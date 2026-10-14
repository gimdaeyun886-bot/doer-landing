"use client";

// 목표 입력칸들. 등록(한 단계씩)과 수정(한 화면)에서 같은 부품을 쓴다.
import { useEffect, useRef, useState } from "react";
import { DAY_NAMES, KINDS, LIMITS, LOCK_APPS, WEEK_ORDER, formatHours, formatMinutes, materialError, type GoalField, type GoalKind } from "@/lib/goals";
import { AppTile } from "./AppTile";
import { Icon } from "./ui";

const describedBy = (id: string, error?: string, hint?: boolean) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function FieldError({ id, error }: { id: GoalField; error?: string }) {
  if (!error) return null;
  return (
    <p className="row-error" id={`${id}-error`} role="alert">
      <Icon name="alert" size={15} weight={2} />
      {error}
    </p>
  );
}

export function TitleField({ value, error, autoFocus }: { value: string; error?: string; autoFocus?: boolean }) {
  const [length, setLength] = useState(value.length);
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <div className="input-box">
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={value}
          maxLength={LIMITS.title}
          placeholder="예: 정보처리기사 실기 합격"
          autoComplete="off"
          autoFocus={autoFocus}
          onChange={(event) => setLength(event.target.value.length)}
          aria-label="목표"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy("title", error)}
        />
        <span className="counter" aria-hidden="true">
          {length}/{LIMITS.title}
        </span>
      </div>
      <FieldError id="title" error={error} />
    </div>
  );
}

export function KindField({ kind: initialKind, deadline, today, error }: { kind: GoalKind; deadline: string; today: string; error?: string }) {
  const [kind, setKind] = useState<GoalKind>(initialKind);
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <div className="choice-list" role="radiogroup" aria-label="목표의 종류">
        {KINDS.map((item) => (
          <label key={item.value} className="choice">
            <input type="radio" name="kind" value={item.value} checked={kind === item.value} onChange={() => setKind(item.value)} />
            <span className="choice-body">
              <b>{item.label}</b>
              <small>
                {item.hint} · {item.example}
              </small>
            </span>
            <span className="radio-dot" aria-hidden="true" />
          </label>
        ))}
      </div>
      {kind === "dated" && (
        <div className="date-field">
          <label className="field-label" htmlFor="deadline">
            목표 날짜
          </label>
          <div className="input-box date-box">
            <input id="deadline" name="deadline" type="date" min={today} defaultValue={deadline} aria-invalid={Boolean(error)} aria-describedby={describedBy("deadline", error)} />
          </div>
        </div>
      )}
      <FieldError id="deadline" error={error} />
    </div>
  );
}

const QUICK_MINUTES = [30, 60, 90, 120];
const PRESETS = [
  { label: "평일", days: [1, 2, 3, 4, 5] },
  { label: "주말", days: [0, 6] },
  { label: "매일", days: [0, 1, 2, 3, 4, 5, 6] },
];

export function WhenField({ weekdays: initialDays, minutes: initialMinutes, schedule, errors }: { weekdays: number[]; minutes: string; schedule: string; errors: Partial<Record<GoalField, string>> }) {
  const [days, setDays] = useState<number[]>(initialDays);
  const [minutes, setMinutes] = useState(initialMinutes);
  const toggle = (day: number) => setDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  const value = Number(minutes);
  const valid = Number.isInteger(value) && value >= LIMITS.minMinutes && value <= LIMITS.maxMinutes;

  return (
    <div className="when">
      <div className={`field${errors.weekdays ? " has-error" : ""}`}>
        <div className="field-top">
          <span className="field-label" id="weekdays-label">
            할 수 있는 요일
          </span>
          <span className="presets">
            {PRESETS.map((preset) => (
              <button key={preset.label} type="button" className="mini-btn" aria-pressed={preset.days.join() === [...days].sort().join()} onClick={() => setDays(preset.days)}>
                {preset.label}
              </button>
            ))}
          </span>
        </div>
        <div className="days" role="group" aria-labelledby="weekdays-label" aria-describedby={describedBy("weekdays", errors.weekdays)}>
          {WEEK_ORDER.map((day) => (
            <label key={day} className="day">
              <input type="checkbox" name="weekdays" value={day} checked={days.includes(day)} onChange={() => toggle(day)} aria-invalid={Boolean(errors.weekdays)} />
              <span>{DAY_NAMES[day]}</span>
            </label>
          ))}
        </div>
        <FieldError id="weekdays" error={errors.weekdays} />
      </div>

      <div className={`field${errors.daily_minutes ? " has-error" : ""}`}>
        <label className="field-label" htmlFor="daily_minutes">
          하루에 낼 시간
        </label>
        <div className="minutes">
          <div className="input-box minutes-box">
            <input id="daily_minutes" name="daily_minutes" type="number" inputMode="numeric" min={LIMITS.minMinutes} max={LIMITS.maxMinutes} step={5} value={minutes} onChange={(event) => setMinutes(event.target.value)} aria-invalid={Boolean(errors.daily_minutes)} aria-describedby={describedBy("daily_minutes", errors.daily_minutes, true)} />
            <span>분</span>
          </div>
          <div className="quick" role="group" aria-label="자주 고르는 시간">
            {QUICK_MINUTES.map((item) => (
              <button key={item} type="button" className="mini-btn" aria-pressed={value === item} onClick={() => setMinutes(String(item))}>
                {formatMinutes(item)}
              </button>
            ))}
          </div>
        </div>
        {errors.daily_minutes ? (
          <FieldError id="daily_minutes" error={errors.daily_minutes} />
        ) : (
          <p className="row-hint" id="daily_minutes-hint">
            {valid && days.length ? `한 주에 ${days.length}번, 약 ${formatHours(days.length * value)}이에요.` : `${LIMITS.minMinutes}분에서 ${LIMITS.maxMinutes}분 사이로 적어 주세요.`}
          </p>
        )}
      </div>

      <div className={`field${errors.schedule ? " has-error" : ""}`}>
        <label className="field-label" htmlFor="schedule">
          시간대 메모<span> 선택</span>
        </label>
        <div className="input-box">
          <input id="schedule" name="schedule" type="text" defaultValue={schedule} maxLength={LIMITS.schedule} placeholder="예: 퇴근하고 밤 9시 이후" autoComplete="off" aria-invalid={Boolean(errors.schedule)} aria-describedby={describedBy("schedule", errors.schedule)} />
        </div>
        <FieldError id="schedule" error={errors.schedule} />
      </div>
    </div>
  );
}

