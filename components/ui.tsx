// 여러 화면에서 반복해 쓰는 작은 UI 조각들.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
const buttonClass = (variant: Variant = "primary", className = "") => `btn btn-${variant} ${className}`.trim();

export function Button({ variant, className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

export function ButtonLink({ variant, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}

export function Icon({ name }: { name: "check" | "clock" | "calendar" | "arrow" | "search" | "image" | "list" | "warning" }) {
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === "check" && <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>}
      {name === "clock" && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}
      {name === "calendar" && <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4m8-4v4M4 11h16m-11 4h2" /></>}
      {name === "arrow" && <path d="M5 12h14m-5-5 5 5-5 5" />}
      {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>}
      {name === "image" && <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>}
      {name === "list" && <><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 3h6v3H9zm0 8h6m-6 4h4" /></>}
      {name === "warning" && <><path d="m10.3 4.8-7.8 13.5A1.8 1.8 0 0 0 4 21h16a1.8 1.8 0 0 0 1.5-2.7L13.7 4.8a2 2 0 0 0-3.4 0Z" /><path d="M12 9v5m0 3h.01" /></>}
    </svg>
  );
}

export function StatusBadge({ verified }: { verified: boolean }) {
  return (
    <span className={`badge ${verified ? "badge-verified" : "badge-todo"}`}>
      <Icon name={verified ? "check" : "clock"} />
      {verified ? "인증 완료" : "인증 전"}
    </span>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: ReactNode }) {
  return (
    <p className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={tone === "success" ? "check" : tone === "error" ? "warning" : "list"} />
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-mark" aria-hidden="true"><Icon name="list" /></span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </header>
  );
}
