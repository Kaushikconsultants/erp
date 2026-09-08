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

        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            return simList
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1 && subscriptionManager != null) {
                val subList: List<SubscriptionInfo>? = subscriptionManager?.activeSubscriptionInfoList
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
                        val number = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            try {
                                subscriptionManager?.getPhoneNumber(subId) ?: subInfo.number
                            } catch (e: Exception) {
                                subInfo.number
                            }
                        } else {
                            subInfo.number
                        }

                        simList.add(
                            SimInfo(
                                subscriptionId = subId,
                                slotIndex = slotIndex,
                                displayName = displayName,
                                carrierName = carrierName,
                                number = number,
                                countryIso = countryIso,
                                iccId = subInfo.iccId,
                                isDefault = (subId == defaultSubId)
                            )
                        )
                    }
                }
            }

            // Fallback for single SIM device if subList is empty
            if (simList.isEmpty()) {
                val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
                val carrier = telephonyManager?.networkOperatorName ?: "Cellular SIM"
                simList.add(
                    SimInfo(
                        subscriptionId = 1,
                        slotIndex = 0,
                        displayName = "SIM 1",
                        carrierName = if (carrier.isNotBlank()) carrier else "Cellular Network",
                        number = null,
                        isDefault = true
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
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
     * Resolves the Telecom PhoneAccountHandle associated with a given subscriptionId
     */
    fun getPhoneAccountHandleForSubscription(subscriptionId: Int): PhoneAccountHandle? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            return null
        }

        try {
            val accounts = telecomManager?.callCapablePhoneAccounts ?: return null
            for (handle in accounts) {
                val account = telecomManager?.getPhoneAccount(handle)
                if (account != null) {
                    val handleId = handle.id
                    // Often handleId matches subscriptionId or sub string
                    if (handleId == subscriptionId.toString() || handleId.contains(subscriptionId.toString())) {
                        return handle
                    }
                }
            }
            if (accounts.isNotEmpty()) {
                // If only 1 account exists or subscription ID matches slot
                val sims = getActiveSims()
                val targetSim = sims.find { it.subscriptionId == subscriptionId }
                if (targetSim != null && targetSim.slotIndex < accounts.size) {
                    return accounts[targetSim.slotIndex]
                }
                return accounts[0]
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return null
    }

    /**
     * Configures Intent with all known OEM dual-SIM extras to guarantee placing call via selected SIM
     */
    fun applySimToIntent(intent: Intent, subscriptionId: Int, slotIndex: Int) {
        val handle = getPhoneAccountHandleForSubscription(subscriptionId)
        if (handle != null) {
            intent.putExtra(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent.putExtra("android.telecom.extra.PHONE_ACCOUNT_HANDLE", handle)
            }
        }

        // Broad OEM Dual-SIM compatibility extras (Samsung, Xiaomi, Oppo, Vivo, MediaTek, Qualcomm)
        intent.putExtra("com.android.phone.force.slot", true)
        intent.putExtra("Cdma_info", slotIndex)
        intent.putExtra("simSlot", slotIndex)
        intent.putExtra("slot", slotIndex)
        intent.putExtra("sim_slot", slotIndex)
        intent.putExtra("subscription", subscriptionId)
        intent.putExtra("subscription_id", subscriptionId)
        intent.putExtra("phone_subscription", subscriptionId)
        intent.putExtra("sub_id", subscriptionId)
    }

    /**
     * Places call via TelecomManager if app is default dialer, or fallback Intent
     */
    fun placeCallWithSim(phoneNumber: String, subscriptionId: Int): Boolean {
        val clean = phoneNumber.replace(Regex("[^0-9+]"), "")
        if (clean.isEmpty()) return false

        val sims = getActiveSims()
        val selectedSim = sims.find { it.subscriptionId == subscriptionId } ?: sims.firstOrNull()
        val targetSlot = selectedSim?.slotIndex ?: 0
        val targetSubId = selectedSim?.subscriptionId ?: subscriptionId

        val uri = Uri.parse("tel:$clean")

        try {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
                return false
            }

            // 1. Direct TelecomManager.placeCall with SIM PhoneAccountHandle
            // This directly invokes the Android Telecom cellular subsystem without opening the app chooser!
            if (telecomManager != null) {
                try {
                    val extras = Bundle()
                    val handle = getPhoneAccountHandleForSubscription(targetSubId)
                    if (handle != null) {
                        extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            extras.putParcelable("android.telecom.extra.PHONE_ACCOUNT_HANDLE", handle)
                        }
                    }
                    extras.putBoolean("com.android.phone.force.slot", true)
                    extras.putInt("simSlot", targetSlot)
                    extras.putInt("slot", targetSlot)
                    extras.putInt("subscription", targetSubId)
                    extras.putInt("subscription_id", targetSubId)
                    telecomManager?.placeCall(uri, extras)
                    return true
                } catch (te: Exception) {
                    te.printStackTrace()
                }
            }

            // 2. Fallback: ACTION_CALL intent with SIM extras
            val callIntent = Intent(Intent.ACTION_CALL, uri)
            callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            applySimToIntent(callIntent, targetSubId, targetSlot)

            val defaultDialerPkg = try { telecomManager?.defaultDialerPackage } catch (e: Exception) { null }
            if (!defaultDialerPkg.isNullOrBlank() && defaultDialerPkg != context.packageName) {
                callIntent.setPackage(defaultDialerPkg)
            }

            context.startActivity(callIntent)
            return true
        } catch (e: Exception) {
            e.printStackTrace()
            // 3. Ultimate fallback: ACTION_DIAL
            try {
                val dialIntent = Intent(Intent.ACTION_DIAL, uri)
                dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                applySimToIntent(dialIntent, targetSubId, targetSlot)
                context.startActivity(dialIntent)
                return true
            } catch (ex: Exception) {
                ex.printStackTrace()
            }
        }
        return false
    }
}
