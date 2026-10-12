"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { signIn, signInWith, signUp, type AuthState } from "@/app/auth/actions";
import { native } from "@/lib/native";
import { Button, Icon, Notice, Symbol } from "./ui";

const AGREEMENTS = [
  { name: "agree_terms", label: "이용약관에 동의해요", href: "/terms" },
  { name: "agree_privacy", label: "개인정보 수집과 이용에 동의해요", href: "/privacy" },
  { name: "agree_age", label: "만 14세 이상이에요" },
] as const;

type Provider = "google" | "kakao";

const PROMISES = [
  { icon: "chat", text: "말하면 코치가 끝나는 날까지 계획을 짜요" },
  { icon: "lock", text: "오늘 몫을 끝낼 때까지 고른 앱이 잠겨요" },
  { icon: "camera", text: "과제에 맞는 방법으로 인증하면 열려요" },
] as const;

// 각 회사가 로그인 버튼에 쓰도록 정해 둔 표식.
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function KakaoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#191919" d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.68 6.74l-.96 3.56c-.09.32.27.58.55.39l4.23-2.79c.49.06.99.1 1.5.1 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
    </svg>
  );
}

// 시작 화면. 카카오·구글이 켜져 있으면 그것을 먼저 보여 주고, 이메일은 아래에서 올라오는 창에서 받는다.
export function AuthForm({ bye, providers = [], failed }: { bye?: boolean; providers?: Provider[]; failed?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [inState, inAction, inPending] = useActionState<AuthState, FormData>(signIn, {});
  const [upState, upAction, upPending] = useActionState<AuthState, FormData>(signUp, {});
  const [mode, setMode] = useState<"in" | "up">("up");
  const [agreed, setAgreed] = useState<string[]>([]);
  const [social, startSocial] = useTransition();
  const [socialError, setSocialError] = useState<string | null>(null);

  // 가입 확인 메일을 보낸 뒤에는 로그인으로 넘어간다.
  useEffect(() => {
    if (upState.mode === "in") setMode("in");
  }, [upState]);

  const signup = mode === "up";
  const state: AuthState = signup ? upState : inState.message || inState.email ? inState : { email: upState.email, notice: upState.notice };
  const pending = inPending || upPending;
  const all = agreed.length === AGREEMENTS.length;
  const ordered = (["kakao", "google"] as const).filter((provider) => providers.includes(provider));

  const continueWith = (provider: Provider) =>
    startSocial(async () => {
      setSocialError(null);
      const app = native();
      const result = await signInWith(provider, Boolean(app?.openExternal));
      if (!result.url) return setSocialError(result.message ?? "로그인 화면을 열지 못했어요.");
      if (app?.openExternal) app.openExternal(result.url);
      else window.location.href = result.url;
    });

  const openEmail = (next: "in" | "up") => {
    setMode(next);
    dialog.current?.showModal();
  };

  return (
    <div className="screen screen-warm welcome">
      <div className="welcome-top">
        <span className="hello-mark" aria-hidden="true">
          <Symbol size={64} />
        </span>
        <p className="wordmark">do-er</p>
        <h1>{"계획을,\n오늘의 실행으로"}</h1>
        <ul className="promises">
          {PROMISES.map((item) => (
            <li key={item.text}>
              <Icon name={item.icon} size={17} />
              {item.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="welcome-actions">
        {bye && <Notice tone="success">탈퇴했어요. 올린 사진과 기록을 모두 지웠어요.</Notice>}
        {(socialError || failed) && <Notice tone="error">{socialError ?? "로그인을 끝내지 못했어요. 다시 시도해 주세요."}</Notice>}

        {ordered.map((provider) => (
          <button key={provider} type="button" className={`btn social-btn social-${provider}`} disabled={social} onClick={() => continueWith(provider)}>
            {provider === "kakao" ? <KakaoMark /> : <GoogleMark />}
            <span>{provider === "kakao" ? "카카오로 시작하기" : "Google로 시작하기"}</span>
          </button>
        ))}
        <button type="button" className={`btn ${ordered.length ? "social-btn social-email" : "btn-primary"}`} onClick={() => openEmail("up")}>
          {ordered.length > 0 && <Icon name="mail" size={20} />}
          <span>이메일로 시작하기</span>
        </button>

        <p className="welcome-foot">
          이미 이메일로 가입했나요?
          <button type="button" className="text-btn" onClick={() => openEmail("in")}>
            로그인
          </button>
        </p>
        <p className="welcome-legal">
          시작하면 <Link href="/terms">이용약관</Link>과 <Link href="/privacy">개인정보 처리방침</Link>을 확인하고 동의하게 돼요.
        </p>
      </div>

      <dialog ref={dialog} className="sheet email-sheet" aria-labelledby="email-title">
        <span className="sheet-grip" aria-hidden="true" />
        <div className="sheet-tabs" role="tablist" aria-label="가입 또는 로그인">
          <button type="button" role="tab" aria-selected={signup} onClick={() => setMode("up")}>
            가입
          </button>
          <button type="button" role="tab" aria-selected={!signup} onClick={() => setMode("in")}>
            로그인
          </button>
        </div>
        <h2 id="email-title">{signup ? "이메일로 가입해요" : "다시 왔네요"}</h2>

        {state.notice && <Notice tone="success">{state.notice}</Notice>}
        {state.message && <Notice tone="error">{state.message}</Notice>}

        <form action={signup ? upAction : inAction} className="auth-form" key={mode}>
          <fieldset disabled={pending} className="field-list">
            <div className="field">
              <label htmlFor="email">이메일</label>
              <input id="email" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={state.email ?? ""} placeholder="name@example.com" required />
            </div>
            <div className="field">
              <label htmlFor="password">비밀번호</label>
              <input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} placeholder={signup ? "8자 이상" : "비밀번호"} required />
            </div>
          </fieldset>

          {signup && (
            <fieldset disabled={pending} className="agree">
              <label className="agree-all">
                <input type="checkbox" checked={all} onChange={() => setAgreed(all ? [] : AGREEMENTS.map((item) => item.name))} />
                <i>
                  <Icon name="check" size={14} weight={3} />
                </i>
                <b>모두 동의해요</b>
              </label>
              {AGREEMENTS.map((item) => (
                <div key={item.name} className="agree-row">
                  <label>
                    <input type="checkbox" name={item.name} checked={agreed.includes(item.name)} onChange={() => setAgreed(agreed.includes(item.name) ? agreed.filter((name) => name !== item.name) : [...agreed, item.name])} />
                    <i>
                      <Icon name="check" size={14} weight={3} />
                    </i>
                    <span>
                      <em>필수</em>
                      {item.label}
                    </span>
                  </label>
                  {"href" in item && (
                    <Link href={item.href} target="_blank" aria-label={`${item.label} 전문 보기`}>
                      보기
                    </Link>
                  )}
                </div>
              ))}
            </fieldset>
          )}

          <Button type="submit" disabled={pending || (signup && !all)} aria-busy={pending}>
            {pending ? "잠시만요…" : signup ? "가입하고 시작하기" : "로그인"}
          </Button>
          <Button type="button" variant="quiet" onClick={() => dialog.current?.close()}>
            닫기
          </Button>
        </form>
      </dialog>
    </div>
  );
}
