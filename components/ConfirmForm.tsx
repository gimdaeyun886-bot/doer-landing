"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { KINDS, LIMITS, LOCK_PRESETS, materialError, type FormState, type GoalField, type GoalKind, type GoalValues } from "@/lib/goals";
import { Button, Icon, Notice, Symbol } from "./ui";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: GoalValues;
  today: string;
  mode: "create" | "edit";
  initialFile?: File | null;
  currentMaterialUrl?: string | null;
  back: React.ReactNode;
};

// 확인 장. 대화로 모은 내용을 한 장으로 보여 주고, 여기서만 직접 고친다. 목표를 고칠 때도 같은 장을 쓴다.
export function ConfirmForm({ action, initial, today, mode, initialFile, currentMaterialUrl, back }: Props) {
  const [state, formAction, pending] = useActionState(action, { attempt: 0 });
  const values = state.values ?? initial;
  const errors = state.errors ?? {};
  const create = mode === "create";
  // 고른 사진은 여기서 들고 있는다. 검증에 걸려 폼이 다시 그려져도 사진이 사라지지 않게 하려는 것.
  const [file, setFile] = useState<File | null>(initialFile ?? null);

  return (
    <form action={formAction} className="screen screen-warm confirm" noValidate>
      <div className="topbar">{back}</div>
      <header className="headline">
        <p className="overline">{create ? "코치가 알아들은 것" : "목표 고치기"}</p>
        <h1>{create ? "이대로 계획을\n짤까요?" : "달라진 점을\n고쳐 주세요"}</h1>
        <p>{create ? "틀린 곳은 눌러서 고쳐요." : "날짜나 시간을 바꾸면 코치가 계획을 다시 짜요."}</p>
      </header>

      {state.message && <Notice tone="error">{state.message}</Notice>}

      {/* 제출할 때마다 새로 그려서, 서버가 돌려준 값이 입력칸에 확실히 들어가게 한다. */}
      <fieldset key={state.attempt} disabled={pending} className="sheet-list">
        <Row id="title" label="목표" error={errors.title}>
          <input id="title" name="title" type="text" defaultValue={values.title} maxLength={LIMITS.title} placeholder="예: 정보처리기사 실기" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : undefined} />
        </Row>
        <KindRow kind={values.kind} deadline={values.deadline} today={today} error={errors.deadline} />
        <Row id="daily_minutes" label="하루에 낼 시간" error={errors.daily_minutes}>
          <span className="with-unit">
            <input id="daily_minutes" name="daily_minutes" type="number" inputMode="numeric" min={LIMITS.minMinutes} max={LIMITS.maxMinutes} step={5} defaultValue={values.daily_minutes} placeholder="60" aria-invalid={Boolean(errors.daily_minutes)} aria-describedby={errors.daily_minutes ? "daily_minutes-error" : undefined} />
            <span>분</span>
          </span>
        </Row>
        <Row id="note" label="지금 상황" optional error={errors.note}>
          <textarea id="note" name="note" rows={2} defaultValue={values.note} maxLength={LIMITS.note} placeholder="지금 수준, 약한 부분, 쓰는 교재나 강의" aria-invalid={Boolean(errors.note)} aria-describedby={errors.note ? "note-error" : undefined} />
        </Row>
        <MaterialRow serverError={errors.material} file={file} onFile={setFile} currentMaterialUrl={currentMaterialUrl} />
        <LockRow selected={values.lock_targets} />
      </fieldset>

      <div className="dock">
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {create ? "계획 만들기" : "저장하고 계획 맞추기"}
        </Button>
      </div>

      {pending && <Planning />}
    </form>
  );
}

