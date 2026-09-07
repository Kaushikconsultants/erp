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

public class MainActivity extends BridgeActivity {

    public static final String NOTIFICATION_CHANNEL_ID = "crm_notifications";
    public static final String NOTIFICATION_CHANNEL_LEADS = "crm_leads";
    private static final int PERMISSION_REQUEST_CODE = 2001;
    private static int notificationIdCounter = 100;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Create Default & Leads Notification Channels (Unlocks notification toggles on Android 8+)
        createNotificationChannels();

        // 2. Request Essential Runtime Permissions on Launch (Notifications, Camera, Microphone)
        requestAppPermissions();

        // 3. Grant WebRTC Camera & Microphone permissions and inject JavaScript Native Bridge
        configureWebView();

        // 4. Start 24/7 background notification polling sync service & alarm fallback
        NotificationSyncService.start(this);
        NotificationSyncReceiver.schedule(this);
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebView();
        NotificationSyncService.start(this);
        NotificationSyncReceiver.schedule(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        createNotificationChannels();
        configureWebView();
        NotificationSyncService.start(this);
        NotificationSyncReceiver.schedule(this);
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
            activity.runOnUiThread(() -> {
                try {
                    if (phoneNumber == null || phoneNumber.trim().isEmpty()) return;
                    String clean = phoneNumber.replaceAll("[^0-9+]", "");
                    if (clean.isEmpty()) return;

                    // If CALL_PHONE permission is granted, make direct phone call without opening keypad
                    if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
                        Intent callIntent = new Intent(Intent.ACTION_CALL);
                        callIntent.setData(Uri.parse("tel:" + clean));
                        callIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(callIntent);
                    } else {
                        // Prompt runtime permission
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            ActivityCompat.requestPermissions(
                                    activity,
                                    new String[]{Manifest.permission.CALL_PHONE},
                                    PERMISSION_REQUEST_CODE
                            );
                        }
                        // Fallback to DIAL
                        Intent dialIntent = new Intent(Intent.ACTION_DIAL);
                        dialIntent.setData(Uri.parse("tel:" + clean));
                        dialIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(dialIntent);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    try {
                        String clean = phoneNumber.replaceAll("[^0-9+]", "");
                        Intent fallback = new Intent(Intent.ACTION_DIAL);
                        fallback.setData(Uri.parse("tel:" + clean));
                        fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(fallback);
                    } catch (Exception ex) {}
                }
            });
        }
    }
}
