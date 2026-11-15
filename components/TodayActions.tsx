"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { startToday } from "@/app/goals/actions";
import { VERIFY_TYPES, lockLabels, verifyTypeOf, type PlanTask } from "@/lib/goals";
import { native, isIOS } from "@/lib/native";
import { AccessHelp } from "./SettingsForms";
import { markStarted } from "./StallNudge";
import { Button, ButtonLink, Icon, Notice, backdropClose } from "./ui";

type Row = { task: PlanTask; goalTitle: string };

// 휴대폰 앱에 오늘의 잠금 상태를 알려 준다. 브라우저에서는 아무 일도 하지 않는다.
export function LockSync({ active, targets, left }: { active: boolean; targets: string[]; left: number }) {
  useEffect(() => {
    native()?.setLock(active, JSON.stringify(targets));
    // 잠금 화면과 알림에 남은 할 일 수를 보여 주도록 앱에 알린다. (예전 앱에는 이 기능이 없다)
    native()?.setLeft?.(left);
  }, [active, targets, left]);
  return null;
}

// 시작 전 확인: 오늘 할 일, 과제마다 정해진 인증 방식, 잠길 앱을 한 번 보고 시작한다.
export function StartButton({ today, rows, lockTargets }: { today: string; rows: Row[]; lockTargets: string[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [needAccess, setNeedAccess] = useState(false);
  const [failed, setFailed] = useState(false);
  const locks = lockLabels(lockTargets);
  const app = typeof window !== "undefined" ? native() : null;

  function begin() {
    // 휴대폰 앱에서 잠금 권한이 꺼져 있으면 먼저 켜도록 안내한다.
    if (app && lockTargets.length && !app.hasAccess()) return setNeedAccess(true);
    setFailed(false);
    startTransition(async () => {
      // 시작을 저장하지 못했으면 창을 닫지 않고 알린다. 닫아 버리면 잠긴 줄 알고 넘어갈 수 있다.
      const result = await startToday().catch(() => ({ ok: false }));
      if (!result.ok) return setFailed(true);
      markStarted(today);
      dialog.current?.close();
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" onClick={() => dialog.current?.showModal()}>
        시작하기
      </Button>
      <dialog ref={dialog} {...backdropClose(pending)} className="sheet start-sheet" aria-labelledby="start-title" onCancel={(event) => pending && event.preventDefault()}>
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
            <dd>{locks.length ? locks.join(", ") : <a href="/settings/locks">아직 없어요. 고르러 가기</a>}</dd>
          </div>
          <div>
            <dt>열려 있는 곳</dt>
            <dd>전화, 메신저, 검색</dd>
          </div>
          <div>
            <dt>버거운 날</dt>
            <dd>코치와 조정할 수 있어요. 옮기거나 줄인 만큼 대가가 있어요</dd>
          </div>
          <div>
            <dt>잠금 권한</dt>
            <dd>지금 열린 앱이 잠근 앱인지만 확인해요. 화면의 글은 읽지 않아요</dd>
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
        {!app && locks.length > 0 && <p className="keep-note">{isIOS() ? "아이폰에서는 아직 앱이 잠기지 않아요. 인증은 그대로 할 수 있어요." : "실제 잠금은 휴대폰에 설치한 Do-er 앱에서 걸려요."}</p>}

        {needAccess && <AccessHelp />}
        {failed && <Notice tone="error">시작하지 못했어요. 잠시 후 다시 눌러 주세요.</Notice>}
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
              {pending ? "시작하는 중…" : locks.length ? "시작하고 잠그기" : "시작하기"}
            </Button>
          )}
          <Button type="button" variant="ghost" disabled={pending} onClick={() => dialog.current?.close()}>
            나중에
          </Button>
        </div>
      </dialog>
    </>
  );
}

export function SettingsLink() {
  return (
    <ButtonLink href="/settings/locks" variant="soft">
      잠글 앱 고르기
    </ButtonLink>
  );
}

// 오늘 화면의 잠금 상태 카드. 잠겼는지, 무엇이 잠기는지, 몇 개 남았는지를 한곳에서 보여 준다.
// 휴대폰 앱이 아니면 실제로 잠기는 곳이 앱이라는 것을 함께 적는다. 첫 화면은 서버와 같게 그리고, 그린 뒤에 판별한다.
export function LockState({ tone, hasLocks, started, locks, passed, total }: { tone: "lock" | "idle" | "done"; hasLocks: boolean; started: boolean; locks: string; passed: number; total: number }) {
  const [inApp, setInApp] = useState(true);
  useEffect(() => setInApp(Boolean(native())), []);
  const title =
    tone === "done" ? (hasLocks && started ? "잠금이 풀렸어요" : "모두 인증했어요") : tone === "lock" ? "잠겨 있어요" : started ? "시작했어요" : hasLocks ? "시작하면 잠겨요" : "잠글 앱을 아직 고르지 않았어요";
  const sub =
    tone === "done"
      ? `오늘 할 일 ${total}가지를 모두 인증했어요`
      : tone === "lock"
        ? `${inApp ? "" : "휴대폰 앱에서 "}${locks} · 모두 인증하면 열려요`
        : hasLocks
          ? locks
          : "고르지 않아도 인증은 할 수 있어요";
  return (
    <div className="lock-state" data-tone={tone} role="status">
      <span className="lock-icon">
        <Icon name={tone === "done" ? "check" : "lock"} size={20} weight={2.1} />
      </span>
      <span className="lock-text">
        <b>{title}</b>
        <small>{sub}</small>
        <span className="lock-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={passed} aria-label="오늘 인증한 할 일">
          <i style={{ width: `${(passed / Math.max(total, 1)) * 100}%` }} />
        </span>
      </span>
      <span className="lock-count" aria-hidden="true">
        {passed}/{total}
      </span>
    </div>
  );
}

// 잠금 중: 남은 할 일 가운데 첫 번째의 인증 창을 바로 연다.
export function VerifyNext() {
  return (
    <div className="dock">
      <Button
        type="button"
        onClick={() => document.querySelector<HTMLButtonElement>(".today-row:not([data-state=\"passed\"]):not([data-passed])")?.click()}
      >
        인증하기
      </Button>
    </div>
  );
}
