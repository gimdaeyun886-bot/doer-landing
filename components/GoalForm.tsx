"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { KINDS, LIMITS, LOCK_APPS, materialError, type FormState, type GoalField, type GoalKind, type GoalValues } from "@/lib/goals";
import { Button, Icon, Notice } from "./ui";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: GoalValues;
  today: string;
  mode: "create" | "edit";
  requestId?: string; // 등록할 때만. 같은 요청이 두 번 저장되지 않게 서버가 이 번호를 본다.
  currentMaterialUrl?: string | null;
};

// 목표를 등록하고 고치는 입력 폼. 저장하는 동안에는 입력칸과 버튼을 모두 잠근다.
export function GoalForm({ action, initial, today, mode, requestId, currentMaterialUrl }: Props) {
  const [state, formAction, pending] = useActionState(action, { attempt: 0 });
  const values = state.values ?? initial;
  const errors = state.errors ?? {};
  // 고른 사진은 여기서 들고 있는다. 검사에 걸려 폼이 다시 그려져도 사진이 남아 있게 하려는 것.
  const [file, setFile] = useState<File | null>(null);
  const [remove, setRemove] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  // 오류가 있으면 첫 번째 오류 칸으로 옮겨 준다.
  useEffect(() => {
    if (!state.attempt || !state.errors) return;
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  return (
    <form ref={form} action={formAction} className="goal-form" noValidate aria-busy={pending}>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      {requestId && <input type="hidden" name="request_id" value={requestId} />}

      {/* 제출할 때마다 새로 그려서, 서버가 돌려준 값이 입력칸에 확실히 들어가게 한다. */}
      <fieldset key={state.attempt} disabled={pending} className="fields">
        <Row id="title" label="목표" error={errors.title} count={LIMITS.title}>
          <input id="title" name="title" type="text" defaultValue={values.title} maxLength={LIMITS.title} placeholder="예: 정보처리기사 실기 합격" autoComplete="off" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? "title-error" : undefined} />
        </Row>
        <KindRow kind={values.kind} deadline={values.deadline} today={today} error={errors.deadline} />
        <Row id="daily_minutes" label="하루에 낼 시간" error={errors.daily_minutes}>
          <span className="with-unit">
            <input id="daily_minutes" name="daily_minutes" type="number" inputMode="numeric" min={LIMITS.minMinutes} max={LIMITS.maxMinutes} step={5} defaultValue={values.daily_minutes} placeholder="60" aria-invalid={Boolean(errors.daily_minutes)} aria-describedby={errors.daily_minutes ? "daily_minutes-error" : "daily_minutes-hint"} />
            <span>분</span>
          </span>
          {!errors.daily_minutes && (
            <p className="row-hint" id="daily_minutes-hint">
              {LIMITS.minMinutes}분에서 {LIMITS.maxMinutes}분 사이
            </p>
          )}
        </Row>
        <Row id="schedule" label="언제 할 수 있는지" optional error={errors.schedule}>
          <textarea id="schedule" name="schedule" rows={1} defaultValue={values.schedule} maxLength={LIMITS.schedule} placeholder="예: 평일 밤 9시 이후, 주말 오전" aria-invalid={Boolean(errors.schedule)} aria-describedby={errors.schedule ? "schedule-error" : undefined} />
        </Row>
        <Row id="note" label="지금 상황" optional error={errors.note}>
          <textarea id="note" name="note" rows={2} defaultValue={values.note} maxLength={LIMITS.note} placeholder="지금 수준, 약한 부분, 쓰는 교재나 강의" aria-invalid={Boolean(errors.note)} aria-describedby={errors.note ? "note-error" : undefined} />
        </Row>
        <LockRow selected={values.lock_apps} />
        <MaterialRow serverError={errors.material} file={file} onFile={setFile} remove={remove} onRemove={setRemove} currentMaterialUrl={currentMaterialUrl} />
      </fieldset>

      <div className="dock">
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending && <span className="spinner" aria-hidden="true" />}
          {pending ? "저장하는 중…" : mode === "create" ? "목표 저장하기" : "고친 내용 저장하기"}
        </Button>
      </div>
    </form>
  );
}

function Row({ id, label, optional, error, count, children }: { id: GoalField; label: string; optional?: boolean; error?: string; count?: number; children: React.ReactNode }) {
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span> 선택</span>}
        {count && <em>{count}자 이하</em>}
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
    <div className={`field${error ? " has-error" : ""}`}>
      <span className="field-label" id="kind-label">
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
      <p className="row-hint">{KINDS.find((item) => item.value === kind)!.hint}</p>
      {kind === "dated" && (
        <input id="deadline" name="deadline" type="date" min={today} defaultValue={deadline} aria-label="목표 날짜" aria-invalid={Boolean(error)} aria-describedby={error ? "deadline-error" : undefined} />
      )}
      {error && (
        <p className="row-error" id="deadline-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function LockRow({ selected }: { selected: string[] }) {
  return (
    <div className="field">
      <span className="field-label" id="lock-label">
        실행할 때 잠글 앱<span> 선택</span>
      </span>
      <div className="chips" role="group" aria-labelledby="lock-label">
        {LOCK_APPS.map((app) => (
          <label key={app} className="chip">
            <input type="checkbox" name="lock_apps" value={app} defaultChecked={selected.includes(app)} />
            <span>
              <Icon name="check" size={14} weight={2.6} />
              {app}
            </span>
          </label>
        ))}
      </div>
      <p className="row-hint">전화, 메신저, 검색은 잠그지 않아요.</p>
    </div>
  );
}

type MaterialProps = { serverError?: string; file: File | null; onFile: (file: File | null) => void; remove: boolean; onRemove: (remove: boolean) => void; currentMaterialUrl?: string | null };

function MaterialRow({ serverError, file, onFile, remove, onRemove: setRemove, currentMaterialUrl }: MaterialProps) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const error = clientError ?? serverError;

  // 들고 있는 사진을 파일 입력칸에 다시 담고 미리보기를 만든다.
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
    if (picked && !problem) setRemove(false);
  }

  function clear() {
    if (input.current) input.current.value = "";
    setClientError(null);
    onFile(null);
  }

  const shown = preview ?? (remove ? null : currentMaterialUrl);
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor="material">
        자료 사진<span> 선택</span>
      </label>
      <div className="material-row">
        <label className="material-thumb" htmlFor="material">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {shown ? <img src={shown} alt="고른 자료 사진 미리보기" /> : <Icon name="image" />}
        </label>
        <div className="material-text">
          <p>{shown ? (preview ? "새로 고른 사진" : "지금 올라가 있는 사진") : remove ? "저장하면 사진을 지워요" : "목차나 범위를 찍은 사진"}</p>
          <p className="muted">{shown ? "눌러서 바꾸기" : "JPG, PNG, WEBP · 3MB 이하"}</p>
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
        {!preview && remove && (
          <button type="button" className="text-btn" onClick={() => setRemove(false)}>
            되돌리기
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
