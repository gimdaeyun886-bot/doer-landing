package app.doer;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.RectF;
import android.os.SystemClock;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 잠금 서비스. 오늘 할 일을 시작한 동안 두 가지를 한다.
 * 1) 사용자가 고른 앱, 또는 그 앱의 릴스·쇼츠 같은 화면이 열리면 그 위에 잠금 화면을 덮는다.
 * 2) 화면만 잠근 앱에서는, 피드에 섞여 나오는 릴스 미리보기나 스토리 줄 위를 가림막으로 덮는다.
 *    다른 앱의 화면 요소를 실제로 없앨 수는 없어서, 그 자리 위에 덮개를 그리는 방식이다.
 * 지금 열린 앱과 화면 요소의 종류(이름표)만 보고, 화면의 글이나 입력 내용은 읽거나 저장하지 않는다.
 */
public class LockService extends AccessibilityService {
    // 화면 이름 → 그 화면 전체가 떴을 때만 보이는 뷰 id 조각. 앱이 업데이트되면 달라질 수 있어 여러 개를 둔다.
    private static final Map<String, String[]> SCREEN_IDS = new HashMap<>();
    // 뷰 id로 못 찾았을 때 쓰는 두 번째 방법: 아래쪽 탭 가운데 '선택된' 탭의 이름.
    private static final Map<String, String[]> TAB_LABELS = new HashMap<>();
    // 다른 화면(피드 등)에 섞여 나오는 조각을 찾는 낱말. 뷰 id에 이 낱말이 들어 있으면 그 자리를 덮는다.
    private static final Map<String, String[]> COVER_WORDS = new HashMap<>();

    static {
        SCREEN_IDS.put("com.instagram.android/릴스", new String[]{"clips_viewer_view_pager", "clips_video_container", "clips_swipe_refresh_container"});
        SCREEN_IDS.put("com.instagram.android/스토리", new String[]{"reel_viewer_root", "reel_viewer_media_container", "story_viewer"});
        SCREEN_IDS.put("com.instagram.android/탐색", new String[]{"explore_action_bar", "explore_grid", "action_bar_search_edit_text"});
        SCREEN_IDS.put("com.google.android.youtube/쇼츠", new String[]{"reel_recycler", "reel_player_page_container", "reel_watch_fragment_root", "shorts_container"});
        SCREEN_IDS.put("com.facebook.katana/릴스", new String[]{"reels_viewer", "fb_shorts_viewer"});

        TAB_LABELS.put("com.instagram.android/릴스", new String[]{"릴스", "Reels"});
        TAB_LABELS.put("com.instagram.android/탐색", new String[]{"검색 및 탐색", "Search and explore"});
        TAB_LABELS.put("com.google.android.youtube/쇼츠", new String[]{"Shorts", "쇼츠"});
        TAB_LABELS.put("com.facebook.katana/릴스", new String[]{"릴스", "Reels"});

        // 인스타그램 안에서는 릴스를 clips, 스토리를 reel 이라고 부른다.
        COVER_WORDS.put("com.instagram.android/릴스", new String[]{"clips"});
        COVER_WORDS.put("com.instagram.android/스토리", new String[]{"reels_tray", "reel_tray", "stories_tray"});
        COVER_WORDS.put("com.google.android.youtube/쇼츠", new String[]{"shorts", "reel_shelf", "reel_item"});
        COVER_WORDS.put("com.facebook.katana/릴스", new String[]{"reels", "shorts"});
    }

    /** 잠근 앱의 화면에서 본 뷰 id 목록(글 내용은 아님). 가림막이 안 맞을 때 원인을 찾는 데 쓴다. */
    static final Set<String> SEEN = Collections.synchronizedSet(new LinkedHashSet<>());

