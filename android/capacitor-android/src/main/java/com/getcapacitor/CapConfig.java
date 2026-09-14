package com.getcapacitor;

import android.content.Context;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class CapConfig {
    private String serverUrl = null;
    private boolean allowNavigation = true;

    public CapConfig() {}

    public static CapConfig loadFromAssets(Context context) {
        CapConfig config = new CapConfig();
        try {
            InputStream is = context.getAssets().open("capacitor.config.json");
            int size = is.available();
            byte[] buffer = new byte[size];
            is.read(buffer);
            is.close();
            String jsonStr = new String(buffer, StandardCharsets.UTF_8);
            JSONObject json = new JSONObject(jsonStr);
            if (json.has("server")) {
                JSONObject server = json.getJSONObject("server");
                if (server.has("url")) {
                    config.serverUrl = server.getString("url");
                }
            }
        } catch (Exception ignored) {}
        return config;
    }

    public String getServerUrl() {
        return serverUrl;
    }

    public void setServerUrl(String serverUrl) {
        this.serverUrl = serverUrl;
    }
}
