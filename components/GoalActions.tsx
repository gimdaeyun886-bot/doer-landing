"use client";

import { useActionState, useRef } from "react";
import { Button, Icon, Notice } from "./ui";

type SimpleAction = (prev: { message?: string }, formData: FormData) => Promise<{ message?: string }>;

// 삭제는 되돌릴 수 없으므로 확인 창을 한 번 거친다.
export function DeleteGoalButton({ action, title }: { action: SimpleAction; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <>
      <Button type="button" variant="danger" onClick={() => dialog.current?.showModal()}>
        삭제
      </Button>
      <dialog ref={dialog} className="dialog" aria-labelledby="delete-title" aria-describedby="delete-description">
        <span className="dialog-mark" aria-hidden="true">
          <Icon name="warning" />
        </span>
        <h2 id="delete-title">이 목표를 삭제할까요?</h2>
        <p id="delete-description">
          <strong>{title}</strong>
          AI가 만든 계획과 올린 자료도 함께 지워지고, 되돌릴 수 없어요.
        </p>
        {state.message && <Notice tone="error">{state.message}</Notice>}
        <form action={formAction} className="dialog-actions" aria-busy={pending}>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => dialog.current?.close()}>
            취소
          </Button>
          <Button type="submit" variant="danger" className="btn-danger-solid" disabled={pending} aria-busy={pending}>
            {pending ? "삭제 중…" : "삭제하기"}
          </Button>
        </form>
      </dialog>
    </>
  );
}

export function ReplanButton({ action, label }: { action: SimpleAction; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="replan">
      <Button type="submit" variant="coach" disabled={pending} aria-busy={pending}>
        <Icon name="refresh" />
        {pending ? "계획을 만드는 중…" : label}
      </Button>
      {state.message && <Notice tone="error">{state.message}</Notice>}
    </form>
  );
}
