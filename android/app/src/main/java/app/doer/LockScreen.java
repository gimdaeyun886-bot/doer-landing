package app.doer;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.TextView;

/**
 * 잠금 화면. 다른 화면으로 넘어가지 않고, 잠근 앱 위에 그대로 덮여 나타난다.
 * 화면 전환 없이 그 자리에서 어두워지므로, 로고가 조각을 무는 장면이 처음부터 보인다.
 */
final class LockScreen {
    // 그림이 문 뒤에 아래에서부터 차례로 떠오르는 순서.
    private static final int[] ORDER = {R.id.lock_where, R.id.lock_title, R.id.lock_body, R.id.lock_go, R.id.lock_close, R.id.lock_hint};

    private final AccessibilityService service;
    private final WindowManager windows;
    private View root;
    private boolean leaving;

    LockScreen(AccessibilityService service) {
        this.service = service;
        this.windows = (WindowManager) service.getSystemService(Context.WINDOW_SERVICE);
    }

    boolean showing() {
        return root != null;
    }

    /** 잠금 화면을 덮는다. 이미 떠 있으면 어디가 잠겼는지만 고쳐 적는다. 덮지 못했으면 false. */
    boolean show(String where, boolean whole) {
        if (root != null) {
            label(where);
            return true;
        }
        Holder holder = new Holder(service);
        LayoutInflater.from(service).inflate(R.layout.lock, holder, true);
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        try {
            windows.addView(holder, params);
        } catch (Exception error) {
            return false;
        }
        root = holder;
        leaving = false;
        label(where);

        // 상태 표시줄과 아래쪽 내비게이션 줄에 글과 버튼이 가리지 않게 띄운다.
        View inside = holder.findViewById(R.id.lock_root);
        inside.setFitsSystemWindows(false);
        inside.setPadding(0, bar("status_bar_height"), 0, bar("navigation_bar_height"));

        holder.findViewById(R.id.lock_go).setOnClickListener(view -> {
            Intent main = new Intent(service, MainActivity.class);
            main.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            service.startActivity(main);
            hide();
        });
        holder.findViewById(R.id.lock_close).setOnClickListener(view -> hide());

        LockMarkView mark = holder.findViewById(R.id.lock_mark);
        mark.showLogo();
        float rise = 22 * service.getResources().getDisplayMetrics().density;
        for (int id : ORDER) {
            View view = holder.findViewById(id);
            view.setAlpha(0f);
            view.setTranslationY(rise);
        }
        holder.setAlpha(0f);
        // 창이 실제로 처음 그려진 뒤에 시작한다. 그 전에 시작하면 보이기도 전에 움직임이 끝나 버린다.
        holder.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override
            public boolean onPreDraw() {
                holder.getViewTreeObserver().removeOnPreDrawListener(this);
                holder.postOnAnimation(() -> enter(holder, mark, whole));
                return true;
            }
        });
        return true;
    }

    /** 바탕이 먼저 어두워지고, 로고가 조각을 물고, 그 뒤에 글과 버튼이 떠오른다. */
    private void enter(View holder, LockMarkView mark, boolean whole) {
        if (root != holder) return;
        holder.animate().alpha(1f).setDuration(260).setInterpolator(new DecelerateInterpolator()).withEndAction(() -> {
            if (root != holder) return;
            // 완전히 덮인 뒤에 잠근 앱을 뒤에서 물린다. 앱 전체는 홈으로, 화면만 잠근 경우는 한 걸음 뒤로.
            service.performGlobalAction(whole ? AccessibilityService.GLOBAL_ACTION_HOME : AccessibilityService.GLOBAL_ACTION_BACK);
            mark.play();
            for (int i = 0; i < ORDER.length; i++) {
                holder.findViewById(ORDER[i]).animate().alpha(1f).translationY(0f).setStartDelay(820 + i * 70L).setDuration(520).setInterpolator(new DecelerateInterpolator(2.2f)).start();
            }
        }).start();
    }

    /** 잠금 화면을 걷는다. 잠근 앱은 이미 뒤로 물러나 있어서, 걷히면 홈이나 그 앱의 다른 화면이 보인다. */
    void hide() {
        if (root == null || leaving) return;
        leaving = true;
        final View gone = root;
        gone.animate().alpha(0f).setDuration(200).withEndAction(() -> {
            try {
                windows.removeView(gone);
            } catch (Exception ignored) {
            }
            if (root == gone) root = null;
            leaving = false;
        }).start();
    }

    /** 서비스가 꺼질 때처럼 기다릴 수 없을 때 바로 걷는다. */
    void remove() {
        if (root == null) return;
        try {
            windows.removeView(root);
        } catch (Exception ignored) {
        }
        root = null;
        leaving = false;
    }

    private void label(String where) {
        ((TextView) root.findViewById(R.id.lock_where)).setText(where == null || where.isEmpty() ? "잠금 중" : where + " · 잠금 중");
    }

    private int bar(String name) {
        int id = service.getResources().getIdentifier(name, "dimen", "android");
        return id > 0 ? service.getResources().getDimensionPixelSize(id) : 0;
    }

    /** 뒤로 가기 단추를 눌러도 잠근 앱으로 돌아가지 않고 잠금 화면만 걷히게 한다. */
    private final class Holder extends FrameLayout {
        Holder(Context context) {
            super(context);
            setFocusableInTouchMode(true);
        }

        @Override
        protected void onAttachedToWindow() {
            super.onAttachedToWindow();
            requestFocus();
        }

        @Override
        public boolean dispatchKeyEvent(KeyEvent event) {
            if (event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
                if (event.getAction() == KeyEvent.ACTION_UP) hide();
                return true;
            }
            return super.dispatchKeyEvent(event);
        }
    }
}
