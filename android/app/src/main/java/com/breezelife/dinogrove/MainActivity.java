package com.breezelife.dinogrove;

import android.app.Activity;
import android.content.ContentValues;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;

/** Offline Android host; web application behavior lives in the shared source. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String ENTRY = "https://" + HOST + "/assets/index.html";
    private static final int MAX_PNG_BYTES = 12 * 1024 * 1024;
    private static final byte[] PNG_SIGNATURE = {(byte) 137, 80, 78, 71, 13, 10, 26, 10};
    private static final String CSP = "default-src 'self'; script-src 'self'; "
            + "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
            + "connect-src 'none'; media-src blob: data:; object-src 'none'; "
            + "frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'";

    private final ExecutorService photoExecutor = Executors.newSingleThreadExecutor();
    private final AtomicBoolean photoPending = new AtomicBoolean(false);
    private Object backCallback;
    private WebView webView;
    private FrameLayout root;
    private volatile boolean trustedContent = false;
    private volatile boolean destroyed = false;
    private boolean foreground = true;
    private boolean immersive = false;

    @Override public void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(20, 38, 34));
        setContentView(root);
        configureInsets();
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(40, 94, 87));
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        configureWebView();
        webView.loadUrl(ENTRY);
        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = BackApi.register(this, this::handleBack);
        }
    }

    private void configureInsets() {
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        else getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else {
                android.view.DisplayCutout cutout = insets.getDisplayCutout();
                view.setPadding(Math.max(insets.getSystemWindowInsetLeft(), cutout == null ? 0 : cutout.getSafeInsetLeft()),
                        Math.max(insets.getSystemWindowInsetTop(), cutout == null ? 0 : cutout.getSafeInsetTop()),
                        Math.max(insets.getSystemWindowInsetRight(), cutout == null ? 0 : cutout.getSafeInsetRight()),
                        Math.max(insets.getSystemWindowInsetBottom(), cutout == null ? 0 : cutout.getSafeInsetBottom()));
            }
            return insets;
        });
        root.requestApplyInsets();
    }

    private void applyImmersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                if (immersive) controller.hide(WindowInsets.Type.systemBars());
                else controller.show(WindowInsets.Type.systemBars());
            }
        } else {
            int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            if (immersive) flags |= View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }
        root.requestApplyInsets();
    }

    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && immersive) applyImmersive();
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setGeolocationEnabled(false);
        webView.addJavascriptInterface(new PhotoBridge(), "DinoGroveAndroid");
        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!"GET".equals(request.getMethod()) || !isAssetUri(request.getUrl())) return denied();
                WebResourceResponse response = assetLoader.shouldInterceptRequest(request.getUrl());
                if (response == null) return denied();
                Map<String, String> headers = new HashMap<>();
                headers.put("Content-Security-Policy", CSP);
                headers.put("X-Content-Type-Options", "nosniff");
                response.setResponseHeaders(headers);
                return response;
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.isForMainFrame() || !isEntryUri(request.getUrl());
            }

            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                immersive = false;
                applyImmersive();
                trustedContent = isEntryUri(Uri.parse(url));
                if (!trustedContent) view.stopLoading();
            }

            @Override public void onPageFinished(WebView view, String url) {
                if (isEntryUri(Uri.parse(url))) dispatchVisibility(foreground, null);
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showLoadError();
            }

            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                showLoadError();
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
    }

    private static boolean isAssetUri(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
                && uri.getPort() == -1 && uri.getUserInfo() == null
                && uri.getPath() != null && uri.getPath().startsWith("/assets/")
                && !uri.getPath().contains("..");
    }

    private static boolean isEntryUri(Uri uri) {
        return isAssetUri(uri) && "/assets/index.html".equals(uri.getPath());
    }

    private static WebResourceResponse denied() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", Collections.emptyMap(),
                new ByteArrayInputStream(new byte[0]));
    }

    private void showLoadError() {
        if (destroyed) return;
        immersive = false;
        applyImmersive();
        trustedContent = false;
        releaseWebView();
        root.removeAllViews();
        TextView message = new TextView(this);
        message.setText(R.string.load_error);
        message.setTextColor(Color.WHITE);
        message.setTextSize(18);
        message.setPadding(32, 48, 32, 32);
        root.addView(message);
    }

    private void dispatchVisibility(boolean visible, android.webkit.ValueCallback<String> callback) {
        if (webView == null || destroyed) return;
        webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('dino-grove-native-visibility',"
                + "{detail:{visible:" + visible + "}}));", callback);
    }

    @Override protected void onPause() {
        foreground = false;
        dispatchVisibility(false, ignored -> {
            if (webView != null && !foreground && !destroyed) {
                webView.onPause();
                webView.pauseTimers();
            }
        });
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        foreground = true;
        if (immersive) applyImmersive();
        if (webView != null) {
            webView.resumeTimers();
            webView.onResume();
            dispatchVisibility(true, null);
        }
    }

    private void handleBack() {
        if (webView == null) { finish(); return; }
        webView.evaluateJavascript("(()=>{const dialog=document.querySelector('dialog[open]');"
                + "if(dialog){dialog.dispatchEvent(new Event('cancel',{cancelable:true}));return true;}"
                + "const event=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});"
                + "window.dispatchEvent(event);return event.defaultPrevented;})()", handled -> {
            if (!"true".equals(handled) && !destroyed) finish();
        });
    }

    // API 33+ uses BackApi above; this override exists solely for Android 10–12.
    @android.annotation.SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed() { handleBack(); }

    private void releaseWebView() {
        if (webView == null) return;
        root.removeView(webView);
        webView.removeJavascriptInterface("DinoGroveAndroid");
        webView.stopLoading();
        webView.destroy();
        webView = null;
    }

    @Override protected void onDestroy() {
        destroyed = true;
        trustedContent = false;
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) BackApi.unregister(this, backCallback);
        // Let a user-requested save finish, but do not retain the WebView or callbacks.
        photoExecutor.shutdown();
        releaseWebView();
        super.onDestroy();
    }

    // Keep Android 13 classes out of the Activity's fields so Android 10 can load it.
    @androidx.annotation.RequiresApi(33)
    private static final class BackApi {
        static Object register(Activity activity, Runnable action) {
            OnBackInvokedCallback callback = action::run;
            activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback);
            return callback;
        }
        static void unregister(Activity activity, Object callback) {
            activity.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback((OnBackInvokedCallback) callback);
        }
    }

    /** Exposed only to packaged, CSP-protected content; no external frames can load. */
    public final class PhotoBridge {
        @JavascriptInterface public void setImmersive(boolean enabled) {
            if (destroyed || !trustedContent) return;
            runOnUiThread(() -> {
                if (destroyed || !trustedContent) return;
                immersive = enabled;
                applyImmersive();
            });
        }

        @JavascriptInterface public void savePhoto(String base64Png, String filename, String requestId) {
            if (destroyed || !trustedContent) return;
            if (requestId == null || !requestId.matches("[A-Za-z0-9_-]{1,96}")) return;
            if (!photoPending.compareAndSet(false, true)) { photoResult(requestId, false, "BUSY"); return; }
            try { photoExecutor.execute(() -> {
                Uri photoUri = null;
                try {
                    byte[] png = validatePng(base64Png);
                    String safeName = safePhotoName(filename);
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Images.Media.DISPLAY_NAME, safeName);
                    values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                    values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Dino Grove");
                    values.put(MediaStore.Images.Media.IS_PENDING, 1);
                    photoUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                    if (photoUri == null) throw new IOException("STORAGE_UNAVAILABLE");
                    try (OutputStream output = getContentResolver().openOutputStream(photoUri, "w")) {
                        if (output == null) throw new IOException("STORAGE_UNAVAILABLE");
                        output.write(png);
                    }
                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    if (getContentResolver().update(photoUri, values, null, null) != 1) throw new IOException("SAVE_FAILED");
                    photoResult(requestId, true, null);
                } catch (Exception error) {
                    if (photoUri != null) {
                        try { getContentResolver().delete(photoUri, null, null); } catch (Exception ignored) { /* Best-effort incomplete image cleanup. */ }
                    }
                    String code = error instanceof IllegalArgumentException ? "INVALID_IMAGE" : "SAVE_FAILED";
                    photoResult(requestId, false, code);
                } finally {
                    photoPending.set(false);
                }
            }); } catch (RejectedExecutionException stopped) {
                photoPending.set(false);
                photoResult(requestId, false, "SAVE_FAILED");
            }
        }
    }

    private static byte[] validatePng(String base64Png) {
        if (base64Png == null || base64Png.length() > MAX_PNG_BYTES * 4 / 3 + 128) throw new IllegalArgumentException();
        String encoded = base64Png.startsWith("data:image/png;base64,") ? base64Png.substring(22) : base64Png;
        byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
        if (bytes.length < PNG_SIGNATURE.length || bytes.length > MAX_PNG_BYTES) throw new IllegalArgumentException();
        for (int i = 0; i < PNG_SIGNATURE.length; i++) if (bytes[i] != PNG_SIGNATURE[i]) throw new IllegalArgumentException();
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0 || bounds.outWidth > 4096 || bounds.outHeight > 4096
                || (long) bounds.outWidth * bounds.outHeight > 8_000_000 || !"image/png".equals(bounds.outMimeType)) {
            throw new IllegalArgumentException();
        }
        return bytes;
    }

    private static String safePhotoName(String filename) {
        String clean = filename == null ? "dino-grove.png" : filename.replaceAll("[^A-Za-z0-9._-]", "_");
        clean = clean.replaceFirst("^\\.+", "");
        if (clean.length() > 96) clean = clean.substring(0, 96);
        if (clean.isEmpty()) clean = "dino-grove";
        if (!clean.toLowerCase(java.util.Locale.ROOT).endsWith(".png")) clean += ".png";
        return clean;
    }

    private void photoResult(String id, boolean success, String error) {
        JSONObject result = new JSONObject();
        try {
            result.put("id", id);
            result.put("success", success);
            if (error != null) result.put("error", error);
        } catch (JSONException impossible) { return; }
        runOnUiThread(() -> {
            if (webView == null || destroyed || !trustedContent) return;
            webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('dino-grove-photo-result',"
                    + "{detail:" + result + "}));", null);
        });
    }
}
