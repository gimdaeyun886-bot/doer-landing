package app.doer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

/** 잠금 중인 동안 상단에 남는 알림. 남은 할 일 수와 인증하러 가는 길을 보여 준다. 다 끝나면 걷힌다. */
final class LockNotice {
    private static final String CHANNEL = "lock";
    private static final int ID = 7;

    private LockNotice() {
    }

    static void show(Context context, int left) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        if (manager.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "잠금 상태", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("잠금 중일 때 남은 할 일을 보여 줘요.");
            channel.setShowBadge(false);
            manager.createNotificationChannel(channel);
        }
        Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notice = new Notification.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_notice)
                .setContentTitle(left > 0 ? "잠금 중 · " + left + "가지 남음" : "잠금 중")
                .setContentText("인증하면 고른 앱이 열려요. 눌러서 인증하러 가기")
                .setContentIntent(tap)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .build();
        try {
            manager.notify(ID, notice);
        } catch (SecurityException ignored) {
            // 알림을 허락하지 않았으면 조용히 넘어간다. 잠금은 그대로 동작한다.
        }
    }

    static void hide(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null) manager.cancel(ID);
    }
}
