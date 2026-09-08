package com.antigravity.erp

import com.antigravity.erp.audio.CapabilityLevel
import com.antigravity.erp.audio.CapabilityResult
import com.antigravity.erp.telecom.SimInfo
import com.antigravity.erp.transcription.TranscriptionResult
import org.junit.Assert.*
import org.junit.Test

class TelephonyEngineUnitTest {

    @Test
    fun testSimInfoModelProperties() {
        val sim = SimInfo(
            subscriptionId = 101,
            slotIndex = 0,
            displayName = "Airtel 5G",
            carrierName = "Airtel",
            number = "+919876543210",
            countryIso = "in",
            iccId = "89910001",
            isDefault = true
        )

        assertEquals(101, sim.subscriptionId)
        assertEquals(0, sim.slotIndex)
        assertEquals("Airtel 5G", sim.displayName)
        assertEquals("Airtel", sim.carrierName)
        assertEquals("+919876543210", sim.number)
        assertTrue(sim.isDefault)
    }

    @Test
    fun testDualSimFormatting() {
        val sim1 = SimInfo(
            subscriptionId = 1,
            slotIndex = 0,
            displayName = "Airtel",
            carrierName = "Airtel",
            isDefault = true
        )
        val sim2 = SimInfo(
            subscriptionId = 2,
            slotIndex = 1,
            displayName = "Jio",
            carrierName = "Jio",
            isDefault = false
        )

        assertEquals(0, sim1.slotIndex)
        assertEquals(1, sim2.slotIndex)
        assertNotEquals(sim1.subscriptionId, sim2.subscriptionId)
        assertTrue(sim1.isDefault)
        assertFalse(sim2.isDefault)
    }

    @Test
    fun testCapabilityResultProperties() {
        val result = CapabilityResult(
            level = CapabilityLevel.PARTIALLY_SUPPORTED_MIC_ONLY,
            title = "Standard Cellular Audio",
            description = "Microphone audio debrief enabled.",
            canRecordBothSides = false,
            recommendedSource = 1,
            sourceName = "MIC",
            oemVendor = "Samsung SM-S918B",
            androidVersion = "Android 14 (API 34)"
        )

        assertEquals(CapabilityLevel.PARTIALLY_SUPPORTED_MIC_ONLY, result.level)
        assertFalse(result.canRecordBothSides)
        assertEquals("MIC", result.sourceName)
        assertEquals("Samsung SM-S918B", result.oemVendor)
        assertEquals("Android 14 (API 34)", result.androidVersion)
    }

    @Test
    fun testTranscriptionResultDefaults() {
        val result = TranscriptionResult(
            success = true,
            text = "Customer confirmed order for 100 shirts at 450 each.",
            summary = "Order confirmed for 100 units.",
            keyPoints = listOf("100 shirts", "450 INR per unit"),
            detectedOutcome = "Order Placed / Deal Closed",
            dealSentiment = "HOT",
            confidence = 0.98f
        )

        assertTrue(result.success)
        assertEquals("Order Placed / Deal Closed", result.detectedOutcome)
        assertEquals("HOT", result.dealSentiment)
        assertEquals(2, result.keyPoints.size)
    }
}
