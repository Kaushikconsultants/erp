package com.getcapacitor;

public class PluginCall {
    private final String callbackId;
    private final String methodName;
    private final JSObject data;

    public PluginCall(String callbackId, String methodName, JSObject data) {
        this.callbackId = callbackId;
        this.methodName = methodName;
        this.data = data != null ? data : new JSObject();
    }

    public String getCallbackId() {
        return callbackId;
    }

    public String getMethodName() {
        return methodName;
    }

    public JSObject getData() {
        return data;
    }

    public String getString(String name) {
        return getString(name, null);
    }

    public String getString(String name, String defaultValue) {
        if (data.has(name)) {
            try {
                return data.getString(name);
            } catch (Exception e) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    public Integer getInt(String name) {
        return getInt(name, null);
    }

    public Integer getInt(String name, Integer defaultValue) {
        if (data.has(name)) {
            try {
                return data.getInt(name);
            } catch (Exception e) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    public Boolean getBoolean(String name) {
        return getBoolean(name, null);
    }

    public Boolean getBoolean(String name, Boolean defaultValue) {
        if (data.has(name)) {
            try {
                return data.getBoolean(name);
            } catch (Exception e) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    public JSObject getObject(String name) {
        if (data.has(name)) {
            try {
                return new JSObject(data.getJSONObject(name).toString());
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    public void resolve(JSObject data) {
        // Resolve callback implementation
    }

    public void resolve() {
        resolve(new JSObject());
    }

    public void reject(String msg) {
        // Reject callback implementation
    }

    public void reject(String msg, String code, Exception ex) {
        // Reject callback implementation
    }
}
