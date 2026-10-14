"use client";

// 목표 등록. 코치가 한 가지씩 묻고, 마지막 확인 장에서 저장한다.
// 모든 칸은 한 폼 안에 있고 지금 단계만 보인다. 저장은 마지막 단계에서 한 번만 한다.
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { EMPTY_VALUES, formatDate, formatMinutes, kindInfo, outlook, readValues, validateValues, weekdaysText, type FieldErrors, type FormState, type GoalField, type GoalValues } from "@/lib/goals";
import { AppTile } from "./AppTile";
import { KindField, LockField, MaterialField, NoteField, TitleField, WhenField } from "./fields";
import { Button, Icon, Mark, Notice } from "./ui";

type Step = { key: string; question: string; sub: string; fields: GoalField[]; optional?: boolean };

const STEPS: Step[] = [
  { key: "title", question: "무엇을 해내고 싶어요?", sub: "시험, 운동, 책, 포트폴리오 무엇이든 좋아요.", fields: ["title"] },
  { key: "kind", question: "끝나는 날이 있나요?", sub: "목표의 모양에 따라 남은 시간을 다르게 계산해요.", fields: ["deadline"] },
  { key: "when", question: "언제, 얼마나 할 수 있어요?", sub: "무리하지 않고 지킬 수 있는 만큼만요.", fields: ["weekdays", "daily_minutes", "schedule"] },
  { key: "note", question: "지금은 어디까지 와 있어요?", sub: "지금 수준이나 약한 부분을 적어 두면 나중에 계획을 짤 때 써요.", fields: ["note"], optional: true },
  { key: "lock", question: "할 때 어떤 앱을 잠글까요?", sub: "고른 앱만 잠가요. 나머지는 그대로 쓸 수 있어요.", fields: ["lock_apps"], optional: true },
  { key: "material", question: "참고할 자료 사진이 있나요?", sub: "교재 목차나 시험 범위를 찍어 두면 한눈에 볼 수 있어요.", fields: ["material"], optional: true },
  { key: "confirm", question: "이대로 저장할까요?", sub: "틀린 곳은 눌러서 고칠 수 있어요.", fields: [] },
];
const LAST = STEPS.length - 1;

const pick = (errors: FieldErrors, fields: GoalField[]) => Object.fromEntries(Object.entries(errors).filter(([key]) => fields.includes(key as GoalField))) as FieldErrors;
const without = (errors: FieldErrors, fields: GoalField[]) => Object.fromEntries(Object.entries(errors).filter(([key]) => !fields.includes(key as GoalField))) as FieldErrors;

type Props = { action: (prev: FormState, formData: FormData) => Promise<FormState>; today: string; requestId: string };

