package br.com.centralplayplus.tv;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.util.Log;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.PlayerView;

public class PlayerActivity extends Activity {
    private static final String TAG = "CentralPlayer";
    private static final int BG = Color.rgb(5, 7, 13);
    private static final int TEXT = Color.WHITE;
    private static final int MUTED = Color.rgb(156, 163, 175);
    private static final int ACCENT = Color.rgb(94, 234, 212);
    private static final int GOLD = Color.rgb(245, 158, 11);

    private ExoPlayer player;
    private TextView status;
    private LinearLayout overlay;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        String title = getIntent().getStringExtra("title");
        String url = getIntent().getStringExtra("url");
        String apiStatus = getIntent().getStringExtra("status");
        String mimeType = getIntent().getStringExtra("mime_type");
        String streamFormat = getIntent().getStringExtra("stream_format");

        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(BG);
        setContentView(frame);

        PlayerView playerView = new PlayerView(this);
        playerView.setUseController(true);
        playerView.setFocusable(true);
        frame.addView(playerView, new FrameLayout.LayoutParams(-1, -1));

        overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.CENTER);
        overlay.setPadding(56, 38, 56, 38);
        overlay.setBackgroundColor(Color.argb(210, 5, 7, 13));
        frame.addView(overlay, new FrameLayout.LayoutParams(-1, -1));

        TextView heading = text(title == null || title.isEmpty() ? "Canal" : title, 30, true, TEXT);
        heading.setGravity(Gravity.CENTER);
        overlay.addView(heading, new LinearLayout.LayoutParams(-1, -2));

        status = text("Carregando canal...", 21, false, MUTED);
        status.setGravity(Gravity.CENTER);
        overlay.addView(status, new LinearLayout.LayoutParams(-1, -2));

        Button back = button("Voltar");
        LinearLayout.LayoutParams backLp = new LinearLayout.LayoutParams(220, 66);
        backLp.setMargins(0, 26, 0, 0);
        back.setOnClickListener(v -> finish());
        overlay.addView(back, backLp);

        if (url == null || url.isEmpty()) {
            status.setText("Não foi possível iniciar este canal." + (apiStatus == null || apiStatus.isEmpty() ? "" : "\nStatus da API: " + apiStatus));
            back.requestFocus();
            return;
        }

        DefaultHttpDataSource.Factory httpFactory = new DefaultHttpDataSource.Factory()
            .setUserAgent("CentralPlayPlusTV/1.0 AndroidTV")
            .setAllowCrossProtocolRedirects(true);
        player = new ExoPlayer.Builder(this)
            .setMediaSourceFactory(new DefaultMediaSourceFactory(httpFactory))
            .build();
        playerView.setPlayer(player);
        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_READY) {
                    overlay.setVisibility(View.GONE);
                    playerView.requestFocus();
                } else if (state == Player.STATE_BUFFERING) {
                    overlay.setVisibility(View.VISIBLE);
                    status.setText("Carregando canal...");
                }
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                String code = error.getErrorCodeName();
                Log.e(TAG, "player_error_code=" + code + " player_error_message=" + error.getMessage());
                overlay.setVisibility(View.VISIBLE);
                status.setText("Não foi possível iniciar este canal.\nCódigo: " + code);
                back.requestFocus();
            }
        });

        try {
            MediaItem.Builder item = new MediaItem.Builder().setUri(url);
            if (isHls(mimeType, streamFormat)) item.setMimeType(MimeTypes.APPLICATION_M3U8);
            player.setMediaItem(item.build());
            player.prepare();
            player.play();
        } catch (Exception e) {
            Log.e(TAG, "player_error_message=" + e.getMessage());
            status.setText("Não foi possível iniciar este canal.\nCódigo: INIT_ERROR");
            back.requestFocus();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (player != null) player.pause();
    }

    @Override
    protected void onDestroy() {
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            finish();
            return true;
        }
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER) {
            View focused = getCurrentFocus();
            if (focused != null && focused.isClickable()) {
                focused.performClick();
                return true;
            }
        }
        return super.onKeyUp(keyCode, event);
    }

    private TextView text(String s, int size, boolean bold, int color) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextColor(color);
        t.setTextSize(size);
        t.setPadding(0, 8, 0, 8);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }

    private boolean isHls(String mimeType, String streamFormat) {
        String mime = mimeType == null ? "" : mimeType.toLowerCase();
        String format = streamFormat == null ? "" : streamFormat.toLowerCase();
        return "hls".equals(format) || mime.contains("mpegurl") || mime.contains("m3u8");
    }

    private Button button(String s) {
        Button b = new Button(this);
        b.setText(s);
        b.setTextSize(18);
        b.setAllCaps(false);
        b.setFocusable(true);
        b.setClickable(true);
        b.setGravity(Gravity.CENTER);
        b.setTextColor(TEXT);
        b.setBackground(bg(Color.rgb(20, 28, 43), ACCENT, 1));
        b.setOnFocusChangeListener((v, focused) -> v.setBackground(bg(focused ? Color.rgb(31, 41, 55) : Color.rgb(20, 28, 43), focused ? GOLD : ACCENT, focused ? 4 : 1)));
        return b;
    }

    private GradientDrawable bg(int color, int stroke, int width) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(10);
        d.setStroke(width, stroke);
        return d;
    }
}
