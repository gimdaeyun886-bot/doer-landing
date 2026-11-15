"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { applyRecovery, requestRecovery, type RecoverOption } from "@/app/goals/actions";
import { LIMITS, weekdayOf } from "@/lib/goals";
import { CoachMark, Icon, NavButton } from "./ui";

type Item = { role: "user" | "coach"; text: string; problem?: boolean };

// 사정을 고르기 쉽게 자주 나오는 말을 먼저 보여 준다. 직접 적어도 된다.
const REASONS = ["바빴어요", "몸이 안 좋았어요", "깜빡했어요", "하기 싫었어요"];
// 서버에 닿지 못했을 때(인터넷 끊김 등). 대화는 그대로 두고 다시 시도하게 한다.
const OFFLINE = "연결이 끊겨 답을 받지 못했어요. 인터넷을 확인하고 다시 시도해 주세요.";

// 지난 며칠 동안 못 한 일을 코치와 정리한다. 사정을 말하면 코치가 무엇을 살릴지 고른 안을 내고,
// 말하지 않아도 기본 방법(남은 날에 나눠 하기, 이번엔 넘기기)으로 정리할 수 있다.
// line: "어제 못 한 일 2가지가 있어요" 같은 한 줄. 없으면 정리할 것이 없다.
export function RecoverChat({ line, titles, until, today }: { line: string | null; titles: string[]; until: string | null; today: string }) {
  // 정리한 뒤 서버가 화면을 다시 그려도 대화가 바뀌지 않게 처음 값만 쓴다.
  const [start] = useState({ line, titles });
  const [items, setItems] = useState<Item[]>(() =>
    start.line
      ? [{ role: "coach", text: `${start.line}: ${start.titles.join(", ")}. 무슨 일이 있었나요? 사정에 맞춰 무엇을 살릴지 골라 드릴게요.` }]
      : [{ role: "coach", text: "지금은 정리할 놓친 일이 없어요." }],
  );
  const [options, setOptions] = useState<RecoverOption[] | null>(null);
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const [asked, setAsked] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "end" });
  }, [items, options, pending]);

  const say = (item: Item) => setItems((current) => [...current, item]);
  const open = Boolean(start.line) && !done;

  function ask(message: string) {
    const clean = message.trim().slice(0, LIMITS.reason);
    if (pending || !open) return;
    say({ role: "user", text: clean || "말하지 않고 정리할게요" });
    setText("");
    setOptions(null);
    setReason(clean);
    setAsked(true);
    startTransition(async () => {
      const result = await requestRecovery(clean).catch(() => ({ message: OFFLINE }) as Awaited<ReturnType<typeof requestRecovery>>);
      if (!result.options) return say({ role: "coach", text: result.message ?? "방법을 찾지 못했어요. 다시 시도해 주세요.", problem: true });
      say({ role: "coach", text: result.reply ?? "이렇게 정리할 수 있어요.", problem: result.fallback });
      setOptions(result.options);
    });
  }

  function choose(option: RecoverOption) {
    if (pending) return;
    say({ role: "user", text: option.label });
    setOptions(null);
    startTransition(async () => {
      const result: Awaited<ReturnType<typeof applyRecovery>> = await applyRecovery(reason, option).catch(() => ({ ok: false, message: OFFLINE }));
      if (!result.ok) {
        say({ role: "coach", text: result.message ?? "정리하지 못했어요. 다시 시도해 주세요.", problem: true });
        setAsked(false);
        return;
      }
      say({ role: "coach", text: result.message ?? `정리했어요. ${result.impact ?? option.impact}` });
      setDone(true);
    });
  }

  function later() {
    say({ role: "user", text: "나중에 정할게요" });
    setOptions(null);
    const when = !until || until === today ? "오늘까지" : `${weekdayOf(until)}요일까지`;
    say({ role: "coach", text: `알겠어요. ${when} 오늘 화면에서 다시 정리할 수 있어요.` });
    setDone(true);
  }

  return (
    <div className="screen chat">
      <header className="chat-head">
        <NavButton href="/today" icon="chevL" label="오늘로" />
        <CoachMark />
        <div>
          <h1 className="chat-name">코치</h1>
          <p className="chat-sub">놓친 날 이어 가기</p>
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

        {/* 코치가 이미 답했으면 서버가 화면을 다시 그리는 동안에도 점을 띄우지 않는다. */}
        {pending && items[items.length - 1]?.role === "user" && (
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

        {open && !asked && !pending && (
          <div className="quick under-coach">
            <div className="chips">
              {REASONS.map((label) => (
                <button key={label} type="button" className="chip-btn option-btn" onClick={() => ask(label)}>
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="text-btn" onClick={() => ask("")}>
              말하지 않고 정리할게요
            </button>
          </div>
        )}

        {options && !pending && (
          <div className="under-coach">
            <ul className="adjust-list recover-list">
              {options.map((option) => (
                <li key={`${option.source}-${option.label}`}>
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
            <button type="button" className="text-btn" onClick={later}>
              나중에 정할게요
            </button>
          </div>
        )}

        {(done || !start.line) && !pending && (
          <div className="under-coach">
            <Link href="/today" className="btn btn-soft">
              오늘 할 일 보기
            </Link>
          </div>
        )}
        <div ref={end} />
      </div>

      {open && !asked && (
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim().length >= 2) ask(text);
          }}
        >
          <label className="sr-only" htmlFor="recover-say">
            코치에게 할 말
          </label>
          <textarea
            id="recover-say"
            rows={1}
            value={text}
            maxLength={LIMITS.reason}
            placeholder="예: 야근이 이틀 이어졌어요"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (text.trim().length >= 2) ask(text);
              }
            }}
          />
          <button type="submit" className="composer-send" disabled={text.trim().length < 2 || pending} aria-label="보내기">
            <Icon name="up" weight={2.2} />
          </button>
        </form>
      )}
    </div>
  );
}
