package com.antigravity.erp.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "crm_calls",
    indices = [
        Index(value = ["callId"], unique = true),
        Index(value = ["phoneNumber"]),
        Index(value = ["customerId"]),
        Index(value = ["leadId"]),
        Index(value = ["syncStatus"]),
        Index(value = ["createdAt"])
    ]
)
data class CallEntity(
    @PrimaryKey
    val callId: String,
    val contactName: String? = null,
    val phoneNumber: String,
    val direction: String, // OUTGOING or INCOMING
    val customerId: String? = null,
    val leadId: String? = null,
    val subscriptionId: Int? = null,
    val simSlot: Int? = null,
    val simDisplayName: String? = null,
    val simCarrier: String? = null,
    val startTime: Long = System.currentTimeMillis(),
    val connectTime: Long? = null,
    val endTime: Long? = null,
    val durationSec: Int = 0,
    val status: String, // DIALING, RINGING, ACTIVE, COMPLETED, BUSY, MISSED, REJECTED, FAILED
    val outcome: String? = null,
    val recordingStatus: String = "NOT_RECORDED", // NOT_RECORDED, RECORDING, RECORDED, FAILED, RESTRICTED
    val audioFilePath: String? = null,
    val audioMimeType: String = "audio/mp4",
    val transcriptionStatus: String = "PENDING", // PENDING, PROCESSING, COMPLETED, FAILED, RESTRICTED
    val transcriptId: String? = null,
    val syncStatus: String = "PENDING", // PENDING, SYNCED, FAILED
    val notes: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
