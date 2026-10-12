package app.doer;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** 오늘의 잠금 상태. 웹 화면이 정해 주고, 잠금 서비스가 읽는다. 기기 안에만 저장한다. */
final class Locks {
    private static final String PREFS = "doer";

    /** 앱 하나에 대한 규칙. whole 이면 앱 전체, 아니면 parts 에 든 화면만 잠근다. */
    static final class Rule {
        boolean whole;
        final Set<String> parts = new HashSet<>();
        String label = "";
    }

    // 웹에서 쓰는 앱 이름과 실제 패키지.
    private static final Map<String, String[]> KNOWN = new HashMap<>();

    static {
        KNOWN.put("인스타그램", new String[]{"com.instagram.android"});
        KNOWN.put("유튜브", new String[]{"com.google.android.youtube"});
        KNOWN.put("틱톡", new String[]{"com.ss.android.ugc.trill", "com.zhiliaoapp.musically"});
        KNOWN.put("페이스북", new String[]{"com.facebook.katana"});
        KNOWN.put("X", new String[]{"com.twitter.android"});
        KNOWN.put("네이버 웹툰", new String[]{"com.nhn.android.webtoon"});
        KNOWN.put("넷플릭스", new String[]{"com.netflix.mediaclient"});
    }

    private Locks() {
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    static void set(Context context, boolean active, String targetsJson) {
        prefs(context).edit().putBoolean("active", active).putString("targets", targetsJson).putString("date", today()).apply();
    }

    /** 잠금은 시작한 날에만 유효하다. 날짜가 바뀌면 저절로 풀린다. */
    static boolean active(Context context) {
        SharedPreferences prefs = prefs(context);
        return prefs.getBoolean("active", false) && today().equals(prefs.getString("date", ""));
    }

    static List<String> labels(Context context) {
        List<String> list = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(prefs(context).getString("targets", "[]"));
            for (int i = 0; i < array.length(); i++) list.add(array.getString(i).split("\\|")[0]);
        } catch (Exception ignored) {
        }
        return list;
    }

    /** "앱 이름", "앱 이름 화면", "앱 이름|패키지" 형태의 목록을 패키지별 규칙으로 바꾼다. */
    static Map<String, Rule> rules(Context context) {
        Map<String, Rule> rules = new HashMap<>();
        try {
            JSONArray array = new JSONArray(prefs(context).getString("targets", "[]"));
            for (int i = 0; i < array.length(); i++) {
                String target = array.getString(i);
                int bar = target.indexOf('|');
                if (bar > 0) {
                    Rule rule = rule(rules, target.substring(bar + 1));
                    rule.whole = true;
                    rule.label = target.substring(0, bar);
                    continue;
                }
                for (Map.Entry<String, String[]> known : KNOWN.entrySet()) {
                    String name = known.getKey();
                    if (!target.equals(name) && !target.startsWith(name + " ")) continue;
                    for (String pkg : known.getValue()) {
                        Rule rule = rule(rules, pkg);
                        rule.label = name;
                        if (target.equals(name)) rule.whole = true;
                        else rule.parts.add(target.substring(name.length() + 1));
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return rules;
    }

    private static Rule rule(Map<String, Rule> rules, String pkg) {
        Rule rule = rules.get(pkg);
        if (rule == null) {
            rule = new Rule();
            rules.put(pkg, rule);
        }
        return rule;
    }
}
