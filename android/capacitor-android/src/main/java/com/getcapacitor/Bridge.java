package com.getcapacitor;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;
import java.util.HashMap;
import java.util.Map;

public class Bridge {
    private final AppCompatActivity activity;
    private final WebView webView;
    private final CapConfig config;
    private final Map<String, Plugin> plugins = new HashMap<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public Bridge(AppCompatActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.config = CapConfig.loadFromAssets(activity);
    }

    public AppCompatActivity getActivity() {
        return activity;
    }

    public Context getContext() {
        return activity;
    }

    public WebView getWebView() {
        return webView;
    }

    public CapConfig getConfig() {
        return config;
    }

    public void eval(final String js, final ValueCallback<String> callback) {
        mainHandler.post(() -> {
            if (webView != null) {
                webView.evaluateJavascript(js, callback);
            }
        });
    }

    public void triggerJSEvent(String eventName, String target, String data) {
        String js = "window.dispatchEvent(new CustomEvent('" + eventName + "', { detail: " + (data != null ? data : "{}") + " }));";
        eval(js, null);
    }

    public void registerPlugin(String name, Plugin plugin) {
        plugin.setBridge(this);
        plugins.put(name, plugin);
        plugin.load();
    }

    public Plugin getPlugin(String name) {
        return plugins.get(name);
    }

    public void onStart() {
        for (Plugin plugin : plugins.values()) {
            plugin.handleOnStart();
        }
    }

    public void onResume() {
        for (Plugin plugin : plugins.values()) {
            plugin.handleOnResume();
        }
    }

    public void onPause() {
        for (Plugin plugin : plugins.values()) {
            plugin.handleOnPause();
        }
    }

    public void onStop() {
        for (Plugin plugin : plugins.values()) {
            plugin.handleOnStop();
        }
    }

    public void onDestroy() {
        for (Plugin plugin : plugins.values()) {
            plugin.handleOnDestroy();
        }
    }
}
