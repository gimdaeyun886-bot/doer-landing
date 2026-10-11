import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaskForm } from "@/components/TaskForm";
import { PageHeader } from "@/components/ui";
import { getTask, isConfigured, proofUrl } from "@/lib/supabase";
import { isUuid, toValues } from "@/lib/tasks";
import { updateTask } from "../../actions";

export const metadata: Metadata = { title: "할 일 수정" };
export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = isUuid(id) && isConfigured() ? await getTask(id) : null;
  if (!task) notFound();

  return (
    <div className="shell-narrow">
      <PageHeader eyebrow="수정" title="할 일 수정" description="내용을 고치거나 인증 자료를 올리고 바꿀 수 있어요." />
      <TaskForm
        action={updateTask.bind(null, task.id)}
        initial={toValues(task)}
        currentProofUrl={task.proof_path ? proofUrl(task.proof_path) : null}
        submitLabel="저장하기"
        pendingLabel="저장 중…"
        cancelHref={`/tasks/${task.id}`}
      />
    </div>
  );
}
