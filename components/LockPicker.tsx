"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LIMITS, LOCK_APPS, lockLabel } from "@/lib/goals";
import { installedApps, native } from "@/lib/native";
import { Button, Icon } from "./ui";

type Known = (typeof LOCK_APPS)[number];
type Choice = { key: string; label: string; known?: Known; target: string };

const partOf = (app: Known, part: string) => `${app.name} ${part}`;
const ownTargets = (app: Known) => [app.name, ...(app.parts ?? []).map((part) => partOf(app, part))];

// 잠글 앱 고르기. 고른 앱만 목록으로 보여 주고, 릴스·스토리·쇼츠처럼 화면이 나뉜 앱은 잠글 화면을 따로 고른다.
// 휴대폰 앱에서는 설치된 앱 가운데서, 웹에서는 잠글 수 있는 앱 가운데서 찾아 더한다. name을 주면 고른 값을 폼과 함께 보낸다.
export function LockPicker({ value, onChange, name }: { value: string[]; onChange: (next: string[]) => void; name?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [inApp, setInApp] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const catalog: Choice[] = LOCK_APPS.map((app) => ({ key: app.pkg, label: app.name, known: app, target: app.name }));
    if (!native()) return setChoices(catalog);
    // 설치된 앱 가운데 화면별 잠금을 아는 앱은 그 정보를 붙이고, 나머지는 앱 전체로 잠근다.
    const byPkg = new Map(LOCK_APPS.map((app) => [app.pkg, app]));
    setInApp(true);
    setChoices(
      installedApps().map((app) => {
        const known = byPkg.get(app.pkg);
        return known ? { key: app.pkg, label: known.name, known, target: known.name } : { key: app.pkg, label: app.label, target: `${app.label}|${app.pkg}` };
      }),
    );
  }, []);

  const full = value.length >= LIMITS.lockCount;
  const picked = (app: Known) => value.filter((item) => ownTargets(app).includes(item));
  const without = (app: Known) => value.filter((item) => !ownTargets(app).includes(item));
  const isOn = (choice: Choice) => (choice.known ? picked(choice.known).length > 0 : value.includes(choice.target));
  const chosenKnown = LOCK_APPS.filter((app) => picked(app).length > 0);
  const chosenOther = value.filter((item) => item.includes("|"));
  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    return choices.filter((choice) => choice.label.toLowerCase().includes(text));
  }, [choices, query]);

  function toggle(choice: Choice) {
    if (choice.known) {
      const app = choice.known;
      // 화면이 나뉜 앱은 가장 흔한 화면(릴스, 쇼츠)부터 고른 상태로 넣는다.
      if (picked(app).length) onChange(without(app));
      else if (!full) onChange([...value, app.parts ? partOf(app, app.parts[0]) : app.name]);
    } else if (value.includes(choice.target)) onChange(value.filter((item) => item !== choice.target));
    else if (!full) onChange([...value, choice.target]);
  }

  function togglePart(app: Known, part: string | null) {
    const rest = without(app);
    if (part === null) return onChange([...rest, app.name]);
    const parts = picked(app).filter((item) => item !== app.name);
    const target = partOf(app, part);
    const next = parts.includes(target) ? parts.filter((item) => item !== target) : [...parts, target];
    // 화면을 모두 끄면 그 앱은 목록에서 빠진다.
    onChange([...rest, ...next]);
  }

  return (
    <div className="lock-picker">
      {chosenKnown.length + chosenOther.length > 0 && (
        <ul className="lock-chosen">
          {chosenKnown.map((app) => {
            const whole = value.includes(app.name);
            return (
              <li key={app.name}>
                <div className="lock-chosen-top">
                  <b>{app.name}</b>
                  <button type="button" className="icon-btn" onClick={() => onChange(without(app))} aria-label={`${app.name} 빼기`}>
                    <Icon name="x" size={16} weight={2} />
                  </button>
                </div>
                {app.parts ? (
                  <div className="chips" role="group" aria-label={`${app.name}에서 잠글 화면`}>
                    {app.parts.map((part) => (
                      <button key={part} type="button" className="chip-btn chip-sm" aria-pressed={!whole && value.includes(partOf(app, part))} onClick={() => togglePart(app, part)}>
                        {part}
                      </button>
                    ))}
                    <button type="button" className="chip-btn chip-sm" aria-pressed={whole} onClick={() => togglePart(app, null)}>
                      앱 전체
                    </button>
                  </div>
                ) : (
                  <p>앱 전체를 잠가요</p>
                )}
              </li>
            );
          })}
          {chosenOther.map((item) => (
            <li key={item}>
              <div className="lock-chosen-top">
                <b>{lockLabel(item)}</b>
                <button type="button" className="icon-btn" onClick={() => onChange(value.filter((other) => other !== item))} aria-label={`${lockLabel(item)} 빼기`}>
                  <Icon name="x" size={16} weight={2} />
                </button>
              </div>
              <p>앱 전체를 잠가요</p>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="quiet"
        className="btn-sm"
        disabled={full}
        onClick={() => {
          setQuery("");
          dialog.current?.showModal();
        }}
      >
        <Icon name="plus" size={17} weight={2} />
        {value.length ? "앱 더 고르기" : "잠글 앱 고르기"}
      </Button>

      <dialog ref={dialog} className="sheet app-sheet" aria-label="잠글 앱 고르기">
        <span className="sheet-grip" aria-hidden="true" />
        <h2>잠글 앱을 골라 주세요</h2>
        <label className="search">
          <Icon name="search" size={18} />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="앱 이름으로 찾기" aria-label="앱 이름으로 찾기" autoComplete="off" />
        </label>
        {/* 찾는 동안 창의 높이가 바뀌지 않도록 목록 칸의 높이를 고정한다. */}
        <ul className="app-list">
          {shown.map((choice) => {
            const on = isOn(choice);
            return (
              <li key={choice.key}>
                <button type="button" aria-pressed={on} disabled={!on && full} onClick={() => toggle(choice)}>
                  <span>
                    {choice.label}
                    {choice.known?.parts && <small>{choice.known.parts.join(" · ")}만 잠글 수도 있어요</small>}
                  </span>
                  <i>{on && <Icon name="check" size={15} weight={2.6} />}</i>
                </button>
              </li>
            );
          })}
          {shown.length === 0 && <li className="muted">{choices.length ? "찾는 앱이 없어요." : "앱 목록을 불러오지 못했어요."}</li>}
        </ul>
        <p className="keep-note">{inApp ? "앱 목록은 휴대폰 안에서만 쓰고, 고른 앱 이름만 저장해요." : "Do-er 앱을 설치하면 설치된 모든 앱에서 고를 수 있어요."}</p>
        <div className="sheet-actions">
          <Button type="button" onClick={() => dialog.current?.close()}>
            {value.length ? `${chosenKnown.length + chosenOther.length}개 앱 골랐어요` : "닫기"}
          </Button>
        </div>
      </dialog>

      {name && value.map((item) => <input key={item} type="hidden" name={name} value={item} />)}
    </div>
  );
}
