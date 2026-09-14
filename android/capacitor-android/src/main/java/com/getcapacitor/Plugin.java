package com.getcapacitor;

import android.content.Context;
import androidx.appcompat.app.AppCompatActivity;

public class Plugin {
    protected Bridge bridge;

    public void setBridge(Bridge bridge) {
        this.bridge = bridge;
    }

    public Bridge getBridge() {
        return bridge;
    }

    public Context getContext() {
        return bridge != null ? bridge.getContext() : null;
    }

    public AppCompatActivity getActivity() {
        return bridge != null ? bridge.getActivity() : null;
    }

    public void load() {}

    public void handleOnStart() {}

    public void handleOnResume() {}

    public void handleOnPause() {}

    public void handleOnStop() {}

    public void handleOnDestroy() {}
}
