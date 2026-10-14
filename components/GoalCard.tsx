import Link from "next/link";
import { formatMinutes, goalTag, kindTone, progress, weekdaysText, type Goal } from "@/lib/goals";
import { Icon } from "./ui";

// 목록의 목표 한 장. 왼쪽 표시로 급한 정도를, 아래 막대로 지나간 기간을 보여 준다.
export function GoalCard({ goal }: { goal: Goal }) {
  const tag = goalTag(goal);
  const passed = progress(goal);
  return (
    <li>
      <Link href={`/goals/${goal.id}`} className="goal-card">
        <span className={`badge badge-${kindTone(goal.kind)}`} aria-hidden="true">
          {tag}
        </span>
        <span className="goal-card-text">
          <b>{goal.title}</b>
          <small>
            {weekdaysText(goal.weekdays)} · 하루 {formatMinutes(goal.daily_minutes)}
            {goal.lock_apps.length > 0 && (
              <span className="meta-icon" aria-label={`잠글 앱 ${goal.lock_apps.length}개`}>
                <Icon name="lock" size={13} weight={2} />
                {goal.lock_apps.length}
              </span>
            )}
            {goal.material_path && (
              <span className="meta-icon" aria-label="자료 사진 있음">
                <Icon name="image" size={13} weight={2} />
              </span>
            )}
          </small>
          {passed && (
            <span className="bar" aria-label={`기간의 ${Math.round(passed.ratio * 100)}% 지남`}>
              <span style={{ width: `${Math.max(4, passed.ratio * 100)}%` }} />
            </span>
          )}
        </span>
        <span className="sr-only">{tag}</span>
        <Icon name="chevR" size={16} />
      </Link>
    </li>
  );
}
