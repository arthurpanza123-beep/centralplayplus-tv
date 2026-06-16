package br.com.centralplayplus.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebResourceError;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String TV_URL = "https://device.centralplayplus.com.br/";
    private static final String BUILD_MARKER = "WebView TV " + BuildConfig.VERSION_NAME + " · " + BuildConfig.GIT_SHA;

    private FrameLayout root;
    private WebView webView;
    private LinearLayout splash;
    private LinearLayout errorView;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(5, 7, 13));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(5, 7, 13));
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.requestFocus();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " CentralPlayPlusTV/1.3.0");
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                return true;
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) {
                    view.loadUrl(uri.toString());
                    return true;
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                hideSplash();
                webView.requestFocus();
            }

            @Override
            public void onPageCommitVisible(WebView view, String url) {
                hideSplash();
                hideError();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    hideSplash();
                    showError();
                }
            }
        });

        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        splash = createSplash();
        errorView = createErrorView();
        root.addView(splash, new FrameLayout.LayoutParams(-1, -1));
        root.addView(errorView, new FrameLayout.LayoutParams(-1, -1));
        errorView.setVisibility(View.GONE);
        setContentView(root);

        webView.loadUrl(TV_URL);
        handler.postDelayed(this::hideSplash, 1400);
    }

    private void hideSplash() {
        if (splash != null) splash.setVisibility(View.GONE);
    }

    private void hideError() {
        if (errorView != null) errorView.setVisibility(View.GONE);
    }

    private LinearLayout createSplash() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(48, 48, 48, 48);
        box.setBackgroundColor(Color.rgb(5, 7, 13));

        ImageView logo = new ImageView(this);
        logo.setImageResource(getResources().getIdentifier("cp_logo", "drawable", getPackageName()));
        logo.setAdjustViewBounds(true);
        LinearLayout.LayoutParams logoLp = new LinearLayout.LayoutParams(420, 140);
        box.addView(logo, logoLp);

        ProgressBar progress = new ProgressBar(this);
        LinearLayout.LayoutParams progressLp = new LinearLayout.LayoutParams(56, 56);
        progressLp.setMargins(0, 26, 0, 18);
        box.addView(progress, progressLp);

        TextView marker = new TextView(this);
        marker.setText(BUILD_MARKER);
        marker.setTextColor(Color.argb(165, 226, 232, 240));
        marker.setTextSize(13);
        marker.setGravity(Gravity.CENTER);
        box.addView(marker, new LinearLayout.LayoutParams(-2, -2));

        return box;
    }

    private LinearLayout createErrorView() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(56, 56, 56, 56);
        box.setBackgroundColor(Color.rgb(5, 7, 13));

        TextView title = new TextView(this);
        title.setText("Sem conexão");
        title.setTextColor(Color.WHITE);
        title.setTextSize(30);
        title.setGravity(Gravity.CENTER);
        box.addView(title, new LinearLayout.LayoutParams(-2, -2));

        TextView message = new TextView(this);
        message.setText("Verifique a internet e tente novamente.");
        message.setTextColor(Color.argb(180, 226, 232, 240));
        message.setTextSize(18);
        message.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams msgLp = new LinearLayout.LayoutParams(-2, -2);
        msgLp.setMargins(0, 10, 0, 24);
        box.addView(message, msgLp);

        Button retry = new Button(this);
        retry.setText("Tentar novamente");
        retry.setAllCaps(false);
        retry.setTextSize(18);
        retry.setOnClickListener(v -> {
            errorView.setVisibility(View.GONE);
            splash.setVisibility(View.VISIBLE);
            webView.reload();
            handler.postDelayed(this::hideSplash, 1400);
        });
        box.addView(retry, new LinearLayout.LayoutParams(260, 64));
        return box;
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_UP
                && (event.getKeyCode() == KeyEvent.KEYCODE_DPAD_CENTER
                || event.getKeyCode() == KeyEvent.KEYCODE_ENTER
                || event.getKeyCode() == KeyEvent.KEYCODE_NUMPAD_ENTER)) {
            View focused = getCurrentFocus();
            if (focused != null && focused.performClick()) return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (webView != null) {
            root.removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private void showError() {
        runOnUiThread(() -> {
            if (webView == null) return;

            String html =
                "<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1' />" +
                "<style>" +
                "html,body{margin:0;width:100%;height:100%;background:#020617;color:white;font-family:Arial,sans-serif;}" +
                ".wrap{height:100%;display:flex;align-items:center;justify-content:center;text-align:center;padding:48px;box-sizing:border-box;}" +
                ".card{max-width:720px;border:1px solid rgba(56,189,248,.35);border-radius:28px;background:linear-gradient(135deg,rgba(15,23,42,.96),rgba(2,6,23,.98));box-shadow:0 30px 90px rgba(0,0,0,.55);padding:42px;}" +
                "h1{font-size:34px;margin:0 0 14px;}" +
                "p{font-size:19px;color:#cbd5e1;line-height:1.45;margin:0 0 26px;}" +
                "button{font-size:20px;font-weight:700;border:0;border-radius:999px;background:#06b6d4;color:#001018;padding:16px 30px;}" +
                "</style></head><body>" +
                "<div class='wrap'><div class='card'>" +
                "<h1>Não foi possível carregar o app</h1>" +
                "<p>Verifique a internet e tente novamente.</p>" +
                "<button onclick='location.href=\"https://device.centralplayplus.com.br/\"'>Tentar novamente</button>" +
                "</div></div></body></html>";

            webView.loadDataWithBaseURL(
                "https://device.centralplayplus.com.br/",
                html,
                "text/html",
                "UTF-8",
                null
            );
        });
    }

}
