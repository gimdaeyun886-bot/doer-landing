package app.doer;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.TextView;

/** 잠근 앱이나 화면을 열었을 때 화면 전체를 덮는 잠금 화면. 인증하러 가는 길 하나만 크게 둔다. */
public class LockActivity extends Activity {
    // 위에서부터 차례로 떠오르는 순서.
    private static final int[] ORDER = {R.id.lock_where, R.id.lock_title, R.id.lock_body, R.id.lock_go, R.id.lock_close, R.id.lock_hint};

    private boolean waiting; // 화면이 보이기를 기다리는 중인지

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.lock);
        render(getIntent());
        if (state == null) prepare();

        findViewById(R.id.lock_go).setOnClickListener(view -> {
            Intent main = new Intent(this, MainActivity.class);
            main.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(main);
            finish();
        });
        findViewById(R.id.lock_close).setOnClickListener(view -> leave());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        render(intent);
    }

    private void render(Intent intent) {
        String where = intent.getStringExtra("where");
        ((TextView) findViewById(R.id.lock_where)).setText(where == null || where.isEmpty() ? "잠금 중" : where + " · 잠금 중");
    }

    /** 화면이 뜨는 동안에는 로고만 보이고, 글과 버튼은 숨겨 둔다. */
    private void prepare() {
        waiting = true;
        ((LockMarkView) findViewById(R.id.lock_mark)).showLogo();
        float rise = 22 * getResources().getDisplayMetrics().density;
        for (int id : ORDER) {
            View view = findViewById(id);
            view.setAlpha(0f);
            view.setTranslationY(rise);
        }
    }

    /** 화면이 실제로 보이기 시작한 뒤에 움직임을 시작한다. 그보다 먼저 시작하면 무는 장면이 보이기 전에 끝나 버린다. */
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus || !waiting) return;
        waiting = false;
        findViewById(R.id.lock_mark).postDelayed(this::reveal, 260);
    }

    /** 로고가 조각을 물고, 그 뒤로 글과 버튼이 아래에서 차례로 떠오른다. */
    private void reveal() {
        ((LockMarkView) findViewById(R.id.lock_mark)).play();
        for (int i = 0; i < ORDER.length; i++) {
            findViewById(ORDER[i]).animate().alpha(1f).translationY(0f).setStartDelay(520 + i * 70L).setDuration(520).setInterpolator(new DecelerateInterpolator(2.2f)).start();
        }
    }

    /** 앱 전체를 잠갔으면 홈으로 나가고, 화면만 잠갔으면 그 앱의 다른 화면(피드 등)으로 돌아간다. */
    private void leave() {
        if (!getIntent().getBooleanExtra("whole", true)) {
            finish();
            return;
        }
        Intent home = new Intent(Intent.ACTION_MAIN);
        home.addCategory(Intent.CATEGORY_HOME);
        home.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(home);
        finish();
    }

    @Override
    public void onBackPressed() {
        leave();
    }
}
