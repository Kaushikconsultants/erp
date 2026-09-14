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
    public String lastContactName = null;
    public String activeRecordingCallId = null;
    public String lastRecordedAudioDataUrl = null;
    public String launchNotificationUrl = null;
    private boolean isBridgeConfigured = false;

    public String findRecentCallAudioDataUrl(String phoneNumber) {
        return findRecentCallAudioDataUrl(phoneNumber, lastContactName, lastCallDurationSec);
    }

    public String findRecentCallAudioDataUrl(String phoneNumber, String contactName, int callDurationSec) {
        String cleanPhone = (phoneNumber != null) ? phoneNumber.replaceAll("[^0-9]", "") : "";
        if (cleanPhone.isEmpty() && lastDialedNumber != null) {
            cleanPhone = lastDialedNumber.replaceAll("[^0-9]", "");
        }
        String phone10 = (cleanPhone.length() == 12 && cleanPhone.startsWith("91")) ? cleanPhone.substring(2) : cleanPhone;

        String rawName = (contactName != null && !contactName.trim().isEmpty()) ? contactName : (lastContactName != null ? lastContactName : "");
        String cleanName = rawName.toLowerCase().replaceAll("[^a-z0-9 ]", " ").trim();
        String firstWordName = "";
        if (!cleanName.isEmpty()) {
            String[] parts = cleanName.split("\\s+");
            if (parts.length > 0 && parts[0].length() >= 3) {
                firstWordName = parts[0];
            }
        }

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

        // 1. First, check direct filesystem (primary when MANAGE_EXTERNAL_STORAGE is granted or public directories readable)
        try {
            java.io.File directFile = findRecentCallAudioFile(cleanPhone, cleanName, firstWordName, callDurationSec);
            if (directFile != null && directFile.exists() && directFile.length() > 2048) {
                int exactAudioSec = getAudioFileDurationSec(directFile);
                if (exactAudioSec > 0) {
                    lastCallDurationSec = exactAudioSec;
                }
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
                    android.provider.MediaStore.Audio.Media.DATA,
                    android.provider.MediaStore.Audio.Media.DURATION
            };

            // Calculate strict time boundary
            long nowMs = System.currentTimeMillis();
            long minTimeSec = (callStartTime > 0)
                    ? ((callStartTime - 60_000L) / 1000L)
                    : ((nowMs - (10 * 60 * 1000L)) / 1000L); // Max 10 minutes ago for manual scan

            String selection = android.provider.MediaStore.Audio.Media.SIZE + " > 2048 AND (" 
                    + android.provider.MediaStore.Audio.Media.DATE_MODIFIED + " >= " + minTimeSec + " OR " 
                    + android.provider.MediaStore.Audio.Media.DATE_ADDED + " >= " + minTimeSec + ")";
            String sortOrder = android.provider.MediaStore.Audio.Media.DATE_MODIFIED + " DESC, " 
                             + android.provider.MediaStore.Audio.Media.DATE_ADDED + " DESC";

            try (android.database.Cursor cursor = cr.query(uri, projection, selection, null, sortOrder)) {
                if (cursor != null) {
                    long bestId = -1;
                    String bestMime = "audio/mpeg";
                    long bestSize = 0;
                    long bestDurationMs = 0;
                    int count = 0;

                    while (cursor.moveToNext() && count < 30) {
                        count++;
                        long id = cursor.getLong(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Audio.Media._ID));
                        String name = cursor.getString(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Audio.Media.DISPLAY_NAME));
                        String title = cursor.getString(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Audio.Media.TITLE));
                        String mime = cursor.getString(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Audio.Media.MIME_TYPE));
                        long size = cursor.getLong(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Audio.Media.SIZE));
                        long durationMs = 0;
                        try {
                            int durIdx = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.DURATION);
                            if (durIdx >= 0) durationMs = cursor.getLong(durIdx);
                        } catch (Throwable t) {}

                        String dataPath = "";
                        try {
                            int dataIdx = cursor.getColumnIndex(android.provider.MediaStore.Audio.Media.DATA);
                            if (dataIdx >= 0) dataPath = cursor.getString(dataIdx);
                        } catch (Throwable t) {}

                        String combined = ((name != null ? name : "") + " " + (title != null ? title : "") + " " + (dataPath != null ? dataPath : "")).toLowerCase();

                        // Duration sanity check: if callDurationSec is known and > 5s, reject recordings > 3x the call duration
                        if (callDurationSec > 5 && durationMs > 0) {
                            long durSec = durationMs / 1000L;
                            if (durSec > (callDurationSec + 90) || (durSec > 90 && callDurationSec < 30)) {
                                continue; // Reject files with huge duration mismatch
                            }
                        }

                        // Priority 1: Phone number match
                        boolean phoneMatch = (!cleanPhone.isEmpty() && cleanPhone.length() >= 3 && combined.contains(cleanPhone))
                                || (!phone10.isEmpty() && phone10.length() >= 5 && combined.contains(phone10));

                        // Priority 2: Contact name match
                        boolean nameMatch = (!cleanName.isEmpty() && cleanName.length() >= 3 && combined.contains(cleanName))
                                || (!firstWordName.isEmpty() && firstWordName.length() >= 3 && combined.contains(firstWordName));

                        if (phoneMatch || nameMatch) {
                            bestId = id;
                            bestMime = mime;
                            bestSize = size;
                            bestDurationMs = durationMs;
                            break;
                        }

                        // Priority 3: File recorded strictly in call window in a call-recording path
                        boolean isCallRecordingPath = combined.contains("call") || combined.contains("rec") || combined.contains("sound_recorder");
                        if (isCallRecordingPath && callStartTime > 0 && bestId == -1) {
                            bestId = id;
                            bestMime = mime;
                            bestSize = size;
                            bestDurationMs = durationMs;
                        }
                    }

                    if (bestId != -1) {
                        if (bestDurationMs > 0) {
                            int exactSec = (int) Math.round(bestDurationMs / 1000.0);
                            if (exactSec > 0) {
                                lastCallDurationSec = exactSec;
                            }
                        }
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
            String mime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "audio/mpeg";
            if (mime.equals("audio/mp3")) mime = "audio/mpeg";
            return "data:" + mime + ";base64," + b64;
        } catch (Throwable t) {
            t.printStackTrace();
            return null;
        }
    }

    public int getAudioFileDurationSec(java.io.File file) {
        if (file == null || !file.exists()) return 0;
        android.media.MediaMetadataRetriever mmr = new android.media.MediaMetadataRetriever();
        try {
            mmr.setDataSource(file.getAbsolutePath());
            String durStr = mmr.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION);
            if (durStr != null) {
                long ms = Long.parseLong(durStr);
                return (int) Math.round(ms / 1000.0);
            }
        } catch (Throwable t) {
            // Ignored
        } finally {
            try { mmr.release(); } catch (Throwable t) {}
        }
        return 0;
    }

    public java.io.File findRecentCallAudioFile(String cleanPhone, String cleanName, String firstWordName, int callDurationSec) {
        long nowMs = System.currentTimeMillis();
        long minAllowedTime = (callStartTime > 0)
                ? (callStartTime - 60_000L) // strictly during this call
                : (nowMs - (10 * 60 * 1000L)); // max 10 min for manual scan

        java.io.File bestFile = null;
        long latestMod = 0;

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
                                    long fMod = f.lastModified();

                                    // Strictly reject any file created before minAllowedTime
                                    if (fMod < minAllowedTime) {
                                        continue;
                                    }

                                    // File size sanity check: for short calls (<45s), reject large files (>1.5MB)
                                    if (callDurationSec > 0 && callDurationSec < 45 && f.length() > (1500 * 1024)) {
                                        continue;
                                    }

                                    // 1. Exact phone number match in filename
                                    boolean phoneMatch = (!cleanPhone.isEmpty() && cleanPhone.length() >= 3 && name.contains(cleanPhone))
                                            || (!phone10.isEmpty() && phone10.length() >= 5 && name.contains(phone10));

                                    // 2. Contact name match in filename
                                    boolean nameMatch = (!cleanName.isEmpty() && cleanName.length() >= 3 && name.contains(cleanName))
                                            || (!firstWordName.isEmpty() && firstWordName.length() >= 3 && name.contains(firstWordName));

                                    if (phoneMatch || nameMatch) {
                                        return f; // Direct high-confidence match!
                                    }

                                    // 3. Fallback: file created strictly during this active call in dedicated recording folder
                                    if (callStartTime > 0 && fMod >= (callStartTime - 30_000L) && fMod > latestMod) {
                                        latestMod = fMod;
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

    public java.io.File findRecentCallAudioFile(String phoneNumber) {
        return findRecentCallAudioFile(phoneNumber, lastContactName, "", lastCallDurationSec);
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

        // 1. Process notification deep links and incoming dial intents
        handleNotificationIntent(getIntent());
        handleDialIntent(getIntent());

        // 2. Create Default & Leads Notification Channels (Unlocks notification toggles on Android 8+)
        createNotificationChannels();

        // 3. Request Essential Runtime Permissions on Launch (Notifications, Camera, Microphone, Calls, Phone State)
        requestAppPermissions();

        // 4. Grant WebRTC Camera & Microphone permissions and inject JavaScript Native Bridge
        configureWebView();

        // 5. Start 24/7 background notification polling sync service & alarm fallback
        NotificationSyncService.start(this);
        NotificationSyncReceiver.schedule(this);

        // 6. Register Telephony Call State Listener
        registerTelephonyListener();
        registerTelecomReceiver();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNotificationIntent(intent);
        handleDialIntent(intent);
    }

    private void handleDialIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_DIAL.equals(action) || Intent.ACTION_VIEW.equals(action)) {
            Uri data = intent.getData();
            if (data != null && "tel".equalsIgnoreCase(data.getScheme())) {
                String phone = data.getSchemeSpecificPart();
                if (phone != null && !phone.trim().isEmpty()) {
                    runOnUiThread(() -> {
                        try {
                            WebView webView = getBridge().getWebView();
                            if (webView != null) {
                                org.json.JSONObject detail = new org.json.JSONObject();
                                detail.put("phone", phone.trim());
                                String script = "window.dispatchEvent(new CustomEvent('open-phone-dialer', { detail: " + detail.toString() + " }));";
                                webView.evaluateJavascript(script, null);
                            }
                        } catch (Exception e) {}
                    });
                }
            }
        }
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent != null && intent.hasExtra("notification_url")) {
            String url = intent.getStringExtra("notification_url");
            if (url != null && !url.trim().isEmpty()) {
                launchNotificationUrl = url;
                runOnUiThread(() -> {
                    try {
                        WebView webView = getBridge().getWebView();
                        if (webView != null) {
                            org.json.JSONObject detail = new org.json.JSONObject();
                            detail.put("url", url);
                            String script = "window.dispatchEvent(new CustomEvent('native-notification-open', { detail: " + detail.toString() + " }));";
                            webView.evaluateJavascript(script, null);
                        }
                    } catch (Exception e) {}
                });
            }
        }
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
                    com.antigravity.erp.telecom.SimManager simManager = new com.antigravity.erp.telecom.SimManager(this);
                    simManager.placeCallWithSim(toCall, -1, -1);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            boolean contactsGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;
            boolean phoneStateGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED;
            if (contactsGranted || callPhoneGranted || phoneStateGranted) {
                runOnUiThread(() -> {
                    try {
                        WebView webView = getBridge().getWebView();
                        if (webView != null) {
                            if (contactsGranted) {
                                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('native-contacts-permission-granted'));", null);
                            }
                            webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('native-telephony-permission-granted'));", null);
                        }
                    } catch (Exception e) {}
                });
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

            // Call Log Permission (for accurate cellular call duration & connection verification)
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_CALL_LOG);
            }

            // Contacts Permission (for syncing and displaying phone contacts in dialer)
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.READ_CONTACTS);
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

    private int getExactDurationFromCallLog(String phoneNumber) {
        try {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CALL_LOG) == PackageManager.PERMISSION_GRANTED) {
                String cleanTarget = (phoneNumber != null) ? phoneNumber.replaceAll("[^0-9]", "") : "";
                String last10Target = cleanTarget.length() >= 10 ? cleanTarget.substring(cleanTarget.length() - 10) : cleanTarget;

                android.database.Cursor cursor = getContentResolver().query(
                    android.provider.CallLog.Calls.CONTENT_URI,
                    new String[]{
                        android.provider.CallLog.Calls.DURATION,
                        android.provider.CallLog.Calls.TYPE,
                        android.provider.CallLog.Calls.NUMBER,
                        android.provider.CallLog.Calls.DATE
                    },
                    null,
                    null,
                    android.provider.CallLog.Calls.DATE + " DESC"
                );

                if (cursor != null) {
                    try {
                        long now = System.currentTimeMillis();
                        int checked = 0;
                        int numberCol = cursor.getColumnIndex(android.provider.CallLog.Calls.NUMBER);
                        int durationCol = cursor.getColumnIndex(android.provider.CallLog.Calls.DURATION);
                        int typeCol = cursor.getColumnIndex(android.provider.CallLog.Calls.TYPE);
                        int dateCol = cursor.getColumnIndex(android.provider.CallLog.Calls.DATE);

                        while (cursor.moveToNext() && checked < 10) {
                            checked++;
                            long callDate = (dateCol >= 0) ? cursor.getLong(dateCol) : 0;
                            // Only check calls within the last 5 minutes
                            if (callDate > 0 && (now - callDate) > 300000) {
                                break;
                            }

                            String num = (numberCol >= 0) ? cursor.getString(numberCol) : "";
                            long dur = (durationCol >= 0) ? cursor.getLong(durationCol) : 0;
                            int type = (typeCol >= 0) ? cursor.getInt(typeCol) : 0;

                            String cleanNum = (num != null) ? num.replaceAll("[^0-9]", "") : "";
                            boolean matchesPhone = last10Target.isEmpty() || cleanNum.endsWith(last10Target) || (last10Target.length() >= 7 && cleanNum.contains(last10Target));

                            if (matchesPhone) {
                                android.util.Log.d("MainActivity", "CallLog match: dur=" + dur + " type=" + type);
                                if (type == android.provider.CallLog.Calls.MISSED_TYPE ||
                                    type == android.provider.CallLog.Calls.REJECTED_TYPE ||
                                    type == android.provider.CallLog.Calls.BLOCKED_TYPE ||
                                    dur == 0) {
                                    return 0;
                                }
                                return (int) dur;
                            }
                        }
                    } finally {
                        cursor.close();
                    }
                }
            }
        } catch (Exception e) {
            android.util.Log.w("MainActivity", "Error reading CallLog: " + e.getMessage());
        }
        return -1;
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

                final String callIdForTranscription = activeRecordingCallId;
                activeRecordingCallId = null;
                final String phoneForTranscription = (pendingCallNumber != null && !pendingCallNumber.isEmpty()) 
                        ? pendingCallNumber 
                        : (lastDialedNumber != null ? lastDialedNumber : "Unknown");
                final String contactNameForTranscription = lastContactName;

                // Query Android CallLog for actual carrier talk duration (which is strictly 0 for unconnected/missed/rejected calls)
                int exactCallLogDur = getExactDurationFromCallLog(phoneForTranscription);
                if (exactCallLogDur >= 0) {
                    durationSec = exactCallLogDur;
                }

                final long actualCallStart = (callStartTime > 0) ? callStartTime : (System.currentTimeMillis() - (durationSec * 1000L));
                lastCallDurationSec = durationSec;
                isCallInProgress = false;
                callStartTime = actualCallStart;
                final int finalDurationSec = durationSec;

                // Scan device storage for native Xiaomi / Android call recording
                new Thread(() -> {
                    try {
                        // Scan device storage & MediaStore for native call recording (Xiaomi writes file on call tear-down)
                        String foundAudioUrl = null;
                        for (int retry = 0; retry < 5; retry++) {
                            try { Thread.sleep(700); } catch (Exception e) {}
                            foundAudioUrl = findRecentCallAudioDataUrl(phoneForTranscription, contactNameForTranscription, finalDurationSec);
                            if (foundAudioUrl != null && !foundAudioUrl.isEmpty()) {
                                break;
                            }
                        }

                        if (foundAudioUrl != null && !foundAudioUrl.isEmpty()) {
                            lastRecordedAudioDataUrl = foundAudioUrl;
                            final String finalCallId = callIdForTranscription != null ? callIdForTranscription : ("call_" + System.currentTimeMillis());
                            int finalReportedDur = (lastCallDurationSec > 0) ? lastCallDurationSec : finalDurationSec;
                            sendNativeCallEvent("ENDED", finalReportedDur, finalCallId, phoneForTranscription, foundAudioUrl);
                        } else {
                            lastRecordedAudioDataUrl = null;
                            sendNativeCallEvent("ENDED", finalDurationSec, callIdForTranscription, phoneForTranscription, null);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        sendNativeCallEvent("ENDED", finalDurationSec, callIdForTranscription, phoneForTranscription, null);
                    } finally {
                        callStartTime = 0;
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
     * Injects AndroidNative JavaScript Bridge into WebView without overriding Capacitor's BridgeWebChromeClient
     */
    private void configureWebView() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null && !isBridgeConfigured) {
                webView.addJavascriptInterface(new AndroidNativeBridge(this), "AndroidNative");
                isBridgeConfigured = true;
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
        public String getLaunchNotificationUrl() {
            return activity.launchNotificationUrl != null ? activity.launchNotificationUrl : "";
        }

        @JavascriptInterface
        public void clearLaunchNotificationUrl() {
            activity.launchNotificationUrl = null;
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
        public boolean hasContactsPermission() {
            return ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public boolean hasPhoneCallPermission() {
            return ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public boolean hasPhoneStatePermission() {
            return ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED;
        }

        @JavascriptInterface
        public void requestContactsPermission() {
            activity.runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    ActivityCompat.requestPermissions(
                            activity,
                            new String[]{Manifest.permission.READ_CONTACTS},
                            PERMISSION_REQUEST_CODE
                    );
                }
            });
        }

        @JavascriptInterface
        public String getDeviceContacts(String searchQuery) {
            org.json.JSONArray list = new org.json.JSONArray();
            try {
                if (ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
                    requestContactsPermission();
                    return "[]";
                }
                android.content.ContentResolver cr = activity.getContentResolver();
                android.net.Uri uri = android.provider.ContactsContract.CommonDataKinds.Phone.CONTENT_URI;
                String selection = null;
                String[] selectionArgs = null;

                boolean hasFilter = (searchQuery != null && !searchQuery.trim().isEmpty());
                if (hasFilter) {
                    try {
                        uri = android.net.Uri.withAppendedPath(
                            android.provider.ContactsContract.CommonDataKinds.Phone.CONTENT_FILTER_URI,
                            android.net.Uri.encode(searchQuery.trim())
                        );
                    } catch (Exception e) {
                        uri = android.provider.ContactsContract.CommonDataKinds.Phone.CONTENT_URI;
                        selection = android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ? OR " +
                                    android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER + " LIKE ?";
                        String param = "%" + searchQuery.trim() + "%";
                        selectionArgs = new String[]{param, param};
                    }
                }

                android.database.Cursor cursor = null;
                // Strategy 1: Standard query with projection and sort order
                try {
                    String sortOrder = android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC";
                    cursor = cr.query(
                        uri,
                        new String[]{
                            android.provider.ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                            android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                            android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER
                        },
                        selection,
                        selectionArgs,
                        sortOrder
                    );
                } catch (Throwable t) {
                    android.util.Log.w("MainActivity", "cr.query with sortOrder failed, attempting fallback query", t);
                }

                // Strategy 2: Query without sort order if Strategy 1 failed
                if (cursor == null) {
                    try {
                        cursor = cr.query(
                            uri,
                            null,
                            selection,
                            selectionArgs,
                            null
                        );
                    } catch (Throwable t) {
                        android.util.Log.e("MainActivity", "cr.query fallback failed", t);
                    }
                }

                // Strategy 3: Direct LIKE query on base CONTENT_URI if filter returned no cursor
                if (cursor == null && hasFilter) {
                    try {
                        uri = android.provider.ContactsContract.CommonDataKinds.Phone.CONTENT_URI;
                        selection = android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ? OR " +
                                    android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER + " LIKE ?";
                        String param = "%" + searchQuery.trim() + "%";
                        selectionArgs = new String[]{param, param};
                        cursor = cr.query(uri, null, selection, selectionArgs, null);
                    } catch (Throwable t) {}
                }

                if (cursor != null) {
                    try {
                        java.util.Set<String> seen = new java.util.HashSet<>();
                        int nameIdx = cursor.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                        if (nameIdx < 0) nameIdx = cursor.getColumnIndex("display_name_primary");
                        if (nameIdx < 0) nameIdx = cursor.getColumnIndex("display_name_alt");
                        if (nameIdx < 0) nameIdx = cursor.getColumnIndex("name");

                        int numIdx = cursor.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER);
                        if (numIdx < 0) numIdx = cursor.getColumnIndex("data1");
                        if (numIdx < 0) numIdx = cursor.getColumnIndex("data4");

                        int idIdx = cursor.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.CONTACT_ID);
                        if (idIdx < 0) idIdx = cursor.getColumnIndex("contact_id");
                        if (idIdx < 0) idIdx = cursor.getColumnIndex("_id");

                        while (cursor.moveToNext() && list.length() < 10000) {
                            String name = (nameIdx >= 0) ? cursor.getString(nameIdx) : null;
                            String number = (numIdx >= 0) ? cursor.getString(numIdx) : null;
                            String contactId = (idIdx >= 0) ? cursor.getString(idIdx) : String.valueOf(list.length());

                            if (number == null || number.trim().isEmpty()) continue;
                            String clean = number.replaceAll("[^0-9+]", "");
                            if (clean.isEmpty() || clean.length() < 5) continue;
                            String key = (name != null ? name.trim().toLowerCase() : "") + "_" + clean;
                            if (seen.contains(key)) continue;
                            seen.add(key);

                            String resolvedName = (name != null && !name.trim().isEmpty()) ? name.trim() : number;

                            org.json.JSONObject obj = new org.json.JSONObject();
                            obj.put("id", "device_" + contactId + "_" + clean);
                            obj.put("contactPerson", resolvedName);
                            obj.put("companyName", resolvedName);
                            obj.put("name", resolvedName);
                            obj.put("phone", number);
                            obj.put("type", "DeviceContact");
                            list.put(obj);
                        }
                    } finally {
                        cursor.close();
                    }
                }
                android.util.Log.d("MainActivity", "getDeviceContacts loaded: " + list.length() + " contacts");
            } catch (Exception e) {
                android.util.Log.e("MainActivity", "getDeviceContacts error", e);
            }
            return list.toString();
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
        public void directPhoneCallWithContact(String phoneNumber, String contactName, int subscriptionId) {
            directPhoneCallWithContactAndSlot(phoneNumber, contactName, subscriptionId, -1);
        }

        @JavascriptInterface
        public void directPhoneCallWithContactAndSlot(String phoneNumber, String contactName, int subscriptionId, int slotIndex) {
            activity.lastContactName = contactName;
            activity.runOnUiThread(() -> {
                try {
                    if (phoneNumber == null || phoneNumber.trim().isEmpty()) return;
                    String clean = phoneNumber.replaceAll("[^0-9+]", "");
                    if (clean.isEmpty()) return;

                    // Initialize call timer state in Java and reset previous audio
                    activity.lastRecordedAudioDataUrl = null;
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
                        simManager.placeCallWithSim(clean, subscriptionId, slotIndex);
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
        public void directPhoneCallWithSim(String phoneNumber, int subscriptionId) {
            directPhoneCallWithContactAndSlot(phoneNumber, activity.lastContactName != null ? activity.lastContactName : "", subscriptionId, -1);
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
            return getLastCallRecording("", "", 0);
        }

        @JavascriptInterface
        public String getLastCallRecording(String phoneNumber) {
            return getLastCallRecording(phoneNumber, "", 0);
        }

        @JavascriptInterface
        public String getLastCallRecording(String phoneNumber, String contactName) {
            return getLastCallRecording(phoneNumber, contactName, 0);
        }

        @JavascriptInterface
        public String getLastCallRecording(String phoneNumber, String contactName, int durationSec) {
            try {
                String phone = (phoneNumber != null && !phoneNumber.trim().isEmpty()) 
                        ? phoneNumber 
                        : ((activity.pendingCallNumber != null && !activity.pendingCallNumber.isEmpty()) ? activity.pendingCallNumber : activity.lastDialedNumber);
                String name = (contactName != null && !contactName.trim().isEmpty())
                        ? contactName
                        : activity.lastContactName;
                int dur = (durationSec > 0) ? durationSec : activity.lastCallDurationSec;

                String dataUrl = activity.findRecentCallAudioDataUrl(phone, name, dur);
                if (dataUrl != null && !dataUrl.isEmpty()) {
                    activity.lastRecordedAudioDataUrl = dataUrl;
                    return dataUrl;
                }
            } catch (Throwable t) {
                t.printStackTrace();
            }
            return ""; // NEVER return stale audio from previous calls
        }

        @JavascriptInterface
        public void clearLastCallRecording() {
            activity.lastRecordedAudioDataUrl = null;
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
