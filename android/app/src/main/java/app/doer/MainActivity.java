package app.doer;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.HashSet;
import java.util.Set;

/** Do-er 웹 화면을 보여 주고, 웹에서 할 수 없는 일(설치된 앱 고르기, 앱 잠금)을 이어 준다. */
public class MainActivity extends Activity {
    private static final int PICK_FILE = 7;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        setContentView(web);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        CookieManager.getInstance().setAcceptCookie(true);

        final String host = Uri.parse(BuildConfig.APP_URL).getHost();
        web.addJavascriptInterface(new Bridge(), "DoerNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Do-er 화면만 앱 안에서 열고, 다른 주소는 브라우저로 보낸다.
                Uri uri = request.getUrl();
                if (host != null && host.equals(uri.getHost())) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                openPicker();
                return true;
            }
        });

        if (state == null) web.loadUrl(BuildConfig.APP_URL + "/today");
        else web.restoreState(state);
    }

    /** 사진첩에서 고르거나 바로 찍을 수 있게 한다. */
    private void openPicker() {
        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("image/*");
        Intent chooser = Intent.createChooser(pick, "사진 고르기");
        try {
            File folder = new File(getCacheDir(), "shots");
            folder.mkdirs();
            File shot = new File(folder, "shot-" + System.currentTimeMillis() + ".jpg");
            cameraUri = FileProvider.getUriForFile(this, "app.doer.files", shot);
            Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
            camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
        } catch (Exception error) {
            cameraUri = null;
        }
        startActivityForResult(chooser, PICK_FILE);
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != PICK_FILE || fileCallback == null) return;
        Uri[] picked = null;
        if (result == RESULT_OK) {
            if (data != null && data.getData() != null) picked = new Uri[]{data.getData()};
            else if (cameraUri != null) picked = new Uri[]{cameraUri};
        }
        fileCallback.onReceiveValue(picked);
        fileCallback = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        web.saveState(state);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // 권한 설정에서 돌아왔을 때 화면이 상태를 다시 읽게 한다.
        web.evaluateJavascript("window.dispatchEvent(new Event('focus'))", null);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    /** 웹 화면에서 window.DoerNative 로 부르는 기능. */
    private final class Bridge {
        /** 잠글 앱을 고르는 목록. 기기 안에서만 쓰고 서버로 보내지 않는다. */
        @JavascriptInterface
        public String getApps() {
            JSONArray list = new JSONArray();
            try {
                PackageManager manager = getPackageManager();
                Intent launcher = new Intent(Intent.ACTION_MAIN);
                launcher.addCategory(Intent.CATEGORY_LAUNCHER);
                Set<String> seen = new HashSet<>();
                for (ResolveInfo info : manager.queryIntentActivities(launcher, 0)) {
                    String pkg = info.activityInfo.packageName;
                    if (pkg.equals(getPackageName()) || !seen.add(pkg)) continue;
                    JSONObject app = new JSONObject();
                    app.put("label", info.loadLabel(manager).toString());
                    app.put("pkg", pkg);
                    list.put(app);
                }
            } catch (Exception ignored) {
            }
            return list.toString();
        }

        @JavascriptInterface
        public boolean hasAccess() {
            String enabled = Settings.Secure.getString(getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            String mine = new ComponentName(MainActivity.this, LockService.class).flattenToString();
            return enabled != null && enabled.contains(mine);
        }

        @JavascriptInterface
        public void openAccessSettings() {
            startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
        }

        @JavascriptInterface
        public void setLock(boolean active, String targetsJson) {
            Locks.set(MainActivity.this, active, targetsJson);
        }
    }
}
