"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { LIMITS, MINUTE_PRESETS, formatMinutes, materialError, type FormState, type GoalValues } from "@/lib/goals";
import { Field, describedBy } from "./Field";
import { Button, ButtonLink, Icon, Notice } from "./ui";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: GoalValues;
  today: string;
  currentMaterialUrl?: string | null;
  submitLabel: string;
  cancelHref: string;
};

// 등록과 수정이 함께 쓰는 폼. 저장하면 서버에서 AI가 계획을 만들기 때문에 몇 초가 걸린다.
export function GoalForm({ action, initial, today, currentMaterialUrl, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, { attempt: 0 });
  const values = state.values ?? initial;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="goal-form" noValidate>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      {/* 제출할 때마다 새로 그려서, 서버가 돌려준 값이 입력칸에 확실히 들어가게 한다. */}
      <fieldset key={state.attempt} disabled={pending}>
        <div className="card form-card">
          <Field id="title" label="목표" required error={errors.title} hint="준비하는 시험이나 자격증 이름을 적어요.">
            <input id="title" name="title" type="text" defaultValue={values.title} maxLength={LIMITS.title} placeholder="예: 정보처리기사 실기" aria-invalid={Boolean(errors.title)} aria-describedby={describedBy("title", errors.title, "h")} />
          </Field>
          <DeadlineField values={values} error={errors.exam_date} today={today} />
          <MinutesField initial={values.daily_minutes} error={errors.daily_minutes} />
        </div>

        <div className="card form-card">
          <Field id="note" label="코치에게 알려 줄 것" error={errors.note} hint="지금 수준, 약한 과목, 쓰는 교재처럼 계획에 참고할 내용이에요.">
            <textarea id="note" name="note" rows={3} defaultValue={values.note} maxLength={LIMITS.note} placeholder="예: 필기는 합격했고 SQL이 약해요. 수제비 교재로 공부해요." aria-invalid={Boolean(errors.note)} aria-describedby={describedBy("note", errors.note, "h")} />
          </Field>
          <MaterialField serverError={errors.material} currentMaterialUrl={currentMaterialUrl} />
        </div>
      </fieldset>

      <div className="form-actions">
        <Button type="submit" disabled={pending} aria-busy={pending}>
          <Icon name="sparkle" />
          {submitLabel}
        </Button>
        <ButtonLink href={cancelHref} variant="ghost">
          취소
        </ButtonLink>
      </div>
      <p className="form-footnote">저장하면 AI 코치가 전체 계획과 오늘 할 일을 만들어요. 10초쯤 걸릴 수 있어요.</p>

      {pending && (
        <div className="planning" role="status" aria-live="polite">
          <div className="planning-box">
            <span className="planning-mark" aria-hidden="true">
              <Icon name="sparkle" />
            </span>
            <p className="planning-title">계획을 오늘 할 일로 나누고 있어요</p>
            <p className="planning-sub">남은 기간과 하루 시간을 맞춰 보는 중이에요.</p>
            <span className="dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      )}
    </form>
  );
}

function DeadlineField({ values, error, today }: { values: GoalValues; error?: string; today: string }) {
  const [open, setOpen] = useState(values.no_deadline);
  return (
    <Field id="exam_date" label="시험일" required error={error} hint={open ? "기한 없이, 하루 분량을 꾸준히 이어 가는 계획을 만들어요." : "시험일에 맞춰 남은 기간을 나눠요."}>
      <input id="exam_date" name="exam_date" type="date" min={today} defaultValue={values.exam_date} disabled={open} aria-invalid={Boolean(error)} aria-describedby={describedBy("exam_date", error, "h")} />
      <label className="check">
        <input type="checkbox" name="no_deadline" checked={open} onChange={(event) => setOpen(event.target.checked)} />
        시험일이 없어요. 기한 없이 할 목표예요.
      </label>
    </Field>
  );
}

function MinutesField({ initial, error }: { initial: string; error?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <Field id="daily_minutes" label="하루에 낼 수 있는 시간" required error={error} hint="퇴근 후 실제로 낼 수 있는 시간으로 적어요. 분 단위예요.">
      <div className="chips" role="group" aria-label="자주 쓰는 시간">
        {MINUTE_PRESETS.map((minutes) => (
          <button key={minutes} type="button" className="chip" aria-pressed={value === String(minutes)} onClick={() => setValue(String(minutes))}>
            {formatMinutes(minutes)}
          </button>
        ))}
      </div>
      <div className="input-unit">
        <input id="daily_minutes" name="daily_minutes" type="number" inputMode="numeric" min={LIMITS.minMinutes} max={LIMITS.maxMinutes} step={5} value={value} onChange={(event) => setValue(event.target.value)} placeholder="60" aria-invalid={Boolean(error)} aria-describedby={describedBy("daily_minutes", error, "h")} />
        <span>분</span>
      </div>
    </Field>
  );
}

function MaterialField({ serverError, currentMaterialUrl }: { serverError?: string; currentMaterialUrl?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const error = clientError ?? serverError;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const problem = file ? materialError(file) : null;
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
    <Field id="material" label="시험 범위·교재 목차 사진" error={error} hint="올리면 코치가 단원 이름을 보고 계획을 짜요. JPG, PNG, WEBP · 3MB 이하.">
      <input ref={input} id="material" name="material" type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} aria-invalid={Boolean(error)} aria-describedby={describedBy("material", error ?? undefined, "h")} />
      {preview && (
        <div className="material-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="올릴 자료 미리보기" />
          <Button type="button" variant="ghost" onClick={clear}>
            선택 취소
          </Button>
        </div>
      )}
      {!preview && currentMaterialUrl && (
        <div className="material-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentMaterialUrl} alt="현재 올린 자료" className={remove ? "is-removed" : undefined} />
          <label className="check">
            <input type="checkbox" name="remove_material" checked={remove} onChange={(event) => setRemove(event.target.checked)} />
            저장할 때 이 자료 삭제하기
          </label>
        </div>
      )}
    </Field>
  );
}