    private long lastBlock;
    private long lastCover;
    private CoverView cover;
    private LockScreen lock;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        CharSequence name = event.getPackageName();
        if (name == null) return;
        String pkg = name.toString();
        if (pkg.equals(getPackageName())) return;
        if (!Locks.active(this)) {
            hideCover();
            if (lock != null) lock.hide();
            return;
        }
        Locks.Rule rule = Locks.rules(this).get(pkg);
        if (rule == null) {
            // 다른 앱으로 넘어갔으면 덮개를 걷는다. (키보드나 알림 같은 잔 이벤트에는 걷지 않는다)
            if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) hideCover();
            return;
        }

        String where = rule.label;
        if (!rule.whole) {
            String part = openPart(pkg, rule);
            if (part == null) {
                updateCover(pkg, rule);
                return;
            }
            where = rule.label + " " + part;
        }
        hideCover();
        // 같은 화면에서 이벤트가 연달아 올 때 잠금 창을 거듭 띄우지 않는다.
        long now = SystemClock.elapsedRealtime();
        if (now - lastBlock < 1200) return;
        lastBlock = now;

        // 다른 화면으로 넘기지 않고, 잠근 앱 위에 잠금 화면을 그대로 덮는다. 잠근 앱은 덮인 뒤에 뒤에서 물린다.
        if (lock == null) lock = new LockScreen(this);
        if (lock.show(where, rule.whole)) return;

        // 덮지 못했을 때만 예전 방식으로, 앱을 물린 뒤 잠금 창을 따로 띄운다.
        performGlobalAction(rule.whole ? GLOBAL_ACTION_HOME : GLOBAL_ACTION_BACK);
        final Intent intent = new Intent(this, LockActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("where", where);
        intent.putExtra("whole", rule.whole);
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> startActivity(intent), 380);
    }

    /** 지금 화면이 잠근 화면(릴스, 쇼츠 등)이면 그 이름을 돌려준다. */
    private String openPart(String pkg, Locks.Rule rule) {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return null;
        for (String part : rule.parts) {
            String[] ids = SCREEN_IDS.get(pkg + "/" + part);
            if (ids == null) continue;
            for (String id : ids) {
                List<AccessibilityNodeInfo> found = root.findAccessibilityNodeInfosByViewId(pkg + ":id/" + id);
                if (found != null && !found.isEmpty()) return part;
            }
        }
        for (String part : rule.parts) {
            String[] labels = TAB_LABELS.get(pkg + "/" + part);
            if (labels == null) continue;
            for (String label : labels) {
                List<AccessibilityNodeInfo> found = root.findAccessibilityNodeInfosByText(label);
                if (found == null) continue;
                for (AccessibilityNodeInfo node : found) {
                    CharSequence text = node.getText() != null ? node.getText() : node.getContentDescription();
                    // 글 속에 그 낱말이 들어간 경우가 아니라, 이름이 딱 그 탭이고 지금 선택된 것만 본다.
                    if (text != null && text.toString().trim().equalsIgnoreCase(label) && (node.isSelected() || (node.getParent() != null && node.getParent().isSelected()))) return part;
                }
            }
        }
        return null;
    }

    /** 피드에 섞여 나온 릴스 미리보기, 스토리 줄 같은 조각을 찾아 그 위를 덮는다. */
    private void updateCover(String pkg, Locks.Rule rule) {
        long now = SystemClock.elapsedRealtime();
        if (now - lastCover < 120) return;
        lastCover = now;

        List<String> words = new ArrayList<>();
        for (String part : rule.parts) {
            String[] list = COVER_WORDS.get(pkg + "/" + part);
            if (list != null) Collections.addAll(words, list);
        }
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (words.isEmpty() || root == null || root.getPackageName() == null || !pkg.equals(root.getPackageName().toString())) {
            hideCover();
            return;
        }
        Rect screen = new Rect();
        root.getBoundsInScreen(screen);
        List<Rect> found = new ArrayList<>();
        int[] budget = {700};
        collect(root, words, screen, found, budget, 0);
        if (found.isEmpty()) hideCover();
        else showCover(found);
    }

    private void collect(AccessibilityNodeInfo node, List<String> words, Rect screen, List<Rect> out, int[] budget, int depth) {
        if (node == null || budget[0]-- <= 0 || depth > 40) return;
        String id = node.getViewIdResourceName();
        if (id != null) {
            String shortId = id.substring(id.indexOf('/') + 1);
            if (SEEN.size() < 500) SEEN.add(shortId);
            if (node.isVisibleToUser()) {
                for (String word : words) {
                    if (!shortId.contains(word)) continue;
                    Rect bounds = new Rect();
                    node.getBoundsInScreen(bounds);
                    // 너무 작은 조각이나, 화면을 거의 다 차지하는 것(이건 잠금 창이 맡는다)은 덮지 않는다.
                    boolean tiny = bounds.width() < 48 || bounds.height() < 48;
                    boolean huge = bounds.height() > screen.height() * 0.85f;
                    if (!tiny && !huge) out.add(bounds);
                    return; // 덮은 조각의 안쪽은 더 살펴볼 필요가 없다.
                }
            }
        }
        for (int i = 0; i < node.getChildCount(); i++) collect(node.getChild(i), words, screen, out, budget, depth + 1);
    }

    private void showCover(List<Rect> rects) {
        if (cover == null) {
            cover = new CoverView(this);
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    // 덮개는 보이기만 하고 손길은 그대로 아래 앱으로 지나간다.
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                    PixelFormat.TRANSLUCENT);
            try {
                ((WindowManager) getSystemService(Context.WINDOW_SERVICE)).addView(cover, params);
            } catch (Exception error) {
                cover = null;
                return;
            }
        }
        cover.show(rects);
    }

    private void hideCover() {
        if (cover == null) return;
        try {
            ((WindowManager) getSystemService(Context.WINDOW_SERVICE)).removeView(cover);
        } catch (Exception ignored) {
        }
        cover = null;
    }

    @Override
    public void onInterrupt() {
        hideCover();
        if (lock != null) lock.remove();
    }

    @Override
    public boolean onUnbind(Intent intent) {
        hideCover();
        if (lock != null) lock.remove();
        return super.onUnbind(intent);
    }

    /** 가릴 자리마다 화면 색의 둥근 네모를 그리고, 넓은 자리에는 한 줄 안내를 적는다. */
    private static final class CoverView extends View {
        private final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint label = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final int[] origin = new int[2];
        private List<Rect> rects = new ArrayList<>();
        private final float density;

        CoverView(Context context) {
            super(context);
            density = context.getResources().getDisplayMetrics().density;
            fill.setColor(0xFFF6F0E8);
            label.setColor(0xFF857A6E);
            label.setTextAlign(Paint.Align.CENTER);
            label.setTextSize(13 * density);
        }

        void show(List<Rect> next) {
            rects = next;
            invalidate();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            getLocationOnScreen(origin);
            float radius = 14 * density;
            for (Rect rect : rects) {
                RectF box = new RectF(rect.left - origin[0], rect.top - origin[1], rect.right - origin[0], rect.bottom - origin[1]);
                canvas.drawRoundRect(box, radius, radius, fill);
                if (box.height() > 72 * density && box.width() > 160 * density) {
                    canvas.drawText("오늘 몫을 끝내면 보여요", box.centerX(), box.centerY() + 5 * density, label);
                }
            }
        }
    }
}
