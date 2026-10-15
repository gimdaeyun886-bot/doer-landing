"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { CoachMark } from "./ui";

export type TourStep = { target?: string; text: string };

type Box = { top: number; left: number; width: number; height: number };

// 처음 온 사람에게 코치가 화면을 하나씩 짚으며 알려 준다. 한 번 본 안내는 이 기기에 적어 두고 다시 띄우지 않는다.
// target은 짚을 요소의 CSS 선택자. 화면에 없는 요소를 짚는 단계는 건너뛴다. target이 없으면 가운데에서 말한다.
// need: 이 요소가 화면에 있을 때만 안내를 시작한다. 짚어 줄 것이 없는 날에 안내를 써 버리지 않기 위해서다.
export function CoachTour({ id, steps, need, doneLabel = "알겠어요", doneHref }: { id: string; steps: TourStep[]; need?: string; doneLabel?: string; doneHref?: string }) {
  const router = useRouter();
  const key = `doer.tour.${id}`;
  const [list, setList] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  // 화면이 다 그려진 뒤에, 실제로 있는 요소를 짚는 단계만 골라 시작한다.
  useEffect(() => {
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      if (need && !document.querySelector(need)) return;
      const usable = steps.filter((step) => !step.target || document.querySelector(step.target));
      if (usable.length) setList(usable);
    }, 450);
    return () => clearTimeout(timer);
  }, [key, steps, need]);

  const step = list?.[index] ?? null;

  const measure = useCallback(() => {
    const element = step?.target ? document.querySelector(step.target) : null;
    if (!element) return setBox(null);
    const rect = element.getBoundingClientRect();
    setBox({ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 });
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return;
    const element = step.target ? document.querySelector(step.target) : null;
    element?.scrollIntoView({ block: "center" });
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure]);

  // 안내가 떠 있는 동안에는 뒤 화면이 움직이지 않게 한다.
  useEffect(() => {
    if (!list) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [list]);

  if (!list || !step) return null;
  const last = index === list.length - 1;

  function finish(go: boolean) {
    try {
      localStorage.setItem(key, "1");
    } catch {}
    setList(null);
    if (go && doneHref) router.push(doneHref);
  }

  // 짚은 요소가 화면 아래쪽에 있으면 말풍선을 그 위에, 아니면 아래에 둔다.
  const below = !box || box.top + box.height / 2 < window.innerHeight / 2;
  const place = !box ? { top: "50%", transform: "translateY(-50%)" } : below ? { top: Math.min(box.top + box.height + 14, window.innerHeight - 220) } : { bottom: Math.max(window.innerHeight - box.top + 14, 16) };

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="코치의 안내">
      {box ? <span className="tour-hole" style={box} aria-hidden="true" /> : <span className="tour-dim" aria-hidden="true" />}
      <div key={index} className="tour-card" style={place}>
        <div className="tour-who">
          <CoachMark size={32} />
          <b>코치</b>
          <span>
            {index + 1} / {list.length}
          </span>
        </div>
        <p aria-live="polite">{step.text}</p>
        <div className="tour-actions">
          {!last && (
            <button type="button" className="tour-skip" onClick={() => finish(false)}>
              건너뛰기
            </button>
          )}
          <button type="button" className="tour-next" onClick={() => (last ? finish(true) : setIndex(index + 1))} autoFocus>
            {last ? doneLabel : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
