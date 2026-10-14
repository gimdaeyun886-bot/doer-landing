"use client";

// 목표 고치기. 등록과 같은 입력칸을 한 화면에 모두 펼쳐 둔다.
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState, GoalValues } from "@/lib/goals";
import { KindField, LockField, MaterialField, NoteField, TitleField, WhenField } from "./fields";
import { Button, Notice } from "./ui";

type Props = { action: (prev: FormState, formData: FormData) => Promise<FormState>; initial: GoalValues; today: string; currentMaterialUrl: string | null };

export function GoalEditForm({ action, initial, today, currentMaterialUrl }: Props) {
  const [state, formAction, pending] = useActionState(action, { attempt: 0 });
  const values = state.values ?? initial;
  const errors = state.errors ?? {};
  const [file, setFile] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  // 오류가 있으면 첫 번째 오류 칸으로 옮겨 준다.
  useEffect(() => {
    if (!state.attempt) return;
    const target = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    target?.focus();
    if (!target) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state]);

  return (
    <form ref={form} action={formAction} className="edit-form" noValidate aria-busy={pending}>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      <fieldset key={state.attempt} disabled={pending} className="groups">
        <Group title="목표">
          <TitleField value={values.title} error={errors.title} />
        </Group>
        <Group title="기한">
          <KindField kind={values.kind} deadline={values.deadline} today={today} error={errors.deadline} />
        </Group>
        <Group title="언제, 얼마나">
          <WhenField weekdays={values.weekdays} minutes={values.daily_minutes} schedule={values.schedule} errors={errors} />
        </Group>
        <Group title="지금 상황" optional>
          <NoteField value={values.note} error={errors.note} />
        </Group>
        <Group title="실행할 때 잠글 앱" optional>
          <LockField selected={values.lock_apps} />
        </Group>
        <Group title="자료 사진" optional>
          <MaterialField file={file} onFile={setFile} remove={remove} onRemove={setRemove} currentUrl={currentMaterialUrl} serverError={errors.material} />
        </Group>
      </fieldset>
      <div className="dock">
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending && <span className="spinner" aria-hidden="true" />}
          {pending ? "저장하는 중…" : "고친 내용 저장하기"}
        </Button>
      </div>
    </form>
  );
}

function Group({ title, optional, children }: { title: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <section className="group">
      <h2>
        {title}
        {optional && <span> 선택</span>}
      </h2>
      {children}
    </section>
  );
}
