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

// 실제 잠금은 휴대폰에 설치하는 앱에서 걸린다. 웹에서는 무엇이 일어날지 알려 주고, 인증은 여기서 바로 한다.
export function StartButton({ lockTargets }: { lockTargets: string[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const targets = lockTargets.length ? lockTargets.join("·") : "고른 앱";
  return (
    <>
      <Button type="button" onClick={() => dialog.current?.showModal()}>
        이대로 시작
      </Button>
      <dialog ref={dialog} className="sheet" aria-labelledby="start-title">
        <span className="sheet-grip" aria-hidden="true" />
        <h2 id="start-title">잠금은 앱에서 걸려요</h2>
        <p>
          휴대폰 앱에서는 여기서 시작하면 고른 앱({targets})이 잠기고, 오늘 할 일을 모두 인증해야 다시 열려요. 다른 앱을 막는 일은 웹에서는 할 수 없어서, 지금은 인증까지 먼저 써 볼 수 있어요. 위 목록에서 할 일을 눌러 사진을 올려 주세요.
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
