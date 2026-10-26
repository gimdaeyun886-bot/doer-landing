"use client";

import { useEffect, useRef, useState } from "react";
import { MILESTONES } from "@/lib/streak";
import { Button, Symbol } from "./ui";

const SEEN_KEY = "doer.celebrated";

// 이정표 날의 한마디. 숫자보다 그날의 의미를 짧게 짚는다.
function milestoneLine(streak: number) {
  if (streak === 3) return "사흘을 이었어요. 처음 며칠이 가장 넘기 어려운 고비예요.";
  if (streak === 7) return "한 주를 꽉 채웠어요. 이제 습관이 자리를 잡기 시작해요.";
  if (streak === 14) return "두 주째예요. 버거운 날을 넘긴 날도 여기 다 들어 있어요.";
  if (streak === 30) return "한 달을 이었어요. 처음 계획을 세운 날의 나에게 보여 주고 싶은 숫자예요.";
  return `${streak}일을 이었어요. 여기까지 온 건 하루하루 인증한 덕분이에요.`;
}

// 오늘 할 일을 모두 인증한 순간. 그날 처음 한 번만, 다른 창이 닫힌 뒤에 아래에서 올라온다.
export function Celebrate({ today, streak, count, tomorrow }: { today: string; streak: number; count: number; tomorrow: string[] }) {
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
    <dialog ref={dialog} className="sheet celebrate" data-milestone={milestone || undefined} aria-labelledby="celebrate-title">
      <div className="burst" aria-hidden="true">
        <span className="burst-mark">
          <Symbol size={56} />
        </span>
        {Array.from({ length: 6 }, (_, index) => (
          <i key={index} style={{ "--turn": `${index * 60 + 15}deg` } as React.CSSProperties} />
        ))}
      </div>
      <p className="celebrate-count" aria-label={`연속 ${streak}일`}>
        <b key={shown}>{shown}</b>일째
      </p>
      <h2 id="celebrate-title">{milestone ? `${streak}일 연속이에요` : "오늘 몫을 다 해냈어요"}</h2>
      <p>{milestone ? milestoneLine(streak) : `오늘 할 일 ${count}가지를 모두 인증했어요. 잠금도 풀렸어요.`}</p>
      <div className="celebrate-next">
        <h3>내일</h3>
        {tomorrow.length ? (
          <ul className="bullets">
            {tomorrow.slice(0, 3).map((title) => (
              <li key={title}>{title}</li>
            ))}
            {tomorrow.length > 3 && <li>그 밖에 {tomorrow.length - 3}가지</li>}
          </ul>
        ) : (
          <p className="plain">쉬는 날이에요. 푹 쉬어요.</p>
        )}
      </div>
      <form method="dialog" className="sheet-actions">
        <Button type="submit" autoFocus>
          확인
        </Button>
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
