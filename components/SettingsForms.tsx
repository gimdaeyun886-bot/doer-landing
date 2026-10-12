"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteAccount } from "@/app/auth/actions";
import { saveLocks } from "@/app/goals/actions";
import { native } from "@/lib/native";
import { LockPicker } from "./LockPicker";
import { Button, Icon, Notice } from "./ui";

// 잠글 앱을 고쳐 저장한다. 모든 목표에 똑같이 적용된다.
export function LockSettings({ initial }: { initial: string[] }) {
  const [value, setValue] = useState(initial);
  const [state, action, pending] = useActionState(saveLocks, {});
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);
  return (
    <form action={action} className="card settings-card">
      <div className="card-head">
        <h2>잠글 앱</h2>
        <span>{value.length ? `${value.length}곳` : "없음"}</span>
      </div>
      <LockPicker value={value} onChange={setValue} name="lock" />
      {state.message && <Notice tone="error">{state.message}</Notice>}
      {state.saved && !dirty && <Notice tone="success">저장했어요. 다음 시작부터 적용돼요.</Notice>}
      <Button type="submit" variant="soft" disabled={pending || !dirty}>
        {pending ? "저장하는 중…" : "저장"}
      </Button>
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
    <section className="card settings-card">
      <div className="card-head">
        <h2>잠금 권한</h2>
        <span data-on={status === "on"}>{status === "on" ? "켜짐" : "꺼짐"}</span>
      </div>
      <p className="row-hint">
        Do-er는 접근성 권한으로 지금 열린 앱이 잠근 앱인지만 확인해요. 화면에 적힌 내용이나 입력한 글자는 읽지도 모으지도 않아요. 권한은 휴대폰 설정에서 언제든 끌 수 있고, 끄면 그날은 인증하지 못한 것으로 남아요.
      </p>
      {status === "on" && <SeenIds />}
      {status === "off" && (
        <>
          <Button type="button" variant="soft" onClick={() => native()?.openAccessSettings()}>
            권한 켜러 가기
          </Button>
          <AccessHelp />
        </>
      )}
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
      <p>잠금을 시작한 뒤 인스타그램이나 유튜브에서 안 가려지는 화면을 잠깐 열었다가 돌아와 아래 버튼을 눌러 주세요. 그 화면의 요소 이름표만 복사하고, 글이나 사진 내용은 들어가지 않아요.</p>
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
      <p>점 세 개가 안 보이면, 권한 화면에서 Do-er를 한 번 눌러 막힌 뒤에 다시 열어 보세요. 스토어에서 받은 앱이 아니라서 안드로이드가 한 번 더 확인하는 절차예요.</p>
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
      <button type="button" className="text-btn danger" onClick={() => dialog.current?.showModal()}>
        탈퇴하기
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
