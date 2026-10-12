package app.doer;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.widget.TextView;

/** 잠근 앱이나 화면을 열었을 때 아래에서 올라오는 창. 인증하러 가는 길 하나만 크게 둔다. */
public class LockActivity extends Activity {
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.lock);
        render(getIntent());

        // 카드가 아래에서 부드럽게 올라온다.
        View card = ((android.view.ViewGroup) findViewById(R.id.lock_root)).getChildAt(0);
        card.setTranslationY(600f);
        card.animate().translationY(0f).setDuration(320).setInterpolator(new DecelerateInterpolator(2f)).start();

        findViewById(R.id.lock_go).setOnClickListener(view -> {
            Intent main = new Intent(this, MainActivity.class);
            main.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(main);
            finish();
        });
        findViewById(R.id.lock_close).setOnClickListener(view -> leave());
        // 카드 바깥(어두운 곳)을 눌러도 닫힌다.
        findViewById(R.id.lock_root).setOnClickListener(view -> leave());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        render(intent);
    }

    private void render(Intent intent) {
        String where = intent.getStringExtra("where");
        ((TextView) findViewById(R.id.lock_where)).setText(where == null || where.isEmpty() ? "이 앱" : where);
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