export function GoalWizard({ action, today, requestId }: Props) {
  const [state, formAction, pending] = useActionState(action, { attempt: 0 });
  const values = state.values ?? EMPTY_VALUES;
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [summary, setSummary] = useState<GoalValues | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const current = STEPS[step];

  // 서버가 돌려보낸 오류는 그 칸이 있는 단계로 돌아가서 보여 준다.
  useEffect(() => {
    if (!state.attempt) return;
    const found = state.errors ?? {};
    setErrors(found);
    const index = STEPS.findIndex((item) => item.fields.some((field) => found[field]));
    if (index >= 0) setStep(index);
  }, [state]);

  // 단계가 바뀌면 맨 위로 올리고, 오류 칸이나 글을 적는 단계의 입력칸으로 옮긴다.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const section = form.current?.querySelector<HTMLElement>(`[data-step="${current.key}"]`);
    const invalid = section?.querySelector<HTMLElement>('[aria-invalid="true"]');
    const typing = current.key === "title" || current.key === "note" ? section?.querySelector<HTMLElement>("input, textarea") : null;
    (invalid ?? typing)?.focus({ preventScroll: true });
  }, [step, current.key, errors]);

  function next() {
    const data = readValues(new FormData(form.current!));
    const found = pick(validateValues(data), current.fields);
    setErrors((prev) => ({ ...without(prev, current.fields), ...found }));
    if (Object.keys(found).length) return;
    if (step + 1 === LAST) setSummary(data);
    setStep(step + 1);
  }

  // 마지막 단계가 아니면 Enter는 다음 단계로 넘어간다.
  function onKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement;
    if (event.key !== "Enter" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON" || step === LAST) return;
    event.preventDefault();
    next();
  }

  return (
    <form ref={form} action={formAction} onKeyDown={onKeyDown} className="wizard" noValidate aria-busy={pending}>
      <input type="hidden" name="request_id" value={requestId} />
      <div className="topbar">
        {step === 0 ? (
          <Link href="/goals" className="nav-btn" aria-label="목록으로 돌아가기">
            <Icon name="chevL" weight={2} />
          </Link>
        ) : (
          <button type="button" className="nav-btn" onClick={() => setStep(step - 1)} disabled={pending} aria-label="이전 질문으로">
            <Icon name="chevL" weight={2} />
          </button>
        )}
        <div className="steps-bar" role="progressbar" aria-label="진행" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <span className="steps-count">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      <header className="ask" key={current.key}>
        <Mark size={40} />
        <div>
          <h1>{current.question}</h1>
          <p>{current.sub}</p>
        </div>
      </header>

      {state.message && step === LAST && <Notice tone="error">{state.message}</Notice>}

      {/* 제출할 때마다 새로 그려서, 서버가 돌려준 값이 입력칸에 들어가게 한다. */}
      <fieldset key={state.attempt} disabled={pending} className="steps">
        <section data-step="title" hidden={current.key !== "title"}>
          <TitleField value={values.title} error={errors.title} />
          <div className="examples">
            {["정보처리기사 실기 합격", "토익 850점", "매일 러닝 3km", "포트폴리오 완성"].map((example) => (
              <button
                key={example}
                type="button"
                className="mini-btn"
                onClick={() => {
                  const input = form.current?.querySelector<HTMLInputElement>("#title");
                  if (!input) return;
                  // React가 바뀐 값을 알아채도록 기본 setter로 넣고 input 이벤트를 보낸다.
                  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, example);
                  input.dispatchEvent(new Event("input", { bubbles: true }));
                  input.focus();
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </section>
        <section data-step="kind" hidden={current.key !== "kind"}>
          <KindField kind={values.kind} deadline={values.deadline} today={today} error={errors.deadline} />
        </section>
        <section data-step="when" hidden={current.key !== "when"}>
          <WhenField weekdays={values.weekdays} minutes={values.daily_minutes} schedule={values.schedule} errors={errors} />
        </section>
        <section data-step="note" hidden={current.key !== "note"}>
          <NoteField value={values.note} error={errors.note} />
        </section>
        <section data-step="lock" hidden={current.key !== "lock"}>
          <LockField selected={values.lock_apps} />
        </section>
        <section data-step="material" hidden={current.key !== "material"}>
          <MaterialField file={file} onFile={setFile} remove={remove} onRemove={setRemove} serverError={errors.material} />
        </section>
        <section data-step="confirm" hidden={current.key !== "confirm"}>
          {summary && <Summary values={summary} file={file} onEdit={setStep} />}
        </section>
      </fieldset>

      <div className="dock">
        {step === LAST ? (
          // 다음 버튼과 다른 key를 줘서, 누르는 도중 같은 버튼이 저장 버튼으로 바뀌어 바로 제출되는 일을 막는다.
          <Button key="save" type="submit" disabled={pending} aria-busy={pending}>
            {pending && <span className="spinner" aria-hidden="true" />}
            {pending ? "저장하는 중…" : "목표 저장하기"}
          </Button>
        ) : (
          <>
            <Button key="next" type="button" onClick={next}>
              다음
            </Button>
            {current.optional && (
              <button type="button" className="skip" onClick={next}>
                건너뛰기
              </button>
            )}
          </>
        )}
      </div>
    </form>
  );
}

// 확인 장: 모은 답을 한 장으로 보여 주고, 앞으로의 분량을 미리 어림해 준다.
function Summary({ values, file, onEdit }: { values: GoalValues; file: File | null; onEdit: (step: number) => void }) {
  const look = outlook({ kind: values.kind, deadline: values.deadline || null, weekdays: values.weekdays, daily_minutes: Number(values.daily_minutes) });
  const rows: { step: number; label: string; value: React.ReactNode }[] = [
    { step: 0, label: "목표", value: values.title },
    { step: 1, label: "기한", value: values.kind === "dated" ? `${formatDate(values.deadline)}까지` : kindInfo(values.kind).label },
    { step: 2, label: "할 때", value: `${weekdaysText(values.weekdays)} · 하루 ${formatMinutes(Number(values.daily_minutes))}${values.schedule ? ` · ${values.schedule}` : ""}` },
    { step: 3, label: "지금 상황", value: values.note || <span className="muted">적지 않았어요</span> },
    {
      step: 4,
      label: "잠글 앱",
      value: values.lock_apps.length ? (
        <span className="tile-row">
          {values.lock_apps.map((app) => (
            <AppTile key={app} name={app} size={26} />
          ))}
          <span>{values.lock_apps.join(", ")}</span>
        </span>
      ) : (
        <span className="muted">고르지 않았어요</span>
      ),
    },
    { step: 5, label: "자료 사진", value: file ? "1장" : <span className="muted">없어요</span> },
  ];
  return (
    <div className="summary">
      <div className="outlook-card">
        <small>{values.kind === "dated" ? "목표일까지" : "앞으로"}</small>
        <b>{look.label}</b>
        <p>{look.detail}</p>
      </div>
      <dl className="answers">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
            <button type="button" className="text-btn" onClick={() => onEdit(row.step)} aria-label={`${row.label} 고치기`}>
              고치기
            </button>
          </div>
        ))}
      </dl>
    </div>
  );
}
