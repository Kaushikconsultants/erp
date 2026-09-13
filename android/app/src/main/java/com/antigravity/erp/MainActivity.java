package com.antigravity.erp;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

import android.os.PowerManager;
import android.os.Environment;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;

public class MainActivity extends BridgeActivity {

    public static final String NOTIFICATION_CHANNEL_ID = "crm_notifications";
    public static final String NOTIFICATION_CHANNEL_LEADS = "crm_leads";
    private static final int PERMISSION_REQUEST_CODE = 2001;
    private static int notificationIdCounter = 100;

    // Telephony Call State Tracking for Automatic Stopwatch & Auto AI Debriefing
    private TelephonyManager telephonyManager;
    private PhoneStateListener phoneStateListener;
    private Object telephonyCallback;
    private long callStartTime = 0;
    private boolean isCallInProgress = false;
    private int lastCallDurationSec = 0;
    public String pendingCallNumber = null;
    public String lastDialedNumber = null;
    public String activeRecordingCallId = null;
    public String lastRecordedAudioDataUrl = null;

    public String findRecentCallAudioDataUrl(String phoneNumber) {
        String cleanPhone = (phoneNumber != null) ? phoneNumber.replaceAll("[^0-9]", "") : "";
        if (cleanPhone.isEmpty() && lastDialedNumber != null) {
            cleanPhone = lastDialedNumber.replaceAll("[^0-9]", "");
        }
        String phone10 = (cleanPhone.length() == 12 && cleanPhone.startsWith("91")) ? cleanPhone.substring(2) : cleanPhone;

        // Trigger MediaScanner on standard recording directories asynchronously
        try {
            android.media.MediaScannerConnection.scanFile(
                    this,
                    new String[]{
                            "/storage/emulated/0/Recordings/Call",
                            "/storage/emulated/0/Recordings",
                            "/storage/emulated/0/Recordings/Sound Recorder/call_rec",
                            "/storage/emulated/0/MIUI/sound_recorder/call_rec",
                            "/storage/emulated/0/MIUI/sound_recorder"
                    },
                    null,
                    null
            );
        } catch (Throwable t) {}

        // 1. First, check direct filesystem (works when MANAGE_EXTERNAL_STORAGE is granted or public directories readable)
        try {
            java.io.File directFile = findRecentCallAudioFile(cleanPhone);
            if (directFile != null && directFile.exists() && directFile.length() > 2048) {
                String directDataUrl = fileToAudioDataUrl(directFile);
                if (directDataUrl != null && !directDataUrl.isEmpty()) {
                    return directDataUrl;
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }

        // 2. Query MediaStore with ContentResolver (Android 10 - 16 Scoped Storage compatible)
        try {
            android.content.ContentResolver cr = getContentResolver();
            android.net.Uri uri = android.provider.MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
            String[] projection = {
                    android.provider.MediaStore.Audio.Media._ID,
                    android.provider.MediaStore.Audio.Media.DISPLAY_NAME,
                    android.provider.MediaStore.Audio.Media.TITLE,
                    android.provider.MediaStore.Audio.Media.MIME_TYPE,
                    android.provider.MediaStore.Audio.Media.DATE_ADDED,
                    android.provider.MediaStore.Audio.Media.DATE_MODIFIED,
                    android.provider.MediaStore.Audio.Media.SIZE,
                    android.provider.MediaStore.Audio.Media.DATA
            };
            String selection = android.provider.MediaStore.Audio.Media.SIZE + " > 2048";
            String sortOrder = android.provider.MediaStore.Audio.Media.DATE_MODIFIED + " DESC, " 
                             + android.provider.MediaStore.Audio.Media.DATE_ADDED + " DESC";

            try (android.database.Cursor cursor = cr.query(uri, projection, selection, null, sortOrder)) {
                if (cursor != null) {
                    long bestId = -1;
                    String bestMime = "audio/mp4";
                    long bestSize = 0;
                    int count = 0;

                    while (cursor.moveToNext() && count < 100) {
                        count++;
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Audio.Media._ID));
                        String name = cursor.getString(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Audio.Media.DISPLAY_NAME));
                        String title = cursor.getString(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Audio.Media.TITLE));
                        String mime = cursor.getString(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Audio.Media.MIME_TYPE));
                        long size = cursor.getLong(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Audio.Media.SIZE));
                        String dataPath = "";
                        try {
                            int dataIdx = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.DATA);
                            if (dataIdx >= 0) dataPath = cursor.getString(dataIdx);
                        } catch (Throwable t) {}

