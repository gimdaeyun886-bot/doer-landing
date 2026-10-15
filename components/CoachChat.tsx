"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { askCoach, createGoal } from "@/app/goals/actions";
import { EMPTY_VALUES, KINDS, formatDate, formatMinutes, lockLabels, materialError, type GoalValues } from "@/lib/goals";
import type { Ask, ChatMessage, Slots } from "@/lib/plan";
import { ADJUST_SAY_KEY } from "./AdjustChat";
import { ConfirmForm } from "./ConfirmForm";
import { LockPicker } from "./LockPicker";
import { Button, CoachMark, Icon, NavButton, Symbol } from "./ui";

const EMPTY: Slots = { title: null, kind: null, deadline: null, schedule: null, daily_minutes: null, note: null, facts: [], material_summary: null, lock_targets: null };
const EXAMPLES = ["11월 15일 정보처리기사 실기, 평일 밤 1시간", "주 3회 아침 30분 달리기를 습관으로", "미뤄 둔 포트폴리오, 이번 달 안에"];
const HOW = [
  { icon: "chat", title: "말하면 계획을 짜요", text: "끝나는 날까지 날짜별로" },
  { icon: "today", title: "매일 오늘 몫만", text: "자정까지 끝낼 한두 가지" },
  { icon: "lock", title: "고른 앱이 잠겨요", text: "전화·메신저·검색은 열려 있어요" },
  { icon: "camera", title: "인증하면 열려요", text: "과제에 맞는 방법으로 확인해요" },
] as const;
// 새 목표가 아니라 오늘 계획을 줄이거나 미루고 싶다는 말로 보이는 표현.
const ADJUST_WORDS = /버거|힘들|못 ?하겠|못 ?할 ?것|조정|줄여|미뤄|미루|야근|아파|아프|시간이 없|오늘은 안|빼 ?줘/;
const SEEN_KEY = "doer.chatted";
// 대화 도중 다른 화면에 다녀와도 이어서 할 수 있게, 이 기기에 대화를 적어 둔다. 목표를 만들면 지운다.
export const CHAT_KEY = "doer.chat.v2";

type Item = ChatMessage & { image?: string; problem?: boolean };
type Saved = { items: Item[]; slots: Slots; ask: Ask; options: string[]; ready: boolean; hadPhoto: boolean };

function toValues(slots: Slots): GoalValues {
  return {
    ...EMPTY_VALUES,
    title: slots.title ?? "",
    kind: slots.kind ?? "dated",
    deadline: slots.deadline ?? "",
    daily_minutes: slots.daily_minutes ? String(slots.daily_minutes) : "",
    schedule: slots.schedule ?? "",
    note: slots.note ?? "",
    context: slots.facts.join("\n"),
    material_summary: slots.material_summary ?? "",
    lock_targets: slots.lock_targets ?? [],
  };
}

