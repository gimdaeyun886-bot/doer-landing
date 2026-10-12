"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { askCoach, createGoal } from "@/app/goals/actions";
import { EMPTY_VALUES, KINDS, LOCK_PRESETS, formatDate, formatMinutes, materialError, type GoalValues } from "@/lib/goals";
import type { Ask, ChatMessage, Slots } from "@/lib/plan";
import { ConfirmForm } from "./ConfirmForm";
import { Button, CoachMark, Icon, NavButton } from "./ui";

const EMPTY: Slots = { title: null, kind: null, deadline: null, daily_minutes: null, note: null, lock_targets: null };
const EXAMPLES = ["11월 15일 정보처리기사 실기, 하루 1시간", "주 3회 30분 달리기를 습관으로", "미뤄 둔 포트폴리오, 이번 달 안에"];
const SEEN_KEY = "doer.chatted";

type Item = ChatMessage & { image?: string; problem?: boolean };

function toValues(slots: Slots): GoalValues {
  return {
    ...EMPTY_VALUES,
    title: slots.title ?? "",
    kind: slots.kind ?? "dated",
    deadline: slots.deadline ?? "",
    daily_minutes: slots.daily_minutes ? String(slots.daily_minutes) : "",
    note: slots.note ?? "",
    lock_targets: slots.lock_targets ?? [],
  };
}

