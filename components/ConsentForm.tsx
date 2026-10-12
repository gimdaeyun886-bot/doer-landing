"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { agree, signOut } from "@/app/auth/actions";
import { Button, Icon, Notice, Symbol } from "./ui";

const AGREEMENTS = [
  { name: "agree_terms", label: "이용약관에 동의해요", href: "/terms" },
  { name: "agree_privacy", label: "개인정보 수집과 이용에 동의해요", href: "/privacy" },
  { name: "agree_age", label: "만 14세 이상이에요" },
] as const;

// 구글·카카오로 처음 들어온 사람에게 필수 동의를 받는다.
export function ConsentForm() {
  const [state, action, pending] = useActionState(agree, {});
  const [agreed, setAgreed] = useState<string[]>([]);
  const all = agreed.length === AGREEMENTS.length;
  return (
    <div className="screen screen-warm auth">
      <header className="auth-head">
        <span className="hello-mark" aria-hidden="true">
          <Symbol size={64} />
        </span>
        <h1>{"시작하기 전에\n확인해 주세요"}</h1>
        <p>계획을 짜고 인증을 확인하는 데 필요한 것만 받아요.</p>
      </header>
      {state.message && <Notice tone="error">{state.message}</Notice>}
      <form action={action} className="auth-form">
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
        <Button type="submit" disabled={pending || !all} aria-busy={pending}>
          {pending ? "잠시만요…" : "동의하고 시작하기"}
        </Button>
      </form>
      <form action={signOut} className="auth-switch">
        <button type="submit" className="text-btn">
          동의하지 않고 나가기
        </button>
      </form>
    </div>
  );
}