// 코치와 자유롭게 대화하며 목표와 사정을 알려 주고, 마지막에 확인 장에서 한 번 확인한다.
// savedLocks: 이미 골라 둔 잠글 앱. 있으면 코치가 다시 묻지 않는다.
// canAdjust: 오늘 남은 할 일이 있어 계획을 조정할 수 있는지.
export function CoachChat({ today, savedLocks, canAdjust }: { today: string; savedLocks: string[]; canAdjust: boolean }) {
  const router = useRouter();
  const fresh: Slots = { ...EMPTY, lock_targets: savedLocks.length ? savedLocks : null };
  const [items, setItems] = useState<Item[]>([]);
  const [slots, setSlots] = useState<Slots>(fresh);
  const [ask, setAsk] = useState<Ask>("title");
  const [options, setOptions] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [hadPhoto, setHadPhoto] = useState(false);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [firstTime, setFirstTime] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [restored, setRestored] = useState(false);
  const [pending, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // 처음 열 때: 하던 대화가 있으면 이어서 보여 준다.
  useEffect(() => {
    try {
      setFirstTime(!localStorage.getItem(SEEN_KEY));
      const saved = JSON.parse(localStorage.getItem(CHAT_KEY) ?? "null") as Saved | null;
      if (saved?.items?.length) {
        setItems(saved.items);
        setSlots({ ...fresh, ...saved.slots, lock_targets: saved.slots.lock_targets ?? fresh.lock_targets });
        setAsk(saved.ask);
        setOptions(saved.options ?? []);
        setReady(Boolean(saved.ready));
        setHadPhoto(Boolean(saved.hadPhoto));
      }
    } catch {
      setFirstTime(true);
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 대화가 달라질 때마다 적어 둔다. 사진 자체는 저장하지 않고, 코치가 읽은 내용만 남는다.
  useEffect(() => {
    if (!restored) return;
    try {
      const clean = items.filter((item) => !item.problem).map(({ role, text }) => ({ role, text }));
      if (clean.length) localStorage.setItem(CHAT_KEY, JSON.stringify({ items: clean, slots, ask, options, ready, hadPhoto } satisfies Saved));
      else localStorage.removeItem(CHAT_KEY);
    } catch {}
  }, [restored, items, slots, ask, options, ready, hadPhoto]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, pending, ready, picked]);

  function send(message: string, photo?: File, locks?: string[]) {
    const clean = message.trim();
    if (!clean || pending) return;
    // 대화를 시작하기 전에 오늘이 버겁다는 말을 하면, 그 말을 들고 조정하는 대화로 넘어간다.
    if (canAdjust && items.length === 0 && !photo && ADJUST_WORDS.test(clean)) {
      try {
        sessionStorage.setItem(ADJUST_SAY_KEY, clean);
      } catch {}
      router.push("/goals/new?talk=adjust");
      return;
    }
    const next: Item[] = [...items, { role: "user", text: clean, image: photo ? URL.createObjectURL(photo) : undefined }];
    setItems(next);
    setText("");
    setPicked([]);
    setOptions([]);
    setBroken(false);
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
      // 잠글 앱은 코치가 받아 적지 않고, 고르기 창에서 고른 값을 그대로 쓴다.
      const result = await askCoach(history, locks ? { ...slots, lock_targets: locks } : slots, payload);
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
    setHadPhoto(true);
    send("자료 사진을 올렸어요.", chosen);
  }

  function restart() {
    setItems([]);
    setSlots(fresh);
    setAsk("title");
    setOptions([]);
    setReady(false);
    setBroken(false);
    setFile(null);
    setHadPhoto(false);
    setPicked([]);
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
  // 계획을 짤 수 있는 최소한을 알았는지. 그 뒤로는 사용자가 언제든 대화를 끝내고 넘어갈 수 있다.
  const enough = Boolean(slots.title && slots.kind && (slots.kind !== "dated" || slots.deadline) && slots.daily_minutes && slots.lock_targets);
  const known = [
    slots.title && ["목표", slots.title],
    slots.kind && ["기한", slots.kind === "dated" ? (slots.deadline ? formatDate(slots.deadline) : "날짜 있음") : KINDS.find((kind) => kind.value === slots.kind)!.short],
    slots.daily_minutes && ["시간", slots.schedule || `하루 ${formatMinutes(slots.daily_minutes)}`],
    slots.note && ["상황", slots.note],
    ...slots.facts.map((fact) => ["사정", fact]),
    slots.lock_targets && ["잠금", slots.lock_targets.length ? lockLabels(slots.lock_targets).join(" · ") : "없음"],
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
          <p className="chat-sub">{!started ? "목표를 같이 정해요" : ready ? "다 정리했어요" : "대화는 저장돼요"}</p>
        </div>
        {started && (
          <button type="button" className="nav-btn chat-reset" onClick={restart} aria-label="대화를 처음부터 다시 하기">
            <Icon name="refresh" size={18} />
          </button>
        )}
      </header>

      <div className="chat-body">
        {!started && restored && (
          <div className="hello">
            <span className="hello-mark" aria-hidden="true">
              <Symbol size={64} />
            </span>
            <h1>{"안녕하세요, 코치예요.\n어떤 걸 해내고 싶어요?"}</h1>
            <p>시험, 운동, 책, 미뤄 둔 작업 무엇이든요.</p>
            {/* 대화 없이 바로 적고 싶을 때. AI를 쓸 수 없을 때도 이 길로 등록할 수 있다. */}
            <button type="button" className="text-btn direct-entry" onClick={() => setConfirming(true)}>
              대화 없이 직접 적기
            </button>
            {canAdjust && (
              <Link href="/goals/new?talk=adjust" className="row talk-row">
                <Icon name="swap" size={20} />
                <span className="row-text">
                  <b>오늘 계획 조정하기</b>
                  <small>사정을 말하면 바꿀 방법과 대가를 보여 줘요</small>
                </span>
                <Icon name="chevR" size={16} />
              </Link>
            )}
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

        {items.map((item, index) => {
          if (item.role === "user") {
            return (
              <div key={index} className="msg msg-me">
                <div className="bubble">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.image && <img src={item.image} alt="올린 사진" />}
                  <p>{item.text}</p>
                </div>
              </div>
            );
          }
          // 코치가 이어서 말할 때는 프로필을 한 번만 보여 준다.
          const first = index === 0 || items[index - 1].role !== "coach";
          return (
            <div key={index} className={`msg msg-coach${first ? "" : " is-follow"}`}>
              {first ? <CoachMark size={34} /> : <span className="msg-gap" />}
              <div>
                {first && <p className="msg-name">코치</p>}
                <p className={`bubble coach-say${item.problem ? " is-problem" : ""}`} role={item.problem ? "alert" : undefined}>
                  {item.text}
                </p>
              </div>
            </div>
          );
        })}

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

        {lastIsCoach && !pending && ready && known.length > 0 && (
          <dl className="understood under-coach">
            {known.map(([label, value], index) => (
              <div key={`${label}-${index}`}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {canAnswer && ask !== "lock" && options.length > 0 && (
          <div className="quick under-coach">
            <div className="chips">
              {options.map((option) => (
                <button key={option} type="button" className="chip-btn option-btn" onClick={() => send(option)}>
                  {option}
                </button>
              ))}
            </div>
            
          </div>
        )}

        {canAnswer && ask === "lock" && (
          <div className="quick lock-card under-coach">
            <LockPicker value={picked} onChange={setPicked} />
            <p className="quick-hint">전화, 메신저, 검색은 잠기지 않아요.</p>
            <Button type="button" variant="soft" disabled={picked.length === 0} onClick={() => send(`${lockLabels(picked).join(", ")} 잠글게요.`, undefined, picked)}>
              {picked.length ? "이대로 잠그기" : "잠글 앱을 골라 주세요"}
            </Button>
            <button type="button" className="text-btn" onClick={() => send("잠글 앱은 없어요.", undefined, [])}>
              잠글 앱 없이 할게요
            </button>
          </div>
        )}

        {canAnswer && ask === "material" && (
          <div className="quick under-coach">
            <Button type="button" variant="soft" onClick={() => fileInput.current?.click()}>
              <Icon name="image" size={18} />
              사진 올리기
            </Button>
            <button type="button" className="text-btn" onClick={() => send("자료는 없어요. 넘어갈게요.")}>
              건너뛰기
            </button>
          </div>
        )}

        {canAnswer && ask === "note" && !enough && (
          <div className="quick under-coach">
            <button type="button" className="text-btn" onClick={() => send("넘어갈게요.")}>
              건너뛰기
            </button>
          </div>
        )}

        {canAnswer && enough && ask !== "lock" && (
          <div className="quick under-coach">
            <button type="button" className="text-btn" onClick={() => setConfirming(true)}>
              이대로 계획 짜기
            </button>
          </div>
        )}

        {(ready || broken) && !pending && (
          <div className="quick under-coach">
            <Button type="button" onClick={() => setConfirming(true)}>
              {ready ? "확인하러 가기" : "직접 적기"}
            </Button>
            {hadPhoto && !file && <p className="quick-hint">아까 올린 사진은 코치가 읽은 내용만 남아 있어요. 사진도 함께 저장하려면 다음 화면에서 다시 올려 주세요.</p>}
          </div>
        )}
        <div ref={end} />
      </div>

      {!started && firstTime && restored && (
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
