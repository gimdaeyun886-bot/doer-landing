package app.doer;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.util.AttributeSet;
import android.view.View;
import android.view.animation.LinearInterpolator;

/**
 * 잠금 화면의 그림. 처음에는 브랜드 로고(둥근 덩어리와 떨어진 조각)였다가, 덩어리가 조각을 무는 모양으로 바뀐다.
 * 두 모양은 같은 수의 곡선으로 그려 두어서, 점들을 그대로 섞으면 중간 모습이 나온다. 좌표는 1024×1024 기준.
 */
public class LockMarkView extends View {
    // 덩어리: 시작점 하나와 곡선 10개(곡선마다 점 3개).
    private static final float[] BODY_LOGO = {570, 318, 568, 335, 564, 353, 560, 370, 552, 410, 540, 455, 552, 485, 565, 512, 610, 522, 680, 533, 705, 537, 725, 545, 735, 560, 745, 575, 745, 595, 738, 610, 710, 690, 610, 761, 470, 761, 305, 761, 205, 680, 205, 545, 205, 400, 330, 268, 494, 261, 512, 260, 528, 262, 540, 268, 560, 278, 572, 296, 570, 318};
    private static final float[] BODY_BITE = {708, 338, 700, 300, 672, 284, 640, 300, 600, 325, 548, 430, 562, 488, 592, 548, 700, 556, 770, 540, 792, 534, 802, 502, 800, 466, 822, 496, 828, 524, 822, 560, 790, 680, 650, 765, 470, 765, 305, 765, 205, 680, 205, 545, 205, 400, 330, 266, 500, 254, 580, 250, 650, 236, 690, 240, 722, 262, 722, 310, 708, 338};
    // 조각: 시작점 하나와 곡선 4개.
    private static final float[] PIECE_LOGO = {600, 430, 592, 395, 612, 300, 663, 289, 720, 285, 810, 345, 817, 405, 822, 455, 795, 500, 750, 505, 720, 505, 625, 460, 600, 430};
    private static final float[] PIECE_BITE = {584, 490, 596, 414, 622, 336, 668, 306, 724, 282, 816, 342, 824, 414, 830, 466, 796, 516, 752, 520, 694, 520, 634, 510, 584, 490};

    private static final int CREAM = Color.rgb(245, 237, 226);
    private static final int CHARCOAL = Color.rgb(44, 46, 51);
    private static final int CORAL = Color.rgb(232, 89, 44);
    private static final float DURATION = 900f;

    private final Paint body = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint piece = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint cut = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path bodyPath = new Path();
    private final Path piecePath = new Path();
    private final float[] bodyNow = new float[BODY_LOGO.length];
    private final float[] pieceNow = new float[PIECE_LOGO.length];
    private ValueAnimator animator;
    private float time = DURATION; // 지금 그리는 시점(ms). 처음에는 다 문 모습.

    public LockMarkView(Context context, AttributeSet attrs) {
        super(context, attrs);
        for (Paint paint : new Paint[] {body, piece, cut}) {
            paint.setStyle(Paint.Style.FILL_AND_STROKE);
            paint.setStrokeJoin(Paint.Join.ROUND);
            paint.setStrokeWidth(8);
        }
        piece.setColor(CORAL);
        // 조각에서 덩어리와 그 둘레만큼을 도려내, 물린 자리에 틈이 보이게 한다.
        cut.setStrokeWidth(30);
        cut.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.CLEAR));
    }

    /** 움직이기 전의 로고 모습으로 멈춰 둔다. */
    public void showLogo() {
        if (animator != null) animator.cancel();
        time = 0f;
        invalidate();
    }

    /** 로고에서 시작해 무는 모습까지 한 번 보여 준다. */
    public void play() {
        if (animator != null) animator.cancel();
        animator = ValueAnimator.ofFloat(0f, DURATION);
        animator.setDuration((long) DURATION);
        animator.setInterpolator(new LinearInterpolator());
        animator.addUpdateListener(a -> {
            time = (float) a.getAnimatedValue();
            invalidate();
        });
        time = 0f;
        animator.start();
    }

    @Override
    protected void onDetachedFromWindow() {
        if (animator != null) animator.cancel();
        super.onDetachedFromWindow();
    }

    /** 시점마다 얼마나 물었는지. 0은 로고, 1은 다 문 모습. 잠깐 입을 더 벌렸다가(음수) 빠르게 물고, 살짝 지나쳤다가 자리를 잡는다. */
    private static float bite(float t) {
        if (t < 120) return 0f;
        if (t < 420) return -0.10f * easeOut((t - 120) / 300f);
        if (t < 600) return -0.10f + 1.16f * easeIn((t - 420) / 180f);
        return 1.06f - 0.06f * easeOut(Math.min(1f, (t - 600) / 240f));
    }

    /** 무는 순간 그림 전체가 아주 조금 커졌다가 돌아온다. */
    private static float pulse(float t) {
        if (t < 560 || t > 860) return 1f;
        float x = (t - 560) / 300f;
        return 1f + 0.035f * (float) Math.sin(Math.PI * x) * (1f - x);
    }

    private static float easeOut(float x) {
        return 1f - (1f - x) * (1f - x) * (1f - x);
    }

    private static float easeIn(float x) {
        return x * x * x;
    }

    private static void mix(float[] from, float[] to, float amount, float[] out, Path path) {
        for (int i = 0; i < out.length; i++) out[i] = from[i] + (to[i] - from[i]) * amount;
        path.rewind();
        path.moveTo(out[0], out[1]);
        for (int i = 2; i < out.length; i += 6) path.cubicTo(out[i], out[i + 1], out[i + 2], out[i + 3], out[i + 4], out[i + 5]);
        path.close();
    }

    private static int blend(int from, int to, float amount) {
        float a = Math.max(0f, Math.min(1f, amount));
        return Color.rgb(
                Math.round(Color.red(from) + (Color.red(to) - Color.red(from)) * a),
                Math.round(Color.green(from) + (Color.green(to) - Color.green(from)) * a),
                Math.round(Color.blue(from) + (Color.blue(to) - Color.blue(from)) * a));
    }

    @Override
    protected void onDraw(Canvas canvas) {
        float amount = bite(time);
        mix(BODY_LOGO, BODY_BITE, amount, bodyNow, bodyPath);
        mix(PIECE_LOGO, PIECE_BITE, amount, pieceNow, piecePath);
        body.setColor(blend(CREAM, CHARCOAL, amount));

        float unit = Math.min(getWidth(), getHeight()) / 1024f;
        float grow = pulse(time);
        canvas.save();
        canvas.translate((getWidth() - 1024 * unit) / 2f, (getHeight() - 1024 * unit) / 2f);
        canvas.scale(unit, unit);
        canvas.scale(grow, grow, 515, 505);

        int layer = canvas.saveLayer(0, 0, 1024, 1024, null);
        canvas.drawPath(piecePath, piece);
        canvas.drawPath(bodyPath, cut);
        canvas.restoreToCount(layer);
        canvas.drawPath(bodyPath, body);
        canvas.restore();
    }
}
