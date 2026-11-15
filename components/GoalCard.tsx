import Link from "next/link";
import { formatMinutes, goalTag, lastTaskDay, tasksOn, todayInSeoul, type Goal } from "@/lib/goals";
import { Icon } from "./ui";

function stateLine(goal: Goal) {
  if (goal.plan_status === "expired") return "목표일이 마감됐어요";
  if (goal.plan_status !== "ready" || !goal.plan?.days) return "계획을 아직 만들지 못했어요";
  const today = todayInSeoul();
  const last = lastTaskDay(goal.plan);
  if (!last || last < today) return "계획한 기간이 끝났어요";
  const tasks = tasksOn(goal, today);
  return tasks.length ? `오늘 ${tasks.length}가지 · 약 ${formatMinutes(tasks.reduce((sum, task) => sum + task.minutes, 0))}` : "오늘은 쉬는 날";
}

export function GoalCard({ goal }: { goal: Goal }) {
  return (
    <li>
      <Link href={`/goals/${goal.id}`} className="row goal-row">
        <span className="row-text">
          <b>{goal.title}</b>
          <small>{stateLine(goal)}</small>
        </span>
        <span className="row-value">{goalTag(goal)}</span>
        <Icon name="chevR" size={16} />
      </Link>
    </li>
  );
}
