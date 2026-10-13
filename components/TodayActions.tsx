"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { applyAdjustment, requestAdjustment, startToday, type AdjustState } from "@/app/goals/actions";
import { LIMITS, VERIFY_TYPES, lockLabels, verifyTypeOf, type AdjustOption, type PlanTask } from "@/lib/goals";
import { native } from "@/lib/native";
import { AccessHelp } from "./SettingsForms";
import { Button, ButtonLink, Icon, Notice } from "./ui";

type Row = { task: PlanTask; goalTitle: string };

// 휴대폰 앱에 오늘의 잠금 상태를 알려 준다. 브라우저에서는 아무 일도 하지 않는다.
export function LockSync({ active, targets }: { active: boolean; targets: string[] }) {
  useEffect(() => {
    native()?.setLock(active, JSON.stringify(targets));
  }, [active, targets]);
  return null;
}

// 시작 전 확인: 오늘 할 일, 과제마다 정해진 인증 방식, 잠길 앱을 한 번 보고 시작한다.
export function StartButton({ rows, lockTargets }: { rows: Row[]; lockTargets: string[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [needAccess, setNeedAccess] = useState(false);
  const locks = lockLabels(lockTargets);
  const app = typeof window !== "undefined" ? native() : null;

  function begin() {
    // 휴대폰 앱에서 잠금 권한이 꺼져 있으면 먼저 켜도록 안내한다.
    if (app && lockTargets.length && !app.hasAccess()) return setNeedAccess(true);
    startTransition(async () => {
      await startToday();
      dialog.current?.close();
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={() => dialog.current?.showModal()}>
        시작하기
      </Button>
      <dialog ref={dialog} className="sheet start-sheet" aria-labelledby="start-title">
        <span className="sheet-grip" aria-hidden="true" />
        <h2 id="start-title">시작할까요?</h2>
        <p>아래를 모두 인증할 때까지 잠겨요. 중간에 바로 푸는 방법은 없어요.</p>

        <ul className="start-list">
          {rows.map(({ task, goalTitle }) => {
            const type = VERIFY_TYPES[verifyTypeOf(task)];
            return (
              <li key={`${goalTitle}-${task.id}`}>
                <Icon name={type.icon} size={18} />
                <span>
                  <b>{task.title}</b>
                  {type.label}
                </span>
              </li>
            );
          })}
        </ul>

        <dl className="facts">
          <div>
            <dt>잠기는 곳</dt>
            <dd>{locks.length ? locks.join(", ") : <a href="/settings">아직 없어요. 고르러 가기</a>}</dd>
          </div>
          <div>
            <dt>열려 있는 곳</dt>
            <dd>전화, 메신저, 검색</dd>
          </div>
          <div>
            <dt>인증 사진</dt>
            <dd>판정에만 쓰고 7일 뒤 지워요</dd>
          </div>
        </dl>

        {needAccess && (
          <Notice tone="info">
            잠그려면 접근성 권한이 필요해요. 지금 열린 앱이 잠근 앱인지만 확인하고, 화면의 글이나 입력한 내용은 모으지 않아요.
          </Notice>
        )}
        {!app && locks.length > 0 && <Notice tone="info">실제 잠금은 휴대폰에 설치한 Do-er 앱에서만 돼요.</Notice>}

        {needAccess && <AccessHelp />}
        <div className="sheet-actions">
          {needAccess ? (
            <Button
              type="button"
              onClick={() => {
                app?.openAccessSettings();
                setNeedAccess(false);
              }}
            >
              권한 켜러 가기
            </Button>
          ) : (
            <Button type="button" onClick={begin} disabled={pending} aria-busy={pending}>
              {pending ? "시작하는 중…" : "시작"}
            </Button>
          )}
          <Button type="button" variant="quiet" onClick={() => dialog.current?.close()}>
            나중에
          </Button>
        </div>
      </dialog>
    </>
  );
}

// 버거운 날: 사정을 말하면 코치가 조정안과 대가를 보여 준다. 고르거나, 그대로 하기로 한다.
// 이 조각은 오늘 할 일이 바뀌어도 화면에서 사라지지 않는 자리에 둔다. 그래야 조정 결과를 끝까지 보여 줄 수 있다.
export function AdjustButton({ show }: { show: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [state, setState] = useState<AdjustState>({});
  const [done, setDone] = useState<AdjustOption | null>(null);
  const [pending, startTransition] = useTransition();

  const ask = () =>
    startTransition(async () => {
      setState(await requestAdjustment(reason));
    });
  const choose = (option: AdjustOption) =>
    startTransition(async () => {
      const result = await applyAdjustment(reason, option);
      if (!result.ok) return setState((current) => ({ ...current, message: result.message }));
      // 화면은 확인을 누른 뒤에 새로 그린다. 먼저 그리면 이 창이 결과를 보여 주기 전에 사라질 수 있다.
      setDone(option);
    });
  function close() {
    dialog.current?.close();
    if (done) router.refresh();
    setState({});
    setDone(null);
    setReason("");
  }

  return (
    <>
      {show && (
        <button type="button" className="row adjust-open" onClick={() => dialog.current?.showModal()}>
          <Icon name="chat" size={20} />
          <span className="row-text">
            <b>오늘 계획이 버거워요</b>
            <small>코치에게 말하고 조정안 받기</small>
          </span>
          <Icon name="chevR" size={16} />
        </button>
      )}
      <dialog ref={dialog} className="sheet adjust-sheet" aria-labelledby="adjust-title" onClose={() => {
        if (done) router.refresh();
        setState({});
        setDone(null);
      }}>
        <span className="sheet-grip" aria-hidden="true" />
        {done ? (
          <>
            <h2 id="adjust-title">이렇게 바꿨어요</h2>
            <p className="sheet-target">{done.label}</p>
            <p>{done.impact}</p>
            <div className="sheet-actions">
              <Button type="button" variant="quiet" onClick={close}>
                확인
              </Button>
            </div>
          </>
        ) : state.options ? (
          <>
            <h2 id="adjust-title">어떻게 할까요?</h2>
            <p>{state.reply}</p>
            {state.message && <Notice tone="error">{state.message}</Notice>}
            <ul className="adjust-list">
              {state.options.map((option) => (
                <li key={option.label}>
                  <button type="button" disabled={pending} onClick={() => choose(option)}>
                    <b>{option.label}</b>
                    <span>
                      <Icon name="swap" size={14} />
                      {option.impact}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="sheet-actions">
              <Button type="button" variant="quiet" disabled={pending} onClick={close}>
                {pending ? "바꾸는 중…" : "그대로 할게요"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 id="adjust-title">무슨 일이 있었나요?</h2>
            <p>코치가 바꿀 방법과 그 대가를 보여 줘요. 고르기 전에는 바뀌지 않아요.</p>
            {state.message && <Notice tone="error">{state.message}</Notice>}
            <label className="sr-only" htmlFor="adjust-reason">
              사정
            </label>
            <textarea id="adjust-reason" className="proof-text" rows={3} maxLength={LIMITS.reason} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="예: 야근해서 30분밖에 못 내요" />
            <div className="sheet-actions">
              <Button type="button" onClick={ask} disabled={pending || reason.trim().length < 4} aria-busy={pending}>
                {pending ? "방법을 찾는 중…" : "코치에게 말하기"}
              </Button>
              <Button type="button" variant="quiet" onClick={close}>
                그대로 할게요
              </Button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

export function SettingsLink() {
  return (
    <ButtonLink href="/settings" variant="soft">
      잠글 앱 고르기
    </ButtonLink>
  );
}
