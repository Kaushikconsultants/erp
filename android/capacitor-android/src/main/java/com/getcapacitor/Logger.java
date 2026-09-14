package com.getcapacitor;

import android.util.Log;

public class Logger {
    public static final String LOG_TAG_CORE = "Capacitor";

    public static void debug(String message) {
        Log.d(LOG_TAG_CORE, message);
    }

    public static void debug(String tag, String message) {
        Log.d(tag, message);
    }

    public static void info(String message) {
        Log.i(LOG_TAG_CORE, message);
    }

    public static void info(String tag, String message) {
        Log.i(tag, message);
    }

    public static void error(String message) {
        Log.e(LOG_TAG_CORE, message);
    }

    public static void error(String message, Throwable ex) {
        Log.e(LOG_TAG_CORE, message, ex);
    }

    public static void error(String tag, String message, Throwable ex) {
        Log.e(tag, message, ex);
    }
}
