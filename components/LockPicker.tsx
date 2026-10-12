"use client";

import { useState } from "react";
import { LIMITS, LOCK_APPS } from "@/lib/goals";
import { Icon } from "./ui";

const partOf = (app: { name: string; part?: string }) => `${app.name} ${app.part}`;

// 잠글 앱 고르기. 앱을 고르고, 릴스·쇼츠가 있는 앱은 그 화면만 잠글지 앱 전체를 잠글지 정한다.
// name을 주면 고른 값을 폼과 함께 보낸다.
export function LockPicker({ value, onChange, name }: { value: string[]; onChange: (next: string[]) => void; name?: string }) {
  const [custom, setCustom] = useState("");
  const known = new Set(LOCK_APPS.flatMap((app) => (app.part ? [app.name, partOf(app)] : [app.name])));
  const extras = value.filter((item) => !known.has(item));
  const state = (app: (typeof LOCK_APPS)[number]) => (value.includes(app.name) ? "all" : app.part && value.includes(partOf(app)) ? "part" : null);
  const without = (app: (typeof LOCK_APPS)[number]) => value.filter((item) => item !== app.name && item !== partOf(app));

  function addCustom() {
    const text = custom.trim().slice(0, LIMITS.lockLength);
    setCustom("");
    if (text && !value.includes(text) && value.length < LIMITS.lockCount) onChange([...value, text]);
  }

  return (
    <div className="lock-picker">
      <div className="chips">
        {LOCK_APPS.map((app) => {
          const on = state(app);
          return (
            <button key={app.name} type="button" className="chip-btn" aria-pressed={Boolean(on)} onClick={() => onChange(on ? without(app) : [...value, app.part ? partOf(app) : app.name])}>
              {on && <Icon name="check" size={15} weight={2.4} />}
              {app.name}
            </button>
          );
        })}
        {extras.map((item) => (
          <button key={item} type="button" className="chip-btn" aria-pressed="true" onClick={() => onChange(value.filter((other) => other !== item))} aria-label={`${item} 빼기`}>
            {item}
            <Icon name="x" size={14} weight={2.2} />
          </button>
        ))}
      </div>

      {LOCK_APPS.filter((app) => app.part && state(app)).map((app) => (
        <div key={app.name} className="lock-scope">
          <span>{app.name}</span>
          <div className="segmented" role="radiogroup" aria-label={`${app.name}에서 잠글 범위`}>
            <label>
              <input type="radio" checked={state(app) === "part"} onChange={() => onChange([...without(app), partOf(app)])} />
              <span>{app.part}만</span>
            </label>
            <label>
              <input type="radio" checked={state(app) === "all"} onChange={() => onChange([...without(app), app.name])} />
              <span>앱 전체</span>
            </label>
          </div>
        </div>
      ))}

      <div className="lock-add">
        <input
          type="text"
          value={custom}
          maxLength={LIMITS.lockLength}
          placeholder="다른 앱 이름 적기"
          aria-label="다른 잠글 앱"
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              addCustom();
            }
          }}
        />
        <button type="button" className="icon-btn" onClick={addCustom} disabled={!custom.trim()} aria-label="적은 앱 더하기">
          <Icon name="plus" size={18} weight={2} />
        </button>
      </div>
      {name && value.map((item) => <input key={item} type="hidden" name={name} value={item} />)}
    </div>
  );
}
