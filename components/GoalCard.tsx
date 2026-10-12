import Link from "next/link";
import { daysLeft, deadlineLabel, formatDate, formatMinutes, type Goal } from "@/lib/goals";
import { Icon, Pill } from "./ui";

export function GoalCard({ goal, href }: { goal: Goal; href?: string }) {
  const urgent = goal.exam_date ? daysLeft(goal.exam_date) <= 14 : false;
  const today = goal.plan?.today ?? [];
  return (
    <li>
      <Link href={href ?? `/goals/${goal.id}`} className="goal-card">
        <div className="goal-card-top">
          <Pill tone={goal.exam_date ? (urgent ? "accent" : "neutral") : "coach"}>{deadlineLabel(goal.exam_date)}</Pill>
          <Icon name="chevron" />
        </div>
        <h2>{goal.title}</h2>
        <p className="goal-meta">
          <span>
            <Icon name="calendar" />
            {goal.exam_date ? formatDate(goal.exam_date) : "기한 없이 꾸준히"}
          </span>
          <span>
            <Icon name="clock" />
            하루 {formatMinutes(goal.daily_minutes)}
          </span>
        </p>
        <p className={`goal-plan goal-plan-${goal.plan_status}`}>
          <Icon name={goal.plan_status === "ready" ? "sparkle" : "warning"} />
          {goal.plan_status === "ready" ? `오늘 할 일 ${today.length}개 · ${formatMinutes(today.reduce((sum, task) => sum + task.minutes, 0))}` : "계획을 아직 만들지 못했어요"}
        </p>
      </Link>
    </li>
  );
}
