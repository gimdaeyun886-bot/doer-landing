import Link from "next/link";
import { formatDate, formatMinutes, type Task } from "@/lib/tasks";
import { StatusBadge } from "./ui";

export function TaskCard({ task }: { task: Task }) {
  return (
    <li>
      <Link href={`/tasks/${task.id}`} className="task-card">
        <div className="task-card-top">
          <span className="task-goal">{task.goal}</span>
          <StatusBadge verified={Boolean(task.proof_path)} />
        </div>
        <h2>{task.title}</h2>
        <p className="task-meta">
          <span>{formatDate(task.due_date)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatMinutes(task.estimated_minutes)}</span>
        </p>
      </Link>
    </li>
  );
}
