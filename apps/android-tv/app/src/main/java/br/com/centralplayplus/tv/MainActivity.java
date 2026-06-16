package br.com.centralplayplus.tv;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;
import java.util.UUID;

public class MainActivity extends Activity {
    private static final String API = "https://device.centralplayplus.com.br";
    private static final String PLATFORM = "android_tv";
    private static final int BG = Color.rgb(5, 7, 13);
    private static final int PANEL = Color.rgb(16, 21, 33);
    private static final int PANEL_FOCUS = Color.rgb(31, 41, 55);
    private static final int TEXT = Color.WHITE;
    private static final int MUTED = Color.rgb(156, 163, 175);
    private static final int ACCENT = Color.rgb(94, 234, 212);
    private static final int GOLD = Color.rgb(245, 158, 11);

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable pollRunnable = new Runnable() {
        @Override public void run() {
            if (!"home".equals(screen)) {
                checkStatus(true);
                handler.postDelayed(this, 5000);
            }
        }
    };

    private SharedPreferences prefs;
    private LinearLayout root;
    private TextView statusView;
    private String screen = "activation";
    private String deviceKey = "";
    private String accessToken = "";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("centralplayplus", MODE_PRIVATE);
        deviceKey = prefs.getString("device_key", "");
        accessToken = prefs.getString("access_token", "");

