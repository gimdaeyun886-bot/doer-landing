import Link from "next/link";
import { formatMinutes, goalTag, kindLabel, kindTone, type Goal } from "@/lib/goals";
import { Icon, Pill } from "./ui";

// 목록의 목표 한 줄. 누르면 상세로 간다.
export function GoalRow({ goal }: { goal: Goal }) {
  const facts = [kindLabel(goal.kind), `하루 ${formatMinutes(goal.daily_minutes)}`];
  if (goal.lock_apps.length) facts.push(`잠글 앱 ${goal.lock_apps.length}개`);
  return (
    <li>
      <Link href={`/goals/${goal.id}`} className="row goal-row">
        <span className="row-text">
          <b>{goal.title}</b>
          <small>
            {facts.join(" · ")}
            {goal.material_path && (
              <span className="has-photo" aria-label="자료 사진 있음">
                <Icon name="image" size={14} />
              </span>
            )}
          </small>
        </span>
        <Pill tone={kindTone(goal.kind)}>{goalTag(goal)}</Pill>
        <Icon name="chevR" size={16} />
      </Link>
    </li>
  );
}
