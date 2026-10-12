"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { signIn, signInWith, signUp, type AuthState } from "@/app/auth/actions";
import { native } from "@/lib/native";
import { Button, Icon, Notice, Symbol } from "./ui";

const AGREEMENTS = [
  { name: "agree_terms", label: "이용약관에 동의해요", href: "/terms" },
  { name: "agree_privacy", label: "개인정보 수집과 이용에 동의해요", href: "/privacy" },
  { name: "agree_age", label: "만 14세 이상이에요" },
] as const;

// 로그인과 가입을 한 화면에서 오간다. 가입할 때는 필수 동의 세 가지를 받는다.
const PROVIDERS = { google: "구글로 계속하기", kakao: "카카오로 계속하기" } as const;
type Provider = keyof typeof PROVIDERS;

export function AuthForm({ bye, providers = [], failed }: { bye?: boolean; providers?: Provider[]; failed?: boolean }) {
  const [inState, inAction, inPending] = useActionState<AuthState, FormData>(signIn, {});
  const [upState, upAction, upPending] = useActionState<AuthState, FormData>(signUp, {});
  const [mode, setMode] = useState<"in" | "up">("up");
  const [agreed, setAgreed] = useState<string[]>([]);
  // 가입 확인 메일을 보낸 뒤에는 로그인 화면으로 넘어간다.
  useEffect(() => {
    if (upState.mode === "in") setMode("in");
  }, [upState]);
  const signup = mode === "up";
  const state: AuthState = signup ? upState : inState.message || inState.email ? inState : { email: upState.email, notice: upState.notice };
  const [social, startSocial] = useTransition();
  const [socialError, setSocialError] = useState<string | null>(null);
  const pending = inPending || upPending || social;

  const continueWith = (provider: Provider) =>
    startSocial(async () => {
      const app = native();
      const result = await signInWith(provider, Boolean(app?.openExternal));
      if (!result.url) return setSocialError(result.message ?? "로그인 화면을 열지 못했어요.");
      if (app?.openExternal) app.openExternal(result.url);
      else window.location.href = result.url;
    });
  const all = agreed.length === AGREEMENTS.length;

  return (
    <div className="screen screen-warm auth">
      <header className="auth-head">
        <span className="hello-mark" aria-hidden="true">
          <Symbol size={64} />
        </span>
        <h1>{signup ? "계획을, 오늘의\n실행으로" : "다시 왔네요.\n이어서 해요"}</h1>
        <p>{signup ? "해내고 싶은 걸 말하면 끝나는 날까지의 계획을 코치가 짜고, 오늘 몫을 끝낼 때까지 고른 앱을 잠가요." : "이메일과 비밀번호를 적어 주세요."}</p>
      </header>

      {bye && <Notice tone="success">탈퇴했어요. 올린 사진과 기록을 모두 지웠어요.</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      {state.message && <Notice tone="error">{state.message}</Notice>}
      {(socialError || failed) && <Notice tone="error">{socialError ?? "로그인을 끝내지 못했어요. 다시 시도해 주세요."}</Notice>}

      {providers.length > 0 && (
        <div className="social">
          {providers.map((provider) => (
            <button key={provider} type="button" className={`btn social-${provider}`} disabled={pending} onClick={() => continueWith(provider)}>
              {PROVIDERS[provider]}
            </button>
          ))}
          <p className="or">또는 이메일로</p>
        </div>
      )}

      <form action={signup ? upAction : inAction} className="auth-form" key={mode}>
        <fieldset disabled={pending} className="sheet-list">
          <div className="sheet-row">
            <label htmlFor="email">이메일</label>
            <input id="email" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={state.email ?? ""} placeholder="name@example.com" required />
          </div>
          <div className="sheet-row">
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
      </form>

      <p className="auth-switch">
        {signup ? "이미 가입했나요?" : "처음인가요?"}
        <button type="button" className="text-btn" onClick={() => setMode(signup ? "in" : "up")}>
          {signup ? "로그인" : "가입하기"}
        </button>
      </p>
    </div>
  );
}
