package com.antigravity.erp.telecom

import org.json.JSONObject

data class SimInfo(
    val subscriptionId: Int,
    val slotIndex: Int, // 0 for SIM 1, 1 for SIM 2
    val displayName: String,
    val carrierName: String,
    val number: String? = null,
    val countryIso: String = "in",
    val iccId: String? = null,
    val isDefault: Boolean = false
) {
    fun toJson(): JSONObject {
        val json = JSONObject()
        json.put("subscriptionId", subscriptionId)
        json.put("slotIndex", slotIndex)
        json.put("slotLabel", "SIM ${slotIndex + 1}")
        json.put("displayName", displayName)
        json.put("carrierName", carrierName)
        json.put("number", number ?: "")
        json.put("countryIso", countryIso)
        json.put("isDefault", isDefault)
        return json
    }
}