function Row({ id, label, optional, error, children }: { id: GoalField; label: string; optional?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className={`sheet-row${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span> 선택</span>}
      </label>
      {children}
      {error && (
        <p className="row-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function KindRow({ kind: initialKind, deadline, today, error }: { kind: GoalKind; deadline: string; today: string; error?: string }) {
  const [kind, setKind] = useState<GoalKind>(initialKind);
  return (
    <div className={`sheet-row${error ? " has-error" : ""}`}>
      <span className="row-label" id="kind-label">
        기한
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby="kind-label">
        {KINDS.map((item) => (
          <label key={item.value}>
            <input type="radio" name="kind" value={item.value} checked={kind === item.value} onChange={() => setKind(item.value)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
      {kind === "dated" && <input id="deadline" name="deadline" type="date" min={today} defaultValue={deadline} aria-label="날짜" aria-invalid={Boolean(error)} aria-describedby={error ? "deadline-error" : undefined} />}
      {error && (
        <p className="row-error" id="deadline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function MaterialRow({ serverError, file, onFile, currentMaterialUrl }: { serverError?: string; file: File | null; onFile: (file: File | null) => void; currentMaterialUrl?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const error = clientError ?? serverError;

  // 들고 있는 사진(대화에서 올렸거나 방금 고른 것)을 파일 입력칸에 담고 미리보기를 만든다.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    if (input.current && input.current.files?.[0] !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.current.files = transfer.files;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    const problem = picked ? materialError(picked) : null;
    // 형식이나 크기가 맞지 않는 파일은 서버로 보내기 전에 여기서 걸러 낸다.
    if (problem) event.target.value = "";
    setClientError(problem);
    onFile(problem ? null : picked);
  }

  function clear() {
    if (input.current) input.current.value = "";
    setClientError(null);
    onFile(null);
  }

  const shown = preview ?? (remove ? null : currentMaterialUrl);
  return (
    <div className={`sheet-row${error ? " has-error" : ""}`}>
      <label htmlFor="material">
        자료<span> 선택</span>
      </label>
      <div className="material-row">
        <label className="material-thumb" htmlFor="material">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shown ? <img src={shown} alt="올린 자료" /> : <Icon name="image" />}
        </label>
        <div className="material-text">
          <p>{shown ? "목차·범위 사진 1장" : "목차나 범위 사진"}</p>
          <p className="muted">{shown ? "눌러서 다른 사진으로 바꿔요" : "올리면 단원 이름에 맞춰 짜요 · 3MB 이하"}</p>
        </div>
        {preview && (
          <button type="button" className="icon-btn" onClick={clear} aria-label="고른 사진 빼기">
            <Icon name="x" size={18} weight={2} />
          </button>
        )}
        {!preview && currentMaterialUrl && !remove && (
          <button type="button" className="icon-btn" onClick={() => setRemove(true)} aria-label="올린 사진 지우기">
            <Icon name="trash" size={18} />
          </button>
        )}
      </div>
      <input ref={input} id="material" name="material" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={onChange} aria-invalid={Boolean(error)} aria-describedby={error ? "material-error" : undefined} />
      {remove && <input type="hidden" name="remove_material" value="on" />}
      {error && (
        <p className="row-error" id="material-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function LockRow({ selected }: { selected: string[] }) {
  const custom = selected.filter((item) => !LOCK_PRESETS.includes(item));
  return (
    <div className="sheet-row">
      <span className="row-label" id="lock-label">
        잠글 화면
      </span>
      <div className="chips" role="group" aria-labelledby="lock-label">
        {LOCK_PRESETS.map((item) => (
          <label key={item} className="chip">
            <input type="checkbox" name="lock" value={item} defaultChecked={selected.includes(item)} />
            <span>
              <Icon name="check" size={15} weight={2.4} />
              {item}
            </span>
          </label>
        ))}
      </div>
      <input name="lock_custom" type="text" defaultValue={custom.join(", ")} maxLength={60} placeholder="다른 화면이 있으면 적어요" aria-label="다른 잠글 화면" />
    </div>
  );
}

const STEPS = ["범위 살펴보기", "주차별로 나누기", "오늘 할 일 정하기"];

// 저장 중: 코치가 계획을 만드는 동안 화면을 덮는다. 조용한 화면.
function Planning() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), 2800);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="planning" role="status" aria-live="polite">
      <div className="ring">
        <svg viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r="46.5" className="ring-track" />
          <circle cx="48" cy="48" r="46.5" className="ring-arc" />
        </svg>
        <span>
          <Symbol size={44} />
        </span>
      </div>
      <h2>{"계획을 오늘 할 일로\n나누고 있어요"}</h2>
      <p>10초쯤 걸릴 수 있어요.</p>
      <ol className="steps">
        {STEPS.map((label, index) => (
          <li key={label} data-state={index < step ? "done" : index === step ? "now" : "next"}>
            <i>{index < step && <Icon name="check" size={13} weight={2.8} />}</i>
            <span>{label}</span>
            {index === step && <em>지금</em>}
          </li>
        ))}
      </ol>
    </div>
  );
}
