"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteAccount } from "@/app/auth/actions";
import { saveLocks } from "@/app/goals/actions";
import { lockAppCount } from "@/lib/goals";
import { native } from "@/lib/native";
import { LockPicker } from "./LockPicker";
import { Button, Icon, NavButton, Notice } from "./ui";

// 잠글 앱 화면. 고친 것이 있을 때만 위쪽 '저장'이 켜진다. 모든 목표에 똑같이 적용된다.
export function LockSettings({ initial }: { initial: string[] }) {
  const [value, setValue] = useState(initial);
  const [state, action, pending] = useActionState(saveLocks, {});
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  const count = lockAppCount(value);
  return (
    <form action={action} className="lock-settings">
      <div className="topbar">
        <NavButton href="/settings" icon="chevL" label="내 정보로 돌아가기" />
        <button type="submit" className="nav-text" disabled={pending || !dirty}>
          {pending ? "저장 중" : "저장"}
        </button>
      </div>
      <header className="headline">
        <p className="date">{count ? `${count}개 앱` : "고른 앱 없음"}</p>
        <h1>잠글 앱</h1>
      </header>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      {state.saved && !dirty && <Notice tone="success">저장했어요. 다음 시작부터 적용돼요.</Notice>}
      <fieldset disabled={pending} className="plain-fieldset">
        <LockPicker value={value} onChange={setValue} name="lock" />
      </fieldset>
    </form>
  );
}

// 휴대폰 앱에서만 보인다. 잠금에 필요한 권한이 켜져 있는지 알려 준다.
export function AccessStatus() {
  const [status, setStatus] = useState<"none" | "on" | "off">("none");
  useEffect(() => {
    const check = () => setStatus(native() ? (native()!.hasAccess() ? "on" : "off") : "none");
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);
  if (status === "none") return null;
  return (
    <section className="group">
      <div className="section-head">
        <h2>잠금 권한</h2>
      </div>
      <div className="section rows">
        {status === "on" ? (
          <div className="row">
            <span className="row-text">
              <b>접근성 권한</b>
            </span>
            <span className="row-value" data-on="true">
              켜짐
            </span>
          </div>
        ) : (
          <button type="button" className="row" onClick={() => native()?.openAccessSettings()}>
            <span className="row-text">
              <b>접근성 권한</b>
            </span>
            <span className="row-value">꺼짐 · 켜러 가기</span>
            <Icon name="chevR" size={16} />
          </button>
        )}
        {status === "on" ? <SeenIds /> : <AccessHelp />}
      </div>
      <p className="group-foot">
        접근성 권한으로 지금 열린 앱이 잠근 앱인지만 확인해요. 화면의 글이나 입력한 내용은 읽지도 모으지도 않아요. 언제든 끌 수 있고, 끄면 그날은 인증하지 못한 날로 남아요.
      </p>
    </section>
  );
}

// 가림막이 안 맞을 때: 잠근 앱 화면의 요소 이름표를 복사해 개발자에게 보낼 수 있게 한다. 글 내용은 들어 있지 않다.
function SeenIds() {
  const [note, setNote] = useState<string | null>(null);
  if (!native()?.getSeenIds) return null;
  async function copy() {
    const ids = native()?.getSeenIds?.() ?? "[]";
    try {
      await navigator.clipboard.writeText(ids);
      setNote(`이름표 ${(JSON.parse(ids) as string[]).length}개를 복사했어요. 그대로 붙여 넣어 보내 주세요.`);
    } catch {
      setNote("복사하지 못했어요. 다시 눌러 주세요.");
    }
  }
  return (
    <details className="access-help">
      <summary>릴스·쇼츠가 제대로 안 가려질 때</summary>
      <p>안 가려지는 화면을 잠깐 열었다가 돌아와 아래 버튼을 눌러 주세요. 화면 요소의 이름표만 복사하고 글이나 사진은 들어가지 않아요.</p>
      <Button type="button" variant="quiet" className="btn-sm" onClick={copy}>
        화면 정보 복사
      </Button>
      {note && <p>{note}</p>}
    </details>
  );
}

// 스토어 밖에서 설치한 앱은 안드로이드가 접근성 권한을 한 번 막는다. 푸는 길을 순서대로 알려 준다.
export function AccessHelp() {
  return (
    <details className="access-help">
      <summary>&lsquo;제한된 설정&rsquo;이라며 막힐 때</summary>
      <ol>
        <li>아래 버튼으로 Do-er 앱 정보 화면을 열어요.</li>
        <li>오른쪽 위 점 세 개(⋮)를 눌러요.</li>
        <li>&lsquo;제한된 설정 허용&rsquo;을 누르고 잠금을 풀어요.</li>
        <li>돌아와서 &lsquo;권한 켜러 가기&rsquo;를 다시 눌러 Do-er 앱 잠금을 켜요.</li>
      </ol>
      <p>점 세 개가 안 보이면 권한 화면에서 Do-er를 한 번 눌러 막힌 뒤 다시 열어 보세요.</p>
      <Button type="button" variant="quiet" className="btn-sm" onClick={() => native()?.openAppSettings?.()}>
        Do-er 앱 정보 열기
      </Button>
    </details>
  );
}

export function DeleteAccount() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(deleteAccount, {});
  return (
    <>
      <button type="button" className="row row-danger" onClick={() => dialog.current?.showModal()}>
        <span className="row-text">
          <b>탈퇴하기</b>
        </span>
      </button>
      <dialog ref={dialog} className="sheet" aria-labelledby="bye-title">
        <span className="sheet-grip" aria-hidden="true" />
        <h2 id="bye-title">정말 탈퇴할까요?</h2>
        <p>목표, 계획, 인증 기록, 올린 사진이 모두 바로 지워지고 되돌릴 수 없어요.</p>
        {state.message && <Notice tone="error">{state.message}</Notice>}
        <form action={action} className="sheet-actions">
          <label className="confirm-word" htmlFor="confirm">
            계속하려면 <b>탈퇴</b>라고 적어 주세요
          </label>
          <input id="confirm" name="confirm" type="text" autoComplete="off" className="confirm-input" />
          <Button type="submit" variant="danger" disabled={pending}>
            <Icon name="trash" size={18} />
            {pending ? "지우는 중…" : "모두 지우고 탈퇴"}
          </Button>
          <Button type="button" variant="quiet" onClick={() => dialog.current?.close()}>
            그대로 둘게요
          </Button>
        </form>
      </dialog>
    </>
  );
}