// 첫 만남. 코치와 자유롭게 대화하며 목표를 정하고, 마지막에 확인 장에서 한 번 확인한다.
export function CoachChat({ today }: { today: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<Slots>(EMPTY);
  const [ask, setAsk] = useState<Ask>("title");
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [firstTime, setFirstTime] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 예시 문장은 처음 쓰는 사람에게만 보여 준다.
    try {
      setFirstTime(!localStorage.getItem(SEEN_KEY));
    } catch {
      setFirstTime(true);
    }
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, pending, ready]);

  function send(message: string, image?: string, hasFile = Boolean(file)) {
    const clean = message.trim();
    if (!clean || pending) return;
    const next: Item[] = [...items, { role: "user", text: clean, image }];
    setItems(next);
    setText("");
    setPicked([]);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    startTransition(async () => {
      const history = next.filter((item) => !item.problem).map(({ role, text }) => ({ role, text }));
      const result = await askCoach(history, slots, hasFile);
      if (!result.ok) {
        setBroken(true);
        setItems((current) => [...current, { role: "coach", text: result.message, problem: true }]);
        return;
      }
      setSlots(result.slots);
      setAsk(result.ask);
      setReady(result.ready);
      setItems((current) => [...current, { role: "coach", text: result.reply }]);
    });
  }

  function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const problem = materialError(chosen);
    if (problem) {
      setItems((current) => [...current, { role: "coach", text: problem, problem: true }]);
      return;
    }
    setFile(chosen);
    send("목차 사진을 올렸어요.", URL.createObjectURL(chosen), true);
  }

  if (confirming) {
    return (
      <ConfirmForm
        action={createGoal}
        initial={toValues(slots)}
        today={today}
        mode="create"
        initialFile={file}
        back={
          <button type="button" className="nav-btn" onClick={() => setConfirming(false)} aria-label="대화로 돌아가기">
            <Icon name="chevL" weight={2} />
          </button>
        }
      />
    );
  }

  const started = items.length > 0;
  const known = [
    slots.title && ["목표", slots.title],
    slots.kind && ["기한", slots.kind === "dated" ? (slots.deadline ? formatDate(slots.deadline) : "날짜 있음") : KINDS.find((kind) => kind.value === slots.kind)!.short],
    slots.daily_minutes && ["하루", formatMinutes(slots.daily_minutes)],
    slots.lock_targets && ["잠금", slots.lock_targets.length ? slots.lock_targets.join(" · ") : "없음"],
  ].filter(Boolean) as [string, string][];
  const lastIsCoach = started && items[items.length - 1].role === "coach";

  return (
    <div className="screen screen-calm chat">
      <header className="chat-head">
        <NavButton href="/goals" icon="chevL" label="내 목표로" />
        <CoachMark />
        <div>
          <p className="chat-name">코치</p>
          <p className="chat-sub">목표를 같이 정해요</p>
        </div>
      </header>

      <div className="chat-body">
        {!started && (
          <div className="hello">
            <h1>{"안녕하세요.\n어떤 걸 해내고 싶어요?"}</h1>
            <p>{"시험, 운동, 책, 미뤄 둔 작업.\n무엇이든 편하게 말해 주세요."}</p>
          </div>
        )}

        {items.map((item, index) =>
          item.role === "user" ? (
            <div key={index} className="bubble-row">
              <div className="bubble">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.image && <img src={item.image} alt="올린 사진" />}
                <p>{item.text}</p>
              </div>
            </div>
          ) : (
            <p key={index} className={`coach-say${item.problem ? " is-problem" : ""}`} role={item.problem ? "alert" : undefined}>
              {item.text}
            </p>
          ),
        )}

        {pending && (
          <p className="typing" role="status" aria-label="코치가 답을 쓰고 있어요">
            <i />
            <i />
            <i />
          </p>
        )}

        {lastIsCoach && !pending && known.length > 0 && !broken && (
          <dl className="understood">
            {known.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {lastIsCoach && !pending && ask === "lock" && !ready && !broken && (
          <div className="quick">
            <div className="chips">
              {LOCK_PRESETS.map((item) => {
                const on = picked.includes(item);
                return (
                  <button key={item} type="button" className="chip-btn" aria-pressed={on} onClick={() => setPicked(on ? picked.filter((value) => value !== item) : [...picked, item])}>
                    {on && <Icon name="check" size={15} weight={2.4} />}
                    {item}
                  </button>
                );
              })}
            </div>
            <p className="quick-hint">{"여러 개 골라도 돼요. 직접 적어도 되고요.\n필요한 앱과 검색, 메신저, 전화는 그대로 열려 있어요."}</p>
            {picked.length > 0 && (
              <Button type="button" variant="soft" onClick={() => send(picked.join(", "))}>
                {picked.join(" · ")} 잠그기
              </Button>
            )}
          </div>
        )}

        {lastIsCoach && !pending && (ask === "note" || ask === "material") && !ready && !broken && (
          <div className="quick">
            <button type="button" className="text-btn" onClick={() => send("넘어갈게요.")}>
              건너뛰기
            </button>
          </div>
        )}

        {(ready || broken) && !pending && (
          <div className="quick">
            <Button type="button" onClick={() => setConfirming(true)}>
              {ready ? "확인하러 가기" : "직접 적기"}
            </Button>
          </div>
        )}
        <div ref={end} />
      </div>

      {!started && firstTime && (
        <div className="examples">
          <p>이렇게 말해 볼 수 있어요</p>
          <ul>
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => {
                    setText(example);
                    input.current?.focus();
                  }}
                >
                  <span>{example}</span>
                  <Icon name="insert" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          send(text);
        }}
      >
        <button type="button" className={`composer-photo${ask === "material" ? " is-hinted" : ""}`} onClick={() => fileInput.current?.click()} aria-label="목차·범위 사진 올리기">
          <Icon name="image" />
        </button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPhoto} tabIndex={-1} aria-hidden="true" />
        <label className="sr-only" htmlFor="say">
          코치에게 할 말
        </label>
        <textarea
          ref={input}
          id="say"
          rows={1}
          value={text}
          maxLength={300}
          placeholder={started ? "편하게 말해 주세요" : "하고 싶은 일을 말해 주세요"}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send(text);
            }
          }}
        />
        <button type="submit" className="composer-send" disabled={!text.trim() || pending} aria-label="보내기">
          <Icon name="up" weight={2.2} />
        </button>
      </form>
    </div>
  );
}
