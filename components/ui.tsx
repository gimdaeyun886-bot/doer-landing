// 여러 화면에서 반복해 쓰는 작은 UI 조각들.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "soft" | "danger" | "quiet" | "ghost";
const buttonClass = (variant: Variant = "primary", className = "") => `btn btn-${variant} ${className}`.trim();

export function Button({ variant, className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

export function ButtonLink({ variant, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}

const ICONS = {
  chevR: <path d="m9.5 6 6 6-6 6" />,
  chevL: <path d="m14.5 6-6 6 6 6" />,
  check: <path d="m5.5 12.5 4.2 4.2L18.5 8" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  x: <path d="m6.5 6.5 11 11m0-11-11 11" />,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 4.6-4.4 3.4 3.2 3.2-4.4L20 16.5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  cal: <><rect x="4" y="5.5" width="16" height="14.5" rx="3.5" /><path d="M8 3.5v4m8-4v4M4 10.5h16" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" /></>,
  trash: <path d="M5 7h14M10 7V5h4v2m-7 0 .8 11a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9L17 7" />,
  pen: <path d="M5 19h3.5L19 8.5 15.5 5 5 15.5Zm8.5-12L17 10.5" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  alert: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5m0 3.2h.01" /></>,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, weight = 1.8 }: { name: IconName; size?: number; weight?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}

// Do-er 심볼. 빈 화면과 안내 화면에 쓴다.
export function Mark({ size = 56 }: { size?: number }) {
  return (
    <span className="mark" style={{ width: size, height: size }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/symbol-light.png" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} alt="" />
    </span>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "coral" | "green"; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: ReactNode }) {
  return (
    <p className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={tone === "success" ? "check" : "alert"} size={18} weight={2} />
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <Mark />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function NavButton({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} className="nav-btn" aria-label={label}>
      <Icon name={icon} weight={2} />
    </Link>
  );
}

// 화면을 나누는 한 구획. 제목과 오른쪽의 짧은 덧말을 둘 수 있다.
export function Section({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`section ${className}`.trim()}>
      {title && (
        <div className="section-head">
          <h2>{title}</h2>
          {aside && <span>{aside}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

// 눌러서 다른 화면으로 가는 목록 한 줄.
export function RowLink({ href, icon, title, sub, value }: { href: string; icon?: IconName; title: ReactNode; sub?: ReactNode; value?: ReactNode }) {
  return (
    <Link href={href} className="row">
      {icon && <Icon name={icon} size={20} />}
      <span className="row-text">
        <b>{title}</b>
        {sub && <small>{sub}</small>}
      </span>
      {value && <span className="row-value">{value}</span>}
      <Icon name="chevR" size={16} />
    </Link>
  );
}
