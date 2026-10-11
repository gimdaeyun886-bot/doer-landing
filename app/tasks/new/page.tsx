import type { Metadata } from "next";
import { TaskForm } from "@/components/TaskForm";
import { PageHeader } from "@/components/ui";
import { todayInSeoul } from "@/lib/tasks";
import { createTask } from "../actions";

export const metadata: Metadata = { title: "할 일 등록" };
export const dynamic = "force-dynamic";

export default function NewTaskPage() {
  return (
    <div className="shell-narrow">
      <PageHeader eyebrow="등록" title="할 일 등록" description="오늘 끝낼 일을 적어요. 인증 자료는 지금 올려도 되고, 끝낸 뒤 수정 화면에서 올려도 돼요." />
      <TaskForm
        action={createTask}
        initial={{ title: "", goal: "", due_date: todayInSeoul(), estimated_minutes: "", memo: "" }}
        submitLabel="등록하기"
        pendingLabel="등록 중…"
        cancelHref="/tasks"
      />
    </div>
  );
}
