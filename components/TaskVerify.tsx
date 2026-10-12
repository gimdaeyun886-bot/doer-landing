"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { verifyTask, type VerifyState } from "@/app/goals/actions";
import { formatMinutes, materialError, type PlanTask } from "@/lib/goals";
import { Button, Icon, Notice } from "./ui";

type Props = { goalId: string; goalTitle: string; tone: string; index: number; task: PlanTask; proof: { passed: boolean; reason: string } | null };

// 오늘 할 일 한 줄. 누르면 창이 올라와 사진으로 인증한다. 통과 여부는 코치가 사진을 보고 정한다.
export function TaskVerify({ goalId, goalTitle, tone, index, task, proof }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState<VerifyState, FormData>(verifyTask.bind(null, goalId, task.id), { attempt: 0 });
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const passed = state.passed ?? proof?.passed ?? false;
  const reason = state.reason ?? proof?.reason ?? null;
  const judged = state.passed !== undefined || Boolean(proof);

  // 판정이 끝나면 고른 사진을 비워, 다시 올릴 때 새로 고르게 한다.
  useEffect(() => {
    if (state.attempt === 0) return;
    setPreview(null);
    if (input.current) input.current.value = "";
  }, [state.attempt]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const problem = file ? materialError(file) : null;
    if (problem) event.target.value = "";
    setFileError(problem);
    setPreview(file && !problem ? URL.createObjectURL(file) : null);
  }

  return (
    <li>
      <button type="button" className="today-row" onClick={() => dialog.current?.showModal()} data-passed={passed || undefined}>
        <span className={`num num-${tone}`} data-done={passed || undefined}>
          {passed ? <Icon name="check" size={17} weight={2.6} /> : index + 1}
        </span>
        <span className="today-text">
          <b>{task.title}</b>
          <small>{goalTitle}</small>
        </span>
        <span className="today-state" data-kind={passed ? "passed" : judged ? "retry" : "todo"}>
          {passed ? "인증 끝" : judged ? "다시 인증" : "인증하기"}
        </span>
      </button>

      <dialog ref={dialog} className="sheet verify-sheet" aria-labelledby={`verify-${task.id}`}>
        <span className="sheet-grip" aria-hidden="true" />
        <p className="sheet-over">
          {goalTitle} · 약 {formatMinutes(task.minutes)}
        </p>
        <h2 id={`verify-${task.id}`}>{task.title}</h2>
        <p>{task.detail}</p>
        <p className="verify">
          <Icon name="camera" size={15} />
          <span>
            <b>{task.verify_method}</b>
            {task.verify_guide}
          </span>
        </p>

        {judged && !pending && reason && <Notice tone={passed ? "success" : "error"}>{reason}</Notice>}
        {state.message && !pending && <Notice tone="error">{state.message}</Notice>}
        {fileError && <Notice tone="error">{fileError}</Notice>}

        <form action={formAction} className="sheet-actions" aria-busy={pending}>
          <input ref={input} id={`proof-${task.id}`} name="proof" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="proof-preview" src={preview} alt="인증할 사진 미리보기" />
          )}
          {pending ? (
            <p className="proof-wait" role="status">
              <i />
              코치가 사진을 보고 있어요. 10초쯤 걸려요.
            </p>
          ) : preview ? (
            <>
              <Button type="submit">이 사진으로 인증</Button>
              <Button type="button" variant="quiet" onClick={() => input.current?.click()}>
                다른 사진 고르기
              </Button>
            </>
          ) : (
            <>
              {!passed && (
                <Button type="button" onClick={() => input.current?.click()}>
                  <Icon name="camera" size={19} />
                  {judged ? "다시 찍어 올리기" : "사진 올려 인증하기"}
                </Button>
              )}
              <Button type="button" variant="quiet" onClick={() => dialog.current?.close()}>
                {passed ? "확인" : "나중에 할게요"}
              </Button>
            </>
          )}
        </form>
      </dialog>
    </li>
  );
}
