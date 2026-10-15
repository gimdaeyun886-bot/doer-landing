import Link from "next/link";
import { formatMinutes, goalTag, tasksOn, todayInSeoul, type Goal } from "@/lib/goals";
import { Icon, Pill, kindTone } from "./ui";

export function GoalCard({ goal }: { goal: Goal }) {
  const tone = kindTone(goal.kind);
  const today = tasksOn(goal, todayInSeoul());
  const ready = goal.plan_status === "ready" && Boolean(goal.plan?.days);
  return (
    <li>
<Link href={`/goals/${goal.id}`} className="row goal-row">
        <span className="row-text">
          <b>{goal.title}</b>
          <small>{!ready ? "계획을 아직 만들지 못했어요" : today.length ? `오늘 ${today.length}가지 · 약 ${formatMinutes(today.reduce((sum, task) => sum + task.minutes, 0))}` : "오늘은 쉬는 날"}</small>
        </span>
        <Pill tone={tone}>{goalTag(goal)}</Pill>
        <Icon name="chevR" size={16} />
      </Link>
    </li>
  );
}
