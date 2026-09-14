package com.antigravity.erp.telecom

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import org.json.JSONArray

class SimManager(private val context: Context) {

    private val subscriptionManager: SubscriptionManager? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
        } else null
    }

    private val telecomManager: TelecomManager? by lazy {
        context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
    }

    /**
     * Retrieves all active SIM card subscriptions (physical SIM & eSIM)
     */
    fun getActiveSims(): List<SimInfo> {
        val simList = mutableListOf<SimInfo>()

        try {
            val hasPhoneState = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
            if (hasPhoneState && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1 && subscriptionManager != null) {
                val subList: List<SubscriptionInfo>? = try {
                    subscriptionManager?.activeSubscriptionInfoList
                } catch (t: Throwable) {
                    null
                }

                if (subList != null && subList.isNotEmpty()) {
                    val defaultSubId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                        SubscriptionManager.getDefaultVoiceSubscriptionId()
                    } else {
                        SubscriptionManager.getDefaultSubscriptionId()
                    }

                    for (subInfo in subList) {
                        val subId = subInfo.subscriptionId
                        val slotIndex = subInfo.simSlotIndex
                        val carrierName = subInfo.carrierName?.toString() ?: "Carrier"
                        val displayName = subInfo.displayName?.toString() ?: "SIM ${slotIndex + 1}"
                        val countryIso = subInfo.countryIso ?: "in"
                        val number = try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                subscriptionManager?.getPhoneNumber(subId)
                            } else {
                                subInfo.number
                            }
                        } catch (t: Throwable) {
                            null
                        }

                        simList.add(
                            SimInfo(
                                subscriptionId = subId,
                                slotIndex = slotIndex,
                                displayName = displayName,
                                carrierName = carrierName,
                                number = number,
                                countryIso = countryIso,
                                iccId = try { subInfo.iccId } catch (t: Throwable) { null },
                                isDefault = (subId == defaultSubId)
                            )
                        )
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        // Fallback: If subscription list is empty or permission not yet granted,
        // detect active SIM modem count to guarantee Dual-SIM / Single-SIM choice pills
        if (simList.isEmpty()) {
            try {
                val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
                val carrier = telephonyManager?.networkOperatorName?.takeIf { it.isNotBlank() }
                    ?: telephonyManager?.simOperatorName?.takeIf { it.isNotBlank() }
                    ?: "Cellular"
                val phoneCount = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    telephonyManager?.activeModemCount ?: 2
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    telephonyManager?.phoneCount ?: 2
                } else {
                    2
                }

                if (phoneCount >= 2) {
                    simList.add(
                        SimInfo(
                            subscriptionId = 1,
                            slotIndex = 0,
                            displayName = "SIM 1",
                            carrierName = if (carrier.isNotBlank() && carrier != "Cellular") "$carrier (SIM 1)" else "SIM 1",
                            number = null,
                            isDefault = true
                        )
                    )
                    simList.add(
                        SimInfo(
                            subscriptionId = 2,
                            slotIndex = 1,
                            displayName = "SIM 2",
                            carrierName = if (carrier.isNotBlank() && carrier != "Cellular") "$carrier (SIM 2)" else "SIM 2",
                            number = null,
                            isDefault = false
                        )
                    )
                } else {
                    simList.add(
                        SimInfo(
                            subscriptionId = 1,
                            slotIndex = 0,
                            displayName = "SIM 1",
                            carrierName = carrier,
                            number = null,
                            isDefault = true
                        )
                    )
                }
            } catch (t: Throwable) {
                simList.add(
                    SimInfo(
                        subscriptionId = 1,
                        slotIndex = 0,
                        displayName = "SIM 1",
                        carrierName = "Cellular",
                        number = null,
                        isDefault = true
                    )
                )
            }
        }

        return simList
    }

    /**
     * Serializes available SIMs to JSON for the Web Dialer
     */
    fun getActiveSimsJson(): String {
        val jsonArray = JSONArray()
        for (sim in getActiveSims()) {
            jsonArray.put(sim.toJson())
        }
        return jsonArray.toString()
    }

    /**
     * Resolves the Telecom PhoneAccountHandle associated with a given subscriptionId or slot
     */
    @JvmOverloads
    fun getPhoneAccountHandleForSubscription(subscriptionId: Int, requestedSlot: Int = -1): PhoneAccountHandle? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            return null
        }

        try {
            val sims = getActiveSims()
            val targetSim = (if (subscriptionId > 0) sims.find { it.subscriptionId == subscriptionId } else null)
                ?: (if (requestedSlot >= 0) sims.find { it.slotIndex == requestedSlot } else null)
                ?: sims.firstOrNull()

            val accounts = telecomManager?.callCapablePhoneAccounts ?: return null
            if (accounts.isEmpty()) return null

            android.util.Log.d("SimManager", "Resolving handle for subId=$subscriptionId, slot=$requestedSlot, targetSim=$targetSim, totalAccounts=${accounts.size}")

            // Strategy 1: Match by ICCID (most reliable on Qualcomm/Xiaomi/MIUI)
            if (targetSim != null && !targetSim.iccId.isNullOrBlank()) {
                val cleanIcc = targetSim.iccId.trim()
                if (cleanIcc.length >= 8) {
                    for (handle in accounts) {
                        val handleId = handle.id ?: ""
                        if (handleId == cleanIcc || handleId.contains(cleanIcc) || cleanIcc.contains(handleId)) {
                            android.util.Log.d("SimManager", "Matched handle by ICCID: ${handle.id}")
                            return handle
                        }
                    }
                }
            }

            // Strategy 2: Match by exact subscription ID string (NOT substring contains to prevent false positives)
            if (targetSim != null) {
                val subStr = targetSim.subscriptionId.toString()
                for (handle in accounts) {
                    val handleId = handle.id ?: ""
                    if (handleId == subStr) {
                        android.util.Log.d("SimManager", "Matched handle by exact subscriptionId: ${handle.id}")
                        return handle
                    }
                }
            }

            // Strategy 3: Match PhoneAccount label with carrier name or display name (e.g. Jio vs Airtel)
            if (targetSim != null) {
                val carrierLower = targetSim.carrierName.trim().lowercase()
                val displayLower = targetSim.displayName.trim().lowercase()

                for (handle in accounts) {
                    val account = telecomManager?.getPhoneAccount(handle) ?: continue
                    val labelLower = (account.label?.toString() ?: "").trim().lowercase()
                    val descLower = (account.shortDescription?.toString() ?: "").trim().lowercase()

                    if (carrierLower.isNotEmpty() && labelLower.isNotEmpty() &&
                        (labelLower.contains(carrierLower) || carrierLower.contains(labelLower))) {
                        android.util.Log.d("SimManager", "Matched handle by carrier label '$labelLower' <=> '$carrierLower': ${handle.id}")
                        return handle
                    }

                    if (displayLower.isNotEmpty() && labelLower.isNotEmpty() &&
                        (labelLower.contains(displayLower) || displayLower.contains(labelLower))) {
                        android.util.Log.d("SimManager", "Matched handle by display label '$labelLower' <=> '$displayLower': ${handle.id}")
                        return handle
                    }

                    if (carrierLower.isNotEmpty() && descLower.isNotEmpty() &&
                        (descLower.contains(carrierLower) || carrierLower.contains(descLower))) {
                        android.util.Log.d("SimManager", "Matched handle by desc '$descLower' <=> '$carrierLower': ${handle.id}")
                        return handle
                    }
                }
            }

            // Strategy 4: Match by slot index in handle ID (e.g. "slot_0", "slot0", "sim1")
            if (targetSim != null) {
                val slot = targetSim.slotIndex
                for (handle in accounts) {
                    val handleId = handle.id?.lowercase() ?: ""
                    if (handleId == slot.toString() ||
                        handleId == "slot_$slot" ||
                        handleId == "slot$slot" ||
                        handleId == "sim${slot + 1}" ||
                        handleId == "sub_$slot") {
                        android.util.Log.d("SimManager", "Matched handle by slot pattern '$handleId': slot=$slot")
                        return handle
                    }
                }
            }

            // Strategy 5: Match slot index with account label containing "SIM 1" or "SIM 2"
            if (targetSim != null) {
                val slotName = "sim ${targetSim.slotIndex + 1}"
                for (handle in accounts) {
                    val account = telecomManager?.getPhoneAccount(handle) ?: continue
                    val labelLower = (account.label?.toString() ?: "").trim().lowercase()
                    if (labelLower.contains(slotName)) {
                        android.util.Log.d("SimManager", "Matched handle by slot label '$labelLower' <=> '$slotName'")
                        return handle
                    }
                }
            }

            // Strategy 6: Fallback to accounts list by slot index if within bounds
            if (targetSim != null && targetSim.slotIndex < accounts.size) {
                android.util.Log.d("SimManager", "Fallback to accounts[slotIndex] -> ${accounts[targetSim.slotIndex].id}")
                return accounts[targetSim.slotIndex]
            }

            return accounts.firstOrNull()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return null
    }

    /**
     * Configures Intent with all known OEM dual-SIM extras to guarantee placing call via selected SIM
     */
    fun applySimToIntent(intent: Intent, subscriptionId: Int, slotIndex: Int) {
        val safeSlot = if (slotIndex >= 0) slotIndex else 0
        val safeSub = if (subscriptionId > 0) subscriptionId else (safeSlot + 1)

        val isDefault = try {
            DefaultDialerManager(context).isDefaultDialer()
        } catch (e: Exception) { false }

        // Only attach TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE if app is the default dialer.
        // On modern Android (API 29+), passing EXTRA_PHONE_ACCOUNT_HANDLE from a non-default dialer in ACTION_CALL
        // causes SecurityException: PhoneAccountHandle does not belong to calling user or process, which broke direct calling.
        if (isDefault) {
            val handle = getPhoneAccountHandleForSubscription(safeSub, safeSlot)
            if (handle != null) {
                try {
                    intent.putExtra(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        intent.putExtra("android.telecom.extra.PHONE_ACCOUNT_HANDLE", handle)
                    }
                } catch (e: Exception) {}
            }
        }

        // Broad OEM Dual-SIM compatibility extras (Samsung, Xiaomi, Oppo, Vivo, Realme, MediaTek, Qualcomm)
        intent.putExtra("com.android.phone.force.slot", true)
        intent.putExtra("com.android.phone.extra.slot", safeSlot)
        intent.putExtra("Cdma_info", safeSlot)
        intent.putExtra("simSlot", safeSlot)
        intent.putExtra("slot", safeSlot)
        intent.putExtra("sim_slot", safeSlot)
        intent.putExtra("simId", safeSlot)
        intent.putExtra("simnum", safeSlot)
        intent.putExtra("slot_id", safeSlot)
        intent.putExtra("subscription", safeSub)
        intent.putExtra("subscription_id", safeSub)
        intent.putExtra("phone_subscription", safeSub)
        intent.putExtra("sub_id", safeSub)
        intent.putExtra("com.android.phone.DialingMode", safeSlot)
        intent.putExtra("android.telecom.extra.PHONE_ACCOUNT_HANDLE_SLOT", safeSlot)
    }

    /**
     * Places call via TelecomManager if app is default dialer, or fallback Intent
     */
    @JvmOverloads
    fun placeCallWithSim(phoneNumber: String, subscriptionId: Int, requestedSlotIndex: Int = -1): Boolean {
        val clean = phoneNumber.replace(Regex("[^0-9+]"), "")
        if (clean.isEmpty()) return false

        val sims = getActiveSims()
        val selectedSim = (if (subscriptionId > 0) sims.find { it.subscriptionId == subscriptionId } else null)
            ?: (if (requestedSlotIndex >= 0) sims.find { it.slotIndex == requestedSlotIndex } else null)
            ?: sims.firstOrNull()

        val safeSlot = selectedSim?.slotIndex ?: (if (requestedSlotIndex >= 0) requestedSlotIndex else 0)
        val safeSub = selectedSim?.subscriptionId ?: (if (subscriptionId > 0) subscriptionId else (safeSlot + 1))

        val uri = Uri.fromParts("tel", clean, null)
        val handle = getPhoneAccountHandleForSubscription(safeSub, safeSlot)

        android.util.Log.d("SimManager", "placeCallWithSim: clean=$clean, safeSub=$safeSub, safeSlot=$safeSlot, carrier=${selectedSim?.carrierName}, handle=${handle?.id}")

        try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
                android.util.Log.w("SimManager", "CALL_PHONE permission not granted, cannot place direct call")
                return false
            }

            // 1. Try TelecomManager.placeCall with handle
            if (telecomManager != null && handle != null) {
                try {
                    val extras = Bundle()
                    extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        extras.putParcelable("android.telecom.extra.PHONE_ACCOUNT_HANDLE", handle)
                    }
                    extras.putBoolean("com.android.phone.force.slot", true)
                    extras.putInt("com.android.phone.extra.slot", safeSlot)
                    extras.putInt("simSlot", safeSlot)
                    extras.putInt("slot", safeSlot)
                    extras.putInt("sim_slot", safeSlot)
                    extras.putInt("simId", safeSlot)
                    extras.putInt("simnum", safeSlot)
                    extras.putInt("slot_id", safeSlot)
                    extras.putInt("subscription", safeSub)
                    extras.putInt("subscription_id", safeSub)
                    extras.putInt("phone_subscription", safeSub)
                    extras.putInt("sub_id", safeSub)
                    extras.putInt("android.telecom.extra.PHONE_ACCOUNT_HANDLE_SLOT", safeSlot)
                    extras.putInt("com.android.phone.DialingMode", safeSlot)

                    telecomManager?.placeCall(uri, extras)
                    android.util.Log.d("SimManager", "telecomManager.placeCall succeeded for sub=$safeSub slot=$safeSlot")
                    return true
                } catch (te: Throwable) {
                    android.util.Log.w("SimManager", "telecomManager.placeCall failed, falling back to ACTION_CALL", te)
                }
            }

            // 2. Primary direct cellular call: ACTION_CALL intent with OEM SIM extras
            try {
                val callIntent = Intent(Intent.ACTION_CALL, uri)
                callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                applySimToIntent(callIntent, safeSub, safeSlot)
                context.startActivity(callIntent)
                android.util.Log.d("SimManager", "ACTION_CALL with SIM extras succeeded: slot=$safeSlot, sub=$safeSub")
                return true
            } catch (ce: Throwable) {
                android.util.Log.w("SimManager", "ACTION_CALL with SIM extras failed, trying bare ACTION_CALL", ce)
                val bareCallIntent = Intent(Intent.ACTION_CALL, uri)
                bareCallIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(bareCallIntent)
                return true
            }
        } catch (e: Throwable) {
            android.util.Log.w("SimManager", "ACTION_CALL failed, falling back to ACTION_DIAL", e)
            // 3. Ultimate fallback: ACTION_DIAL only if permission is completely denied
            try {
                val dialIntent = Intent(Intent.ACTION_DIAL, uri)
                dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                applySimToIntent(dialIntent, safeSub, safeSlot)
                context.startActivity(dialIntent)
                return true
            } catch (ex: Throwable) {
                ex.printStackTrace()
            }
        }
        return false
    }
}
