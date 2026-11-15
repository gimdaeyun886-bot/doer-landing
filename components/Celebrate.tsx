"use client";

import { useEffect, useRef, useState } from "react";
import { MILESTONES } from "@/lib/streak";
import { Art, Button, Symbol, backdropClose } from "./ui";

const SEEN_KEY = "doer.celebrated";

// 이정표 날의 한마디. 숫자보다 그날의 의미를 짧게 짚는다.
function milestoneTitle(streak: number) {
  if (streak === 3) return "사흘을 이었어요";
  if (streak === 7) return "한 주를 꽉 채웠어요";
  if (streak === 14) return "두 주를 이었어요";
  if (streak === 30) return "한 달을 이었어요";
  return `${streak}일을 이었어요`;
}

function milestoneLine(streak: number) {
  if (streak === 3) return "처음 며칠이 가장 넘기 어려운 고비예요. 그 고비를 넘겼어요.";
  if (streak === 7) return "이제 습관이 자리를 잡기 시작해요.";
  if (streak === 14) return "버거운 날을 넘긴 날도 여기 다 들어 있어요.";
  if (streak === 30) return "처음 계획을 세운 날의 나에게 보여 주고 싶은 숫자예요.";
  return "여기까지 온 건 하루하루 인증한 덕분이에요.";
}

// 오늘 할 일을 모두 인증한 순간. 그날 처음 한 번만, 다른 창이 닫힌 뒤에 아래에서 올라온다.
export function Celebrate({ today, streak, count, tomorrow, unlocked }: { today: string; streak: number; count: number; tomorrow: string[]; unlocked: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState(Math.max(0, streak - 1));
  const milestone = MILESTONES.includes(streak);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) === today) return;
    } catch {}
    // 인증 창이 열려 있으면 닫힐 때까지 기다린다.
    const timer = window.setInterval(() => {
      if (document.querySelector("dialog[open]")) return;
      window.clearInterval(timer);
      dialog.current?.showModal();
      // 버튼이 아니라 제목에 초점을 둬, 열리자마자 버튼에 테두리가 생기지 않게 한다.
      dialog.current?.querySelector<HTMLElement>("#celebrate-title")?.focus();
      try {
        localStorage.setItem(SEEN_KEY, today);
      } catch {}
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (still) setShown(streak);
      else window.setTimeout(() => setShown(streak), 650);
    }, 400);
    return () => window.clearInterval(timer);
  }, [today, streak]);

  return (
    <dialog ref={dialog} {...backdropClose()} className="sheet celebrate" data-milestone={milestone || undefined} aria-labelledby="celebrate-title">
      <div className="burst" aria-hidden="true">
        <span className="burst-mark">
          <Art name={streak >= 30 ? "cup" : streak >= 7 ? "candle" : "lock-open"} size={150} />
        </span>
        {Array.from({ length: 6 }, (_, index) => (
          <i key={index} style={{ "--turn": `${index * 60 + 15}deg` } as React.CSSProperties} />
        ))}
      </div>
      <p className="celebrate-count" aria-label={`연속 ${streak}일`}>
        <b key={shown}>{shown}</b>일째
      </p>
      <h2 id="celebrate-title" tabIndex={-1}>{milestone ? milestoneTitle(streak) : "오늘 몫을 다 해냈어요"}</h2>
      {/* 이정표 날에도 잠금이 풀렸다는 것은 꼭 말한다. 이 순간의 가장 큰 보상이다. */}
      <p>
        {milestone ? milestoneLine(streak) : `오늘 할 일 ${count}가지를 모두 인증했어요.`}
        {unlocked && " 잠금도 풀렸어요."}
      </p>
      <div className="group next-group">
        <div className="section-head">
          <h3>내일</h3>
          {tomorrow.length > 3 && <span>그 밖에 {tomorrow.length - 3}가지</span>}
        </div>
        <ul className="section rows">
          {tomorrow.length ? (
            tomorrow.slice(0, 3).map((title) => (
              <li key={title} className="row">
                {title}
              </li>
            ))
          ) : (
            <li className="row">쉬는 날이에요</li>
          )}
        </ul>
      </div>
      <form method="dialog" className="sheet-actions">
        <Button type="submit">닫기</Button>
      </form>
    </dialog>
  );
}

// 오늘 화면 머리의 연속 기록. 누르면 어떻게 세는지 한 줄로 알려 준다.
export function StreakBadge({ streak, doneToday }: { streak: number; doneToday: boolean }) {
  const [open, setOpen] = useState(false);
  const label = streak === 0 ? "오늘이 첫날" : `${streak}일째`;
  return (
    <div className="streak">
      <button type="button" className="streak-badge" data-live={doneToday || undefined} aria-expanded={open} aria-label={`연속 ${streak}일`} onClick={() => setOpen(!open)}>
        <Symbol size={16} />
        {label}
      </button>
      {open && (
        <p className="streak-rule" role="note">
          할 일을 모두 인증한 날이 이어져요. 코치와 조정한 날도 이어지고, 쉬는 날은 세지 않아요.
          {!doneToday && streak > 0 && " 오늘을 끝내면 하루가 더해져요."}
        </p>
      )}
    </div>
  );
}
