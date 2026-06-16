package br.com.centralplayplus.tv;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.VideoView;

public class PlayerActivity extends Activity {
    private static final int BG = Color.rgb(5, 7, 13);
    private static final int TEXT = Color.WHITE;
    private static final int MUTED = Color.rgb(156, 163, 175);
    private static final int ACCENT = Color.rgb(94, 234, 212);
    private static final int GOLD = Color.rgb(245, 158, 11);

    private TextView status;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);

        String title = getIntent().getStringExtra("title");
        String url = getIntent().getStringExtra("url");
        String apiStatus = getIntent().getStringExtra("status");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(56, 38, 56, 38);
        root.setBackgroundColor(BG);
        setContentView(root);

        TextView heading = text(title == null || title.isEmpty() ? "Player" : title, 32, true, TEXT);
        root.addView(heading, new LinearLayout.LayoutParams(-1, -2));

        status = text("Loading...", 20, false, MUTED);
        root.addView(status, new LinearLayout.LayoutParams(-1, -2));

        VideoView video = new VideoView(this);
        LinearLayout.LayoutParams videoLp = new LinearLayout.LayoutParams(-1, 0, 1);
        videoLp.setMargins(0, 18, 0, 18);
        root.addView(video, videoLp);

        Button back = button("Voltar");
        back.setOnClickListener(v -> finish());
        root.addView(back, new LinearLayout.LayoutParams(220, 66));
        back.requestFocus();

        if (url == null || url.isEmpty()) {
            status.setText("Player em desenvolvimento" + (apiStatus == null || apiStatus.isEmpty() ? "" : "\nStatus da API: " + apiStatus));
            return;
        }

        try {
            video.setVideoURI(Uri.parse(url));
            video.setOnPreparedListener(mp -> {
                status.setText("Reproduzindo");
                video.start();
                video.requestFocus();
            });
            video.setOnErrorListener((mp, what, extra) -> {
                status.setText("Não foi possível reproduzir este canal agora.");
                return true;
            });
        } catch (Exception e) {
            status.setText("Não foi possível abrir o player.");
        }
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

    private TextView text(String s, int size, boolean bold, int color) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextColor(color);
        t.setTextSize(size);
        t.setPadding(0, 8, 0, 8);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
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
