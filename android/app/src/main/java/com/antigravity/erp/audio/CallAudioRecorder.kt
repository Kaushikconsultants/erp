package com.antigravity.erp.audio

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File
import java.io.IOException

class CallAudioRecorder(private val context: Context) {

    private var mediaRecorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var isRecording = false

    fun isRecording(): Boolean = isRecording

    fun getOutputFile(): File? = outputFile

    /**
     * Starts recording cellular call audio into an AAC .m4a file
     */
    @Synchronized
    fun start(callId: String): File? {
        if (isRecording) {
            return outputFile
        }

        val outputDir = File(context.filesDir, "call_recordings").apply {
            if (!exists()) mkdirs()
        }
        val file = File(outputDir, "call_${callId}_${System.currentTimeMillis()}.m4a")
        outputFile = file

        val checker = CallRecordingCapabilityChecker(context)
        val capability = checker.evaluateCapability()
        val preferredSource = capability.recommendedSource

        // Build candidate sources in order of preference
        val sourcesToTry = linkedSetOf<Int>()
        sourcesToTry.add(preferredSource)
        sourcesToTry.add(MediaRecorder.AudioSource.VOICE_COMMUNICATION)
        sourcesToTry.add(MediaRecorder.AudioSource.VOICE_RECOGNITION)
        sourcesToTry.add(MediaRecorder.AudioSource.MIC)
        sourcesToTry.add(MediaRecorder.AudioSource.DEFAULT)

        var started = false
        for (source in sourcesToTry) {
            try {
                if (file.exists()) {
                    file.delete()
                }
                mediaRecorder = createRecorder().apply {
                    setAudioSource(source)
                    setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                    setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                    setAudioEncodingBitRate(64000)
                    setAudioSamplingRate(16000)
                    setOutputFile(file.absolutePath)
                    prepare()
                    start()
                }
                started = true
                isRecording = true
                break
            } catch (e: Exception) {
                e.printStackTrace()
                releaseRecorder()
            }
        }

        return if (started) file else null
    }

    /**
     * Stops recording and returns finalized audio file
     */
    @Synchronized
    fun stop(): File? {
        if (!isRecording) {
            return outputFile
        }

        try {
            mediaRecorder?.apply {
                stop()
                reset()
                release()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            mediaRecorder = null
            isRecording = false
        }

        val file = outputFile
        if (file != null && file.exists() && file.length() == 0L) {
            try { file.delete() } catch (e: Exception) {}
            return null
        }

        return file
    }

    private fun releaseRecorder() {
        try {
            mediaRecorder?.reset()
            mediaRecorder?.release()
        } catch (e: Exception) {}
        mediaRecorder = null
    }

    @Suppress("DEPRECATION")
    private fun createRecorder(): MediaRecorder {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            MediaRecorder()
        }
    }
}
