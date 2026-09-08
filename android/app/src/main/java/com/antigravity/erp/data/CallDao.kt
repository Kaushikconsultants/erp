package com.antigravity.erp.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface CallDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCall(call: CallEntity): Long

    @Update
    suspend fun updateCall(call: CallEntity)

    @Query("SELECT * FROM crm_calls WHERE callId = :callId LIMIT 1")
    suspend fun getCallById(callId: String): CallEntity?

    @Query("SELECT * FROM crm_calls ORDER BY createdAt DESC LIMIT :limit")
    suspend fun getRecentCalls(limit: Int = 50): List<CallEntity>

    @Query("SELECT * FROM crm_calls ORDER BY createdAt DESC")
    fun observeRecentCalls(): Flow<List<CallEntity>>

    @Query("SELECT * FROM crm_calls WHERE syncStatus = 'PENDING' LIMIT 20")
    suspend fun getUnsyncedCalls(): List<CallEntity>

    @Query("UPDATE crm_calls SET status = :status, durationSec = :durationSec, endTime = :endTime, updatedAt = :updatedAt WHERE callId = :callId")
    suspend fun updateCallEnd(callId: String, status: String, durationSec: Int, endTime: Long, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE crm_calls SET recordingStatus = :recordingStatus, audioFilePath = :audioPath, updatedAt = :updatedAt WHERE callId = :callId")
    suspend fun updateRecording(callId: String, recordingStatus: String, audioPath: String?, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE crm_calls SET transcriptionStatus = :transcriptionStatus, transcriptId = :transcriptId, updatedAt = :updatedAt WHERE callId = :callId")
    suspend fun updateTranscriptionStatus(callId: String, transcriptionStatus: String, transcriptId: String?, updatedAt: Long = System.currentTimeMillis())

    @Query("UPDATE crm_calls SET syncStatus = :syncStatus, updatedAt = :updatedAt WHERE callId = :callId")
    suspend fun updateSyncStatus(callId: String, syncStatus: String, updatedAt: Long = System.currentTimeMillis())
}
