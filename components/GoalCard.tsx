import Link from "next/link";
import { formatDate, formatMinutes, goalTag, tasksOn, todayInSeoul, type Goal } from "@/lib/goals";
import { Icon, Pill, kindTone } from "./ui";

export function GoalCard({ goal }: { goal: Goal }) {
  const tone = kindTone(goal.kind);
  const today = tasksOn(goal, todayInSeoul());
  const ready = goal.plan_status === "ready" && Boolean(goal.plan?.days);
  return (
    <li>
      <Link href={`/goals/${goal.id}`} className="goal-card">
        <div className="goal-card-top">
          <h2>{goal.title}</h2>
          <Pill tone={tone}>{goalTag(goal)}</Pill>
        </div>
        <p className="meta">
          <span>
            <Icon name={goal.kind === "ongoing" ? "repeat" : "cal"} size={14} />
            {goal.kind === "dated" && goal.deadline ? formatDate(goal.deadline) : goal.kind === "ongoing" ? "매주 반복" : "날짜 없음"}
          </span>
          <span>
            <Icon name="clock" size={14} />
            하루 {formatMinutes(goal.daily_minutes)}
          </span>
        </p>
        <p className={`goal-today goal-today-${tone}`}>
          <i />
          {!ready ? "계획을 아직 만들지 못했어요" : today.length ? `오늘 ${today.length}가지 · 약 ${formatMinutes(today.reduce((sum, task) => sum + task.minutes, 0))}` : "오늘은 쉬는 날"}
        </p>
      </Link>
    </li>
  );
}
