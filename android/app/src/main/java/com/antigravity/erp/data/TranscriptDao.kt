package com.antigravity.erp.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TranscriptDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTranscript(transcript: TranscriptEntity): Long

    @Update
    suspend fun updateTranscript(transcript: TranscriptEntity)

    @Query("SELECT * FROM crm_transcripts WHERE transcriptId = :transcriptId LIMIT 1")
    suspend fun getTranscriptById(transcriptId: String): TranscriptEntity?

    @Query("SELECT * FROM crm_transcripts WHERE callId = :callId LIMIT 1")
    suspend fun getTranscriptForCall(callId: String): TranscriptEntity?

    @Query("SELECT * FROM crm_transcripts WHERE callId = :callId LIMIT 1")
    fun observeTranscriptForCall(callId: String): Flow<TranscriptEntity?>

    @Query("SELECT * FROM crm_transcripts WHERE status = 'WAITING_FOR_NETWORK' OR status = 'FAILED' LIMIT 10")
    suspend fun getPendingOrFailedTranscripts(): List<TranscriptEntity>

    @Query("SELECT * FROM crm_transcripts WHERE syncStatus = 'PENDING' LIMIT 20")
    suspend fun getUnsyncedTranscripts(): List<TranscriptEntity>

    @Query("UPDATE crm_transcripts SET syncStatus = :syncStatus, updatedAt = :updatedAt WHERE transcriptId = :transcriptId")
    suspend fun updateSyncStatus(transcriptId: String, syncStatus: String, updatedAt: Long = System.currentTimeMillis())

    @Query("DELETE FROM crm_transcripts WHERE transcriptId = :transcriptId")
    suspend fun deleteTranscript(transcriptId: String)
}
