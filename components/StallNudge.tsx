"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CoachMark } from "./ui";

const HOUR = 60 * 60 * 1000;
// 시작하고 이만큼 지났는데도 남은 일이 있으면 코치가 말을 건다.
const AFTER_START = 1.5 * HOUR;
// 시작하지 않은 채 오늘 화면을 처음 본 뒤로 이만큼 지났을 때.
const AFTER_SEEN = 3 * HOUR;
// 시작하지 않은 채 이 시각(시)을 넘겼을 때.
const LATE_HOUR = 21;

export const startedKey = (today: string) => `doer.started.${today}`;
const seenKey = (today: string) => `doer.seen.${today}`;
const quietKey = (today: string) => `doer.nudge.${today}`;

/** 오늘 할 일을 시작한 시각을 이 기기에 적어 둔다. */
export function markStarted(today: string) {
  try {
    if (!localStorage.getItem(startedKey(today))) localStorage.setItem(startedKey(today), String(Date.now()));
  } catch {}
}

// 할 일을 오래 하지 않고 있을 때 화면 아래에서 올라오는 코치의 한마디. 조정은 코치와의 대화에서 한다.
// 하루에 한 번만 뜨고, 닫으면 그날은 다시 뜨지 않는다.
export function StallNudge({ today, left, started }: { today: string; left: number; started: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (left === 0) return setOpen(false);
    function check() {
      try {
        if (localStorage.getItem(quietKey(today))) return setOpen(false);
        const now = Date.now();
        if (!localStorage.getItem(seenKey(today))) localStorage.setItem(seenKey(today), String(now));
        if (started) markStarted(today);
        const since = (key: string) => now - Number(localStorage.getItem(key) ?? now);
        const stalled = started ? since(startedKey(today)) >= AFTER_START : since(seenKey(today)) >= AFTER_SEEN || new Date().getHours() >= LATE_HOUR;
        setOpen(stalled);
      } catch {}
    }
    check();
    const timer = setInterval(check, 60 * 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [today, left, started]);

  if (!open) return null;

  function quiet() {
    try {
      localStorage.setItem(quietKey(today), "1");
    } catch {}
    setOpen(false);
  }

  return (
    <aside className="nudge" role="status" aria-label="코치의 한마디">
      <CoachMark size={36} />
      <div>
        <p>
          <b>아직 {left}가지가 남았어요.</b> 오늘이 버거우면 저와 얘기해서 조정해요.
        </p>
        <div className="nudge-actions">
          <button type="button" onClick={quiet}>
            괜찮아요
          </button>
          <Link href="/goals/new?talk=adjust" onClick={quiet}>
            코치와 얘기하기
          </Link>
        </div>
      </div>
    </aside>
  );
}
