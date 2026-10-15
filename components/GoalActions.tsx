"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Icon, Notice } from "./ui";

// 목표가 만들어졌으면, 이 기기에 적어 둔 코치와의 대화를 지운다.
export function ClearChat() {
  useEffect(() => {
    try {
      localStorage.removeItem("doer.chat.v2");
    } catch {}
  }, []);
  return null;
}

type SimpleAction = (prev: { message?: string }, formData: FormData) => Promise<{ message?: string }>;

// 지우기는 되돌릴 수 없으므로, 아래에서 올라오는 창으로 한 번 더 묻는다.
export function DeleteGoalButton({ action, title }: { action: SimpleAction; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <>
      <button type="button" className="nav-btn" onClick={() => dialog.current?.showModal()} aria-label="이 목표 지우기">
        <Icon name="trash" size={19} />
      </button>
      <dialog ref={dialog} className="sheet" aria-labelledby="delete-title" aria-describedby="delete-description">
        <span className="sheet-grip" aria-hidden="true" />
        <h2 id="delete-title">이 목표를 지울까요?</h2>
        <p className="sheet-target">{title}</p>
        <p id="delete-description">코치가 짠 계획과 올린 자료가 함께 지워져요. 되돌릴 수 없어요.</p>
        {state.message && <Notice tone="error">{state.message}</Notice>}
        <form action={formAction} className="sheet-actions" aria-busy={pending}>
          <Button type="submit" variant="danger" disabled={pending} aria-busy={pending}>
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

export function ReplanButton({ action, label }: { action: SimpleAction; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="replan">
      <Button type="submit" variant="coach" disabled={pending} aria-busy={pending}>
        <Icon name="refresh" size={18} weight={2} />
        {pending ? "계획을 만드는 중…" : label}
      </Button>
      {state.message && <Notice tone="error">{state.message}</Notice>}
    </form>
  );
}
