"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { askCoach, createGoal } from "@/app/goals/actions";
import { EMPTY_VALUES, KINDS, formatDate, formatMinutes, materialError, type GoalValues } from "@/lib/goals";
import type { Ask, ChatMessage, Slots } from "@/lib/plan";
import { ConfirmForm } from "./ConfirmForm";
import { LockPicker } from "./LockPicker";
import { Button, CoachMark, Icon, NavButton, Symbol } from "./ui";

const EMPTY: Slots = { title: null, kind: null, deadline: null, schedule: null, daily_minutes: null, note: null, material_summary: null, lock_targets: null };
const EXAMPLES = ["11월 15일 정보처리기사 실기, 평일 밤 1시간", "주 3회 아침 30분 달리기를 습관으로", "미뤄 둔 포트폴리오, 이번 달 안에"];
const HOW = [
  { icon: "chat", title: "말하면 계획을 짜요", text: "끝나는 날까지 날짜별로" },
  { icon: "today", title: "매일 오늘 몫만", text: "자정까지 끝낼 한두 가지" },
  { icon: "lock", title: "고른 앱이 잠겨요", text: "전화·메신저·검색은 열려 있어요" },
  { icon: "camera", title: "인증하면 열려요", text: "코치가 사진을 보고 확인해요" },
] as const;
const SEEN_KEY = "doer.chatted";

type Item = ChatMessage & { image?: string; problem?: boolean };

function toValues(slots: Slots): GoalValues {
  return {
    ...EMPTY_VALUES,
    title: slots.title ?? "",
    kind: slots.kind ?? "dated",
    deadline: slots.deadline ?? "",
    daily_minutes: slots.daily_minutes ? String(slots.daily_minutes) : "",
    schedule: slots.schedule ?? "",
    note: slots.note ?? "",
    material_summary: slots.material_summary ?? "",
    lock_targets: slots.lock_targets ?? [],
  };
}

// 첫 만남. 코치와 자유롭게 대화하며 목표를 정하고, 마지막에 확인 장에서 한 번 확인한다.
// savedLocks: 이미 골라 둔 잠글 앱. 있으면 코치가 다시 묻지 않는다.
export function CoachChat({ today, savedLocks }: { today: string; savedLocks: string[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<Slots>({ ...EMPTY, lock_targets: savedLocks.length ? savedLocks : null });
  const [ask, setAsk] = useState<Ask>("title");
  const [options, setOptions] = useState<string[]>([]);
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
    // 서비스 소개와 예시 문장은 처음 쓰는 사람에게만 보여 준다.
    try {
      setFirstTime(!localStorage.getItem(SEEN_KEY));
    } catch {
      setFirstTime(true);
    }
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, pending, ready, picked]);

  function send(message: string, photo?: File) {
    const clean = message.trim();
    if (!clean || pending) return;
    const next: Item[] = [...items, { role: "user", text: clean, image: photo ? URL.createObjectURL(photo) : undefined }];
    setItems(next);
    setText("");
    setPicked([]);
    setOptions([]);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    startTransition(async () => {
      const history = next.filter((item) => !item.problem).map(({ role, text }) => ({ role, text }));
      let payload: FormData | undefined;
      if (photo) {
        payload = new FormData();
        payload.set("material", photo);
      }
      const result = await askCoach(history, slots, payload);
      if (!result.ok) {
        setBroken(true);
        setItems((current) => [...current, { role: "coach", text: result.message, problem: true }]);
        return;
      }
      setSlots(result.slots);
      setAsk(result.ask);
      setOptions(result.options);
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
    send("자료 사진을 올렸어요.", chosen);
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
  const steps = [Boolean(slots.title), Boolean(slots.kind && (slots.kind !== "dated" || slots.deadline)), Boolean(slots.daily_minutes), Boolean(slots.lock_targets)];
  const done = steps.filter(Boolean).length;
  const known = [
    slots.title && ["목표", slots.title],
    slots.kind && ["기한", slots.kind === "dated" ? (slots.deadline ? formatDate(slots.deadline) : "날짜 있음") : KINDS.find((kind) => kind.value === slots.kind)!.short],
    slots.daily_minutes && ["시간", slots.schedule || `하루 ${formatMinutes(slots.daily_minutes)}`],
    slots.lock_targets && ["잠금", slots.lock_targets.length ? slots.lock_targets.join(" · ") : "없음"],
  ].filter(Boolean) as [string, string][];
  const lastIsCoach = started && items[items.length - 1].role === "coach";
  const canAnswer = lastIsCoach && !pending && !ready && !broken;

  return (
    <div className="screen screen-calm chat">
      <header className="chat-head">
        <NavButton href="/goals" icon="chevL" label="내 목표로" />
        {started && <CoachMark />}
        <div>
          <p className="chat-name">코치</p>
          <p className="chat-sub">{started ? (ready ? "다 정리했어요" : `${steps.length}가지 중 ${done}가지를 알았어요`) : "목표를 같이 정해요"}</p>
        </div>
        {started && (
          <ol className="chat-steps" aria-hidden="true">
            {steps.map((filled, index) => (
              <li key={index} data-on={filled} />
            ))}
          </ol>
        )}
      </header>

      <div className="chat-body">
        {!started && (
          <div className="hello">
            <span className="hello-mark" aria-hidden="true">
              <Symbol size={64} />
            </span>
            <h1>{"안녕하세요, 코치예요.\n어떤 걸 해내고 싶어요?"}</h1>
            <p>{"시험, 운동, 책, 미뤄 둔 작업.\n무엇이든 편하게 말해 주세요."}</p>
            {firstTime && (
              <ol className="how">
                {HOW.map((step) => (
                  <li key={step.title}>
                    <i>
                      <Icon name={step.icon} size={18} />
                    </i>
                    <span>
                      <b>{step.title}</b>
                      {step.text}
                    </span>
                  </li>
                ))}
              </ol>
            )}
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

        {lastIsCoach && !pending && ready && known.length > 0 && (
          <dl className="understood">
            {known.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {canAnswer && ask !== "lock" && options.length > 0 && (
          <div className="quick">
            <div className="chips">
              {options.map((option) => (
                <button key={option} type="button" className="chip-btn option-btn" onClick={() => send(option)}>
                  {option}
                </button>
              ))}
            </div>
            <p className="quick-hint">눌러서 답하거나, 아래에 직접 적어도 돼요.</p>
          </div>
        )}

        {canAnswer && ask === "lock" && (
          <div className="quick lock-card">
            <LockPicker value={picked} onChange={setPicked} />
            <p className="quick-hint">고른 앱만 잠겨요. 전화, 메신저, 검색은 그대로 열려 있어요.</p>
            <Button type="button" variant="soft" disabled={picked.length === 0} onClick={() => send(`${picked.join(", ")} 잠글게요.`)}>
              {picked.length ? `${picked.join(" · ")} 잠그기` : "잠글 앱을 골라 주세요"}
            </Button>
            <button type="button" className="text-btn" onClick={() => send("잠글 앱은 없어요.")}>
              잠글 앱 없이 할게요
            </button>
          </div>
        )}

        {canAnswer && (ask === "note" || ask === "material") && (
          <div className="quick">
            {ask === "material" && (
              <Button type="button" variant="soft" onClick={() => fileInput.current?.click()}>
                <Icon name="image" size={18} />
                사진 올리기
              </Button>
            )}
            <button type="button" className="text-btn" onClick={() => send(ask === "material" ? "자료는 없어요. 넘어갈게요." : "넘어갈게요.")}>
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
