"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { LIMITS, proofError, type FormState, type TaskValues } from "@/lib/tasks";
import { Field, describedBy } from "./Field";
import { Button, ButtonLink, Notice } from "./ui";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: TaskValues;
  currentProofUrl?: string | null;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
};

// 등록과 수정이 함께 쓰는 폼. 서버가 돌려준 오류와 입력값을 그대로 다시 보여 준다.
export function TaskForm({ action, initial, currentProofUrl, submitLabel, pendingLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, { attempt: 0 });
  const values = state.values ?? initial;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="task-form" noValidate>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      {/* 제출할 때마다 새로 그려서, 서버가 돌려준 값이 입력칸에 확실히 들어가게 한다. */}
      <fieldset key={state.attempt} disabled={pending}>
        <Field id="title" label="할 일" required error={errors.title} hint="오늘 끝낼 수 있는 크기로 적어요.">
          <input id="title" name="title" type="text" defaultValue={values.title} maxLength={LIMITS.title} placeholder="예: 데이터베이스 3장 기출 20문제 풀기" aria-invalid={Boolean(errors.title)} aria-describedby={describedBy("title", errors.title, "h")} />
        </Field>
        <Field id="goal" label="목표" required error={errors.goal} hint="이 일이 속한 목표나 시험 이름이에요.">
          <input id="goal" name="goal" type="text" defaultValue={values.goal} maxLength={LIMITS.goal} placeholder="예: 정보처리기사 실기" aria-invalid={Boolean(errors.goal)} aria-describedby={describedBy("goal", errors.goal, "h")} />
        </Field>
        <div className="field-row">
          <Field id="due_date" label="날짜" required error={errors.due_date}>
            <input id="due_date" name="due_date" type="date" defaultValue={values.due_date} aria-invalid={Boolean(errors.due_date)} aria-describedby={describedBy("due_date", errors.due_date)} />
          </Field>
          <Field id="estimated_minutes" label="예상 시간(분)" required error={errors.estimated_minutes} hint={`${LIMITS.minMinutes}분에서 ${LIMITS.maxMinutes}분 사이`}>
            <input id="estimated_minutes" name="estimated_minutes" type="number" inputMode="numeric" min={LIMITS.minMinutes} max={LIMITS.maxMinutes} step={5} defaultValue={values.estimated_minutes} placeholder="45" aria-invalid={Boolean(errors.estimated_minutes)} aria-describedby={describedBy("estimated_minutes", errors.estimated_minutes, "h")} />
          </Field>
        </div>
        <Field id="memo" label="메모" error={errors.memo} hint={`${LIMITS.memo}자까지 적을 수 있어요.`}>
          <textarea id="memo" name="memo" rows={4} defaultValue={values.memo} maxLength={LIMITS.memo} placeholder="범위, 참고할 자료, 막혔던 부분 등" aria-invalid={Boolean(errors.memo)} aria-describedby={describedBy("memo", errors.memo, "h")} />
        </Field>
        <ProofField serverError={errors.proof} currentProofUrl={currentProofUrl} />
      </fieldset>
      <div className="form-actions">
        <ButtonLink href={cancelHref} variant="ghost">
          취소
        </ButtonLink>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ProofField({ serverError, currentProofUrl }: { serverError?: string; currentProofUrl?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const error = clientError ?? serverError;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const problem = file ? proofError(file) : null;
    // 형식이나 크기가 맞지 않는 파일은 서버로 보내기 전에 여기서 걸러 낸다.
    if (problem) event.target.value = "";
    setClientError(problem);
    setPreview(file && !problem ? URL.createObjectURL(file) : null);
  }

  function clear() {
    if (input.current) input.current.value = "";
    setPreview(null);
    setClientError(null);
  }

  return (
    <Field id="proof" label="인증 자료 이미지" error={error} hint="끝낸 증거를 올려요. JPG, PNG, WEBP · 3MB 이하. 나중에 수정 화면에서 올려도 돼요.">
      <input ref={input} id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} aria-invalid={Boolean(error)} aria-describedby={describedBy("proof", error ?? undefined, "h")} />
      {preview && (
        <div className="proof-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="올릴 이미지 미리보기" />
          <Button type="button" variant="ghost" onClick={clear}>
            선택 취소
          </Button>
        </div>
      )}
      {!preview && currentProofUrl && (
        <div className="proof-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentProofUrl} alt="현재 인증 자료" className={remove ? "is-removed" : undefined} />
          <label className="check">
            <input type="checkbox" name="remove_proof" checked={remove} onChange={(event) => setRemove(event.target.checked)} />
            저장할 때 이 이미지 삭제하기
          </label>
        </div>
      )}
    </Field>
  );
}
