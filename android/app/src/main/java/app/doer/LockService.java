package app.doer;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 잠금 서비스. 오늘 할 일을 시작한 동안, 사용자가 고른 앱(또는 그 앱의 릴스·쇼츠 같은 화면)이 열리면
 * 잠금 화면을 대신 띄운다. 지금 열린 앱과 화면의 종류만 확인하고, 화면의 글이나 입력 내용은 저장하지 않는다.
 */
public class LockService extends AccessibilityService {
    // 화면 이름 → 그 화면에서만 보이는 뷰 id 조각. 앱이 업데이트되면 달라질 수 있어 여러 개를 둔다.
    private static final Map<String, String[]> SCREEN_IDS = new HashMap<>();

    static {
        SCREEN_IDS.put("com.instagram.android/릴스", new String[]{"clips_viewer_view_pager", "clips_video_container", "clips_swipe_refresh_container"});
        SCREEN_IDS.put("com.instagram.android/스토리", new String[]{"reel_viewer_root", "reel_viewer_media_container", "story_viewer"});
        SCREEN_IDS.put("com.instagram.android/탐색", new String[]{"explore_action_bar", "explore_grid", "action_bar_search_edit_text"});
        SCREEN_IDS.put("com.google.android.youtube/쇼츠", new String[]{"reel_recycler", "reel_player_page_container", "reel_watch_fragment_root", "shorts_container"});
        SCREEN_IDS.put("com.facebook.katana/릴스", new String[]{"reels_viewer", "fb_shorts_viewer"});
    }

    // 뷰 id로 못 찾았을 때 쓰는 두 번째 방법: 아래쪽 탭 가운데 '선택된' 탭의 이름.
    private static final Map<String, String[]> TAB_LABELS = new HashMap<>();

    static {
        TAB_LABELS.put("com.instagram.android/릴스", new String[]{"릴스", "Reels"});
        TAB_LABELS.put("com.instagram.android/탐색", new String[]{"검색 및 탐색", "Search and explore"});
        TAB_LABELS.put("com.google.android.youtube/쇼츠", new String[]{"Shorts", "쇼츠"});
        TAB_LABELS.put("com.facebook.katana/릴스", new String[]{"릴스", "Reels"});
    }

    private long lastBlock;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        CharSequence name = event.getPackageName();
        if (name == null || !Locks.active(this)) return;
        String pkg = name.toString();
        if (pkg.equals(getPackageName())) return;
        Locks.Rule rule = Locks.rules(this).get(pkg);
        if (rule == null) return;

        String where = rule.label;
        if (!rule.whole) {
            String part = openPart(pkg, rule);
            if (part == null) return;
            where = rule.label + " " + part;
        }
        // 같은 화면에서 이벤트가 연달아 올 때 잠금 화면을 거듭 띄우지 않는다.
        long now = SystemClock.elapsedRealtime();
        if (now - lastBlock < 1200) return;
        lastBlock = now;

        // 앱 전체는 홈으로, 화면만 잠근 경우는 그 화면에서 한 걸음 물러나게 한다.
        performGlobalAction(rule.whole ? GLOBAL_ACTION_HOME : GLOBAL_ACTION_BACK);
        Intent intent = new Intent(this, LockActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("where", where);
        startActivity(intent);
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

    @Override
    public void onInterrupt() {
    }
}
