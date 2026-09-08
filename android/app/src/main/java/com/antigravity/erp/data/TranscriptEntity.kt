package com.antigravity.erp.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "crm_transcripts",
    indices = [
        Index(value = ["transcriptId"], unique = true),
        Index(value = ["callId"]),
        Index(value = ["status"]),
        Index(value = ["createdAt"])
    ]
)
data class TranscriptEntity(
    @PrimaryKey
    val transcriptId: String,
    val callId: String,
    val transcriptText: String,
    val summary: String? = null,
    val keyPointsJson: String? = null,
    val language: String = "en-IN",
    val speakersJson: String? = null,
    val timestampsJson: String? = null,
    val detectedOutcome: String? = null,
    val dealSentiment: String? = null,
    val sentimentReason: String? = null,
    val suggestedFollowUpJson: String? = null,
    val confidence: Float = 0.95f,
    val provider: String = "GEMINI_AI",
    val status: String = "COMPLETED", // PENDING, PROCESSING, COMPLETED, FAILED, WAITING_FOR_NETWORK
    val errorMessage: String? = null,
    val retryCount: Int = 0,
    val syncStatus: String = "PENDING", // PENDING, SYNCED, FAILED
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
