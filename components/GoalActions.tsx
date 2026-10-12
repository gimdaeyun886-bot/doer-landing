"use client";

import { useActionState, useRef } from "react";
import { Button, Icon, Notice } from "./ui";

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

// 시작(잠금)은 앱에서 제공할 기능이라, 지금은 무엇이 일어날지만 알려 준다.
export function StartButton({ lockTargets }: { lockTargets: string[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const targets = lockTargets.length ? `${lockTargets.join("·")} 화면` : "고른 화면";
  return (
    <>
      <Button type="button" onClick={() => dialog.current?.showModal()}>
        이대로 시작
      </Button>
      <dialog ref={dialog} className="sheet" aria-labelledby="start-title">
        <span className="sheet-grip" aria-hidden="true" />
        <h2 id="start-title">잠금과 인증은 곧 열려요</h2>
        <p>
          앱에서는 여기서 시작하면 {targets}이 잠기고, 오늘 할 일을 모두 인증해야 다시 열려요. 지금은 계획과 오늘 할 일까지 써 볼 수 있어요.
        </p>
        <div className="sheet-actions">
          <Button type="button" variant="quiet" onClick={() => dialog.current?.close()}>
            알겠어요
          </Button>
        </div>
      </dialog>
    </>
  );
}
