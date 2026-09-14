package com.getcapacitor;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

public class BridgeActivity extends AppCompatActivity {
    protected Bridge bridge;
    protected WebView webView;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        init();
    }

    @SuppressLint("SetJavaScriptEnabled")
    protected void init() {
        setContentView(R.layout.bridge_activity);
        webView = findViewById(R.id.webview);
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setDatabaseEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);

            bridge = new Bridge(this, webView);

            String serverUrl = bridge.getConfig().getServerUrl();
            if (serverUrl != null && !serverUrl.isEmpty()) {
                webView.loadUrl(serverUrl);
            } else {
                webView.loadUrl("file:///android_asset/public/index.html");
            }
        }
    }

    public Bridge getBridge() {
        return bridge;
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (bridge != null) {
            bridge.onStart();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (bridge != null) {
            bridge.onResume();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (bridge != null) {
            bridge.onPause();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (bridge != null) {
            bridge.onStop();
        }
    }

    @Override
    protected void onDestroy() {
        if (bridge != null) {
            bridge.onDestroy();
        }
        super.onDestroy();
    }
}
