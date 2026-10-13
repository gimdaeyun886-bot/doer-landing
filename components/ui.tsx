// 여러 화면에서 반복해 쓰는 작은 UI 조각들.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "soft" | "coach" | "danger" | "quiet" | "ghost" | "cream";
const buttonClass = (variant: Variant = "primary", className = "") => `btn btn-${variant} ${className}`.trim();

export function Button({ variant, className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

export function ButtonLink({ variant, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}

const ICONS = {
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" /></>,
  up: <path d="M12 19V5.5m-5.5 5.5L12 5.5l5.5 5.5" />,
  chevR: <path d="m9.5 6 6 6-6 6" />,
  chevL: <path d="m14.5 6-6 6 6 6" />,
  check: <path d="m5.5 12.5 4.2 4.2L18.5 8" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  x: <path d="m6.5 6.5 11 11m0-11-11 11" />,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 4.6-4.4 3.4 3.2 3.2-4.4L20 16.5" /></>,
  insert: <path d="M17.5 17.5 7 7m0 7.5V7h7.5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  cal: <><rect x="4" y="5.5" width="16" height="14.5" rx="3.5" /><path d="M8 3.5v4m8-4v4M4 10.5h16" /></>,
  repeat: <path d="m17 4 3 3-3 3M20 7H8a4 4 0 0 0-4 4m3 9-3-3 3-3M4 17h12a4 4 0 0 0 4-4" />,
  today: <><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.3 2.6 2.6 4.8-5.2" /></>,
  goal: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="12" cy="12" r=".6" /></>,
  chat: <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16A2.5 2.5 0 0 1 5 13.5Z" />,
  trash: <path d="M5 7h14M10 7V5h4v2m-7 0 .8 11a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9L17 7" />,
  camera: <><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1-1.6h6.6l1 1.6h1.2A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" /><circle cx="12" cy="12.5" r="3.2" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" /></>,
  swap: <path d="M7 8h11m-3-3 3 3-3 3M17 16H6m3 3-3-3 3-3" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  quiz: <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.8m0 2.6h.01" /></>,
  pen: <path d="M5 19h3.5L19 8.5 15.5 5 5 15.5Zm8.5-12L17 10.5" />,
  user: <><circle cx="12" cy="8.5" r="3.6" /><path d="M5 19.5a7 7 0 0 1 14 0" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="3" /><path d="m4.5 8 7.5 5.5L19.5 8" /></>,
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

// Do-er 심볼. 코치를 나타내는 자리에 쓴다.
export function Symbol({ size = 26, dark = false }: { size?: number; dark?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="symbol" src={dark ? "/assets/symbol-dark.png" : "/assets/symbol-light.png"} width={size} height={size} alt="" aria-hidden="true" />;
}

export function CoachMark({ size = 38 }: { size?: number }) {
  return (
    <span className="coach-mark" style={{ width: size, height: size }} aria-hidden="true">
      <Symbol size={Math.round(size * 0.7)} />
    </span>
  );
}

export function CoachLine({ children }: { children: ReactNode }) {
  return (
    <div className="coach-line">
      <CoachMark size={30} />
      <p>{children}</p>
    </div>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "coral" | "coach" | "green"; children: ReactNode }) {
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
      <CoachMark size={56} />
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

export function TabBar({ active }: { active: "today" | "goals" | "me" }) {
  const tabs = [
    { key: "today", href: "/today", icon: "today", label: "오늘" },
    { key: "goals", href: "/goals", icon: "goal", label: "목표" },
    { key: "coach", href: "/goals/new", icon: "chat", label: "코치" },
    { key: "me", href: "/settings", icon: "user", label: "내 정보" },
  ] as const;
  return (
    <nav className="tabbar" aria-label="주 메뉴">
      <div className="tabbar-inner">
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href} aria-current={tab.key === active ? "page" : undefined}>
            <Icon name={tab.icon} size={22} weight={tab.key === active ? 2.1 : 1.7} />
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
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

// 눌러서 다른 화면으로 가는 목록 한 줄. 아이콘, 제목, 한 줄 설명, 오른쪽 값으로 이뤄진다.
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

// 목표의 모양에 따라 정해지는 색.
export const kindTone = (kind: "dated" | "finish" | "ongoing") => (kind === "dated" ? "coral" : kind === "ongoing" ? "green" : "coach");
