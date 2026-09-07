package com.antigravity.erp;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.SystemClock;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Native Android background notification receiver that polls the CRM server
 * and displays instant status-bar notifications even when the app is completely closed.
 */
public class NotificationSyncReceiver extends BroadcastReceiver {

    public static final String PREFS_NAME = "antigravity_erp_prefs";
    public static final String PREF_USER_ID = "crm_user_id";
    public static final String PREF_SERVER_URL = "crm_server_url";
    public static final String PREF_LAST_POLL_TIME = "crm_last_poll_time";
    public static final String PREF_SEEN_IDS = "crm_seen_notif_ids";
    public static final String DEFAULT_SERVER_URL = "https://erp.esponsports.com";
    private static final int ALARM_REQUEST_CODE = 9001;
    private static final long POLL_INTERVAL_MS = 60 * 1000; // Poll every 60 seconds in background

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
    private static int notificationIdCounter = 2000;

    @Override
    public void onReceive(Context context, Intent intent) {
        // Run background network sync on executor thread
        final Context appContext = context.getApplicationContext();
        executor.execute(() -> {
            try {
                pollServerForNewNotifications(appContext);
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                // Re-schedule the next alarm to keep background sync continuous
                schedule(appContext);
            }
        });
    }

    /**
     * Poll the CRM API for new unread notifications and post to Android status bar
     */
    private void pollServerForNewNotifications(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String userId = prefs.getString(PREF_USER_ID, null);
        String serverUrl = prefs.getString(PREF_SERVER_URL, DEFAULT_SERVER_URL);
        long lastPollTime = prefs.getLong(PREF_LAST_POLL_TIME, 0);

        if (userId == null || userId.trim().isEmpty()) {
            return; // Not logged in yet
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
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.setRequestProperty("User-Agent", "AntigravityERP-AndroidBackground");

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
                        String seenIds = prefs.getString(PREF_SEEN_IDS, "");

                        for (int i = 0; i < notifications.length(); i++) {
                            JSONObject notif = notifications.getJSONObject(i);
                            String notifId = notif.optString("id", "");
                            if (seenIds.contains(notifId)) {
                                continue; // Already alerted
                            }

                            String title = notif.optString("title", "Antigravity ERP");
                            String message = notif.optString("message", "New CRM alert received");
                            String notifType = notif.optString("type", "System");
                            String link = notif.optString("link", "/leads");

                            // Post native Android notification to system tray
                            postNotification(context, notifId, title, message, notifType, link);

                            // Append to seen IDs
                            seenIds = notifId + "," + seenIds;
                            if (seenIds.length() > 2000) {
                                seenIds = seenIds.substring(0, 1000);
                            }
                        }

                        prefs.edit()
                                .putString(PREF_SEEN_IDS, seenIds)
                                .putLong(PREF_LAST_POLL_TIME, System.currentTimeMillis())
                                .apply();
                    } else {
                        prefs.edit()
                                .putLong(PREF_LAST_POLL_TIME, System.currentTimeMillis())
                                .apply();
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
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
     * Build and post a native high-priority Android notification
     */
    private void postNotification(Context context, String notifId, String title, String message, String type, String linkUrl) {
        try {
            String channelId = "crm_leads".equalsIgnoreCase(type) || "lead".equalsIgnoreCase(type)
                    ? MainActivity.NOTIFICATION_CHANNEL_LEADS
                    : MainActivity.NOTIFICATION_CHANNEL_ID;

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            if (linkUrl != null && !linkUrl.isEmpty()) {
                launchIntent.putExtra("notification_url", linkUrl);
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    notifId.hashCode(),
                    launchIntent,
                    flags
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent)
                    .setDefaults(NotificationCompat.DEFAULT_ALL);

            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            if (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                notificationManager.notify(notificationIdCounter++, builder.build());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Schedule the periodic background worker using Android AlarmManager
     */
    public static void schedule(Context context) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent intent = new Intent(context, NotificationSyncReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    ALARM_REQUEST_CODE,
                    intent,
                    flags
            );

            long triggerAtMillis = SystemClock.elapsedRealtime() + POLL_INTERVAL_MS;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerAtMillis,
                        pendingIntent
                );
            } else {
                alarmManager.set(
                        AlarmManager.ELAPSED_REALTIME_WAKEUP,
                        triggerAtMillis,
                        pendingIntent
                );
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Cancel background polling
     */
    public static void cancel(Context context) {
        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            Intent intent = new Intent(context, NotificationSyncReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    ALARM_REQUEST_CODE,
                    intent,
                    flags
            );
            alarmManager.cancel(pendingIntent);
        } catch (Exception e) {}
    }
}
