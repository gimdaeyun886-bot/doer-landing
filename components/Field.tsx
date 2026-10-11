import type { ReactNode } from "react";
import { Icon } from "./ui";

// 라벨, 도움말, 오류 메시지를 한 묶음으로 그린다. 입력 요소는 children으로 받는다.
export function Field({ id, label, hint, error, required, children }: { id: string; label: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required ? <span className="required"> 필수</span> : <span className="optional"> 선택</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          <Icon name="warning" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export const describedBy = (id: string, error?: string, hint?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);
