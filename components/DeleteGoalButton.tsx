"use client";

import { useActionState, useRef } from "react";
import { Button, Icon, Notice } from "./ui";

type DeleteAction = (prev: { message?: string }, formData: FormData) => Promise<{ message?: string }>;

// 지우기는 되돌릴 수 없으므로, 아래에서 올라오는 창으로 한 번 더 묻는다.
export function DeleteGoalButton({ action, title }: { action: DeleteAction; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <>
      <button type="button" className="nav-btn" onClick={() => dialog.current?.showModal()} aria-label="이 목표 지우기">
        <Icon name="trash" size={20} />
      </button>
      <dialog
        ref={dialog}
        className="sheet"
        aria-labelledby="delete-title"
        aria-describedby="delete-description"
        onCancel={(event) => pending && event.preventDefault()}
      >
        <span className="sheet-grip" aria-hidden="true" />
        <h2 id="delete-title">이 목표를 지울까요?</h2>
        <p className="sheet-target">{title}</p>
        <p id="delete-description">올린 자료 사진도 함께 지워져요. 되돌릴 수 없어요.</p>
        {state.message && <Notice tone="error">{state.message}</Notice>}
        <form action={formAction} className="sheet-actions" aria-busy={pending}>
          <Button type="submit" variant="danger" disabled={pending} aria-busy={pending}>
            {pending && <span className="spinner" aria-hidden="true" />}
            {pending ? "지우는 중…" : "지우기"}
          </Button>
          <Button type="button" variant="quiet" disabled={pending} onClick={() => dialog.current?.close()}>
            그대로 두기
          </Button>
        </form>
      </dialog>
    </>
  );
}
