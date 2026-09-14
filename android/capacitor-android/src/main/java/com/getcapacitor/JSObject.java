package com.getcapacitor;

import org.json.JSONException;
import org.json.JSONObject;

public class JSObject extends JSONObject {

    public JSObject() {
        super();
    }

    public JSObject(String json) throws JSONException {
        super(json);
    }

    @Override
    public JSObject put(String key, boolean value) {
        try {
            super.put(key, value);
        } catch (JSONException ignored) {}
        return this;
    }

    @Override
    public JSObject put(String key, int value) {
        try {
            super.put(key, value);
        } catch (JSONException ignored) {}
        return this;
    }

    @Override
    public JSObject put(String key, long value) {
        try {
            super.put(key, value);
        } catch (JSONException ignored) {}
        return this;
    }

    @Override
    public JSObject put(String key, double value) {
        try {
            super.put(key, value);
        } catch (JSONException ignored) {}
        return this;
    }

    @Override
    public JSObject put(String key, Object value) {
        try {
            super.put(key, value);
        } catch (JSONException ignored) {}
        return this;
    }

    public JSObject put(String key, String value) {
        try {
            super.put(key, value);
        } catch (JSONException ignored) {}
        return this;
    }

    public String getString(String key, String defaultValue) {
        try {
            return super.getString(key);
        } catch (JSONException e) {
            return defaultValue;
        }
    }

    public Boolean getBoolean(String key, Boolean defaultValue) {
        try {
            return super.getBoolean(key);
        } catch (JSONException e) {
            return defaultValue;
        }
    }

    public Integer getInteger(String key, Integer defaultValue) {
        try {
            return super.getInt(key);
        } catch (JSONException e) {
            return defaultValue;
        }
    }
}
