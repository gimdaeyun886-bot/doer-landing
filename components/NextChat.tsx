"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { regeneratePlan } from "@/app/goals/actions";
import { CHAT_KEY } from "./CoachChat";
import { CoachMark, Icon, NavButton } from "./ui";

type Item = { role: "user" | "coach"; text: string; problem?: boolean };

const OFFLINE = "연결이 끊겨 계획을 받지 못했어요. 인터넷을 확인하고 다시 시도해 주세요.";

const CHOICES = [
  { key: "continue", label: "이어서 짜기", impact: "목표와 지난 기록은 그대로 두고, 오늘부터 이어서 할 계획을 짜요." },
  { key: "fresh", label: "새로 짜기", impact: "목표나 사정이 달라졌다면 코치와 처음부터 다시 이야기해요." },
] as const;

// 계획한 기간이 끝난 목표를 두고 코치가 먼저 묻는다. 이어서 짤지, 처음부터 새로 짤지.
// 이어서 짜면 그 목표의 계획을 오늘부터 다시 만들고(지난 기록은 그대로), 새로 짜면 새 목표 대화로 간다.
// newDate: 날짜 있는 목표의 목표일이 이미 지났으면, 이어서 짜기 전에 목표 고치기에서 새 날짜를 정한다.
export function NextChat({ goalId, title, newDate = false }: { goalId: string | null; title: string | null; newDate?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(() =>
    goalId && title
      ? [{ role: "coach", text: `'${title}' 계획한 기간이 끝났어요. 지금까지 해 온 흐름을 이어서 다음 계획을 짤까요, 아니면 처음부터 새로 짤까요?` }]
      : [{ role: "coach", text: "이어서 계획을 짤 목표를 찾지 못했어요. 목표 화면에서 다시 골라 주세요." }],
  );
  const [chosen, setChosen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "end" });
  }, [items, pending]);

  const say = (...next: Item[]) => setItems((current) => [...current, ...next]);

  function choose(key: (typeof CHOICES)[number]["key"]) {
    if (pending || !goalId) return;
    const choice = CHOICES.find((item) => item.key === key)!;
    setChosen(true);
    setFailed(false);
    if (key === "fresh") {
      say({ role: "user", text: choice.label }, { role: "coach", text: "좋아요. 무엇을 해내고 싶은지부터 다시 들어 볼게요." });
      // 예전 대화가 이어 붙지 않게 저장된 목표 대화를 비우고 새로 시작한다.
      try {
        localStorage.removeItem(CHAT_KEY);
      } catch {}
      window.setTimeout(() => router.push("/goals/new"), 600);
      return;
    }
    if (newDate) {
      say({ role: "user", text: choice.label }, { role: "coach", text: "목표일이 이미 지났어요. 새 날짜를 정하면 지금까지 한 것을 바탕으로 이어서 짤게요." });
      window.setTimeout(() => router.push(`/goals/${goalId}/edit`), 900);
      return;
    }
    say({ role: "user", text: choice.label }, { role: "coach", text: "좋아요. 지금까지 한 것을 바탕으로 다음 계획을 짜 볼게요. 1분쯤 걸려요." });
    startTransition(async () => {
      // 성공하면 서버가 목표 화면으로 보낸다. 돌아온 값이 있으면 실패다.
      const result = await regeneratePlan(goalId, {}, new FormData()).catch(() => ({ message: OFFLINE }));
      if (result?.message) {
        say({ role: "coach", text: result.message, problem: true });
        setChosen(false);
        setFailed(true);
      }
    });
  }

  return (
    <div className="screen chat">
      <header className="chat-head">
        <NavButton href="/today" icon="chevL" label="오늘로" />
        <CoachMark />
        <div>
          <h1 className="chat-name">코치</h1>
          <p className="chat-sub">다음 계획</p>
        </div>
      </header>

      <div className="chat-body" role="log" aria-live="polite">
        {items.map((item, index) =>
          item.role === "user" ? (
            <div key={index} className="msg msg-me">
              <div className="bubble">
                <p>{item.text}</p>
              </div>
            </div>
          ) : (
            <div key={index} className="msg msg-coach">
              <CoachMark size={34} />
              <div>
                <p className="msg-name">코치</p>
                <p className={`bubble coach-say${item.problem ? " is-problem" : ""}`} role={item.problem ? "alert" : undefined}>
                  {item.text}
                </p>
              </div>
            </div>
          ),
        )}

        {pending && (
          <div className="msg msg-coach">
            <CoachMark size={34} />
            <div>
              <p className="msg-name">코치</p>
              <p className="bubble typing" role="status" aria-label="코치가 계획을 짜고 있어요">
                <i />
                <i />
                <i />
              </p>
            </div>
          </div>
        )}

        {goalId && !chosen && !pending && (
          <div className="under-coach">
            <ul className="adjust-list next-list">
              {CHOICES.map((choice) => (
                <li key={choice.key}>
                  <button type="button" onClick={() => choose(choice.key)}>
                    <b>{failed && choice.key === "continue" ? "다시 이어서 짜기" : choice.label}</b>
                    <span>
                      <Icon name={choice.key === "continue" ? "repeat" : "plus"} size={14} />
                      {newDate && choice.key === "continue" ? "목표일이 지났으니 새 날짜를 정하고 이어서 짜요." : choice.impact}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!goalId && (
          <div className="under-coach">
            <Link href="/goals" className="btn btn-soft">
              내 목표 보기
            </Link>
          </div>
        )}
        <div ref={end} />
      </div>
    </div>
  );
}
