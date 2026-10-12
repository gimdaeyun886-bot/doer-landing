package app.doer;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/** 잠근 앱을 열었을 때 대신 보이는 화면. 조용한 밤 화면에, 인증하러 가는 길 하나만 둔다. */
public class LockActivity extends Activity {
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        render(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        render(intent);
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics()));
    }

    private void render(Intent intent) {
        String where = intent.getStringExtra("where");
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER_HORIZONTAL);
        box.setPadding(dp(32), dp(120), dp(32), dp(40));
        box.setBackgroundColor(Color.parseColor("#2A2420"));

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.symbol);
        GradientDrawable circle = new GradientDrawable();
        circle.setShape(GradientDrawable.OVAL);
        circle.setColor(Color.parseColor("#FBF7F0"));
        mark.setBackground(circle);
        mark.setPadding(dp(22), dp(22), dp(22), dp(22));
        box.addView(mark, new LinearLayout.LayoutParams(dp(96), dp(96)));

        TextView title = new TextView(this);
        title.setText((where == null ? "이 앱은" : where + "은(는)") + "\n지금 잠겨 있어요");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 26);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setLineSpacing(dp(4), 1f);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(-1, -2);
        titleParams.topMargin = dp(28);
        box.addView(title, titleParams);

        TextView body = new TextView(this);
        body.setText("오늘 할 일을 모두 인증하면 열려요.\n전화와 메신저, 검색은 그대로 쓸 수 있어요.");
        body.setTextColor(Color.parseColor("#B5AA9C"));
        body.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        body.setGravity(Gravity.CENTER);
        body.setLineSpacing(dp(4), 1f);
        LinearLayout.LayoutParams bodyParams = new LinearLayout.LayoutParams(-1, 0, 1f);
        bodyParams.topMargin = dp(12);
        box.addView(body, bodyParams);

        Button go = new Button(this);
        go.setText("인증하러 가기");
        go.setAllCaps(false);
        go.setTextColor(Color.WHITE);
        go.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
        go.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable pill = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, new int[]{Color.parseColor("#FF8A55"), Color.parseColor("#EE5F33")});
        pill.setCornerRadius(dp(22));
        go.setBackground(pill);
        go.setStateListAnimator(null);
        go.setOnClickListener(view -> {
            Intent main = new Intent(this, MainActivity.class);
            main.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(main);
            finish();
        });
        box.addView(go, new LinearLayout.LayoutParams(-1, dp(58)));

        TextView hint = new TextView(this);
        hint.setText("오늘이 버겁다면 Do-er에서 코치에게 사정을 말해 주세요.");
        hint.setTextColor(Color.parseColor("#857A6E"));
        hint.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        hint.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams hintParams = new LinearLayout.LayoutParams(-1, -2);
        hintParams.topMargin = dp(14);
        box.addView(hint, hintParams);

        setContentView(box);
    }

    @Override
    public void onBackPressed() {
        // 뒤로 가면 잠근 앱이 아니라 홈으로 나간다.
        Intent home = new Intent(Intent.ACTION_MAIN);
        home.addCategory(Intent.CATEGORY_HOME);
        home.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(home);
        finish();
    }
}
