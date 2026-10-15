"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { applyAdjustment, requestAdjustment } from "@/app/goals/actions";
import { LIMITS, type AdjustOption } from "@/lib/goals";
import { CoachMark, Icon, NavButton } from "./ui";

// 목표를 정하는 대화에서 "오늘 버거워요" 같은 말을 하면, 그 말을 들고 이 대화로 넘어온다.
export const ADJUST_SAY_KEY = "doer.adjust.say";

type Item = { role: "user" | "coach"; text: string; problem?: boolean };

const HELLO = "오늘 무슨 일이 있었나요? 사정을 말해 주면 바꿀 방법과 그 대가를 보여 드릴게요. 고르기 전에는 아무것도 바뀌지 않아요.";

// 코치와 대화하며 오늘 계획을 조정한다. 사정을 말하면 조정안과 대가가 나오고, 고르거나 그대로 하기로 한다.
// left: 오늘 아직 인증하지 않은 할 일의 수.
export function AdjustChat({ left }: { left: number }) {
  const [items, setItems] = useState<Item[]>([{ role: "coach", text: left > 0 ? HELLO : "오늘은 조정할 할 일이 없어요." }]);
  const [options, setOptions] = useState<AdjustOption[] | null>(null);
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const sent = useRef(false);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, options, pending]);

  const say = (item: Item) => setItems((current) => [...current, item]);

  function send(message: string) {
    const clean = message.trim().slice(0, LIMITS.reason);
    if (!clean || pending || done || left === 0) return;
    say({ role: "user", text: clean });
    setText("");
    setOptions(null);
    setReason(clean);
    startTransition(async () => {
      const result = await requestAdjustment(clean);
      if (!result.options) return say({ role: "coach", text: result.message ?? "방법을 찾지 못했어요. 다시 말해 주세요.", problem: true });
      say({ role: "coach", text: result.reply ?? "이렇게 바꿀 수 있어요." });
      setOptions(result.options);
    });
  }

  // 다른 대화에서 넘겨받은 말이 있으면 바로 이어서 보낸다.
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    try {
      const carried = sessionStorage.getItem(ADJUST_SAY_KEY);
      sessionStorage.removeItem(ADJUST_SAY_KEY);
      if (carried) send(carried);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(option: AdjustOption) {
    if (pending) return;
    say({ role: "user", text: option.label });
    setOptions(null);
    startTransition(async () => {
      const result = await applyAdjustment(reason, option);
      if (!result.ok) return say({ role: "coach", text: result.message ?? "바꾸지 못했어요. 다시 시도해 주세요.", problem: true });
      say({ role: "coach", text: `바꿨어요. ${option.impact}` });
      setDone(true);
    });
  }

  function keep() {
    say({ role: "user", text: "그대로 할게요" });
    setOptions(null);
    say({ role: "coach", text: "알겠어요. 계획은 그대로예요." });
    setDone(true);
  }

  return (
    <div className="screen chat">
      <header className="chat-head">
        <NavButton href="/today" icon="chevL" label="오늘로" />
        <CoachMark />
        <div>
          <p className="chat-name">코치</p>
          <p className="chat-sub">오늘 계획 조정</p>
        </div>
      </header>

      <div className="chat-body">
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
              <p className="bubble typing" role="status" aria-label="코치가 답을 쓰고 있어요">
                <i />
                <i />
                <i />
              </p>
            </div>
          </div>
        )}

        {options && !pending && (
          <div className="under-coach">
            <ul className="adjust-list">
              {options.map((option) => (
                <li key={option.label}>
                  <button type="button" onClick={() => choose(option)}>
                    <b>{option.label}</b>
                    <span>
                      <Icon name="swap" size={14} />
                      {option.impact}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="text-btn" onClick={keep}>
              그대로 할게요
            </button>
          </div>
        )}

        {(done || left === 0) && !pending && (
          <div className="under-coach">
            <Link href="/today" className="btn btn-soft">
              오늘 할 일 보기
            </Link>
          </div>
        )}
        <div ref={end} />
      </div>

      {!done && left > 0 && (
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            send(text);
          }}
        >
          <label className="sr-only" htmlFor="adjust-say">
            코치에게 할 말
          </label>
          <textarea
            id="adjust-say"
            rows={1}
            value={text}
            maxLength={LIMITS.reason}
            placeholder="예: 야근해서 30분밖에 못 내요"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send(text);
              }
            }}
          />
          <button type="submit" className="composer-send" disabled={text.trim().length < 4 || pending} aria-label="보내기">
            <Icon name="up" weight={2.2} />
          </button>
        </form>
      )}
    </div>
  );
}
