package br.com.centralplayplus.tv;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String API = "https://device.centralplayplus.com.br";
    private static final String PLATFORM = "android_tv";

    private static final int BG = Color.rgb(14, 15, 18);
    private static final int BG_2 = Color.rgb(4, 6, 12);
    private static final int SURFACE = Color.rgb(28, 30, 36);
    private static final int SURFACE_2 = Color.rgb(43, 47, 58);
    private static final int TEXT = Color.rgb(248, 250, 252);
    private static final int MUTED = Color.rgb(158, 166, 179);
    private static final int DIM = Color.rgb(92, 100, 116);
    private static final int BLUE = Color.rgb(37, 99, 235);
    private static final int CYAN = Color.rgb(34, 211, 238);
    private static final int AMBER = Color.rgb(245, 158, 11);
    private static final int GLASS = Color.argb(178, 0, 0, 0);
    private static final String BUILD_MARKER = "Android TV " + BuildConfig.VERSION_NAME + " · " + BuildConfig.GIT_SHA;

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
    private final ExecutorService imagePool = Executors.newFixedThreadPool(4);
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
    private int channelsPage = 0;
    private int moviesPage = 0;
    private int seriesPage = 0;
    private boolean channelsHasMore = false;
    private boolean moviesHasMore = false;
    private boolean seriesHasMore = false;
    private int totalLive = 0;
    private int totalMovies = 0;
    private int totalSeries = 0;
    private int totalLiveCategories = 0;
    private int totalVodCategories = 0;
    private int totalSeriesCategories = 0;

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
        imagePool.shutdownNow();
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

        FrameLayout frame = brandedFrame(false);
        setContentView(frame);

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(56, 56, 56, 56);
        frame.addView(box, new FrameLayout.LayoutParams(-1, -1));

        ImageView logo = new ImageView(this);
        logo.setImageResource(getResources().getIdentifier("cp_logo", "drawable", getPackageName()));
        logo.setAdjustViewBounds(true);
        box.addView(logo, lp(360, 124));

        ImageView mascot = new ImageView(this);
        mascot.setImageResource(getResources().getIdentifier("mascot_icon", "drawable", getPackageName()));
        mascot.setAdjustViewBounds(true);
        LinearLayout.LayoutParams mascotLp = lp(118, 118);
        mascotLp.setMargins(0, 18, 0, 0);
        box.addView(mascot, mascotLp);

        TextView title = text("Central Play Plus", 32, true, TEXT);
        title.setGravity(Gravity.CENTER);
        box.addView(title, lp(-1, -2));

        TextView sub = text("Preparando seu catálogo real...", 18, false, MUTED);
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
        FrameLayout frame = brandedFrame(false);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(34, 24, 34, 28);
        root.setBackgroundColor(Color.TRANSPARENT);
        frame.addView(root, new FrameLayout.LayoutParams(-1, -1));
        setContentView(frame);
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
        top.addView(logo, lp(190, 58));

        TextView plan = text("Plano ativado", 13, true, AMBER);
        plan.setGravity(Gravity.CENTER);
        plan.setBackground(round(Color.argb(34, 245, 158, 11), Color.argb(120, 245, 158, 11), 1, 14));
        LinearLayout.LayoutParams planLp = lp(130, 42);
        planLp.setMargins(12, 0, 20, 0);
        top.addView(plan, planLp);

        String[] tabs = {"Home", "Canais", "Filmes", "Séries", "Categorias", "Favoritos"};
        for (String tab : tabs) {
            Button b = pill(tab, tab.equals(active));
            top.addView(b, lp(tab.equals("Categorias") ? 145 : tab.equals("Favoritos") ? 135 : tab.equals("Home") ? 110 : 118, 50));
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

        FrameLayout frame = brandedFrame(true);
        setContentView(frame);

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(56, 42, 56, 42);
        frame.addView(box, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(44, 34, 44, 34);
        card.setBackground(gradient(GLASS, Color.argb(210, 7, 10, 18), Color.argb(70, 255, 255, 255), 28));
        LinearLayout.LayoutParams cardLp = lp(560, -2);
        box.addView(card, cardLp);

        ImageView logo = new ImageView(this);
        logo.setImageResource(getResources().getIdentifier("cp_logo", "drawable", getPackageName()));
        logo.setAdjustViewBounds(true);
        card.addView(logo, lp(330, 100));

        TextView title = text("Ative sua TV", 34, true, TEXT);
        title.setGravity(Gravity.CENTER);
        card.addView(title, lp(-1, -2));

        TextView hint = text("Informe o código abaixo no painel de ativação.", 17, false, Color.rgb(205, 213, 225));
        hint.setGravity(Gravity.CENTER);
        card.addView(hint, lp(-1, -2));

        LinearLayout keyPanel = new LinearLayout(this);
        keyPanel.setGravity(Gravity.CENTER);
        keyPanel.setOrientation(LinearLayout.VERTICAL);
        keyPanel.setPadding(28, 16, 28, 16);
        keyPanel.setBackground(round(Color.argb(54, 255, 255, 255), Color.argb(42, 255, 255, 255), 1, 18));
        LinearLayout.LayoutParams keyPanelLp = lp(-1, 142);
        keyPanelLp.setMargins(0, 26, 0, 16);
        card.addView(keyPanel, keyPanelLp);

        TextView label = text("DEVICE KEY", 10, true, Color.argb(150, 255, 255, 255));
        label.setGravity(Gravity.CENTER);
        label.setLetterSpacing(0.32f);
        keyPanel.addView(label, lp(-1, -2));

        TextView key = text(deviceKey.isEmpty() ? "------" : deviceKey, 66, true, CYAN);
        key.setGravity(Gravity.CENTER);
        key.setLetterSpacing(0.08f);
        keyPanel.addView(key, lp(-1, -2));

        statusView = text(message, 22, false, MUTED);
        statusView.setGravity(Gravity.CENTER);
        card.addView(statusView, lp(-1, -2));

        Button verify = primaryButton("Verificar ativação");
        LinearLayout.LayoutParams btnLp = lp(-1, 68);
        btnLp.setMargins(0, 28, 0, 0);
        card.addView(verify, btnLp);
        verify.setOnClickListener(v -> checkStatus(false));
        verify.requestFocus();

        TextView build = text(BUILD_MARKER, 12, false, Color.argb(120, 255, 255, 255));
        build.setGravity(Gravity.RIGHT);
        FrameLayout.LayoutParams buildLp = new FrameLayout.LayoutParams(-2, -2, Gravity.RIGHT | Gravity.BOTTOM);
        buildLp.setMargins(0, 0, 28, 18);
        frame.addView(build, buildLp);
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
        channels = new JSONArray();
        channelsPage = 0;
        loadMoreChannels();
    }

    private void showMovies() {
        screen = "movies";
        base("Filmes");
        addPageTitle("Filmes", "Catálogo completo com carregamento incremental");
        statusView = muted("Carregando filmes...");
        content.addView(statusView, lp(-1, -2));
        movies = new JSONArray();
        moviesPage = 0;
        loadMoreMovies();
    }

    private void showSeries() {
        screen = "series";
        base("Séries");
        addPageTitle("Séries", "Catálogo completo com carregamento incremental");
        statusView = muted("Carregando séries...");
        content.addView(statusView, lp(-1, -2));
        series = new JSONArray();
        seriesPage = 0;
        loadMoreSeries();
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
        TextView t = text(title, 36, true, TEXT);
        TextView s = text(sub, 17, false, MUTED);
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
                JSONObject firstChannels = loadPage("/api/tv/channels", 1);
                channels = toArray(firstChannels);
                channelsPage = 1;
                channelsHasMore = firstChannels.optBoolean("has_more", false);
                readCounts(firstChannels);
                runOnUiThread(() -> renderHome(home));
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void loadMoreChannels() {
        if (statusView != null) statusView.setText(channelsPage == 0 ? "Carregando canais..." : "Carregando mais canais...");
        new Thread(() -> {
            try {
                JSONObject page = loadPage("/api/tv/channels", channelsPage + 1);
                appendItems(channels, toArray(page));
                channelsPage = page.optInt("page", channelsPage + 1);
                channelsHasMore = page.optBoolean("has_more", false);
                readCounts(page);
                runOnUiThread(() -> renderGrid(channels, "channels", "Nenhum canal encontrado."));
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void loadMoreMovies() {
        if (statusView != null) statusView.setText(moviesPage == 0 ? "Carregando filmes..." : "Carregando mais filmes...");
        new Thread(() -> {
            try {
                JSONObject page = loadPage("/api/tv/movies", moviesPage + 1);
                appendItems(movies, toArray(page));
                moviesPage = page.optInt("page", moviesPage + 1);
                moviesHasMore = page.optBoolean("has_more", false);
                readCounts(page);
                runOnUiThread(() -> renderGrid(movies, "movies", "Nenhum filme encontrado."));
            } catch (Exception e) {
                runOnUiThread(() -> statusView.setText(messageFor(e, "Sem conexão.")));
            }
        }).start();
    }

    private void loadMoreSeries() {
        if (statusView != null) statusView.setText(seriesPage == 0 ? "Carregando séries..." : "Carregando mais séries...");
        new Thread(() -> {
            try {
                JSONObject page = loadPage("/api/tv/series", seriesPage + 1);
                appendItems(series, toArray(page));
                seriesPage = page.optInt("page", seriesPage + 1);
                seriesHasMore = page.optBoolean("has_more", false);
                readCounts(page);
                runOnUiThread(() -> renderGrid(series, "series", "Nenhuma série encontrada."));
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

    private JSONObject loadPage(String endpoint, int page) throws Exception {
        Object response = requestAny("GET", endpoint + "?page=" + page + "&limit=100", null, token());
        if (response instanceof JSONObject) return (JSONObject) response;
        JSONObject wrapped = new JSONObject();
        wrapped.put("items", response);
        wrapped.put("page", page);
        wrapped.put("has_more", false);
        return wrapped;
    }

    private void appendItems(JSONArray target, JSONArray items) {
        for (int i = 0; i < items.length(); i++) target.put(items.opt(i));
    }

    private void parseHome(JSONObject home) {
        readCounts(home);
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
        addStats();
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
        FrameLayout heroFrame = new FrameLayout(this);
        LinearLayout.LayoutParams heroLp = lp(-1, 318);
        heroLp.setMargins(0, 8, 0, 18);
        content.addView(heroFrame, heroLp);

        ImageView image = new ImageView(this);
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        image.setBackground(gradient(Color.rgb(20, 22, 30), Color.rgb(5, 7, 13), Color.TRANSPARENT, 18));
        heroFrame.addView(image, new FrameLayout.LayoutParams(-1, -1));
        if (item != null) {
            String heroUrl = first(item, "backdrop", "poster", "cover", "logo", "stream_icon", "image");
            if (!heroUrl.isEmpty()) loadImage(heroUrl, image);
        }

        View shade = new View(this);
        shade.setBackground(gradient(Color.argb(245, 5, 7, 13), Color.argb(120, 5, 7, 13), Color.argb(70, 255, 255, 255), 18));
        heroFrame.addView(shade, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout hero = new LinearLayout(this);
        hero.setOrientation(LinearLayout.VERTICAL);
        hero.setGravity(Gravity.BOTTOM);
        hero.setPadding(42, 34, 42, 34);
        heroFrame.addView(hero, new FrameLayout.LayoutParams(-1, -1));

        TextView badge = text("DESTAQUE", 13, true, CYAN);
        badge.setBackground(round(Color.argb(38, 37, 99, 235), Color.argb(105, 34, 211, 238), 1, 8));
        badge.setPadding(12, 4, 12, 4);
        hero.addView(badge, lp(-1, -2));

        String title = item == null ? "Central Play Plus" : first(item, "title", "name");
        TextView h = text(title.isEmpty() ? "Central Play Plus" : title, 50, true, TEXT);
        h.setMaxLines(2);
        hero.addView(h, lp(-1, -2));

        String meta = item == null ? "Canais, filmes e séries em um só lugar" : join(first(item, "type"), first(item, "quality"), first(item, "genre", "category"));
        TextView m = text(meta, 18, false, Color.rgb(218, 226, 238));
        hero.addView(m, lp(-1, -2));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        hero.addView(actions, lp(-1, -2));
        Button play = whiteButton("Assistir");
        LinearLayout.LayoutParams playLp = lp(202, 60);
        playLp.setMargins(0, 12, 12, 0);
        actions.addView(play, playLp);
        play.setOnClickListener(v -> {
            if (item == null) showChannels();
            else openItem(item, "home");
        });
        Button more = secondaryButton("Mais informações");
        LinearLayout.LayoutParams moreLp = lp(250, 60);
        moreLp.setMargins(0, 12, 0, 0);
        actions.addView(more, moreLp);
        more.setOnClickListener(v -> {
            if (item == null) showMovies();
            else showDetail(item);
        });
    }

    private void addStats() {
        if (totalLive <= 0 && totalMovies <= 0 && totalSeries <= 0) return;
        LinearLayout stats = new LinearLayout(this);
        stats.setOrientation(LinearLayout.HORIZONTAL);
        stats.setPadding(0, 0, 0, 0);
        content.addView(stats, lp(-1, 86));
        stats.addView(statBox("Canais", totalLive), lp(220, 72));
        stats.addView(statBox("Filmes", totalMovies), lp(220, 72));
        stats.addView(statBox("Séries", totalSeries), lp(220, 72));
    }

    private View statBox(String label, int total) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(12, 8, 12, 8);
        box.setBackground(round(Color.argb(38, 255, 255, 255), Color.argb(65, 255, 255, 255), 1, 12));
        LinearLayout.LayoutParams boxLp = lp(210, 72);
        boxLp.setMargins(0, 0, 14, 0);
        box.setLayoutParams(boxLp);
        TextView value = text(String.valueOf(total), 24, true, TEXT);
        value.setGravity(Gravity.CENTER);
        TextView name = text(label, 13, false, MUTED);
        name.setGravity(Gravity.CENTER);
        box.addView(value, lp(-1, -2));
        box.addView(name, lp(-1, -2));
        return box;
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
            row.addView(card(item, source, isLive(first(item, "type")) ? 292 : 178, isLive(first(item, "type")) ? 176 : 266));
        }
        content.addView(scroll, lp(-1, 292));
    }

    private void renderGrid(JSONArray items, String source, String empty) {
        if (content.getChildCount() > 2) {
            while (content.getChildCount() > 2) content.removeViewAt(2);
        }
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
            boolean poster = "movies".equals(source) || "series".equals(source) || "favorites".equals(source);
            row.addView(card(item, source, "categories".equals(source) ? 260 : poster ? 172 : 224, "categories".equals(source) ? 122 : poster ? 258 : 150));
        }
        if (hasMore(source)) {
            if (items.length() % columns == 0 || row == null) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                grid.addView(row, lp(-1, -2));
            }
            JSONObject more = new JSONObject();
            try {
                more.put("title", "Carregar mais");
                more.put("type", "action");
                more.put("genre", "Mais itens do catálogo");
            } catch (Exception ignored) {}
            row.addView(card(more, source, "categories".equals(source) ? 260 : 224, "categories".equals(source) ? 122 : 150));
        }
        content.addView(scroll, lp(-1, 0, 1));
    }

    private boolean hasMore(String source) {
        if ("channels".equals(source)) return channelsHasMore;
        if ("movies".equals(source)) return moviesHasMore;
        if ("series".equals(source)) return seriesHasMore;
        return false;
    }

    private View card(JSONObject item, String source, int w, int h) {
        String title = first(item, "title", "name", "category", "genre");
        String type = first(item, "type", "content_type", "kind");
        String quality = first(item, "quality", "resolution");
        String genre = first(item, "genre", "category_name");
        String meta = join(type, quality, genre);

        FrameLayout card = new FrameLayout(this);
        card.setFocusable(true);
        card.setClickable(true);
        card.setPadding(0, 0, 0, 0);
        card.setBackground(round(SURFACE, Color.TRANSPARENT, 0, 8));

        ImageView image = new ImageView(this);
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        image.setBackground(gradient(Color.rgb(33, 36, 44), Color.rgb(8, 10, 16), Color.rgb(55, 65, 81), 8));
        card.addView(image, new FrameLayout.LayoutParams(-1, -1));

        String imageUrl = first(item, "poster", "cover", "backdrop", "logo", "stream_icon", "image", "icon");
        if (!imageUrl.isEmpty()) loadImage(imageUrl, image);

        LinearLayout overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.BOTTOM);
        overlay.setPadding(14, 12, 14, 12);
        overlay.setBackground(gradient(Color.TRANSPARENT, Color.argb(230, 0, 0, 0), Color.TRANSPARENT, 10));
        card.addView(overlay, new FrameLayout.LayoutParams(-1, -1));

        TextView titleView = text(compact(title.isEmpty() ? "Sem título" : title, 38), 15, true, TEXT);
        titleView.setMaxLines(2);
        overlay.addView(titleView, lp(-1, -2));
        if (!meta.isEmpty()) {
            TextView metaView = text(compact(meta, 42), 11, false, Color.rgb(138, 155, 181));
            metaView.setMaxLines(1);
            overlay.addView(metaView, lp(-1, -2));
        }

        if (!quality.isEmpty()) {
            TextView badge = text(quality, 10, true, TEXT);
            badge.setGravity(Gravity.CENTER);
            badge.setBackground(round(Color.argb(185, 0, 0, 0), Color.TRANSPARENT, 0, 6));
            FrameLayout.LayoutParams badgeLp = new FrameLayout.LayoutParams(58, 28, Gravity.TOP | Gravity.RIGHT);
            badgeLp.setMargins(0, 8, 8, 0);
            card.addView(badge, badgeLp);
        }

        card.setOnFocusChangeListener((v, focused) -> {
            v.setBackground(focused ? round(SURFACE, Color.WHITE, 4, 8) : round(SURFACE, Color.TRANSPARENT, 0, 8));
            v.setScaleX(focused ? 1.09f : 1f);
            v.setScaleY(focused ? 1.09f : 1f);
            v.setElevation(focused ? 22f : 0f);
        });
        card.setOnClickListener(v -> openItem(item, source));
        LinearLayout.LayoutParams lp = lp(w, h);
        lp.setMargins(0, 0, 14, 18);
        card.setLayoutParams(lp);
        return card;
    }

    private void openItem(JSONObject item, String source) {
        String type = first(item, "type", "content_type", "kind");
        if ("action".equals(type) && "Carregar mais".equals(first(item, "title", "name"))) {
            if ("channels".equals(source)) loadMoreChannels();
            else if ("movies".equals(source)) loadMoreMovies();
            else if ("series".equals(source)) loadMoreSeries();
            return;
        }
        if ("categories".equals(source)) {
            showCategoryItems(item);
        } else if ("channels".equals(source) || ("home".equals(source) && isLive(type))) {
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
        b.setOnFocusChangeListener((v, focused) -> {
            v.setBackground(round(focused ? Color.rgb(59, 130, 246) : BLUE, focused ? Color.WHITE : CYAN, focused ? 4 : 2, 12));
            v.setScaleX(focused ? 1.035f : 1f);
            v.setScaleY(focused ? 1.035f : 1f);
        });
        return b;
    }

    private Button whiteButton(String s) {
        Button b = baseButton(s);
        b.setTextColor(Color.BLACK);
        b.setBackground(round(Color.WHITE, Color.WHITE, 1, 8));
        b.setOnFocusChangeListener((v, focused) -> {
            b.setTextColor(Color.BLACK);
            v.setBackground(round(focused ? Color.rgb(229, 231, 235) : Color.WHITE, focused ? CYAN : Color.WHITE, focused ? 4 : 1, 8));
            v.setScaleX(focused ? 1.045f : 1f);
            v.setScaleY(focused ? 1.045f : 1f);
        });
        return b;
    }

    private Button secondaryButton(String s) {
        Button b = baseButton(s);
        b.setBackground(round(Color.argb(38, 255, 255, 255), Color.argb(65, 255, 255, 255), 1, 12));
        b.setOnFocusChangeListener((v, focused) -> {
            v.setBackground(round(focused ? Color.argb(64, 255, 255, 255) : Color.argb(38, 255, 255, 255), focused ? Color.WHITE : Color.argb(65, 255, 255, 255), focused ? 3 : 1, 12));
            v.setScaleX(focused ? 1.035f : 1f);
            v.setScaleY(focused ? 1.035f : 1f);
        });
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

    private FrameLayout brandedFrame(boolean room) {
        FrameLayout frame = new FrameLayout(this);
        frame.setBackground(gradient(BG, BG_2));
        if (room) {
            ImageView bg = new ImageView(this);
            bg.setImageResource(getResources().getIdentifier("login_room", "drawable", getPackageName()));
            bg.setScaleType(ImageView.ScaleType.CENTER_CROP);
            bg.setAlpha(0.38f);
            frame.addView(bg, new FrameLayout.LayoutParams(-1, -1));
        }

        View dark = new View(this);
        dark.setBackground(gradient(Color.argb(room ? 170 : 118, 0, 0, 0), Color.argb(238, 4, 6, 12)));
        frame.addView(dark, new FrameLayout.LayoutParams(-1, -1));

        View glowTop = new View(this);
        glowTop.setBackground(gradient(Color.argb(72, 37, 99, 235), Color.TRANSPARENT));
        FrameLayout.LayoutParams topLp = new FrameLayout.LayoutParams(-1, 280, Gravity.TOP);
        frame.addView(glowTop, topLp);

        View glowBottom = new View(this);
        glowBottom.setBackground(gradient(Color.TRANSPARENT, Color.argb(54, 34, 211, 238)));
        FrameLayout.LayoutParams bottomLp = new FrameLayout.LayoutParams(-1, 260, Gravity.BOTTOM);
        frame.addView(glowBottom, bottomLp);
        return frame;
    }

    private GradientDrawable gradient(int start, int end, int stroke) {
        GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[] { start, end });
        d.setCornerRadius(16);
        d.setStroke(2, stroke);
        return d;
    }

    private GradientDrawable gradient(int start, int end, int stroke, int radius) {
        GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[] { start, end });
        d.setCornerRadius(radius);
        if (stroke != Color.TRANSPARENT) d.setStroke(2, stroke);
        return d;
    }

    private void loadImage(String rawUrl, ImageView target) {
        final String url = absoluteUrl(rawUrl);
        target.setTag(url);
        imagePool.execute(() -> {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(7000);
                conn.setReadTimeout(9000);
                conn.setRequestProperty("User-Agent", "CentralPlayPlusTV/1.0 AndroidTV");
                InputStream input = conn.getInputStream();
                Bitmap bitmap = BitmapFactory.decodeStream(input);
                input.close();
                if (bitmap != null) {
                    runOnUiThread(() -> {
                        Object tag = target.getTag();
                        if (tag != null && tag.equals(url)) target.setImageBitmap(bitmap);
                    });
                }
            } catch (Exception ignored) {
            }
        });
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

    private void readCounts(JSONObject json) {
        if (json == null) return;
        JSONObject counts = json.optJSONObject("counts");
        if (counts == null) return;
        totalLive = counts.optInt("total_live_channels", totalLive);
        totalMovies = counts.optInt("total_movies", totalMovies);
        totalSeries = counts.optInt("total_series", totalSeries);
        totalLiveCategories = counts.optInt("total_live_categories", totalLiveCategories);
        totalVodCategories = counts.optInt("total_vod_categories", totalVodCategories);
        totalSeriesCategories = counts.optInt("total_series_categories", totalSeriesCategories);
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
