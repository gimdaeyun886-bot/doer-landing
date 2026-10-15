"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { startToday } from "@/app/goals/actions";
import { VERIFY_TYPES, lockLabels, verifyTypeOf, type PlanTask } from "@/lib/goals";
import { native } from "@/lib/native";
import { AccessHelp } from "./SettingsForms";
import { markStarted } from "./StallNudge";
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
export function StartButton({ today, rows, lockTargets }: { today: string; rows: Row[]; lockTargets: string[] }) {
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
        {!app && <Notice tone="info">웹에서는 앱 잠금이 준비 중이에요. 시작한 기록과 인증은 그대로 남아요.</Notice>}

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

export function SettingsLink() {
  return (
    <ButtonLink href="/settings" variant="soft">
      잠글 앱 고르기
    </ButtonLink>
  );
}
