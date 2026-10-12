import Link from "next/link";
import { formatDate, formatMinutes, goalTag, type Goal } from "@/lib/goals";
import { Icon, Pill, kindTone } from "./ui";

export function GoalCard({ goal, href }: { goal: Goal; href?: string }) {
  const tone = kindTone(goal.kind);
  const today = goal.plan_status === "ready" ? (goal.plan?.today ?? []) : [];
  return (
    <li>
      <Link href={href ?? `/goals/${goal.id}`} className="goal-card">
        <div className="goal-card-top">
          <h2>{goal.title}</h2>
          <Pill tone={tone}>{goalTag(goal)}</Pill>
        </div>
        <p className="meta">
          <span>
            <Icon name={goal.kind === "ongoing" ? "repeat" : "cal"} size={14} />
            {goal.kind === "dated" && goal.deadline ? formatDate(goal.deadline) : goal.kind === "ongoing" ? "계속 이어 가기" : "기한 없음"}
          </span>
          <span>
            <Icon name="clock" size={14} />
            {goal.kind === "ongoing" ? "한 번에" : "하루"} {formatMinutes(goal.daily_minutes)}
          </span>
        </p>
        <p className={`goal-today goal-today-${tone}`}>
          <i />
          {goal.plan_status === "ready" ? `오늘 ${today.length}개 · ${formatMinutes(today.reduce((sum, task) => sum + task.minutes, 0))}` : "계획을 아직 만들지 못했어요"}
        </p>
      </Link>
    </li>
  );
}
