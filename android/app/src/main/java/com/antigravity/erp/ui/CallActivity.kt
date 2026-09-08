package com.antigravity.erp.ui

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.antigravity.erp.MainActivity
import com.antigravity.erp.R
import com.antigravity.erp.audio.CallRecordingCapabilityChecker
import com.antigravity.erp.audio.CapabilityLevel
import com.antigravity.erp.telecom.ACTION_CALL_STATE_CHANGED
import com.antigravity.erp.telecom.CrmInCallService

class CallActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_PHONE_NUMBER = "extra_phone_number"
        const val EXTRA_CALL_ID = "extra_call_id"
        const val EXTRA_DIRECTION = "extra_direction"
    }

    private lateinit var tvSimBadge: TextView
    private lateinit var tvAvatar: TextView
    private lateinit var tvContactName: TextView
    private lateinit var tvPhoneNumber: TextView
    private lateinit var tvCallStatus: TextView
    private lateinit var tvCallTimer: TextView
    private lateinit var tvTranscriptionStatus: TextView
    private lateinit var btnMute: Button
    private lateinit var btnKeypad: Button
    private lateinit var btnSpeaker: Button
    private lateinit var btnHold: Button
    private lateinit var btnReturnCrm: Button
    private lateinit var btnEndCall: Button

    private var isMuted = false
    private var isSpeakerOn = false
    private var isHeld = false
    private var callStartTimeMs = 0L

    private val timerHandler = Handler(Looper.getMainLooper())
    private val timerRunnable = object : Runnable {
        override fun run() {
            if (callStartTimeMs > 0) {
                val elapsedSec = (System.currentTimeMillis() - callStartTimeMs) / 1000
                val min = elapsedSec / 60
                val sec = elapsedSec % 60
                tvCallTimer.text = String.format("%02d:%02d", min, sec)
            }
            timerHandler.postDelayed(this, 1000)
        }
    }

    private val callStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent == null) return
            val state = intent.getStringExtra("state") ?: return
            val durationSec = intent.getIntExtra("durationSec", 0)

            when (state) {
                "ACTIVE" -> {
                    tvCallStatus.text = "Connected"
                    if (callStartTimeMs == 0L) {
                        callStartTimeMs = System.currentTimeMillis()
                    }
                }
                "RINGING" -> {
                    tvCallStatus.text = "Ringing..."
                }
                "DIALING" -> {
                    tvCallStatus.text = "Calling..."
                }
                "HOLDING" -> {
                    tvCallStatus.text = "On Hold"
                }
                "ENDED" -> {
                    tvCallStatus.text = "Call Ended (${durationSec}s)"
                    timerHandler.removeCallbacks(timerRunnable)
                    timerHandler.postDelayed({ finish() }, 1500)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Safety guard: If no active call is bound in CrmInCallService, finish immediately
        if (CrmInCallService.activeCall == null) {
            finish()
            return
        }

        // Keep screen on during active phone call
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )

        setContentView(R.layout.activity_call)

        tvSimBadge = findViewById(R.id.tvSimBadge)
        tvAvatar = findViewById(R.id.tvAvatar)
        tvContactName = findViewById(R.id.tvContactName)
        tvPhoneNumber = findViewById(R.id.tvPhoneNumber)
        tvCallStatus = findViewById(R.id.tvCallStatus)
        tvCallTimer = findViewById(R.id.tvCallTimer)
        tvTranscriptionStatus = findViewById(R.id.tvTranscriptionStatus)
        btnMute = findViewById(R.id.btnMute)
        btnKeypad = findViewById(R.id.btnKeypad)
        btnSpeaker = findViewById(R.id.btnSpeaker)
        btnHold = findViewById(R.id.btnHold)
        btnReturnCrm = findViewById(R.id.btnReturnCrm)
        btnEndCall = findViewById(R.id.btnEndCall)

        val phone = intent.getStringExtra(EXTRA_PHONE_NUMBER) ?: "Cellular Call"
        val direction = intent.getStringExtra(EXTRA_DIRECTION) ?: "OUTGOING"

        tvPhoneNumber.text = phone
        tvSimBadge.text = if (direction == "INCOMING") "Incoming Call • SIM 1" else "Outgoing Call • SIM 1"
        tvAvatar.text = if (phone.isNotBlank()) phone.takeLast(1) else "C"

        // Display Capability Status
        val capability = CallRecordingCapabilityChecker(this).evaluateCapability()
        when (capability.level) {
            CapabilityLevel.SUPPORTED_TWO_WAY -> {
                tvTranscriptionStatus.text = "🎙️ AI Two-Way Transcription Active"
            }
            CapabilityLevel.PARTIALLY_SUPPORTED_MIC_ONLY -> {
                tvTranscriptionStatus.text = "🎙️ Voice Debrief Capture Active"
            }
            else -> {
                tvTranscriptionStatus.text = "ℹ️ Standard Call Audio Active"
            }
        }

        // Setup Controls
        btnMute.setOnClickListener {
            isMuted = !isMuted
            CrmInCallService.toggleMute(isMuted)
            btnMute.text = if (isMuted) "Unmute" else "Mute"
            btnMute.setBackgroundColor(if (isMuted) 0xff475569.toInt() else 0xff1e293b.toInt())
        }

        btnSpeaker.setOnClickListener {
            isSpeakerOn = !isSpeakerOn
            CrmInCallService.toggleSpeaker(isSpeakerOn)
            btnSpeaker.text = if (isSpeakerOn) "Earpiece" else "Speaker"
            btnSpeaker.setBackgroundColor(if (isSpeakerOn) 0xff0284c7.toInt() else 0xff1e293b.toInt())
        }

        btnHold.setOnClickListener {
            isHeld = !isHeld
            CrmInCallService.toggleHold(isHeld)
            btnHold.text = if (isHeld) "Resume" else "Hold"
            btnHold.setBackgroundColor(if (isHeld) 0xffd97706.toInt() else 0xff1e293b.toInt())
        }

        btnReturnCrm.setOnClickListener {
            val crmIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            startActivity(crmIntent)
        }

        btnEndCall.setOnClickListener {
            CrmInCallService.endCall()
            finish()
        }

        // Register Call State Receiver
        val filter = IntentFilter(ACTION_CALL_STATE_CHANGED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(callStateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(callStateReceiver, filter)
        }

        timerHandler.post(timerRunnable)
    }

    override fun onDestroy() {
        timerHandler.removeCallbacks(timerRunnable)
        try {
            unregisterReceiver(callStateReceiver)
        } catch (e: Exception) {}
        super.onDestroy()
    }
}