                        String combined = ((name != null ? name : "") + " " + (title != null ? title : "") + " " + (dataPath != null ? dataPath : "")).toLowerCase();
                        
                        // Priority 1: Exact phone number match (10 or clean digits)
                        if (!cleanPhone.isEmpty() && cleanPhone.length() >= 3 && combined.contains(cleanPhone)) {
                            bestId = id;
                            bestMime = mime;
                            bestSize = size;
                            break;
                        }
                        if (!phone10.isEmpty() && phone10.length() >= 5 && combined.contains(phone10)) {
                            bestId = id;
                            bestMime = mime;
                            bestSize = size;
                            break;
                        }

                        // Priority 2: Identified call recording within last 24h
                        if (combined.contains("call") || combined.contains("rec") || combined.contains("recording") || combined.contains("miui") || combined.contains("sound_recorder") || combined.contains("voice")) {
                            if (bestId == -1) {
                                bestId = id;
                                bestMime = mime;
                                bestSize = size;
                            }
                        }
                    }

                    if (bestId != -1) {
                        android.net.Uri contentUri = android.content.ContentUris.withAppendedId(android.provider.MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, bestId);
                        String dataUrl = uriToAudioDataUrl(contentUri, bestMime, bestSize);
                        if (dataUrl != null && !dataUrl.isEmpty()) {
                            return dataUrl;
                        }
                    }
                }
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }

        return null;
    }

    public String uriToAudioDataUrl(android.net.Uri uri, String mimeType, long size) {
        if (uri == null) return null;
        try {
            int maxLen = (int) Math.min(size > 0 ? size : (15 * 1024 * 1024), 15 * 1024 * 1024);
            byte[] bytes;
            try (java.io.InputStream is = getContentResolver().openInputStream(uri)) {
                if (is == null) return null;
                java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                int total = 0;
                while ((n = is.read(buf)) > 0 && total < maxLen) {
                    baos.write(buf, 0, n);
                    total += n;
                }
                bytes = baos.toByteArray();
            }
            if (bytes == null || bytes.length < 2048) return null;
            String b64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
            String mime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "audio/mp4";
            return "data:" + mime + ";base64," + b64;
        } catch (Throwable t) {
            t.printStackTrace();
            return null;
        }
    }

    public java.io.File findRecentCallAudioFile(String phoneNumber) {
        long twentyFourHoursAgo = System.currentTimeMillis() - 86400000L;
        long fortyEightHoursAgo = System.currentTimeMillis() - (86400000L * 2);
        java.io.File bestFile = null;
        long latestMod = 0;

        String cleanPhone = (phoneNumber != null) ? phoneNumber.replaceAll("[^0-9]", "") : "";
        if (cleanPhone.isEmpty() && lastDialedNumber != null) {
            cleanPhone = lastDialedNumber.replaceAll("[^0-9]", "");
        }
        String phone10 = (cleanPhone.length() == 12 && cleanPhone.startsWith("91")) ? cleanPhone.substring(2) : cleanPhone;

        java.util.List<java.io.File> candidateDirs = new java.util.ArrayList<>();
        try {
            java.io.File ext = android.os.Environment.getExternalStorageDirectory();
            if (ext != null && ext.exists()) {
                candidateDirs.add(new java.io.File(ext, "Recordings/Call"));
                candidateDirs.add(new java.io.File(ext, "Recordings/call"));
                candidateDirs.add(new java.io.File(ext, "Recordings/Call Recordings"));
                candidateDirs.add(new java.io.File(ext, "Recordings/Calls"));
                candidateDirs.add(new java.io.File(ext, "Recordings/Sound Recorder/call_rec"));
                candidateDirs.add(new java.io.File(ext, "Recordings"));
                candidateDirs.add(new java.io.File(ext, "MIUI/sound_recorder/call_rec"));
                candidateDirs.add(new java.io.File(ext, "MIUI/sound_recorder"));
                candidateDirs.add(new java.io.File(ext, "sound_recorder/call_rec"));
                candidateDirs.add(new java.io.File(ext, "VoiceRecorder"));
                candidateDirs.add(new java.io.File(ext, "Call"));
                candidateDirs.add(new java.io.File(ext, "Music/Recordings/Call"));
                candidateDirs.add(new java.io.File(ext, "Music/Recordings"));
            }
            java.io.File pubRec = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_RECORDINGS);
            if (pubRec != null && pubRec.exists()) {
                candidateDirs.add(new java.io.File(pubRec, "Call"));
                candidateDirs.add(new java.io.File(pubRec, "call"));
                candidateDirs.add(new java.io.File(pubRec, "Sound Recorder/call_rec"));
                candidateDirs.add(pubRec);
            }
            java.io.File pubMusic = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_MUSIC);
            if (pubMusic != null && pubMusic.exists()) {
                candidateDirs.add(new java.io.File(pubMusic, "Recordings/Call"));
                candidateDirs.add(new java.io.File(pubMusic, "Recordings"));
            }
        } catch (Throwable t) {
            t.printStackTrace();
        }

        // Expand candidateDirs to include 1-level subdirectories
        java.util.List<java.io.File> allDirs = new java.util.ArrayList<>(candidateDirs);
        for (java.io.File dir : candidateDirs) {
            if (dir != null && dir.exists() && dir.isDirectory()) {
                try {
                    java.io.File[] subs = dir.listFiles(java.io.File::isDirectory);
                    if (subs != null) {
                        for (java.io.File s : subs) {
                            if (s != null && s.isDirectory()) allDirs.add(s);
                        }
                    }
                } catch (Throwable t) {}
            }
        }

        for (java.io.File dir : allDirs) {
            if (dir != null && dir.exists() && dir.isDirectory()) {
                try {
                    java.io.File[] files = dir.listFiles();
                    if (files != null) {
                        for (java.io.File f : files) {
                            if (f != null && f.isFile() && f.length() > 2048) {
                                String name = f.getName().toLowerCase();
                                if (name.endsWith(".mp3") || name.endsWith(".m4a") || name.endsWith(".aac") || name.endsWith(".wav") || name.endsWith(".ogg") || name.endsWith(".3gp") || name.endsWith(".amr")) {
                                    // 1. Exact phone number match in filename within 48h
                                    if (!cleanPhone.isEmpty() && cleanPhone.length() >= 3 && name.contains(cleanPhone) && f.lastModified() >= fortyEightHoursAgo) {
                                        return f;
                                    }
                                    if (!phone10.isEmpty() && phone10.length() >= 5 && name.contains(phone10) && f.lastModified() >= fortyEightHoursAgo) {
                                        return f;
                                    }
                                    // 2. Latest modified recording in candidate folder within 24h
                                    if (f.lastModified() >= twentyFourHoursAgo && f.lastModified() > latestMod) {
                                        latestMod = f.lastModified();
                                        bestFile = f;
                                    }
                                }
                            }
                        }
                    }
                } catch (Throwable t) {}
            }
        }

        return bestFile;
    }

    public String fileToAudioDataUrl(java.io.File file) {
        if (file == null || !file.exists() || file.length() < 1024) return null;
        try {
            long len = Math.min(file.length(), 15 * 1024 * 1024);
            byte[] bytes = new byte[(int) len];
            try (java.io.FileInputStream fis = new java.io.FileInputStream(file)) {
                int read = fis.read(bytes);
                if (read <= 0) return null;
            }
            String b64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP);
            String name = file.getName().toLowerCase();
            String mime = "audio/mp4";
            if (name.endsWith(".mp3")) mime = "audio/mpeg";
            else if (name.endsWith(".wav")) mime = "audio/wav";
            else if (name.endsWith(".aac")) mime = "audio/aac";
            else if (name.endsWith(".m4a")) mime = "audio/mp4";
            else if (name.endsWith(".ogg")) mime = "audio/ogg";
            else if (name.endsWith(".3gp") || name.endsWith(".amr")) mime = "audio/amr";
            return "data:" + mime + ";base64," + b64;
        } catch (Throwable t) {
            t.printStackTrace();
            return null;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Create Default & Leads Notification Channels (Unlocks notification toggles on Android 8+)
        createNotificationChannels();

        // 2. Request Essential Runtime Permissions on Launch (Notifications, Camera, Microphone, Calls, Phone State)
        requestAppPermissions();

        // 3. Grant WebRTC Camera & Microphone permissions and inject JavaScript Native Bridge
        configureWebView();

        // 4. Start 24/7 background notification polling sync service & alarm fallback
        NotificationSyncService.start(this);
        NotificationSyncReceiver.schedule(this);

        // 5. Register Telephony Call State Listener
        registerTelephonyListener();
        registerTelecomReceiver();
    }

    private boolean isTelecomReceiverRegistered = false;

    private void registerTelecomReceiver() {
        try {
            if (!isTelecomReceiverRegistered) {
                android.content.IntentFilter filter = new android.content.IntentFilter();
                filter.addAction(com.antigravity.erp.telecom.CrmInCallServiceKt.ACTION_CALL_STATE_CHANGED);
                filter.addAction(com.antigravity.erp.transcription.TranscriptionWorkerKt.ACTION_TRANSCRIPTION_READY);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    registerReceiver(telecomEventReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
                } else {
                    registerReceiver(telecomEventReceiver, filter);
                }
                isTelecomReceiverRegistered = true;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebView();
        NotificationSyncService.start(this);
        NotificationSyncReceiver.schedule(this);
        registerTelephonyListener();
        registerTelecomReceiver();
    }

    @Override
    public void onResume() {
        super.onResume();
        createNotificationChannels();
        configureWebView();
        NotificationSyncService.start(this);
        NotificationSyncReceiver.schedule(this);
        registerTelephonyListener();
        registerTelecomReceiver();
    }

    @Override
    public void onStop() {
        super.onStop();
    }

    @Override
    public void onDestroy() {
        try {
            if (isTelecomReceiverRegistered) {
                unregisterReceiver(telecomEventReceiver);
                isTelecomReceiverRegistered = false;
            }
        } catch (Exception e) {}
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @androidx.annotation.NonNull String[] permissions, @androidx.annotation.NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean callPhoneGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
            if (callPhoneGranted && pendingCallNumber != null && !pendingCallNumber.isEmpty()) {
                String toCall = pendingCallNumber;
                pendingCallNumber = null;
                try {
                    Intent callIntent = new Intent(Intent.ACTION_CALL);
                    callIntent.setData(Uri.parse("tel:" + toCall));
                    callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(callIntent);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    /**
     * Creates high-priority notification channels for incoming CRM alerts and leads
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager == null) return;

            // Channel 1: Real-time CRM Notifications
            NotificationChannel generalChannel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "CRM Alerts & Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            generalChannel.setDescription("Alerts for team updates, reminders, orders, and system messages");
            generalChannel.enableVibration(true);
            generalChannel.enableLights(true);
            generalChannel.setShowBadge(true);
            notificationManager.createNotificationChannel(generalChannel);

            // Channel 2: Urgent Leads & WhatsApp
            NotificationChannel leadsChannel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_LEADS,
                    "New Leads & WhatsApp Messages",
                    NotificationManager.IMPORTANCE_HIGH
            );
            leadsChannel.setDescription("Urgent alerts for new incoming leads and customer chats");
            leadsChannel.enableVibration(true);
            leadsChannel.enableLights(true);
            leadsChannel.setShowBadge(true);
            notificationManager.createNotificationChannel(leadsChannel);
        }
    }

    /**
     * Prompt for Camera, Audio/Mic, and Android 13+ Notification permissions
     */
    public void requestAppPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> permissionsNeeded = new ArrayList<>();

            // Android 13+ (API 33) Notification Permission
            if (Build.VERSION.SDK_INT >= 33) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
                    permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
                }
            }

            // Camera Permission (for QR / Barcode Scanner)
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.CAMERA);
            }

            // Microphone Permission (for Voice AI Assistant & Call Logger)
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.RECORD_AUDIO);
            }

            // Direct Phone Call Permission (for In-App Direct SIM Dialing)
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.CALL_PHONE);
            }

            // Phone State Permission (for Automatic Call Duration Stopwatch & Auto AI Debriefing)
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_PHONE_STATE);
            }

            // External Media / Audio Read Permission (to auto-detect Xiaomi & Android Call Recordings)
            if (Build.VERSION.SDK_INT >= 33) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                    permissionsNeeded.add(Manifest.permission.READ_MEDIA_AUDIO);
                }
            } else {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
                        != PackageManager.PERMISSION_GRANTED) {
                    permissionsNeeded.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                }
            }

            if (!permissionsNeeded.isEmpty()) {
                ActivityCompat.requestPermissions(
                        this,
                        permissionsNeeded.toArray(new String[0]),
                        PERMISSION_REQUEST_CODE
                );
            }
        }
    }

    /**
     * Registers TelephonyManager listener for real-time call connection and termination events
     */
    private void registerTelephonyListener() {
        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
                return;
            }
            if (telephonyManager == null) {
                telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
            }
            if (telephonyManager == null) return;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (telephonyCallback == null) {
                    telephonyCallback = new CustomTelephonyCallback();
                    telephonyManager.registerTelephonyCallback(getMainExecutor(), (TelephonyCallback) telephonyCallback);
                }
            } else {
                if (phoneStateListener == null) {
                    phoneStateListener = new PhoneStateListener() {
                        @Override
                        public void onCallStateChanged(int state, String phoneNumber) {
                            handleCallStateChange(state);
                        }
                    };
                    telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @androidx.annotation.RequiresApi(api = Build.VERSION_CODES.S)
    private class CustomTelephonyCallback extends TelephonyCallback implements TelephonyCallback.CallStateListener {
        @Override
        public void onCallStateChanged(int state) {
            handleCallStateChange(state);
        }
    }

    private void handleCallStateChange(int state) {
        if (state == TelephonyManager.CALL_STATE_OFFHOOK) {
            // Call answered or active
            if (callStartTime == 0) {
                callStartTime = System.currentTimeMillis();
            }
            isCallInProgress = true;
            sendNativeCallEvent("CONNECTED", 0);
        } else if (state == TelephonyManager.CALL_STATE_IDLE) {
            // Call ended / hung up
            if (isCallInProgress || callStartTime > 0) {
                long elapsedMs = callStartTime > 0 ? (System.currentTimeMillis() - callStartTime) : 0;
                int durationSec = (int) Math.max(0, elapsedMs / 1000);
                lastCallDurationSec = durationSec;
                isCallInProgress = false;
                callStartTime = 0;

                final String callIdForTranscription = activeRecordingCallId;
                activeRecordingCallId = null;
                final String phoneForTranscription = (pendingCallNumber != null && !pendingCallNumber.isEmpty()) 
                        ? pendingCallNumber 
                        : (lastDialedNumber != null ? lastDialedNumber : "Unknown");

                // Scan device storage for native Xiaomi / Android call recording
                new Thread(() -> {
                    try {
                        // Scan device storage & MediaStore for native call recording (Xiaomi writes file on call tear-down)
                        String foundAudioUrl = null;
                        for (int retry = 0; retry < 4; retry++) {
                            try { Thread.sleep(600); } catch (Exception e) {}
                            foundAudioUrl = findRecentCallAudioDataUrl(phoneForTranscription);
                            if (foundAudioUrl != null && !foundAudioUrl.isEmpty()) {
                                break;
                            }
                        }

                        if (foundAudioUrl != null && !foundAudioUrl.isEmpty()) {
                            lastRecordedAudioDataUrl = foundAudioUrl;
                            final String finalCallId = callIdForTranscription != null ? callIdForTranscription : ("call_" + System.currentTimeMillis());
                            sendNativeCallEvent("ENDED", durationSec, finalCallId, phoneForTranscription, foundAudioUrl);
                        } else {
                            lastRecordedAudioDataUrl = null;
                            sendNativeCallEvent("ENDED", durationSec, callIdForTranscription, phoneForTranscription, null);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        sendNativeCallEvent("ENDED", durationSec, callIdForTranscription, phoneForTranscription, null);
                    }

                    bringAppToForeground();
                }).start();
            }
        } else if (state == TelephonyManager.CALL_STATE_RINGING) {
            sendNativeCallEvent("RINGING", 0);
        }
    }

    /**
     * Automatically brings the CRM app back to the foreground upon call disconnection
     */
    private void bringAppToForeground() {
        runOnUiThread(() -> {
            try {
                // 1. Direct Activity Intent with Reorder to Front flags
                Intent intent = new Intent(this, MainActivity.class);
                intent.setAction(Intent.ACTION_MAIN);
                intent.addCategory(Intent.CATEGORY_LAUNCHER);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
                startActivity(intent);

                // 2. PendingIntent Execution (bypasses OEM background activity restrictions on Android 10-14)
                int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    piFlags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pendingIntent = PendingIntent.getActivity(this, 999, intent, piFlags);
                try {
                    pendingIntent.send();
                } catch (Exception piEx) {
                    // Handled gracefully
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    private final android.content.BroadcastReceiver telecomEventReceiver = new android.content.BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null) return;
            String action = intent.getAction();
            if (com.antigravity.erp.telecom.CrmInCallServiceKt.ACTION_CALL_STATE_CHANGED.equals(action)) {
                String state = intent.getStringExtra("state");
                int durationSec = intent.getIntExtra("durationSec", 0);
                String callId = intent.getStringExtra("callId");
                String phoneNumber = intent.getStringExtra("phoneNumber");
                sendNativeCallEvent(state != null ? state : "UNKNOWN", durationSec, callId, phoneNumber);
                if ("ENDED".equalsIgnoreCase(state)) {
                    bringAppToForeground();
                }
            } else if (com.antigravity.erp.transcription.TranscriptionWorkerKt.ACTION_TRANSCRIPTION_READY.equals(action)) {
                String callId = intent.getStringExtra("callId");
                String transcriptId = intent.getStringExtra("transcriptId");
                String transcriptText = intent.getStringExtra("transcriptText");
                String summary = intent.getStringExtra("summary");
                String outcome = intent.getStringExtra("outcome");
                sendNativeTranscriptionEvent(callId, transcriptId, transcriptText, summary, outcome);
            }
        }
    };

    /**
     * Broadcasts native call events directly into WebView JavaScript window event bus
     */
    public void sendNativeCallEvent(final String state, final int durationSec) {
        sendNativeCallEvent(state, durationSec, null, null, null);
    }

    public void sendNativeCallEvent(final String state, final int durationSec, final String callId, final String phoneNumber) {
        sendNativeCallEvent(state, durationSec, callId, phoneNumber, null);
    }

    public void sendNativeCallEvent(final String state, final int durationSec, final String callId, final String phoneNumber, final String recordingUrl) {
        runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    org.json.JSONObject detail = new org.json.JSONObject();
                    detail.put("state", state);
                    detail.put("durationSec", durationSec);
                    detail.put("timestamp", System.currentTimeMillis());
                    if (callId != null) detail.put("callId", callId);
                    if (phoneNumber != null) detail.put("phoneNumber", phoneNumber);
                    if (recordingUrl != null && !recordingUrl.isEmpty()) detail.put("recordingUrl", recordingUrl);

                    String script = "window.dispatchEvent(new CustomEvent('native-call-state', { detail: " + detail.toString() + " }));";
                    webView.evaluateJavascript(script, null);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    /**
     * Broadcasts post-call transcription results directly into WebView
     */
    public void sendNativeTranscriptionEvent(final String callId, final String transcriptId, final String text, final String summary, final String outcome) {
        runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    org.json.JSONObject detail = new org.json.JSONObject();
                    detail.put("callId", callId != null ? callId : "");
                    detail.put("transcriptId", transcriptId != null ? transcriptId : "");
                    detail.put("text", text != null ? text : "");
                    detail.put("summary", summary != null ? summary : "");
                    detail.put("outcome", outcome != null ? outcome : "Completed");
                    detail.put("timestamp", System.currentTimeMillis());

                    String script = "window.dispatchEvent(new CustomEvent('native-call-transcription', { detail: " + detail.toString() + " }));";
                    webView.evaluateJavascript(script, null);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    /**
     * Configures WebChromeClient for WebRTC media access and injects AndroidNative JavaScript Bridge
     */
    private void configureWebView() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                // 1. WebRTC Permission handler
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        MainActivity.this.runOnUiThread(() -> {
                            request.grant(request.getResources());
                        });
                    }
                });

                // 2. Inject AndroidNative JavaScript interface
                webView.addJavascriptInterface(new AndroidNativeBridge(this), "AndroidNative");
            }
        } catch (Exception e) {
            // Silently handle if bridge is not ready
        }
    }

    /**
     * JavaScript Bridge class exposed as window.AndroidNative in the WebView
     */
    public static class AndroidNativeBridge {
        private final MainActivity activity;

        public AndroidNativeBridge(MainActivity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public void setUserSession(String userId, String serverUrl) {
            if (userId != null && !userId.isEmpty()) {
                activity.getSharedPreferences(NotificationSyncReceiver.PREFS_NAME, Context.MODE_PRIVATE)
                        .edit()
                        .putString(NotificationSyncReceiver.PREF_USER_ID, userId)
                        .putString(NotificationSyncReceiver.PREF_SERVER_URL, serverUrl != null && !serverUrl.isEmpty() ? serverUrl : NotificationSyncReceiver.DEFAULT_SERVER_URL)
                        .apply();
                NotificationSyncService.start(activity);
                NotificationSyncReceiver.schedule(activity);
            }
        }

        @JavascriptInterface
        public void requestIgnoreBatteryOptimizations() {
            activity.runOnUiThread(() -> {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        Intent intent = new Intent();
                        String packageName = activity.getPackageName();
                        PowerManager pm = (PowerManager) activity.getSystemService(Context.POWER_SERVICE);
                        if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                            intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                            intent.setData(Uri.parse("package:" + packageName));
                            activity.startActivity(intent);
                        }
                    }
                } catch (Exception e) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                        activity.startActivity(intent);
                    } catch (Exception ex) {}
                }
            });
        }

        @JavascriptInterface
        public void requestAllPermissions() {
            activity.runOnUiThread(activity::requestAppPermissions);
        }

        @JavascriptInterface
        public void requestCameraPermission() {
            activity.runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    ActivityCompat.requestPermissions(
                            activity,
                            new String[]{Manifest.permission.CAMERA},
                            PERMISSION_REQUEST_CODE
                    );
                }
            });
        }

        @JavascriptInterface
        public void requestMicrophonePermission() {
            activity.runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    ActivityCompat.requestPermissions(
                            activity,
                            new String[]{Manifest.permission.RECORD_AUDIO},
                            PERMISSION_REQUEST_CODE
                    );
                }
            });
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            activity.runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 33) {
                    ActivityCompat.requestPermissions(
                            activity,
                            new String[]{Manifest.permission.POST_NOTIFICATIONS},
                            PERMISSION_REQUEST_CODE
                    );
                }
            });
        }

        @JavascriptInterface
        public void openAppNotificationSettings() {
            activity.runOnUiThread(() -> {
                try {
                    Intent intent = new Intent();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                        intent.putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
                    } else {
                        intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(Uri.fromParts("package", activity.getPackageName(), null));
                    }
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    activity.startActivity(intent);
                } catch (Exception e) {
                    try {
                        Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        fallback.setData(Uri.fromParts("package", activity.getPackageName(), null));
                        fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(fallback);
                    } catch (Exception ex) {}
                }
            });
        }

        @JavascriptInterface
        public void postNativeNotification(String title, String body, String url) {
            activity.runOnUiThread(() -> {
                try {
                    Intent launchIntent = new Intent(activity, MainActivity.class);
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    if (url != null && !url.isEmpty()) {
                        launchIntent.putExtra("notification_url", url);
                    }

                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags |= PendingIntent.FLAG_IMMUTABLE;
                    }

                    PendingIntent pendingIntent = PendingIntent.getActivity(
                            activity,
                            (int) System.currentTimeMillis(),
                            launchIntent,
                            flags
                    );

                    NotificationCompat.Builder builder = new NotificationCompat.Builder(activity, NOTIFICATION_CHANNEL_ID)
                            .setSmallIcon(R.mipmap.ic_launcher)
                            .setContentTitle(title != null && !title.isEmpty() ? title : "Antigravity ERP")
                            .setContentText(body != null && !body.isEmpty() ? body : "New alert received")
                            .setStyle(new NotificationCompat.BigTextStyle().bigText(body != null ? body : ""))
                            .setPriority(NotificationCompat.PRIORITY_HIGH)
                            .setAutoCancel(true)
                            .setContentIntent(pendingIntent)
                            .setDefaults(NotificationCompat.DEFAULT_ALL);

                    NotificationManagerCompat notificationManager = NotificationManagerCompat.from(activity);
                    if (Build.VERSION.SDK_INT >= 33) {
                        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                            notificationManager.notify(notificationIdCounter++, builder.build());
                        } else {
                            // If not granted, prompt the user for permission
                            ActivityCompat.requestPermissions(
                                    activity,
                                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                                    PERMISSION_REQUEST_CODE
                            );
                        }
                    } else {
                        notificationManager.notify(notificationIdCounter++, builder.build());
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void directPhoneCall(String phoneNumber) {
            directPhoneCallWithSim(phoneNumber, -1);
        }

        @JavascriptInterface
        public void directPhoneCallWithSim(String phoneNumber, int subscriptionId) {
            activity.runOnUiThread(() -> {
                try {
                    if (phoneNumber == null || phoneNumber.trim().isEmpty()) return;
                    String clean = phoneNumber.replaceAll("[^0-9+]", "");
                    if (clean.isEmpty()) return;

                    // Initialize call timer state in Java
                    activity.callStartTime = System.currentTimeMillis();
                    activity.isCallInProgress = true;
                    activity.lastCallDurationSec = 0;
                    activity.pendingCallNumber = clean;
                    activity.lastDialedNumber = clean;
                    if (activity.activeRecordingCallId == null) {
                        activity.activeRecordingCallId = "call_" + System.currentTimeMillis();
                    }

                    // If CALL_PHONE permission is granted, place call using SimManager
                    if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                        com.antigravity.erp.telecom.SimManager simManager = new com.antigravity.erp.telecom.SimManager(activity);
                        simManager.placeCallWithSim(clean, subscriptionId);
                    } else {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            ActivityCompat.requestPermissions(
                                    activity,
                                    new String[]{Manifest.permission.CALL_PHONE, Manifest.permission.READ_PHONE_STATE},
                                    PERMISSION_REQUEST_CODE
                            );
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public String getAvailableSims() {
            try {
                com.antigravity.erp.telecom.SimManager simManager = new com.antigravity.erp.telecom.SimManager(activity);
                return simManager.getActiveSimsJson();
            } catch (Throwable t) {
                t.printStackTrace();
                return "[]";
            }
        }

        @JavascriptInterface
        public String getCallRecordingCapability() {
            try {
                com.antigravity.erp.audio.CallRecordingCapabilityChecker checker = new com.antigravity.erp.audio.CallRecordingCapabilityChecker(activity);
                return checker.evaluateCapability().toJson().toString();
            } catch (Throwable t) {
                t.printStackTrace();
                return "{}";
            }
        }

        @JavascriptInterface
        public boolean isDefaultDialer() {
            try {
                com.antigravity.erp.telecom.DefaultDialerManager ddm = new com.antigravity.erp.telecom.DefaultDialerManager(activity);
                return ddm.isDefaultDialer();
            } catch (Throwable t) {
                return false;
            }
        }

        @JavascriptInterface
        public void requestDefaultDialer() {
            activity.runOnUiThread(() -> {
                try {
                    com.antigravity.erp.telecom.DefaultDialerManager ddm = new com.antigravity.erp.telecom.DefaultDialerManager(activity);
                    ddm.requestDefaultDialerRole(activity);
                } catch (Throwable t) {
                    t.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public int getLastCallDuration() {
            return activity.lastCallDurationSec;
        }

        @JavascriptInterface
        public boolean isCallActive() {
            return activity.isCallInProgress;
        }

        @JavascriptInterface
        public boolean startCallRecording(String callId) {
            final String idToUse = (callId != null && !callId.trim().isEmpty()) ? callId : ("call_" + System.currentTimeMillis());
            activity.activeRecordingCallId = idToUse;
            return true;
        }

        @JavascriptInterface
        public String stopCallRecording() {
            try {
                final String callId = activity.activeRecordingCallId != null ? activity.activeRecordingCallId : ("call_" + System.currentTimeMillis());
                final String phone = (activity.pendingCallNumber != null && !activity.pendingCallNumber.isEmpty()) ? activity.pendingCallNumber : activity.lastDialedNumber;
                activity.activeRecordingCallId = null;

                java.io.File file = activity.findRecentCallAudioFile(phone);
                org.json.JSONObject result = new org.json.JSONObject();
                if (file != null && file.exists() && file.length() > 2048) {
                    result.put("success", true);
                    result.put("filePath", file.getAbsolutePath());
                    result.put("callId", callId);

                    final String aPath = file.getAbsolutePath();
                    final int durationSec = activity.lastCallDurationSec;
                    new Thread(() -> {
                        try {
                            com.antigravity.erp.transcription.TranscriptionWorker.Companion.enqueue(
                                activity.getApplicationContext(),
                                callId,
                                aPath,
                                phone != null ? phone : "Unknown",
                                durationSec
                            );
                        } catch (Exception ex) {
                            ex.printStackTrace();
                        }
                    }).start();
                } else {
                    result.put("success", false);
                    result.put("error", "No native call recording found on device");
                }
                return result.toString();
            } catch (Throwable t) {
                t.printStackTrace();
                return "{\"success\": false, \"error\": \"" + t.getMessage() + "\"}";
            }
        }

        @JavascriptInterface
        public String getLastCallRecording() {
            return getLastCallRecording("");
        }

        @JavascriptInterface
        public String getLastCallRecording(String phoneNumber) {
            try {
                String phone = (phoneNumber != null && !phoneNumber.trim().isEmpty()) 
                        ? phoneNumber 
                        : ((activity.pendingCallNumber != null && !activity.pendingCallNumber.isEmpty()) ? activity.pendingCallNumber : activity.lastDialedNumber);
                String dataUrl = activity.findRecentCallAudioDataUrl(phone);
                if (dataUrl != null && !dataUrl.isEmpty()) {
                    activity.lastRecordedAudioDataUrl = dataUrl;
                    return dataUrl;
                }
            } catch (Throwable t) {
                t.printStackTrace();
            }
            return activity.lastRecordedAudioDataUrl != null ? activity.lastRecordedAudioDataUrl : "";
        }

        @JavascriptInterface
        public boolean hasAllFilesPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                return android.os.Environment.isExternalStorageManager();
            }
            return true;
        }

        @JavascriptInterface
        public void requestAllFilesPermission() {
            activity.runOnUiThread(() -> {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                        intent.setData(Uri.parse("package:" + activity.getPackageName()));
                        activity.startActivity(intent);
                    }
                } catch (Exception e) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                        activity.startActivity(intent);
                    } catch (Exception ex) {}
                }
            });
        }
    }
}
