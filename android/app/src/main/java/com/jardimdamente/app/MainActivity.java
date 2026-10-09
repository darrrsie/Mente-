package com.jardimdamente.app;

import com.getcapacitor.BridgeActivity;
import android.content.res.Configuration;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.util.TypedValue;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyFontPreference();
    }

    @Override
    public void onConfigurationChanged(Configuration configuration) {
        super.onConfigurationChanged(configuration);
        applyFontPreference();
    }

    private void applyFontPreference() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        // Resolve sp through Android so newer non-linear font scaling is used.
        float referencePixels = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 16, metrics);
        int textZoom = Math.round(referencePixels / (16 * metrics.density) * 100);
        getBridge().getWebView().getSettings().setTextZoom(textZoom);
    }
}
