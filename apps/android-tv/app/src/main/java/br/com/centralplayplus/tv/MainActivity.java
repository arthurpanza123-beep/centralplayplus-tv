package br.com.centralplayplus.tv;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;

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

    private static final int BG = Color.rgb(8, 10, 16);
    private static final int BG_2 = Color.rgb(9, 19, 34);
    private static final int SURFACE = Color.rgb(18, 24, 36);
    private static final int SURFACE_2 = Color.rgb(25, 34, 51);
    private static final int TEXT = Color.WHITE;
    private static final int MUTED = Color.rgb(167, 174, 190);
    private static final int DIM = Color.rgb(104, 114, 133);
    private static final int BLUE = Color.rgb(37, 99, 235);
    private static final int CYAN = Color.rgb(34, 211, 238);
    private static final int AMBER = Color.rgb(245, 158, 11);

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable pollRunnable = new Runnable() {
        @Override public void run() {
            if ("activation".equals(screen)) {
                checkStatus(true);
                handler.postDelayed(this, 5000);
            }
        }
    };

    private SharedPreferences prefs;
    private LinearLayout root;
    private LinearLayout content;
    private TextView statusView;
    private String screen = "splash";
    private String deviceKey = "";
    private String accessToken = "";

    private JSONArray homeRows = new JSONArray();
    private JSONArray channels = new JSONArray();
    private JSONArray movies = new JSONArray();
    private JSONArray series = new JSONArray();
    private JSONArray categories = new JSONArray();

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("centralplayplus", MODE_PRIVATE);
        deviceKey = prefs.getString("device_key", "");
        accessToken = prefs.getString("access_token", "");
        showSplash();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(pollRunnable);
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if ("player".equals(screen)) {
            showHome();
            return;
        }
        if (!"home".equals(screen) && !"activation".equals(screen) && !"splash".equals(screen)) {
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

    private void showSplash() {
        screen = "splash";
        handler.removeCallbacks(pollRunnable);

        FrameLayout frame = new FrameLayout(this);
        frame.setBackground(gradient(BG, BG_2));
        setContentView(frame);

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(56, 56, 56, 56);
        frame.addView(box, new FrameLayout.LayoutParams(-1, -1));

        ImageView logo = new ImageView(this);
        logo.setImageResource(getResources().getIdentifier("cp_logo", "drawable", getPackageName()));
        logo.setAdjustViewBounds(true);
        box.addView(logo, lp(160, 160));

        TextView title = text("Central Play Plus", 38, true, TEXT);
        title.setGravity(Gravity.CENTER);
        box.addView(title, lp(-1, -2));

        TextView sub = text("Preparando seu catálogo...", 18, false, MUTED);
        sub.setGravity(Gravity.CENTER);
        box.addView(sub, lp(-1, -2));

        View barBg = new View(this);
        barBg.setBackground(round(Color.rgb(29, 38, 58), Color.TRANSPARENT, 0, 999));
        LinearLayout.LayoutParams bgLp = lp(360, 8);
        bgLp.setMargins(0, 30, 0, 0);
        box.addView(barBg, bgLp);

        new Thread(() -> {
            try { requestAny("GET", "/api/app/version?platform=android_tv", null, null); } catch (Exception ignored) {}
            handler.postDelayed(() -> {
                if (deviceKey.isEmpty()) {
                    showActivation("Registrando TV...");
                    registerDevice();
                } else if (!accessToken.isEmpty()) {
                    showHome();
                } else {
                    showActivation("Aguardando ativação...");
                    startPolling();
                }
            }, 900);
        }).start();
    }

    private void base(String active) {
        handler.removeCallbacks(pollRunnable);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(44, 28, 44, 32);
        root.setBackground(gradient(BG, BG_2));
        setContentView(root);
        addTopbar(active);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        root.addView(content, lp(-1, 0, 1));
    }

    private void addTopbar(String active) {
        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);
        root.addView(top, lp(-1, 76));

        ImageView logo = new ImageView(this);
        logo.setImageResource(getResources().getIdentifier("cp_logo", "drawable", getPackageName()));
        logo.setAdjustViewBounds(true);
        top.addView(logo, lp(54, 54));

        TextView brand = text("Central Play Plus", 28, true, TEXT);
        LinearLayout.LayoutParams brandLp = lp(265, -2);
        brandLp.setMargins(14, 0, 20, 0);
        top.addView(brand, brandLp);

        String[] tabs = {"Home", "Canais", "Filmes", "Séries", "Categorias", "Favoritos"};
        for (String tab : tabs) {
            Button b = pill(tab, tab.equals(active));
            top.addView(b, lp(tab.equals("Categorias") ? 176 : 136, 54));
            if ("Home".equals(tab)) b.setOnClickListener(v -> showHome());
            if ("Canais".equals(tab)) b.setOnClickListener(v -> showChannels());
            if ("Filmes".equals(tab)) b.setOnClickListener(v -> showMovies());
            if ("Séries".equals(tab)) b.setOnClickListener(v -> showSeries());
            if ("Categorias".equals(tab)) b.setOnClickListener(v -> showCategories());
            if ("Favoritos".equals(tab)) b.setOnClickListener(v -> showFavorites());
        }
    }

    private void showActivation(String message) {
        screen = "activation";
        handler.removeCallbacks(pollRunnable);

        FrameLayout frame = new FrameLayout(this);
        frame.setBackground(gradient(BG, BG_2));
        setContentView(frame);

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER_HORIZONTAL);
        box.setPadding(72, 52, 72, 52);
        frame.addView(box, new FrameLayout.LayoutParams(-1, -1));

        ImageView logo = new ImageView(this);
        logo.setImageResource(getResources().getIdentifier("cp_logo", "drawable", getPackageName()));
        logo.setAdjustViewBounds(true);
        box.addView(logo, lp(118, 118));

        TextView title = text("Central Play Plus", 34, true, TEXT);
        title.setGravity(Gravity.CENTER);
        box.addView(title, lp(-1, -2));

        TextView hint = text("Informe esta chave para ativar sua TV.", 24, false, MUTED);
        hint.setGravity(Gravity.CENTER);
        box.addView(hint, lp(-1, -2));

        LinearLayout keyPanel = new LinearLayout(this);
        keyPanel.setGravity(Gravity.CENTER);
        keyPanel.setPadding(28, 18, 28, 18);
        keyPanel.setBackground(round(Color.rgb(12, 18, 31), CYAN, 2, 18));
        LinearLayout.LayoutParams keyPanelLp = lp(-1, 178);
        keyPanelLp.setMargins(90, 34, 90, 18);
        box.addView(keyPanel, keyPanelLp);

        TextView key = text(deviceKey.isEmpty() ? "------" : deviceKey, 66, true, CYAN);
        key.setGravity(Gravity.CENTER);
        key.setLetterSpacing(0.08f);
        keyPanel.addView(key, lp(-1, -2));

        statusView = text(message, 22, false, MUTED);
        statusView.setGravity(Gravity.CENTER);
        box.addView(statusView, lp(-1, -2));

        Button verify = primaryButton("Verificar agora");
        LinearLayout.LayoutParams btnLp = lp(360, 70);
        btnLp.setMargins(0, 28, 0, 0);
        box.addView(verify, btnLp);
        verify.setOnClickListener(v -> checkStatus(false));
        verify.requestFocus();
    }

    private void showHome() {
        screen = "home";
        base("Home");
        statusView = muted("Carregando experiência...");
        content.addView(statusView, lp(-1, -2));
        loadHome();
    }

    private void showChannels() {
        screen = "channels";
        base("Canais");
        addPageTitle("Canais ao vivo", "Escolha um canal para assistir agora");
        statusView = muted("Carregando canais...");
        content.addView(statusView, lp(-1, -2));
        loadChannels(() -> renderGrid(channels, "channels", "Nenhum canal encontrado."));
    }

    private void showMovies() {
        screen = "movies";
        base("Filmes");
        addPageTitle("Filmes", "Destaques do catálogo");
        ensureCatalog(() -> renderGrid(movies, "movies", "Nenhum filme encontrado."));
    }

    private void showSeries() {
        screen = "series";
        base("Séries");
        addPageTitle("Séries", "Temporadas e coleções em destaque");
        ensureCatalog(() -> renderGrid(series, "series", "Nenhuma série encontrada."));
    }

    private void showCategories() {
        screen = "categories";
        base("Categorias");
        addPageTitle("Categorias", "Navegue por gêneros e canais");
        statusView = muted("Carregando categorias...");
        content.addView(statusView, lp(-1, -2));
        loadCategories();
    }

    private void showFavorites() {
        screen = "favorites";
        base("Favoritos");
        addPageTitle("Favoritos", "Salvos neste aparelho");
        renderGrid(loadFavorites(), "favorites", "Nenhum favorito salvo.");
    }

    private void addPageTitle(String title, String sub) {
        TextView t = text(title, 32, true, TEXT);
        TextView s = text(sub, 18, false, MUTED);
        content.addView(t, lp(-1, -2));
        content.addView(s, lp(-1, -2));
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
                        prefs.edit().putString("access_token", accessToken).putString("refresh_token", refreshToken).apply();
                        runOnUiThread(this::showHome);
                        return;
                    }
                }
                runOnUiThread(() -> statusView.setText(("expired".equalsIgnoreCase(status) || "blocked".equalsIgnoreCase(status))
                    ? "Acesso expirado ou bloqueado. Fale com o suporte."
                    : "Aguardando ativação..."));
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void ensureCatalog(Runnable done) {
        if (homeRows.length() > 0 || movies.length() > 0 || series.length() > 0) {
            done.run();
            return;
        }
        statusView = muted("Carregando catálogo...");
        content.addView(statusView, lp(-1, -2));
        new Thread(() -> {
            try {
                JSONObject home = request("GET", "/api/tv/home", null, token());
                parseHome(home);
                runOnUiThread(done);
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void loadHome() {
        new Thread(() -> {
            try {
                JSONObject home = request("GET", "/api/tv/home", null, token());
                parseHome(home);
                channels = loadChannelPages();
                runOnUiThread(() -> renderHome(home));
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void loadChannels(Runnable done) {
        new Thread(() -> {
            try {
                channels = loadChannelPages();
                runOnUiThread(done);
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void loadCategories() {
        new Thread(() -> {
            try {
                Object json = requestAny("GET", "/api/tv/categories", null, token());
                categories = toArray(json);
                runOnUiThread(() -> renderGrid(categories, "categories", "Nenhuma categoria encontrada."));
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private JSONArray loadChannelPages() throws Exception {
        JSONArray all = new JSONArray();
        boolean hasMore = true;
        for (int page = 1; page <= 3 && hasMore && all.length() < 100; page++) {
            Object response = requestAny("GET", "/api/tv/channels?page=" + page + "&page_size=80", null, token());
            JSONArray items = toArray(response);
            for (int i = 0; i < items.length() && all.length() < 100; i++) all.put(items.opt(i));
            hasMore = response instanceof JSONObject && ((JSONObject) response).optBoolean("has_more", ((JSONObject) response).optBoolean("hasMore", false));
        }
        return all;
    }

    private void parseHome(JSONObject home) {
        homeRows = home.optJSONArray("rows");
        if (homeRows == null) homeRows = home.optJSONArray("sections");
        if (homeRows == null) homeRows = new JSONArray();
        movies = new JSONArray();
        series = new JSONArray();
        for (int i = 0; i < homeRows.length(); i++) {
            JSONObject row = homeRows.optJSONObject(i);
            if (row == null) continue;
            String rowType = row.optString("type", "");
            JSONArray items = row.optJSONArray("items");
            if (items == null) continue;
            for (int j = 0; j < items.length(); j++) {
                JSONObject item = items.optJSONObject(j);
                if (item == null) continue;
                String type = first(item, "type", "content_type", "kind");
                if (type.isEmpty()) type = rowType;
                if (isMovie(type)) movies.put(item);
                else if (isSeries(type)) series.put(item);
            }
        }
    }

    private void renderHome(JSONObject home) {
        content.removeAllViews();
        JSONObject featured = firstFeatured();
        addHero(featured);
        if (channels.length() > 0) addRow("Canais ao vivo", channels, "home", 22);
        if (movies.length() > 0) addRow("Filmes em destaque", movies, "movies", 24);
        if (series.length() > 0) addRow("Séries em destaque", series, "series", 24);
        JSONArray recent = loadRecent();
        if (recent.length() > 0) addRow("Continue assistindo", recent, "home", 12);
        if (channels.length() == 0 && movies.length() == 0 && series.length() == 0) content.addView(muted("Nenhum conteúdo encontrado."), lp(-1, -2));
    }

    private JSONObject firstFeatured() {
        if (movies.length() > 0) return movies.optJSONObject(0);
        if (series.length() > 0) return series.optJSONObject(0);
        if (channels.length() > 0) return channels.optJSONObject(0);
        return null;
    }

    private void addHero(JSONObject item) {
        LinearLayout hero = new LinearLayout(this);
        hero.setOrientation(LinearLayout.VERTICAL);
        hero.setGravity(Gravity.BOTTOM);
        hero.setPadding(34, 28, 34, 28);
        hero.setBackground(gradient(Color.rgb(14, 28, 55), Color.rgb(7, 10, 18), CYAN));
        LinearLayout.LayoutParams heroLp = lp(-1, 230);
        heroLp.setMargins(0, 14, 0, 16);
        content.addView(hero, heroLp);

        TextView badge = text("DESTAQUE", 14, true, CYAN);
        hero.addView(badge, lp(-1, -2));

        String title = item == null ? "Central Play Plus" : first(item, "title", "name");
        TextView h = text(title.isEmpty() ? "Central Play Plus" : title, 42, true, TEXT);
        h.setMaxLines(2);
        hero.addView(h, lp(-1, -2));

        String meta = item == null ? "Canais, filmes e séries em um só lugar" : join(first(item, "type"), first(item, "quality"), first(item, "genre", "category"));
        TextView m = text(meta, 18, false, MUTED);
        hero.addView(m, lp(-1, -2));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        hero.addView(actions, lp(-1, -2));
        Button play = primaryButton("Assistir");
        actions.addView(play, lp(190, 58));
        play.setOnClickListener(v -> {
            if (item == null) showChannels();
            else openItem(item, "home");
        });
    }

    private void addRow(String title, JSONArray items, String source, int limit) {
        TextView t = text(title, 24, true, TEXT);
        LinearLayout.LayoutParams titleLp = lp(-1, -2);
        titleLp.setMargins(0, 18, 0, 8);
        content.addView(t, titleLp);

        HorizontalScrollView scroll = new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(0, 6, 0, 12);
        scroll.addView(row);
        int count = Math.min(items.length(), limit);
        for (int i = 0; i < count; i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            row.addView(card(item, source, 292, 176));
        }
        content.addView(scroll, lp(-1, 204));
    }

    private void renderGrid(JSONArray items, String source, String empty) {
        if (statusView != null) content.removeView(statusView);
        if (items.length() == 0) {
            content.addView(muted(empty), lp(-1, -2));
            return;
        }
        ScrollView scroll = new ScrollView(this);
        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        grid.setPadding(0, 18, 0, 36);
        scroll.addView(grid);

        LinearLayout row = null;
        int columns = "categories".equals(source) ? 4 : 5;
        for (int i = 0; i < items.length(); i++) {
            if (i % columns == 0) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                grid.addView(row, lp(-1, -2));
            }
            JSONObject item = items.optJSONObject(i);
            if (item == null || row == null) continue;
            row.addView(card(item, source, "categories".equals(source) ? 260 : 224, "categories".equals(source) ? 122 : 150));
        }
        content.addView(scroll, lp(-1, 0, 1));
    }

    private TextView card(JSONObject item, String source, int w, int h) {
        String title = first(item, "title", "name", "category", "genre");
        String type = first(item, "type", "content_type", "kind");
        String quality = first(item, "quality", "resolution");
        String genre = first(item, "genre", "category_name");
        String meta = join(type, quality, genre);

        TextView card = text(compact(title.isEmpty() ? "Sem título" : title, 42), 18, true, TEXT);
        if (!meta.isEmpty()) card.setText(card.getText() + "\n" + compact(meta, 44));
        card.setGravity(Gravity.BOTTOM | Gravity.LEFT);
        card.setPadding(18, 16, 18, 16);
        card.setFocusable(true);
        card.setClickable(true);
        card.setMaxLines(2);
        card.setBackground(gradient(Color.rgb(18, 25, 39), Color.rgb(8, 12, 22), Color.rgb(52, 74, 102)));
        card.setOnFocusChangeListener((v, focused) -> {
            v.setBackground(focused
                ? gradient(Color.rgb(24, 40, 72), Color.rgb(10, 18, 33), CYAN)
                : gradient(Color.rgb(18, 25, 39), Color.rgb(8, 12, 22), Color.rgb(52, 74, 102)));
            v.setScaleX(focused ? 1.07f : 1f);
            v.setScaleY(focused ? 1.07f : 1f);
        });
        card.setOnClickListener(v -> openItem(item, source));
        LinearLayout.LayoutParams lp = lp(w, h);
        lp.setMargins(0, 0, 18, 18);
        card.setLayoutParams(lp);
        return card;
    }

    private void openItem(JSONObject item, String source) {
        String type = first(item, "type", "content_type", "kind");
        if ("categories".equals(source)) {
            showCategoryItems(item);
        } else if ("channels".equals(source) || "home".equals(source) && isLive(type)) {
            openPlayback(item);
        } else {
            showDetail(item);
        }
    }

    private void showDetail(JSONObject item) {
        screen = "detail";
        base("");
        String title = first(item, "title", "name", "category", "genre");
        addPageTitle(title.isEmpty() ? "Detalhes" : title, join(first(item, "type"), first(item, "quality"), first(item, "genre", "category_name")));
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(32, 28, 32, 28);
        panel.setBackground(round(SURFACE, Color.rgb(55, 78, 108), 1, 16));
        content.addView(panel, lp(-1, 230));
        panel.addView(text("Conteúdo disponível em breve para reprodução.", 24, true, TEXT), lp(-1, -2));
        panel.addView(text("Use Favoritos para salvar este título neste aparelho.", 18, false, MUTED), lp(-1, -2));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        content.addView(actions, lp(-1, -2));
        Button fav = primaryButton(isFavorite(item) ? "Remover favorito" : "Favoritar");
        Button back = secondaryButton("Voltar");
        actions.addView(fav, lp(250, 64));
        actions.addView(back, lp(180, 64));
        fav.setOnClickListener(v -> {
            toggleFavorite(item);
            fav.setText(isFavorite(item) ? "Remover favorito" : "Favoritar");
        });
        back.setOnClickListener(v -> showHome());
        fav.requestFocus();
    }

    private void showCategoryItems(JSONObject category) {
        screen = "category";
        base("Categorias");
        String name = first(category, "name", "title", "category", "genre");
        addPageTitle(name.isEmpty() ? "Categoria" : name, "Itens filtrados localmente");
        JSONArray filtered = new JSONArray();
        for (int i = 0; i < channels.length(); i++) {
            JSONObject item = channels.optJSONObject(i);
            if (item != null && name.equalsIgnoreCase(first(item, "category", "genre", "category_name"))) filtered.put(item);
        }
        for (int i = 0; i < movies.length(); i++) {
            JSONObject item = movies.optJSONObject(i);
            if (item != null && name.equalsIgnoreCase(first(item, "genre", "category", "category_name"))) filtered.put(item);
        }
        for (int i = 0; i < series.length(); i++) {
            JSONObject item = series.optJSONObject(i);
            if (item != null && name.equalsIgnoreCase(first(item, "genre", "category", "category_name"))) filtered.put(item);
        }
        renderGrid(filtered, "home", "Filtro de categoria em desenvolvimento.");
    }

    private void openPlayback(JSONObject item) {
        String id = first(item, "id", "channel_id", "channelId", "stream_id", "streamId");
        if (id.isEmpty()) {
            showDetail(item);
            return;
        }
        String title = first(item, "title", "name");
        rememberRecent(item);
        new Thread(() -> {
            try {
                JSONObject json = request("GET", "/api/tv/channel/" + id + "/play", null, token());
                String url = findPlaybackUrl(json);
                String status = first(json, "status", "message", "error");
                String mimeType = first(json, "mime_type", "mimeType", "content_type", "contentType");
                String streamFormat = first(json, "stream_format", "streamFormat");
                runOnUiThread(() -> openPlayer(title, absoluteUrl(url), status.isEmpty() ? "OK" : status, mimeType, streamFormat));
            } catch (Exception e) {
                runOnUiThread(() -> openPlayer(title, "", messageFor(e, "Não foi possível iniciar este canal."), "", ""));
            }
        }).start();
    }

    private void openPlayer(String title, String url, String status, String mimeType, String streamFormat) {
        Intent intent = new Intent(this, PlayerActivity.class);
        intent.putExtra("title", title == null || title.isEmpty() ? "Canal" : title);
        intent.putExtra("url", url == null ? "" : url);
        intent.putExtra("status", status == null || status.isEmpty() ? "Não foi possível iniciar este canal." : status);
        intent.putExtra("mime_type", mimeType == null ? "" : mimeType);
        intent.putExtra("stream_format", streamFormat == null ? "" : streamFormat);
        startActivity(intent);
    }

    private JSONArray loadFavorites() {
        try { return new JSONArray(prefs.getString("favorites_json", "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    private boolean isFavorite(JSONObject item) {
        String id = first(item, "id", "title", "name");
        JSONArray favs = loadFavorites();
        for (int i = 0; i < favs.length(); i++) {
            JSONObject fav = favs.optJSONObject(i);
            if (fav != null && id.equals(first(fav, "id", "title", "name"))) return true;
        }
        return false;
    }

    private void toggleFavorite(JSONObject item) {
        String id = first(item, "id", "title", "name");
        JSONArray favs = loadFavorites();
        JSONArray next = new JSONArray();
        boolean removed = false;
        for (int i = 0; i < favs.length(); i++) {
            JSONObject fav = favs.optJSONObject(i);
            if (fav != null && id.equals(first(fav, "id", "title", "name"))) removed = true;
            else if (fav != null) next.put(fav);
        }
        if (!removed) next.put(item);
        prefs.edit().putString("favorites_json", next.toString()).apply();
    }

    private JSONArray loadRecent() {
        try { return new JSONArray(prefs.getString("recent_json", "[]")); } catch (Exception e) { return new JSONArray(); }
    }

    private void rememberRecent(JSONObject item) {
        JSONArray current = loadRecent();
        JSONArray next = new JSONArray();
        String id = first(item, "id", "title", "name");
        next.put(item);
        for (int i = 0; i < current.length() && next.length() < 12; i++) {
            JSONObject old = current.optJSONObject(i);
            if (old != null && !id.equals(first(old, "id", "title", "name"))) next.put(old);
        }
        prefs.edit().putString("recent_json", next.toString()).apply();
    }

    private boolean isLive(String type) {
        String t = type == null ? "" : type.toLowerCase();
        return t.contains("live") || t.contains("channel") || t.contains("canal") || t.contains("tv");
    }

    private boolean isMovie(String type) {
        String t = type == null ? "" : type.toLowerCase();
        return t.contains("movie") || t.contains("filme") || t.contains("vod");
    }

    private boolean isSeries(String type) {
        String t = type == null ? "" : type.toLowerCase();
        return t.contains("series") || t.contains("serie");
    }

    private TextView text(String s, int size, boolean bold, int color) {
        TextView t = new TextView(this);
        t.setText(s == null ? "" : s);
        t.setTextColor(color);
        t.setTextSize(size);
        t.setPadding(0, 6, 0, 6);
        t.setIncludeFontPadding(true);
        t.setLineSpacing(0, 1.02f);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }

    private TextView muted(String s) {
        return text(s, 20, false, MUTED);
    }

    private Button pill(String s, boolean active) {
        Button b = baseButton(s);
        b.setTextSize(16);
        b.setBackground(round(active ? BLUE : Color.rgb(18, 24, 36), active ? CYAN : Color.rgb(45, 61, 82), active ? 2 : 1, 999));
        b.setOnFocusChangeListener((v, focused) -> v.setBackground(round(focused ? BLUE : active ? BLUE : Color.rgb(18, 24, 36), focused ? CYAN : active ? CYAN : Color.rgb(45, 61, 82), focused ? 3 : active ? 2 : 1, 999)));
        return b;
    }

    private Button primaryButton(String s) {
        Button b = baseButton(s);
        b.setBackground(round(BLUE, CYAN, 2, 12));
        b.setOnFocusChangeListener((v, focused) -> v.setBackground(round(focused ? Color.rgb(30, 136, 250) : BLUE, CYAN, focused ? 4 : 2, 12)));
        return b;
    }

    private Button secondaryButton(String s) {
        Button b = baseButton(s);
        b.setBackground(round(SURFACE, Color.rgb(64, 86, 116), 1, 12));
        b.setOnFocusChangeListener((v, focused) -> v.setBackground(round(focused ? SURFACE_2 : SURFACE, focused ? CYAN : Color.rgb(64, 86, 116), focused ? 3 : 1, 12)));
        return b;
    }

    private Button baseButton(String s) {
        Button b = new Button(this);
        b.setText(s);
        b.setAllCaps(false);
        b.setTextColor(TEXT);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setFocusable(true);
        b.setClickable(true);
        b.setPadding(10, 0, 10, 0);
        return b;
    }

    private GradientDrawable round(int color, int stroke, int width, int radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(radius);
        if (width > 0) d.setStroke(width, stroke);
        return d;
    }

    private GradientDrawable gradient(int start, int end) {
        GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[] { start, end });
        d.setCornerRadius(0);
        return d;
    }

    private GradientDrawable gradient(int start, int end, int stroke) {
        GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[] { start, end });
        d.setCornerRadius(16);
        d.setStroke(2, stroke);
        return d;
    }

    private String token() {
        if (accessToken.isEmpty()) accessToken = prefs.getString("access_token", "");
        return accessToken;
    }

    private JSONArray toArray(Object value) {
        if (value instanceof JSONArray) return (JSONArray) value;
        if (value instanceof JSONObject) return findArray((JSONObject) value);
        return new JSONArray();
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
        if (obj == null) return "";
        for (String key : keys) {
            String value = obj.optString(key, "");
            if (!value.isEmpty() && !"null".equalsIgnoreCase(value)) return value;
        }
        return "";
    }

    private String findPlaybackUrl(JSONObject obj) {
        String direct = first(obj, "playback_url", "playbackUrl", "stream_url", "streamUrl", "url", "proxy_url", "proxyUrl", "hls", "m3u8");
        if (!direct.isEmpty()) return direct;
        String[] nestedKeys = {"data", "playback", "stream", "channel", "selected_variant", "selectedVariant"};
        for (String key : nestedKeys) {
            JSONObject nested = obj.optJSONObject(key);
            if (nested != null) {
                String found = findPlaybackUrl(nested);
                if (!found.isEmpty()) return found;
            }
        }
        return "";
    }

    private String absoluteUrl(String url) {
        if (url == null || url.isEmpty()) return "";
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        if (url.startsWith("/")) return API + url;
        return API + "/" + url;
    }

    private String compact(String value, int max) {
        if (value == null) return "";
        return value.length() > max ? value.substring(0, Math.max(0, max - 3)) + "..." : value;
    }

    private String join(String a, String b, String c) {
        String out = "";
        if (a != null && !a.isEmpty()) out = a;
        if (b != null && !b.isEmpty()) out += out.isEmpty() ? b : " • " + b;
        if (c != null && !c.isEmpty()) out += out.isEmpty() ? c : " • " + c;
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
        Object value = requestAny(method, path, body, token);
        if (value instanceof JSONObject) return (JSONObject) value;
        JSONObject wrapped = new JSONObject();
        wrapped.put("items", value);
        return wrapped;
    }

    private Object requestAny(String method, String path, JSONObject body, String token) throws Exception {
        URL url = new URL(API + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(12000);
        conn.setReadTimeout(22000);
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
        return new JSONTokener(sb.toString()).nextValue();
    }
}
