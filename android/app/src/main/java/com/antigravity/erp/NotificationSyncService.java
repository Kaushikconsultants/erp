package com.antigravity.erp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * High-Reliability Native Android Background Sync Service
 * Keeps running continuously in the background (even when app is closed / killed from recents)
 * to deliver real-time lead alerts, WhatsApp messages, and reminders instantly.
 */
public class NotificationSyncService extends Service {

    public static final String SYNC_CHANNEL_ID = "crm_sync_service";
    private static final int FOREGROUND_SERVICE_ID = 1001;
    private static int notificationIdCounter = 3000;

    private ScheduledExecutorService scheduler;
    private boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createSyncNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!isRunning) {
            isRunning = true;

            // 1. Promote to Foreground Service so Android never kills this process
            try {
                Notification foregroundNotification = buildForegroundNotification();
                startForeground(FOREGROUND_SERVICE_ID, foregroundNotification);
            } catch (Exception e) {
                e.printStackTrace();
            }

            // 2. Start high-frequency background polling (every 15 seconds)
            startPollingScheduler();
        }

        return START_STICKY; // Automatically restart if killed by OS memory pressure
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }
        // Restart service immediately to maintain 24/7 background alerts
        try {
            Intent restartIntent = new Intent(getApplicationContext(), NotificationSyncService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(restartIntent);
            } else {
                startService(restartIntent);
            }
        } catch (Exception e) {}
        super.onDestroy();
    }

    /**
     * Creates low-importance channel for the silent background sync status
     */
    private void createSyncNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                        SYNC_CHANNEL_ID,
                        "Real-Time Alert Sync Service",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Keeps real-time lead alerts and push notifications connected in background");
                channel.setShowBadge(false);
                nm.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Builds silent status notification required for Android Foreground Services
     */
    private Notification buildForegroundNotification() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                flags
        );

        return new NotificationCompat.Builder(this, SYNC_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Antigravity ERP • Active")
                .setContentText("Real-time lead alerts & CRM notifications active")
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setSilent(true)
                .build();
    }

    /**
     * Poll the CRM API every 15 seconds in background
     */
    private void startPollingScheduler() {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }

        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleWithFixedDelay(() -> {
            try {
                pollServerForNewNotifications();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, 2, 15, TimeUnit.SECONDS);
    }

    /**
     * Fetch unread notifications from CRM server and dispatch native alerts
     */
    private void pollServerForNewNotifications() {
        SharedPreferences prefs = getSharedPreferences(NotificationSyncReceiver.PREFS_NAME, Context.MODE_PRIVATE);
        String userId = prefs.getString(NotificationSyncReceiver.PREF_USER_ID, null);
        String serverUrl = prefs.getString(NotificationSyncReceiver.PREF_SERVER_URL, NotificationSyncReceiver.DEFAULT_SERVER_URL);
        long lastPollTime = prefs.getLong(NotificationSyncReceiver.PREF_LAST_POLL_TIME, 0);

        if (userId == null || userId.trim().isEmpty()) {
            return; // User has not logged in yet
        }

        HttpURLConnection conn = null;
        BufferedReader reader = null;
        try {
            String queryUrl = serverUrl + "/api/notifications/poll?userId=" + userId;
            if (lastPollTime > 0) {
                queryUrl += "&since=" + lastPollTime;
            }

            URL url = new URL(queryUrl);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(10000);
            conn.setRequestProperty("User-Agent", "AntigravityERP-NativeBackgroundService");

            int responseCode = conn.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }

                JSONObject json = new JSONObject(response.toString());
                if (json.optBoolean("success", false)) {
                    JSONArray notifications = json.optJSONArray("notifications");
                    if (notifications != null && notifications.length() > 0) {
                        String seenIds = prefs.getString(NotificationSyncReceiver.PREF_SEEN_IDS, "");

                        for (int i = 0; i < notifications.length(); i++) {
                            JSONObject notif = notifications.getJSONObject(i);
                            String notifId = notif.optString("id", "");
                            if (seenIds.contains(notifId)) {
                                continue; // Already shown
                            }

                            String title = notif.optString("title", "Antigravity ERP");
                            String message = notif.optString("message", "New CRM alert received");
                            String notifType = notif.optString("type", "System");
                            String link = notif.optString("link", "/leads");

                            // Post genuine high-priority alert to notification drawer
                            dispatchHighPriorityAlert(notifId, title, message, notifType, link);

                            // Mark as seen
                            seenIds = notifId + "," + seenIds;
                            if (seenIds.length() > 2000) {
                                seenIds = seenIds.substring(0, 1000);
                            }
                        }

                        prefs.edit()
                                .putString(NotificationSyncReceiver.PREF_SEEN_IDS, seenIds)
                                .putLong(NotificationSyncReceiver.PREF_LAST_POLL_TIME, System.currentTimeMillis())
                                .apply();
                    } else {
                        prefs.edit()
                                .putLong(NotificationSyncReceiver.PREF_LAST_POLL_TIME, System.currentTimeMillis())
                                .apply();
                    }
                }
            }
        } catch (Exception e) {
            // Background network fail (offline or reconnecting)
        } finally {
            if (reader != null) {
                try { reader.close(); } catch (Exception e) {}
            }
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    /**
     * Dispatch high-importance status bar notification with sound, vibration, and banner
     */
    private void dispatchHighPriorityAlert(String notifId, String title, String message, String type, String linkUrl) {
        try {
            String channelId = "crm_leads".equalsIgnoreCase(type) || "lead".equalsIgnoreCase(type)
                    ? MainActivity.NOTIFICATION_CHANNEL_LEADS
                    : MainActivity.NOTIFICATION_CHANNEL_ID;

            Intent launchIntent = new Intent(this, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            if (linkUrl != null && !linkUrl.isEmpty()) {
                launchIntent.putExtra("notification_url", linkUrl);
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    notifId.hashCode(),
                    launchIntent,
                    flags
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent)
                    .setDefaults(NotificationCompat.DEFAULT_ALL);

            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
            if (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                notificationManager.notify(notificationIdCounter++, builder.build());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Helper to start the background service safely across all Android versions
     */
    public static void start(Context context) {
        try {
            Intent intent = new Intent(context, NotificationSyncService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
