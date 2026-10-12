// 여러 화면에서 반복해 쓰는 작은 UI 조각들.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "coach";
const buttonClass = (variant: Variant = "primary", className = "") => `btn btn-${variant} ${className}`.trim();

export function Button({ variant, className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

export function ButtonLink({ variant, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}

const ICONS = {
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4m8-4v4M4 11h16" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  back: <path d="m14 6-6 6 6 6" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.6" /></>,
  warning: <><path d="m10.3 4.8-7.8 13.5A1.8 1.8 0 0 0 4 21h16a1.8 1.8 0 0 0 1.5-2.7L13.7 4.8a2 2 0 0 0-3.4 0Z" /><path d="M12 9v5m0 3h.01" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  sparkle: <path d="M12 3.5 13.8 9a2 2 0 0 0 1.2 1.2l5.5 1.8-5.5 1.8a2 2 0 0 0-1.2 1.2L12 20.5 10.2 15A2 2 0 0 0 9 13.8L3.5 12 9 10.2A2 2 0 0 0 10.2 9Z" />,
  camera: <><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1-1.6h6.6l1 1.6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" /><circle cx="12" cy="12.5" r="3.2" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" /></>,
  swap: <path d="M7 8h11m-3-3 3 3-3 3M17 16H6m3 3-3-3 3-3" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "coach" | "done" | "warn"; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: ReactNode }) {
  return (
    <p className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={tone === "success" ? "check" : tone === "error" ? "warning" : "sparkle"} />
      <span>{children}</span>
    </p>
  );
}

export function EmptyState({ icon = "target", title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-mark" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ overline, title, description, aside }: { overline?: string; title: string; description?: string; aside?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        {overline && <p className="overline">{overline}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {aside}
    </header>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="back-link">
      <Icon name="back" />
      {children}
    </Link>
  );
}
