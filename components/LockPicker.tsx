"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITS, LOCK_APPS, lockLabel } from "@/lib/goals";
import { installedApps, native, type InstalledApp } from "@/lib/native";
import { Button, Icon } from "./ui";

type App = (typeof LOCK_APPS)[number];
const partOf = (app: App, part: string) => `${app.name} ${part}`;
const ownTargets = (app: App) => [app.name, ...(app.parts ?? []).map((part) => partOf(app, part))];

// 잠글 앱 고르기. 앱을 고르고, 릴스·스토리처럼 화면이 나뉜 앱은 잠글 화면을 따로 고른다.
// 휴대폰 앱에서는 설치된 앱 목록에서 직접 고를 수 있다. name을 주면 고른 값을 폼과 함께 보낸다.
export function LockPicker({ value, onChange, name }: { value: string[]; onChange: (next: string[]) => void; name?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (native()) setApps(installedApps());
  }, []);

  const full = value.length >= LIMITS.lockCount;
  const picked = (app: App) => value.filter((item) => ownTargets(app).includes(item));
  const without = (app: App) => value.filter((item) => !ownTargets(app).includes(item));
  const extras = value.filter((item) => item.includes("|"));
  const knownPkgs = new Set(LOCK_APPS.map((app) => app.pkg));
  const shown = (apps ?? []).filter((app) => !knownPkgs.has(app.pkg) && app.label.toLowerCase().includes(query.trim().toLowerCase()));

  function toggleApp(app: App) {
    if (picked(app).length) onChange(without(app));
    else if (!full) onChange([...value, app.parts ? partOf(app, app.parts[0]) : app.name]);
  }

  function togglePart(app: App, part: string | null) {
    const rest = without(app);
    if (part === null) return onChange([...rest, app.name]);
    const parts = picked(app).filter((item) => item !== app.name);
    const target = partOf(app, part);
    const next = parts.includes(target) ? parts.filter((item) => item !== target) : [...parts, target];
    // 화면을 모두 끄면 그 앱을 고르지 않은 것으로 돌아간다.
    onChange([...rest, ...next]);
  }

  return (
    <div className="lock-picker">
      <div className="chips">
        {LOCK_APPS.map((app) => {
          const on = picked(app).length > 0;
          return (
            <button key={app.name} type="button" className="chip-btn" aria-pressed={on} onClick={() => toggleApp(app)}>
              {on && <Icon name="check" size={15} weight={2.4} />}
              {app.name}
            </button>
          );
        })}
        {extras.map((item) => (
          <button key={item} type="button" className="chip-btn" aria-pressed="true" onClick={() => onChange(value.filter((other) => other !== item))} aria-label={`${lockLabel(item)} 빼기`}>
            <Icon name="check" size={15} weight={2.4} />
            {lockLabel(item)}
          </button>
        ))}
      </div>

      {LOCK_APPS.filter((app) => app.parts && picked(app).length).map((app) => {
        const whole = value.includes(app.name);
        return (
          <div key={app.name} className="lock-scope">
            <span>{app.name}에서 잠글 곳</span>
            <div className="chips" role="group" aria-label={`${app.name}에서 잠글 화면`}>
              {app.parts!.map((part) => (
                <button key={part} type="button" className="chip-btn chip-sm" aria-pressed={!whole && value.includes(partOf(app, part))} onClick={() => togglePart(app, part)}>
                  {part}
                </button>
              ))}
              <button type="button" className="chip-btn chip-sm" aria-pressed={whole} onClick={() => togglePart(app, null)}>
                앱 전체
              </button>
            </div>
          </div>
        );
      })}

      {apps ? (
        <Button type="button" variant="quiet" className="btn-sm" onClick={() => dialog.current?.showModal()}>
          <Icon name="plus" size={17} weight={2} />내 휴대폰의 다른 앱 고르기
        </Button>
      ) : (
        <p className="row-hint">목록에 없는 앱은 Do-er 앱을 휴대폰에 설치하면, 설치된 앱 가운데서 바로 고를 수 있어요.</p>
      )}

      <dialog ref={dialog} className="sheet app-sheet" aria-label="설치된 앱에서 고르기">
        <span className="sheet-grip" aria-hidden="true" />
        <h2>잠글 앱을 골라 주세요</h2>
        <p>이 목록은 휴대폰 안에서만 쓰고 고른 앱의 이름만 저장해요.</p>
        <label className="search">
          <Icon name="search" size={18} />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="앱 이름으로 찾기" aria-label="앱 이름으로 찾기" />
        </label>
        <ul className="app-list">
          {shown.map((app) => {
            const target = `${app.label}|${app.pkg}`;
            const on = value.includes(target);
            return (
              <li key={app.pkg}>
                <button type="button" aria-pressed={on} disabled={!on && full} onClick={() => onChange(on ? value.filter((item) => item !== target) : [...value, target])}>
                  <span>{app.label}</span>
                  <i>{on && <Icon name="check" size={15} weight={2.6} />}</i>
                </button>
              </li>
            );
          })}
          {shown.length === 0 && <li className="muted">찾는 앱이 없어요.</li>}
        </ul>
        <div className="sheet-actions">
          <Button type="button" onClick={() => dialog.current?.close()}>
            다 골랐어요
          </Button>
        </div>
      </dialog>

      {name && value.map((item) => <input key={item} type="hidden" name={name} value={item} />)}
    </div>
  );
}