export function NoteField({ value, error }: { value: string; error?: string }) {
  const [length, setLength] = useState(value.length);
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <div className="input-box textarea-box">
        <textarea id="note" name="note" rows={4} defaultValue={value} maxLength={LIMITS.note} placeholder={"예: 필기는 붙었고 실기 기출을 한 번 풀어 봤어요.\nSQL이 약해요."} onChange={(event) => setLength(event.target.value.length)} aria-label="지금 상황" aria-invalid={Boolean(error)} aria-describedby={describedBy("note", error)} />
        <span className="counter" aria-hidden="true">
          {length}/{LIMITS.note}
        </span>
      </div>
      <FieldError id="note" error={error} />
    </div>
  );
}

export function LockField({ selected }: { selected: string[] }) {
  return (
    <div className="field">
      <div className="app-grid" role="group" aria-label="잠글 앱">
        {LOCK_APPS.map((app) => (
          <label key={app} className="app-pick">
            <input type="checkbox" name="lock_apps" value={app} defaultChecked={selected.includes(app)} />
            <AppTile name={app} />
            <span className="app-name">{app}</span>
            <span className="app-check" aria-hidden="true">
              <Icon name="lock" size={12} weight={2.4} />
            </span>
          </label>
        ))}
      </div>
      <p className="row-hint">
        <Icon name="check" size={14} weight={2.2} />
        전화, 메신저, 검색은 목록에 없어요. 언제나 열려 있어요.
      </p>
    </div>
  );
}

type MaterialProps = {
  file: File | null;
  onFile: (file: File | null) => void;
  remove: boolean;
  onRemove: (remove: boolean) => void;
  currentUrl?: string | null;
  serverError?: string;
};

export function MaterialField({ file, onFile, remove, onRemove, currentUrl, serverError }: MaterialProps) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const error = clientError ?? serverError;

  // 들고 있는 사진을 파일 입력칸에 다시 담고 미리보기를 만든다. 폼이 다시 그려져도 사진이 남는다.
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
    if (picked && !problem) onRemove(false);
  }

  function clear() {
    if (input.current) input.current.value = "";
    setClientError(null);
    onFile(null);
  }

  const shown = preview ?? (remove ? null : currentUrl);
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      {shown ? (
        <div className="photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="고른 자료 사진 미리보기" />
          <div className="photo-bar">
            <span>{preview ? "새로 고른 사진" : "지금 올라가 있는 사진"}</span>
            <label htmlFor="material" className="mini-btn">
              바꾸기
            </label>
            {preview ? (
              <button type="button" className="mini-btn" onClick={clear}>
                빼기
              </button>
            ) : (
              <button type="button" className="mini-btn" onClick={() => onRemove(true)} aria-label="올린 사진 지우기">
                지우기
              </button>
            )}
          </div>
        </div>
      ) : (
        <label htmlFor="material" className="drop">
          <Icon name="image" size={28} weight={1.6} />
          <b>{remove ? "저장하면 사진을 지워요" : "사진 고르기"}</b>
          <small>목차나 시험 범위를 찍은 사진 · JPG, PNG, WEBP · 3MB 이하</small>
          {remove && (
            <button type="button" className="mini-btn" onClick={(event) => (event.preventDefault(), onRemove(false))}>
              지우지 않기
            </button>
          )}
        </label>
      )}
      <input ref={input} id="material" name="material" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={onChange} aria-label="자료 사진" aria-invalid={Boolean(error)} aria-describedby={describedBy("material", error)} />
      {remove && <input type="hidden" name="remove_material" value="on" />}
      <FieldError id="material" error={error ?? undefined} />
    </div>
  );
}
