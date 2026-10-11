import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DeleteTaskButton } from "@/components/DeleteTaskButton";
import { ButtonLink, Notice, StatusBadge } from "@/components/ui";
import { getTask, isConfigured, proofUrl } from "@/lib/supabase";
import { formatDate, formatDateTime, formatMinutes, isUuid } from "@/lib/tasks";
import { deleteTask } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> };

// 메타데이터와 본문이 같은 할 일을 한 번만 조회하게 한다. 형식이 틀린 주소는 조회 없이 없는 것으로 본다.
const loadTask = cache(async (id: string) => (isUuid(id) && isConfigured() ? getTask(id) : null));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const task = await loadTask((await params).id);
  if (!task) return { title: "할 일을 찾을 수 없어요" };
  const description = `${task.goal} · ${formatDate(task.due_date)} · ${formatMinutes(task.estimated_minutes)}`;
  return {
    title: task.title,
    description,
    openGraph: { title: task.title, description, images: task.proof_path ? [proofUrl(task.proof_path)] : undefined },
  };
}

const NOTICES: Record<string, string> = { created: "할 일을 등록했어요.", updated: "수정한 내용을 저장했어요." };

export default async function TaskDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { notice } = await searchParams;
  const task = await loadTask(id);
  if (!task) notFound();
  const verified = Boolean(task.proof_path);

  return (
    <article className="shell-narrow detail">
      <p className="back">
        <ButtonLink href="/tasks" variant="ghost">
          ← 목록으로
        </ButtonLink>
      </p>
      {notice && NOTICES[notice] && <Notice tone="success">{NOTICES[notice]}</Notice>}

      <header className="detail-header">
        <div className="task-card-top">
          <span className="task-goal">{task.goal}</span>
          <StatusBadge verified={verified} />
        </div>
        <h1>{task.title}</h1>
      </header>

      <dl className="detail-facts">
        <div>
          <dt>날짜</dt>
          <dd>{formatDate(task.due_date)}</dd>
        </div>
        <div>
          <dt>예상 시간</dt>
          <dd>{formatMinutes(task.estimated_minutes)}</dd>
        </div>
        <div>
          <dt>등록</dt>
          <dd>{formatDateTime(task.created_at)}</dd>
        </div>
        <div>
          <dt>마지막 수정</dt>
          <dd>{formatDateTime(task.updated_at)}</dd>
        </div>
      </dl>

      <section aria-labelledby="memo-title">
        <h2 id="memo-title">메모</h2>
        {task.memo ? <p className="memo">{task.memo}</p> : <p className="muted">적어 둔 메모가 없어요.</p>}
      </section>

      <section aria-labelledby="proof-title">
        <h2 id="proof-title">인증 자료</h2>
        {task.proof_path ? (
          <a href={proofUrl(task.proof_path)} target="_blank" rel="noreferrer" className="proof-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proofUrl(task.proof_path)} alt={`${task.title} 인증 자료`} />
          </a>
        ) : (
          <div className="proof-empty">
            <p>아직 인증 전이에요.</p>
            <p className="muted">끝낸 증거 이미지를 올리면 인증 완료로 바뀌어요.</p>
            <ButtonLink href={`/tasks/${task.id}/edit`} variant="secondary">
              인증 자료 올리기
            </ButtonLink>
          </div>
        )}
      </section>

      <div className="detail-actions">
        <DeleteTaskButton action={deleteTask.bind(null, task.id)} title={task.title} />
        <ButtonLink href={`/tasks/${task.id}/edit`}>수정</ButtonLink>
      </div>
    </article>
  );
}
