package com.antigravity.erp.telecom

import android.content.Intent
import android.os.Build
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.DisconnectCause
import android.telecom.InCallService
import com.antigravity.erp.audio.CallAudioRecordingService
import com.antigravity.erp.data.CallEntity
import com.antigravity.erp.data.CrmDatabase
import com.antigravity.erp.transcription.TranscriptionWorker
import com.antigravity.erp.ui.CallActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.UUID

class CrmInCallService : InCallService() {

    companion object {
        @Volatile
        var activeCall: Call? = null
            private set

        @Volatile
        var currentCallId: String? = null
            private set

        @Volatile
        var currentPhoneNumber: String? = null
            private set

        @Volatile
        var callConnectTime: Long = 0
            private set

        @Volatile
        var currentCallState: String = "IDLE"
            private set

        @Volatile
        var inCallServiceInstance: CrmInCallService? = null
            private set

        // Call Control API for UI
        fun endCall() {
            try {
                activeCall?.disconnect()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun toggleMute(mute: Boolean) {
            try {
                inCallServiceInstance?.setMuted(mute)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun toggleSpeaker(speakerOn: Boolean) {
            try {
                val route = if (speakerOn) CallAudioState.ROUTE_SPEAKER else CallAudioState.ROUTE_EARPIECE
                inCallServiceInstance?.setAudioRoute(route)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun toggleHold(hold: Boolean) {
            try {
                if (hold) {
                    activeCall?.hold()
                } else {
                    activeCall?.unhold()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        fun sendDtmfTone(digit: Char) {
            try {
                activeCall?.playDtmfTone(digit)
                activeCall?.stopDtmfTone()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val callCallback = object : Call.Callback() {
        override fun onStateChanged(call: Call, state: Int) {
            handleCallState(call, state)
        }

        override fun onDetailsChanged(call: Call, details: Call.Details) {
            super.onDetailsChanged(call, details)
        }
    }

    override fun onCreate() {
        super.onCreate()
        inCallServiceInstance = this
    }

    override fun onDestroy() {
        inCallServiceInstance = null
        activeCall = null
        super.onDestroy()
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        activeCall = call
        call.registerCallback(callCallback)

        val number = call.details.handle?.schemeSpecificPart ?: "Unknown"
        val callId = UUID.randomUUID().toString()
        currentCallId = callId
        currentPhoneNumber = number
        callConnectTime = 0

        val direction = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (call.details.callDirection == Call.Details.DIRECTION_INCOMING) "INCOMING" else "OUTGOING"
        } else {
            "OUTGOING"
        }

        // Save initial Call in Room Database
        serviceScope.launch {
            try {
                val db = CrmDatabase.getInstance(applicationContext)
                val entity = CallEntity(
                    callId = callId,
                    phoneNumber = number,
                    direction = direction,
                    status = "DIALING",
                    startTime = System.currentTimeMillis()
                )
                db.callDao().insertCall(entity)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // Launch Enterprise Active Call Screen
        try {
            val intent = Intent(this, CallActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(CallActivity.EXTRA_PHONE_NUMBER, number)
                putExtra(CallActivity.EXTRA_CALL_ID, callId)
                putExtra(CallActivity.EXTRA_DIRECTION, direction)
            }
            startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        handleCallState(call, call.state)
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        call.unregisterCallback(callCallback)
        if (activeCall == call) {
            activeCall = null
            currentCallState = "ENDED"
        }
    }

    private fun handleCallState(call: Call, state: Int) {
        val callId = currentCallId ?: return
        val number = currentPhoneNumber ?: "Unknown"

        when (state) {
            Call.STATE_CONNECTING -> {
                currentCallState = "CONNECTING"
                broadcastCallState("CONNECTING", 0)
            }
            Call.STATE_DIALING -> {
                currentCallState = "DIALING"
                broadcastCallState("DIALING", 0)
            }
            Call.STATE_RINGING -> {
                currentCallState = "RINGING"
                broadcastCallState("RINGING", 0)
            }
            Call.STATE_ACTIVE -> {
                currentCallState = "ACTIVE"
                if (callConnectTime == 0L) {
                    callConnectTime = System.currentTimeMillis()
                }
                broadcastCallState("ACTIVE", 0)

                // Trigger cellular call audio recording service
                try {
                    CallAudioRecordingService.startRecording(applicationContext, callId, number)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            Call.STATE_HOLDING -> {
                currentCallState = "HOLDING"
                broadcastCallState("HOLDING", getDurationSeconds())
            }
            Call.STATE_DISCONNECTED -> {
                currentCallState = "DISCONNECTED"
                val durationSec = getDurationSeconds()
                val endTime = System.currentTimeMillis()

                val cause = call.details.disconnectCause
                val outcome = when (cause.code) {
                    DisconnectCause.BUSY -> "Busy"
                    DisconnectCause.MISSED -> "Missed"
                    DisconnectCause.REJECTED -> "Rejected"
                    DisconnectCause.CANCELED -> "No Answer"
                    else -> if (durationSec > 0) "Completed" else "No Answer / Busy"
                }

                broadcastCallState("ENDED", durationSec)

                // Stop audio recording & obtain audio file path
                val audioFile = try {
                    CallAudioRecordingService.stopRecording(applicationContext)
                } catch (e: Exception) {
                    null
                }

                // Update Room Database
                serviceScope.launch {
                    try {
                        val db = CrmDatabase.getInstance(applicationContext)
                        db.callDao().updateCallEnd(
                            callId = callId,
                            status = outcome,
                            durationSec = durationSec,
                            endTime = endTime
                        )

                        if (audioFile != null && audioFile.exists()) {
                            db.callDao().updateRecording(
                                callId = callId,
                                recordingStatus = "RECORDED",
                                audioPath = audioFile.absolutePath
                            )
                            // Enqueue asynchronous background transcription via WorkManager
                            TranscriptionWorker.enqueue(applicationContext, callId, audioFile.absolutePath, number, durationSec)
                        } else {
                            db.callDao().updateRecording(
                                callId = callId,
                                recordingStatus = "NOT_RECORDED",
                                audioPath = null
                            )
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        }
    }

    private fun getDurationSeconds(): Int {
        return if (callConnectTime > 0) {
            ((System.currentTimeMillis() - callConnectTime) / 1000).toInt()
        } else 0
    }

    private fun broadcastCallState(state: String, durationSec: Int) {
        val intent = Intent(ACTION_CALL_STATE_CHANGED).apply {
            putExtra("state", state)
            putExtra("durationSec", durationSec)
            putExtra("callId", currentCallId)
            putExtra("phoneNumber", currentPhoneNumber)
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }
}

const val ACTION_CALL_STATE_CHANGED = "com.antigravity.erp.CALL_STATE_CHANGED"
