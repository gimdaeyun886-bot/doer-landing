import Link from "next/link";
import { formatDate, formatMinutes, type Task } from "@/lib/tasks";
import { Icon, StatusBadge } from "./ui";

export function TaskCard({ task }: { task: Task }) {
  return (
    <li>
      <Link href={`/tasks/${task.id}`} className={`task-card${task.proof_path ? " task-card-verified" : ""}`}>
        <div className="task-card-top">
          <span className="task-goal">{task.goal}</span>
          <StatusBadge verified={Boolean(task.proof_path)} />
        </div>
        <h2>{task.title}</h2>
        <div className="task-card-footer">
          <p className="task-meta">
            <span><Icon name="calendar" />{formatDate(task.due_date)}</span>
            <span aria-hidden="true">·</span>
            <span><Icon name="clock" />{formatMinutes(task.estimated_minutes)}</span>
          </p>
          <Icon name="arrow" />
        </div>
      </Link>
    </li>
  );
}
