package com.antigravity.erp.audio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.antigravity.erp.MainActivity
import com.antigravity.erp.R
import java.io.File

class CallAudioRecordingService : Service() {

    companion object {
        const val CHANNEL_ID = "crm_call_recording"
        private const val NOTIFICATION_ID = 2002

        const val ACTION_START = "com.antigravity.erp.action.START_RECORDING"
        const val ACTION_STOP = "com.antigravity.erp.action.STOP_RECORDING"
        const val EXTRA_CALL_ID = "extra_call_id"
        const val EXTRA_PHONE_NUMBER = "extra_phone_number"

        @Volatile
        private var instance: CallAudioRecordingService? = null

        fun isRecording(): Boolean = instance?.recorder?.isRecording() == true

        fun getCurrentCallId(): String? = instance?.currentCallId

        fun getCurrentPhoneNumber(): String? = instance?.currentPhoneNumber

        fun startRecording(context: Context, callId: String, phoneNumber: String) {
            val intent = Intent(context, CallAudioRecordingService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_CALL_ID, callId)
                putExtra(EXTRA_PHONE_NUMBER, phoneNumber)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopRecording(context: Context): File? {
            val file = instance?.recorder?.stop()
            val intent = Intent(context, CallAudioRecordingService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
            return file
        }
    }

    private var recorder: CallAudioRecorder? = null
    private var currentCallId: String? = null
    private var currentPhoneNumber: String? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        recorder = CallAudioRecorder(this)
        createNotificationChannel()
    }

    override fun onDestroy() {
        recorder?.stop()
        recorder = null
        instance = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action

        if (action == ACTION_START) {
            val callId = intent.getStringExtra(EXTRA_CALL_ID) ?: System.currentTimeMillis().toString()
            val phone = intent.getStringExtra(EXTRA_PHONE_NUMBER) ?: "Active Call"
            currentCallId = callId
            currentPhoneNumber = phone

            val notification = buildForegroundNotification(phone)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val fgsType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                } else {
                    0
                }
                startForeground(NOTIFICATION_ID, notification, fgsType)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }

            recorder?.start(callId)
        } else if (action == ACTION_STOP) {
            recorder?.stop()
            stopForeground(true)
            stopSelf()
        }

        return START_NOT_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call Audio Capture",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Captures cellular audio during active calls for CRM sales intelligence"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(phoneNumber: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getActivity(this, 0, launchIntent, flags)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Antigravity CRM • Call Connected")
            .setContentText("Processing call with $phoneNumber for transcription")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }
}
