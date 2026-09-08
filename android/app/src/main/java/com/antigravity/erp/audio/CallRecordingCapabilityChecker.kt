package com.antigravity.erp.audio

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import androidx.core.content.ContextCompat
import com.antigravity.erp.telecom.DefaultDialerManager
import org.json.JSONObject

enum class CapabilityLevel {
    SUPPORTED_TWO_WAY,      // Hardware / ROM permits capturing both caller & receiver
    PARTIALLY_SUPPORTED_MIC_ONLY, // Only user's microphone can be captured (Standard Android 10-15 limitation)
    RESTRICTED_BY_OS,       // Cellular call audio capture completely blocked by platform policy
    PERMISSION_REQUIRED,    // RECORD_AUDIO permission missing
    DEFAULT_DIALER_REQUIRED // Requires default phone app role
}

data class CapabilityResult(
    val level: CapabilityLevel,
    val title: String,
    val description: String,
    val canRecordBothSides: Boolean,
    val recommendedSource: Int,
    val sourceName: String,
    val oemVendor: String,
    val androidVersion: String
) {
    fun toJson(): JSONObject {
        val json = JSONObject()
        json.put("level", level.name)
        json.put("title", title)
        json.put("description", description)
        json.put("canRecordBothSides", canRecordBothSides)
        json.put("sourceName", sourceName)
        json.put("oemVendor", oemVendor)
        json.put("androidVersion", androidVersion)
        return json
    }
}

class CallRecordingCapabilityChecker(private val context: Context) {

    private val defaultDialerManager = DefaultDialerManager(context)

    /**
     * Inspects device architecture, OEM manufacturer, API level, and audio subsystems
     */
    fun evaluateCapability(): CapabilityResult {
        val oem = Build.MANUFACTURER.lowercase()
        val model = Build.MODEL
        val apiLevel = Build.VERSION.SDK_INT
        val androidVer = "Android ${Build.VERSION.RELEASE} (API $apiLevel)"

        // 1. Permission check
        val hasRecordAudio = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasRecordAudio) {
            return CapabilityResult(
                level = CapabilityLevel.PERMISSION_REQUIRED,
                title = "Microphone Permission Required",
                description = "Grant audio recording permission to enable call audio processing and transcription.",
                canRecordBothSides = false,
                recommendedSource = MediaRecorder.AudioSource.MIC,
                sourceName = "MIC",
                oemVendor = "${Build.MANUFACTURER} $model",
                androidVersion = androidVer
            )
        }

        // 2. Default dialer role check
        val isDefault = defaultDialerManager.isDefaultDialer()

        // 3. Test AudioSource viability safely using test probe
        val sourceToUse = determineBestAudioSource()

        // 4. Determine two-way capability based on OEM & Android platform security policies
        // Note: Android 10+ (API 29+) explicitly stripped non-system apps of cellular downlink interception
        // Some OEMs (older Samsung, Xiaomi MIUI with native call recorder integration) allow VOICE_CALL or VOICE_COMMUNICATION
        val isKnownTwoWayOEM = (oem.contains("xiaomi") || oem.contains("redmi") || oem.contains("samsung")) && apiLevel < 31

        return if (isKnownTwoWayOEM && isAudioSourceAvailable(MediaRecorder.AudioSource.VOICE_CALL)) {
            CapabilityResult(
                level = CapabilityLevel.SUPPORTED_TWO_WAY,
                title = "Two-Way Call Audio Supported",
                description = "Your device hardware and ROM permit capturing both caller and recipient audio.",
                canRecordBothSides = true,
                recommendedSource = MediaRecorder.AudioSource.VOICE_CALL,
                sourceName = "VOICE_CALL",
                oemVendor = "${Build.MANUFACTURER} $model",
                androidVersion = androidVer
            )
        } else if (apiLevel >= Build.VERSION_CODES.Q) {
            // Android 10, 11, 12, 13, 14, 15, 16 standard behavior: Mic capture supported, remote party restricted
            CapabilityResult(
                level = CapabilityLevel.PARTIALLY_SUPPORTED_MIC_ONLY,
                title = "Standard Cellular Audio (Local Voice)",
                description = "Android $apiLevel platform security policy allows capturing local microphone audio for debrief and AI sales transcription.",
                canRecordBothSides = false,
                recommendedSource = sourceToUse,
                sourceName = getSourceLabel(sourceToUse),
                oemVendor = "${Build.MANUFACTURER} $model",
                androidVersion = androidVer
            )
        } else {
            CapabilityResult(
                level = CapabilityLevel.PARTIALLY_SUPPORTED_MIC_ONLY,
                title = "Call Audio Available",
                description = "Call audio capture available for post-call CRM intelligence processing.",
                canRecordBothSides = false,
                recommendedSource = sourceToUse,
                sourceName = getSourceLabel(sourceToUse),
                oemVendor = "${Build.MANUFACTURER} $model",
                androidVersion = androidVer
            )
        }
    }

    private fun determineBestAudioSource(): Int {
        val candidates = listOf(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            MediaRecorder.AudioSource.VOICE_CALL,
            MediaRecorder.AudioSource.MIC
        )

        for (source in candidates) {
            if (isAudioSourceAvailable(source)) {
                return source
            }
        }
        return MediaRecorder.AudioSource.MIC
    }

    private fun isAudioSourceAvailable(source: Int): Boolean {
        return try {
            val minBufSize = AudioRecord.getMinBufferSize(
                16000,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            if (minBufSize <= 0) return false

            val record = AudioRecord(
                source,
                16000,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                minBufSize
            )
            val state = record.state
            record.release()
            state == AudioRecord.STATE_INITIALIZED
        } catch (e: Exception) {
            false
        }
    }

    private fun getSourceLabel(source: Int): String {
        return when (source) {
            MediaRecorder.AudioSource.VOICE_COMMUNICATION -> "VOICE_COMMUNICATION"
            MediaRecorder.AudioSource.VOICE_CALL -> "VOICE_CALL"
            MediaRecorder.AudioSource.MIC -> "MIC"
            else -> "DEFAULT"
        }
    }
}
