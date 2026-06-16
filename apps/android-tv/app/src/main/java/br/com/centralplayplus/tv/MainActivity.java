package br.com.centralplayplus.tv;

import android.app.Activity;
import android.os.Bundle;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.*;
import android.text.method.ScrollingMovementMethod;

import org.json.JSONObject;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.UUID;

public class MainActivity extends Activity {
    private static final String API = "https://device.centralplayplus.com.br";

    private TextView keyView;
    private TextView statusView;
    private TextView catalogView;

    private SharedPreferences prefs;
    private String deviceKey = "";
    private String accessToken = "";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);

        prefs = getSharedPreferences("centralplayplus", MODE_PRIVATE);
        deviceKey = prefs.getString("device_key", "");
        accessToken = prefs.getString("access_token", "");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(48, 48, 48, 48);
        root.setBackgroundColor(Color.rgb(5, 7, 13));

        TextView title = text("Central Play Plus TV", 34, true);
        root.addView(title);

        LinearLayout buttons = new LinearLayout(this);
        buttons.setOrientation(LinearLayout.HORIZONTAL);

        Button register = button("Registrar TV");
        Button status = button("Verificar status");
        Button catalog = button("Carregar catálogo");

        buttons.addView(register);
        buttons.addView(status);
        buttons.addView(catalog);
        root.addView(buttons);

        root.addView(text("Device Key", 24, true));
        keyView = text(deviceKey.isEmpty() ? "---" : deviceKey, 44, true);
        keyView.setTextColor(Color.rgb(94, 234, 212));
        root.addView(keyView);

        root.addView(text("Status", 24, true));
        statusView = box("Aguardando...");
        root.addView(statusView);

        root.addView(text("Catálogo", 24, true));
        catalogView = box("Aguardando...");
        catalogView.setMinHeight(420);
        catalogView.setMovementMethod(new ScrollingMovementMethod());
        root.addView(catalogView);

        setContentView(root);

        register.setOnClickListener(v -> registerDevice());
        status.setOnClickListener(v -> checkStatus());
        catalog.setOnClickListener(v -> loadCatalog());

        if (!deviceKey.isEmpty()) {
            checkStatus();
        }
    }

    private TextView text(String s, int size, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextColor(Color.WHITE);
        t.setTextSize(size);
        t.setPadding(0, 16, 0, 16);
        if (bold) t.setTypeface(null, 1);
        return t;
    }

    private TextView box(String s) {
        TextView t = text(s, 16, false);
        t.setBackgroundColor(Color.rgb(16, 21, 33));
        t.setPadding(22, 22, 22, 22);
        return t;
    }

    private Button button(String s) {
        Button b = new Button(this);
        b.setText(s);
        b.setTextSize(16);
        b.setFocusable(true);
        b.setAllCaps(false);
        b.setPadding(24, 12, 24, 12);
        return b;
    }

    private void registerDevice() {
        statusView.setText("Registrando...");
        new Thread(() -> {
            try {
                String installId = prefs.getString("install_id", "");
                if (installId.isEmpty()) {
                    installId = UUID.randomUUID().toString();
                    prefs.edit().putString("install_id", installId).apply();
                }

                JSONObject body = new JSONObject();
                body.put("install_id", installId);
                body.put("platform", "android_tv");

                JSONObject json = request("POST", "/api/tv/register", body, null);
                deviceKey = json.optString("deviceKey", json.optString("device_key", ""));
                prefs.edit().putString("device_key", deviceKey).apply();

                runOnUiThread(() -> {
                    keyView.setText(deviceKey.isEmpty() ? "---" : deviceKey);
                    statusView.setText(json.toString());
                });
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText("Erro ao registrar: " + e.getMessage()));
            }
        }).start();
    }

    private void checkStatus() {
        if (deviceKey.isEmpty()) {
            statusView.setText("Registre a TV primeiro.");
            return;
        }

        new Thread(() -> {
            try {
                JSONObject json = request("GET", "/api/tv/status/" + deviceKey, null, null);

                accessToken = json.optString("access_token", "");
                String refreshToken = json.optString("refresh_token", "");

                if (!accessToken.isEmpty()) {
                    prefs.edit()
                        .putString("access_token", accessToken)
                        .putString("refresh_token", refreshToken)
                        .apply();
                }

                JSONObject safe = new JSONObject();
                safe.put("status", json.optString("status"));
                safe.put("has_access_token", !accessToken.isEmpty());
                safe.put("has_refresh_token", !refreshToken.isEmpty());
                safe.put("expires_at", json.optString("expires_at"));

                runOnUiThread(() -> statusView.setText(safe.toString()));
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText("Erro status: " + e.getMessage()));
            }
        }).start();
    }

    private void loadCatalog() {
        if (accessToken.isEmpty()) {
            accessToken = prefs.getString("access_token", "");
        }

        if (accessToken.isEmpty()) {
            catalogView.setText("Sem token. Ative a Device Key primeiro.");
            return;
        }

        catalogView.setText("Carregando catálogo...");

        new Thread(() -> {
            try {
                JSONObject result = new JSONObject();
                result.put("home", request("GET", "/api/tv/home", null, accessToken));
                result.put("channels", request("GET", "/api/tv/channels", null, accessToken));
                result.put("categories", request("GET", "/api/tv/categories", null, accessToken));

                runOnUiThread(() -> catalogView.setText(result.toString()));
            } catch (Exception e) {
                runOnUiThread(() -> catalogView.setText("Erro catálogo: " + e.getMessage()));
            }
        }).start();
    }

    private JSONObject request(String method, String path, JSONObject body, String token) throws Exception {
        URL url = new URL(API + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.setRequestMethod(method);
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);
        conn.setRequestProperty("Content-Type", "application/json");

        if (token != null && !token.isEmpty()) {
            conn.setRequestProperty("Authorization", "Bearer " + token);
        }

        if (body != null) {
            conn.setDoOutput(true);
            OutputStream os = conn.getOutputStream();
            os.write(body.toString().getBytes("UTF-8"));
            os.close();
        }

        int code = conn.getResponseCode();
        InputStream is = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();

        BufferedReader br = new BufferedReader(new InputStreamReader(is));
        StringBuilder sb = new StringBuilder();
        String line;

        while ((line = br.readLine()) != null) {
            sb.append(line);
        }

        br.close();

        if (code < 200 || code >= 300) {
            throw new Exception("HTTP " + code + ": " + sb.toString());
        }

        return new JSONObject(sb.toString());
    }
}
