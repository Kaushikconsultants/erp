package com.antigravity.erp.transcription

import android.content.Context
import android.content.Intent
import androidx.work.*
import com.antigravity.erp.data.CrmDatabase
import com.antigravity.erp.data.TranscriptEntity
import org.json.JSONArray
import java.io.File
import java.util.UUID
import java.util.concurrent.TimeUnit

class TranscriptionWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val KEY_CALL_ID = "call_id"
        const val KEY_AUDIO_PATH = "audio_path"
        const val KEY_PHONE_NUMBER = "phone_number"
        const val KEY_DURATION_SEC = "duration_sec"

        fun enqueue(context: Context, callId: String, audioPath: String, phoneNumber: String, durationSec: Int) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val inputData = Data.Builder()
                .putString(KEY_CALL_ID, callId)
                .putString(KEY_AUDIO_PATH, audioPath)
                .putString(KEY_PHONE_NUMBER, phoneNumber)
                .putInt(KEY_DURATION_SEC, durationSec)
                .build()

            val workRequest = OneTimeWorkRequestBuilder<TranscriptionWorker>()
                .setConstraints(constraints)
                .setInputData(inputData)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                "transcribe_$callId",
                ExistingWorkPolicy.REPLACE,
                workRequest
            )
        }
    }

    override suspend fun doWork(): Result {
        val callId = inputData.getString(KEY_CALL_ID) ?: return Result.failure()
        val audioPath = inputData.getString(KEY_AUDIO_PATH) ?: return Result.failure()
        val phone = inputData.getString(KEY_PHONE_NUMBER) ?: "Unknown"
        val durationSec = inputData.getInt(KEY_DURATION_SEC, 0)

        val audioFile = File(audioPath)
        if (!audioFile.exists() || audioFile.length() == 0L) {
            return Result.failure()
        }

        val db = CrmDatabase.getInstance(applicationContext)

        try {
            db.callDao().updateTranscriptionStatus(callId, "PROCESSING", null)

            val provider = GeminiCloudTranscriptionProvider(applicationContext)
            val result = provider.transcribeAudio(audioFile, phone, durationSec)

            val transcriptId = UUID.randomUUID().toString()
            val transcriptEntity = TranscriptEntity(
                transcriptId = transcriptId,
                callId = callId,
                transcriptText = result.text,
                summary = result.summary,
                keyPointsJson = JSONArray(result.keyPoints).toString(),
                detectedOutcome = result.detectedOutcome,
                dealSentiment = result.dealSentiment,
                sentimentReason = result.sentimentReason,
                confidence = result.confidence,
                provider = result.provider,
                status = if (result.success) "COMPLETED" else "FAILED",
                errorMessage = result.errorMessage
            )

            db.transcriptDao().insertTranscript(transcriptEntity)
            db.callDao().updateTranscriptionStatus(callId, "COMPLETED", transcriptId)

            // Broadcast completion to WebView
            val intent = Intent(ACTION_TRANSCRIPTION_READY).apply {
                putExtra("callId", callId)
                putExtra("transcriptId", transcriptId)
                putExtra("transcriptText", result.text)
                putExtra("summary", result.summary)
                putExtra("outcome", result.detectedOutcome)
                setPackage(applicationContext.packageName)
            }
            applicationContext.sendBroadcast(intent)

            return Result.success()
        } catch (e: Exception) {
            e.printStackTrace()
            return Result.retry()
        }
    }
}

const val ACTION_TRANSCRIPTION_READY = "com.antigravity.erp.TRANSCRIPTION_READY"
