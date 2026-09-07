package com.antigravity.erp;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    public static final String NOTIFICATION_CHANNEL_ID = "crm_notifications";
    private static final int PERMISSION_REQUEST_CODE = 2001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Create Default Notification Channel (Unlocks "Allow notifications" toggle on Android 8+)
        createNotificationChannel();

        // 2. Request Essential Runtime Permissions on Launch (Notifications, Camera, Microphone)
        requestAppPermissions();

        // 3. Grant WebRTC Camera & Microphone permissions inside Capacitor WebView
        configureWebViewPermissions();
    }

    /**
     * Creates high-priority notification channel for incoming CRM alerts
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "CRM Real-Time Notifications";
            String description = "Real-time alerts for incoming leads, WhatsApp chats, orders, and follow-ups";
            int importance = NotificationManager.IMPORTANCE_HIGH;

            NotificationChannel channel = new NotificationChannel(NOTIFICATION_CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.enableVibration(true);
            channel.enableLights(true);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Prompt for Camera, Audio/Mic, and Android 13+ Notification permissions
     */
    private void requestAppPermissions() {
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
     * Ensures WebView WebChromeClient automatically grants Camera & Audio requests from JavaScript
     */
    private void configureWebViewPermissions() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        MainActivity.this.runOnUiThread(() -> {
                            request.grant(request.getResources());
                        });
                    }
                });
            }
        } catch (Exception e) {
            // Silently handle if bridge is not ready
        }
    }
}