        if (deviceKey.isEmpty()) {
            showActivation("Registrando TV...");
            registerDevice();
        } else if (!accessToken.isEmpty()) {
            showHome();
        } else {
            showActivation("Aguardando ativação...");
            startPolling();
        }
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(pollRunnable);
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if ("channels".equals(screen) || "categories".equals(screen) || "detail".equals(screen)) {
            showHome();
            return;
        }
        super.onBackPressed();
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER) {
            View focused = getCurrentFocus();
            if (focused != null && focused.isClickable()) {
                focused.performClick();
                return true;
            }
        }
        return super.onKeyUp(keyCode, event);
    }

    private void base() {
        handler.removeCallbacks(pollRunnable);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(56, 38, 56, 38);
        root.setBackgroundColor(BG);
        setContentView(root);
    }

    private void showActivation(String message) {
        screen = "activation";
        base();

        TextView title = text("Central Play Plus", 36, true, TEXT);
        title.setGravity(Gravity.CENTER);
        root.addView(title, lp(-1, -2));

        TextView hint = text("Informe esta chave para ativar sua TV.", 22, false, MUTED);
        hint.setGravity(Gravity.CENTER);
        root.addView(hint, lp(-1, -2));

        TextView key = text(deviceKey.isEmpty() ? "------" : deviceKey, 68, true, ACCENT);
        key.setGravity(Gravity.CENTER);
        key.setLetterSpacing(0.08f);
        LinearLayout keyBox = panel();
        keyBox.setGravity(Gravity.CENTER);
        keyBox.addView(key, lp(-1, -2));
        LinearLayout.LayoutParams keyLp = lp(-1, 180);
        keyLp.setMargins(0, 34, 0, 22);
        root.addView(keyBox, keyLp);

        statusView = text(message, 22, false, MUTED);
        statusView.setGravity(Gravity.CENTER);
        root.addView(statusView, lp(-1, -2));

        Button verify = button("Verificar agora");
        LinearLayout.LayoutParams btnLp = lp(360, 72);
        btnLp.gravity = Gravity.CENTER_HORIZONTAL;
        btnLp.setMargins(0, 28, 0, 0);
        root.addView(verify, btnLp);
        verify.setOnClickListener(v -> checkStatus(false));
        verify.requestFocus();
    }

    private void showHome() {
        screen = "home";
        base();
        addHeader("Central Play Plus", "Início");

        LinearLayout nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        Button home = button("Home");
        nav.addView(home, lp(170, 62));
        Button channels = button("Canais");
        Button categories = button("Categorias");
        nav.addView(channels, lp(190, 62));
        nav.addView(categories, lp(230, 62));
        root.addView(nav, lp(-1, -2));

        statusView = text("Carregando...", 20, false, MUTED);
        root.addView(statusView, lp(-1, -2));

        home.setOnClickListener(v -> showHome());
        channels.setOnClickListener(v -> showChannels());
        categories.setOnClickListener(v -> showCategories());
        loadHome();
    }

    private void showChannels() {
        screen = "channels";
        base();
        addHeader("Canais", "Ao vivo");
        statusView = text("Carregando canais...", 20, false, MUTED);
        root.addView(statusView, lp(-1, -2));
        loadChannels();
    }

    private void showCategories() {
        screen = "categories";
        base();
        addHeader("Categorias", "Catálogo");
        statusView = text("Carregando categorias...", 20, false, MUTED);
        root.addView(statusView, lp(-1, -2));
        loadCategories();
    }

    private void addHeader(String title, String subtitle) {
        TextView t = text(title, 34, true, TEXT);
        TextView s = text(subtitle, 18, false, MUTED);
        root.addView(t, lp(-1, -2));
        root.addView(s, lp(-1, -2));
    }

    private void registerDevice() {
        new Thread(() -> {
            try {
                String installId = prefs.getString("install_id", "");
                if (installId.isEmpty()) {
                    installId = UUID.randomUUID().toString();
                    prefs.edit().putString("install_id", installId).apply();
                }

                JSONObject body = new JSONObject();
                body.put("install_id", installId);
                body.put("platform", PLATFORM);

                JSONObject json = request("POST", "/api/tv/register", body, null);
                deviceKey = json.optString("deviceKey", json.optString("device_key", ""));
                prefs.edit().putString("device_key", deviceKey).apply();
                runOnUiThread(() -> {
                    showActivation("Aguardando ativação...");
                    startPolling();
                });
            } catch (Exception e) {
                runOnUiThread(() -> showActivation(messageFor(e, "Erro ao registrar TV.")));
            }
        }).start();
    }

    private void startPolling() {
        handler.removeCallbacks(pollRunnable);
        handler.postDelayed(pollRunnable, 500);
    }

    private void checkStatus(boolean silent) {
        if (deviceKey.isEmpty()) {
            registerDevice();
            return;
        }
        if (!silent && statusView != null) statusView.setText("Verificando...");

        new Thread(() -> {
            try {
                JSONObject json = request("GET", "/api/tv/status/" + deviceKey, null, null);
                String status = json.optString("status", "pending");

                if ("active".equalsIgnoreCase(status)) {
                    accessToken = json.optString("access_token", "");
                    String refreshToken = json.optString("refresh_token", "");
                    if (!accessToken.isEmpty()) {
                        prefs.edit()
                            .putString("access_token", accessToken)
                            .putString("refresh_token", refreshToken)
                            .apply();
                        runOnUiThread(this::showHome);
                        return;
                    }
                }

                runOnUiThread(() -> {
                    if ("expired".equalsIgnoreCase(status) || "blocked".equalsIgnoreCase(status)) {
                        statusView.setText("Acesso expirado ou bloqueado. Fale com o suporte.");
                    } else {
                        statusView.setText("Aguardando ativação...");
                    }
                });
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void loadHome() {
        new Thread(() -> {
            try {
                JSONObject json = request("GET", "/api/tv/home", null, token());
                runOnUiThread(() -> renderHome(json));
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void loadChannels() {
        new Thread(() -> {
            try {
                JSONObject json = request("GET", "/api/tv/channels", null, token());
                runOnUiThread(() -> renderGrid(findArray(json), "Nenhum canal encontrado."));
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void loadCategories() {
        new Thread(() -> {
            try {
                JSONObject json = request("GET", "/api/tv/categories", null, token());
                runOnUiThread(() -> renderGrid(findArray(json), "Nenhuma categoria encontrada."));
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void renderHome(JSONObject json) {
        root.removeView(statusView);
        JSONArray sections = json.optJSONArray("sections");
        if (sections == null) sections = json.optJSONArray("rows");
        if (sections == null) {
            JSONArray items = findArray(json);
            if (items.length() == 0) {
                root.addView(text("Nenhum conteúdo encontrado.", 22, false, MUTED), lp(-1, -2));
                return;
            }
            addRow("Catálogo", items);
            return;
        }

        boolean hasContent = false;
        for (int i = 0; i < sections.length(); i++) {
            JSONObject section = sections.optJSONObject(i);
            if (section == null) continue;
            JSONArray items = section.optJSONArray("items");
            if (items == null) items = section.optJSONArray("contents");
            if (items == null || items.length() == 0) continue;
            hasContent = true;
            addRow(section.optString("title", section.optString("name", "Catálogo")), items);
        }
        if (!hasContent) root.addView(text("Nenhum conteúdo encontrado.", 22, false, MUTED), lp(-1, -2));
    }

    private void renderGrid(JSONArray items, String empty) {
        root.removeView(statusView);
        if (items.length() == 0) {
            root.addView(text(empty, 22, false, MUTED), lp(-1, -2));
            return;
        }

        ScrollView scroll = new ScrollView(this);
        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        scroll.addView(grid);

        LinearLayout row = null;
        for (int i = 0; i < items.length(); i++) {
            if (i % 4 == 0) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                grid.addView(row, lp(-1, -2));
            }
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            row.addView(card(item, "channels"), lp(250, 150));
        }
        root.addView(scroll, lp(-1, 0, 1));
    }

    private void addRow(String title, JSONArray items) {
        TextView rowTitle = text(title, 24, true, TEXT);
        LinearLayout.LayoutParams titleLp = lp(-1, -2);
        titleLp.setMargins(0, 22, 0, 8);
        root.addView(rowTitle, titleLp);

        HorizontalScrollView scroll = new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        scroll.addView(row);

        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            row.addView(card(item, "home"), lp(260, 160));
        }
        root.addView(scroll, lp(-1, 180));
    }

    private TextView card(JSONObject item, String source) {
        String title = first(item, "title", "name", "category", "genre");
        String type = first(item, "type", "content_type", "kind");
        String quality = first(item, "quality", "resolution");
        String genre = first(item, "genre", "category_name");
        String meta = join(type, quality, genre);

        TextView card = text(title.isEmpty() ? "Sem título" : title, 19, true, TEXT);
        if (!meta.isEmpty()) card.setText(card.getText() + "\n" + meta);
        card.setTextColor(TEXT);
        card.setGravity(Gravity.BOTTOM | Gravity.LEFT);
        card.setPadding(18, 18, 18, 18);
        card.setFocusable(true);
        card.setClickable(true);
        card.setBackground(bg(PANEL, ACCENT, 1));
        card.setOnFocusChangeListener((v, focused) -> {
            v.setBackground(bg(focused ? PANEL_FOCUS : PANEL, focused ? GOLD : ACCENT, focused ? 4 : 1));
            v.setScaleX(focused ? 1.04f : 1f);
            v.setScaleY(focused ? 1.04f : 1f);
        });
        card.setOnClickListener(v -> openItem(item, source));
        LinearLayout.LayoutParams margins = lp(260, 160);
        margins.setMargins(0, 0, 18, 18);
        card.setLayoutParams(margins);
        return card;
    }

    private void openItem(JSONObject item, String source) {
        String type = first(item, "type", "content_type", "kind");
        if ("channels".equals(source) || isLive(type)) {
            openPlayback(item);
            return;
        }
        showDetail(item);
    }

    private boolean isLive(String type) {
        String t = type == null ? "" : type.toLowerCase();
        return t.contains("live") || t.contains("channel") || t.contains("canal") || t.contains("tv");
    }

    private void openPlayback(JSONObject item) {
        String id = first(item, "id", "channel_id", "channelId", "stream_id", "streamId");
        if (id.isEmpty()) {
            showDetail(item);
            return;
        }
        String title = first(item, "title", "name");
        new Thread(() -> {
            try {
                JSONObject json = request("GET", "/api/tv/channel/" + id + "/play", null, token());
                String url = findPlaybackUrl(json);
                String status = first(json, "status", "message", "error");
                runOnUiThread(() -> openPlayer(title, url, status.isEmpty() ? "OK" : status));
            } catch (Exception e) {
                runOnUiThread(() -> openPlayer(title, "", messageFor(e, "Player em desenvolvimento")));
            }
        }).start();
    }

    private void openPlayer(String title, String url, String status) {
        Intent intent = new Intent(this, PlayerActivity.class);
        intent.putExtra("title", title == null || title.isEmpty() ? "Canal" : title);
        intent.putExtra("url", url == null ? "" : url);
        intent.putExtra("status", status == null || status.isEmpty() ? "Player em desenvolvimento" : status);
        startActivity(intent);
    }

    private void showDetail(JSONObject item) {
        screen = "detail";
        base();
        addHeader(first(item, "title", "name", "category", "genre"), "Detalhes");

        LinearLayout box = panel();
        box.addView(text("Tipo: " + valueOrDash(first(item, "type", "content_type", "kind")), 22, false, TEXT), lp(-1, -2));
        box.addView(text("Qualidade: " + valueOrDash(first(item, "quality", "resolution")), 22, false, TEXT), lp(-1, -2));
        box.addView(text("Gênero: " + valueOrDash(first(item, "genre", "category_name")), 22, false, TEXT), lp(-1, -2));
        box.addView(text("Player em desenvolvimento", 22, true, ACCENT), lp(-1, -2));
        root.addView(box, lp(-1, -2));

        Button back = button("Voltar");
        back.setOnClickListener(v -> showHome());
        LinearLayout.LayoutParams backLp = lp(220, 66);
        backLp.setMargins(0, 28, 0, 0);
        root.addView(back, backLp);
        back.requestFocus();
    }

    private String valueOrDash(String value) {
        return value == null || value.isEmpty() ? "-" : value;
    }

    private TextView text(String s, int size, boolean bold, int color) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextColor(color);
        t.setTextSize(size);
        t.setPadding(0, 8, 0, 8);
        t.setIncludeFontPadding(true);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }

    private LinearLayout panel() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(26, 26, 26, 26);
        l.setBackground(bg(PANEL, ACCENT, 1));
        return l;
    }

    private Button button(String s) {
        Button b = new Button(this);
        b.setText(s);
        b.setTextSize(18);
        b.setAllCaps(false);
        b.setFocusable(true);
        b.setClickable(true);
        b.setTextColor(TEXT);
        b.setBackground(bg(Color.rgb(20, 28, 43), ACCENT, 1));
        b.setOnFocusChangeListener((v, focused) -> v.setBackground(bg(focused ? PANEL_FOCUS : Color.rgb(20, 28, 43), focused ? GOLD : ACCENT, focused ? 4 : 1)));
        return b;
    }

    private GradientDrawable bg(int color, int stroke, int width) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(10);
        d.setStroke(width, stroke);
        return d;
    }

    private String token() {
        if (accessToken.isEmpty()) accessToken = prefs.getString("access_token", "");
        return accessToken;
    }

    private JSONArray findArray(JSONObject json) {
        String[] keys = {"items", "channels", "categories", "data", "results", "contents"};
        for (String key : keys) {
            JSONArray arr = json.optJSONArray(key);
            if (arr != null) return arr;
            JSONObject nested = json.optJSONObject(key);
            if (nested != null) {
                JSONArray found = findArray(nested);
                if (found.length() > 0) return found;
            }
        }
        Iterator<String> it = json.keys();
        while (it.hasNext()) {
            Object value = json.opt(it.next());
            if (value instanceof JSONArray) return (JSONArray) value;
        }
        return new JSONArray();
    }

    private String first(JSONObject obj, String... keys) {
        for (String key : keys) {
            String value = obj.optString(key, "");
            if (!value.isEmpty() && !"null".equalsIgnoreCase(value)) return value;
        }
        return "";
    }

    private String findPlaybackUrl(JSONObject obj) {
        String direct = first(obj, "stream_url", "streamUrl", "playback_url", "playbackUrl", "url", "hls", "m3u8");
        if (!direct.isEmpty()) return direct;
        String[] nestedKeys = {"data", "playback", "stream", "channel"};
        for (String key : nestedKeys) {
            JSONObject nested = obj.optJSONObject(key);
            if (nested != null) {
                String found = findPlaybackUrl(nested);
                if (!found.isEmpty()) return found;
            }
        }
        return "";
    }

    private String join(String a, String b, String c) {
        String out = "";
        if (!a.isEmpty()) out = a;
        if (!b.isEmpty()) out += out.isEmpty() ? b : " • " + b;
        if (!c.isEmpty()) out += out.isEmpty() ? c : " • " + c;
        return out;
    }

    private String messageFor(Exception e, String fallback) {
        String msg = e.getMessage() == null ? "" : e.getMessage().toLowerCase();
        if (msg.contains("unknownhost") || msg.contains("timeout") || msg.contains("failed to connect")) return "Sem conexão.";
        if (msg.contains("401") || msg.contains("403")) return "Acesso expirado ou bloqueado. Fale com o suporte.";
        return fallback;
    }

    private LinearLayout.LayoutParams lp(int w, int h) {
        return new LinearLayout.LayoutParams(w, h);
    }

    private LinearLayout.LayoutParams lp(int w, int h, float weight) {
        return new LinearLayout.LayoutParams(w, h, weight);
    }

    private JSONObject request(String method, String path, JSONObject body, String token) throws Exception {
        URL url = new URL(API + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);
        conn.setRequestProperty("Content-Type", "application/json");
        if (token != null && !token.isEmpty()) conn.setRequestProperty("Authorization", "Bearer " + token);
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
        while ((line = br.readLine()) != null) sb.append(line);
        br.close();
        if (code < 200 || code >= 300) throw new Exception("HTTP " + code);
        return new JSONObject(sb.toString());
    }
}
