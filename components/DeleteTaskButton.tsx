"use client";

import { useActionState, useRef } from "react";
import { Button, Notice } from "./ui";

type DeleteAction = (prev: { message?: string }, formData: FormData) => Promise<{ message?: string }>;

// 삭제는 되돌릴 수 없으므로 확인 창을 한 번 거친다.
export function DeleteTaskButton({ action, title }: { action: DeleteAction; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <>
      <Button type="button" variant="danger" onClick={() => dialog.current?.showModal()}>
        삭제
      </Button>
      <dialog ref={dialog} className="dialog" aria-labelledby="delete-title">
        <h2 id="delete-title">이 할 일을 삭제할까요?</h2>
        <p>
          <strong>{title}</strong>
          <br />
          삭제하면 인증 자료 이미지도 함께 지워지고, 되돌릴 수 없어요.
        </p>
        {state.message && <Notice tone="error">{state.message}</Notice>}
        <form action={formAction} className="dialog-actions">
          <Button type="button" variant="ghost" disabled={pending} onClick={() => dialog.current?.close()}>
            취소
          </Button>
          <Button type="submit" variant="danger" disabled={pending} aria-busy={pending}>
            {pending ? "삭제 중…" : "삭제하기"}
          </Button>
        </form>
      </dialog>
    </>
  );
}
