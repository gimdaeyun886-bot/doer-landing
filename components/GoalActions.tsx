"use client";

import { useActionState, useEffect, useRef } from "react";
import { LOCKED_NOTE } from "./ConfirmForm";
import { Button, Icon, Notice, backdropClose } from "./ui";

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

// 지우면 휴지통으로 간다. 30일 안에는 되살릴 수 있다는 것을 아래에서 올라오는 창으로 한 번 더 알린다.
export function DeleteGoalButton({ action, title, locked = false }: { action: SimpleAction; title: string; locked?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <>
      <button type="button" className="nav-btn" onClick={() => dialog.current?.showModal()} aria-label="이 목표 지우기">
        <Icon name="trash" size={19} />
      </button>
      <dialog ref={dialog} {...backdropClose(pending)} className="sheet" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={(event) => pending && event.preventDefault()}>
        <span className="sheet-grip" aria-hidden="true" />
        <h2 id="delete-title">이 목표를 지울까요?</h2>
        <p className="sheet-target">{title}</p>
        <p id="delete-description">휴지통으로 옮겨요. 30일 안에는 되살릴 수 있고, 그 뒤에는 계획·인증 기록·올린 자료가 함께 지워져요.</p>
        {locked && <Notice>{LOCKED_NOTE}</Notice>}
        {state.message && <Notice tone="error">{state.message}</Notice>}
        <form action={formAction} className="sheet-actions" aria-busy={pending}>
          <Button type="submit" variant="danger" disabled={pending || locked} aria-busy={pending}>
            {pending ? "옮기는 중…" : "휴지통으로 옮기기"}
          </Button>
          <Button type="button" variant="quiet" disabled={pending} onClick={() => dialog.current?.close()}>
            그대로 두기
          </Button>
        </form>
      </dialog>
    </>
  );
}

// primary: 빈 화면처럼 이 버튼이 그 화면의 할 일일 때는 코랄 버튼으로 둔다.
export function ReplanButton({ action, label, locked = false, primary = false }: { action: SimpleAction; label: string; locked?: boolean; primary?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="replan">
      <Button type="submit" variant={primary ? undefined : "coach"} disabled={pending || locked} aria-busy={pending}>
        <Icon name="refresh" size={18} weight={2} />
        {pending ? "계획을 만드는 중…" : label}
      </Button>
      {locked ? <p className="replan-hint">잠금 중에는 계획을 다시 만들 수 없어요. 오늘 할 일을 모두 인증하면 돼요.</p> : label !== "계획 만들기" && !primary && <p className="replan-hint">지난 날 기록은 그대로 두고 오늘 이후 계획만 다시 짜요.</p>}
      {state.message && <Notice tone="error">{state.message}</Notice>}
    </form>
  );
}

// 휴지통의 한 줄. 되살리기는 바로 하고, 완전히 지우기는 되돌릴 수 없으니 한 번 더 묻는다.
export function TrashRow({ title, left, restore, purge }: { title: string; left: string; restore: SimpleAction; purge: SimpleAction }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [back, backAction, backPending] = useActionState(restore, {});
  const [gone, goneAction, gonePending] = useActionState(purge, {});
  const pending = backPending || gonePending;
  return (
    <li className="row trash-row">
      <span className="row-text">
        <b>{title}</b>
        <small>{left}</small>
      </span>
      <form action={backAction}>
        <Button type="submit" variant="soft" disabled={pending} aria-busy={backPending}>
          {backPending ? "되살리는 중…" : "되살리기"}
        </Button>
      </form>
      <button type="button" className="nav-btn" disabled={pending} onClick={() => dialog.current?.showModal()} aria-label={`${title} 완전히 지우기`}>
        <Icon name="trash" size={19} />
      </button>
      {(back.message || gone.message) && <Notice tone="error">{back.message || gone.message}</Notice>}
      <dialog ref={dialog} {...backdropClose(gonePending)} className="sheet" aria-labelledby="purge-title" onCancel={(event) => gonePending && event.preventDefault()}>
        <span className="sheet-grip" aria-hidden="true" />
        <h2 id="purge-title">완전히 지울까요?</h2>
        <p className="sheet-target">{title}</p>
        <p>계획, 인증 기록, 올린 자료가 함께 지워져요. 되돌릴 수 없어요.</p>
        <form action={goneAction} className="sheet-actions" aria-busy={gonePending}>
          <Button type="submit" variant="danger" disabled={gonePending} aria-busy={gonePending}>
            {gonePending ? "지우는 중…" : "완전히 지우기"}
          </Button>
          <Button type="button" variant="quiet" disabled={gonePending} onClick={() => dialog.current?.close()}>
            그대로 두기
          </Button>
        </form>
      </dialog>
    </li>
  );
}
