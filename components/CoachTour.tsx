"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CoachMark, Icon } from "./ui";

export type TourStep = { target?: string; text: string };

const TOUR_EVENT = "doer:tour";

// 이 화면의 안내를 다시 여는 물음표 버튼.
export function TourButton({ id }: { id: string }) {
  return (
    <button type="button" className="nav-btn tour-help" onClick={() => window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail: id }))} aria-label="이 화면 안내 다시 보기">
      <Icon name="quiz" size={22} />
    </button>
  );
}

type Box = { top: number; left: number; width: number; height: number };

// 처음 온 사람에게 코치가 화면을 하나씩 짚으며 알려 준다. 한 번 본 안내는 이 기기에 적어 두고 저절로는 다시 띄우지 않는다.
// 다시 보고 싶으면 화면 위의 물음표(TourButton)로 연다.
// target은 짚을 요소의 CSS 선택자. 화면에 없는 요소를 짚는 단계는 건너뛴다. target이 없으면 가운데에서 말한다.
// need: 이 요소가 화면에 있을 때만 안내를 시작한다. 짚어 줄 것이 없는 날에 안내를 써 버리지 않기 위해서다.
export function CoachTour({ id, steps, need, doneLabel = "알겠어요", doneHref }: { id: string; steps: TourStep[]; need?: string; doneLabel?: string; doneHref?: string }) {
  const router = useRouter();
  const key = `doer.tour.${id}`;
  const [list, setList] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const card = useRef<HTMLDivElement>(null);

  // 실제로 있는 요소를 짚는 단계만 골라 처음부터 시작한다.
  const begin = useCallback(() => {
    if (need && !document.querySelector(need)) return;
    const usable = steps.filter((step) => !step.target || document.querySelector(step.target));
    if (!usable.length) return;
    setIndex(0);
    setList(usable);
  }, [steps, need]);

  // 처음 한 번은 화면이 다 그려진 뒤에 저절로 띄운다.
  useEffect(() => {
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      return;
    }
    const timer = setTimeout(begin, 450);
    return () => clearTimeout(timer);
  }, [key, begin]);

  // 물음표를 누르면 다시 띄운다.
  useEffect(() => {
    const onAsk = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) begin();
    };
    window.addEventListener(TOUR_EVENT, onAsk);
    return () => window.removeEventListener(TOUR_EVENT, onAsk);
  }, [id, begin]);

  const step = list?.[index] ?? null;

  // 단계가 바뀌면 말풍선으로 초점을 옮긴다. 버튼에 바로 주면 초점 테두리가 늘 보여 이중 테두리처럼 보인다.
  useEffect(() => {
    if (list) card.current?.focus({ preventScroll: true });
  }, [list, index]);

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

  // 안내가 떠 있는 동안 키보드 초점은 안내 안에서만 돈다. Escape는 건너뛰기와 같다.
  useEffect(() => {
    if (!list) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        try {
          localStorage.setItem(key, "1");
        } catch {}
        setList(null);
        return;
      }
      if (event.key !== "Tab" || !card.current) return;
      const buttons = [...card.current.querySelectorAll<HTMLElement>("button")];
      if (!buttons.length) return;
      const first = buttons[0];
      const end = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        first.focus();
      } else if (!card.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    // 뒤 화면은 안내가 떠 있는 동안 누르거나 읽히지 않게 한다.
    const behind = [...document.querySelectorAll<HTMLElement>(".app > .screen > *:not(.tour), .tabbar")];
    behind.forEach((element) => element.setAttribute("inert", ""));
    return () => {
      document.removeEventListener("keydown", onKey);
      behind.forEach((element) => element.removeAttribute("inert"));
    };
  }, [list, key]);

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
  // PC에서는 휴대폰 틀 안에서만 띄운다.
  const frame = document.querySelector(".app")?.getBoundingClientRect();
  const top = Math.max(frame?.top ?? 0, 0);
  const bottom = Math.min(frame?.bottom ?? window.innerHeight, window.innerHeight);
  const below = !box || box.top + box.height / 2 < (top + bottom) / 2;
  const place = !box
    ? { top: "50%", transform: "translateY(-50%)" }
    : below
      ? { top: Math.min(box.top + box.height + 14, bottom - 200) }
      : { bottom: Math.max(window.innerHeight - box.top + 14, window.innerHeight - bottom + 16) };

  return (
    <div className="tour" data-tour={id} role="dialog" aria-modal="true" aria-label="코치의 안내">
      {box ? <span className="tour-hole" style={box} aria-hidden="true" /> : <span className="tour-dim" aria-hidden="true" />}
      <div key={index} ref={card} className="tour-card" style={place} tabIndex={-1}>
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
          <button type="button" className="tour-next" onClick={() => (last ? finish(true) : setIndex(index + 1))}>
            {last ? doneLabel : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
