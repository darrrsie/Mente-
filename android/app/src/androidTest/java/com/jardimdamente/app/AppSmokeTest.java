package com.jardimdamente.app;

import static org.junit.Assert.*;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import androidx.test.core.app.ActivityScenario;

/**
 * Instrumented test, which will execute on an Android device.
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
@RunWith(AndroidJUnit4.class)
public class AppSmokeTest {

    @Test
    public void webViewRespectsFontPreferenceAndAllowsZoom() {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                assertNotNull(activity.getBridge());
                android.webkit.WebSettings settings = activity.getBridge().getWebView().getSettings();
                DisplayMetrics metrics = activity.getResources().getDisplayMetrics();
                int expectedZoom = Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 16, metrics) / (16 * metrics.density) * 100);
                assertEquals(expectedZoom, settings.getTextZoom());
                assertTrue(settings.getBuiltInZoomControls());
            });
        }
    }

    @Test
    public void useAppContext() throws Exception {
        // Context of the app under test.
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();

        assertEquals("com.jardimdamente.app", appContext.getPackageName());
        for (String asset : new String[] { "public/index.html", "public/src/app.js", "public/src/styles.css", "public/assets/map-meadow.png" }) {
            try (java.io.InputStream stream = appContext.getAssets().open(asset)) {
                assertTrue("Recurso offline vazio: " + asset, stream.read() != -1);
            }
        }
    }
}
