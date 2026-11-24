"use client";

import type { ComponentType, ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/** One page title, one operational description, actions aligned right. */
export function PageHeader({ title, description, actions, eyebrow }: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-[color:var(--st-text)] sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-[color:var(--st-text-2)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function GlassCard({ children, className = "", solid = false }: { children: ReactNode; className?: string; solid?: boolean }) {
  return <section className={`${solid ? "ck-glass-solid" : "ck-glass-card"} min-w-0 p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function CardTitle({ title, description, icon: Icon, action }: {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold text-[color:var(--st-text)]">
          {Icon && <Icon className="size-4 text-[color:var(--st-primary)]" />}{title}
        </h2>
        {description && <p className="mt-0.5 text-[12.5px] text-[color:var(--st-text-2)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const TONE_BG: Record<string, string> = {
  green: "bg-[#d9ebff] text-[#1f66b3]",
  amber: "bg-[#fbefd5] text-[#8a5a10]",
  teal: "bg-[#dcedf1] text-[#1f5f6d]",
  red: "bg-[#fbe1dc] text-[#9a2a1b]",
  neutral: "bg-[#e6eef8] text-[#41567a]",
};

/**
 * A count with an optional way into the panel behind it. A real <button> when
 * given `onOpen` (no nested controls), a plain block otherwise. No count-up
 * animation — values must read instantly on every refresh.
 */
export function MetricTile({ label, value, icon: Icon, tone = "green", hint, onOpen }: {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: keyof typeof TONE_BG;
  hint?: string;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        {Icon && (
          <span className={`flex size-9 items-center justify-center rounded-full ${TONE_BG[tone]}`}>
            <Icon className="size-4" />
          </span>
        )}
        {onOpen && <ChevronRight className="size-4 text-[color:var(--st-text-2)]" aria-hidden />}
      </div>
      <p className="mt-4 text-[30px] font-bold leading-none tracking-[-0.02em] tabular-nums text-[color:var(--st-text)]">{value}</p>
      <p className="mt-2 text-[13px] font-semibold text-[color:var(--st-text)]">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-[color:var(--st-text-2)]">{hint}</p>}
    </>
  );
  return onOpen ? (
    <button type="button" onClick={onOpen} className="ck-glass-card ck-glass-interactive block w-full p-5 text-left">{body}</button>
  ) : (
    <div className="ck-glass-card p-5">{body}</div>
  );
}

export type StatusTone = "waiting" | "success" | "danger" | "info" | "neutral";

/** Status pill — label always visible; tone is decoration, not meaning. */
export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return <span className="ck-status" data-tone={tone}>{label}</span>;
}

/** "No records" — distinct from a load failure (use SaLoadError / ErrorState for that). */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="ck-glass-card px-6 py-12 text-center">
      <p className="text-[15px] font-semibold text-[color:var(--st-text)]">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-[13px] text-[color:var(--st-text-2)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A row in a "Needs attention" list: what, how many, and a way in. */
export function AttentionRow({ label, count, hint, icon: Icon, tone = "amber", onOpen }: {
  label: string;
  count: number;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: keyof typeof TONE_BG;
  onOpen: () => void;
}) {
  return (
    <li>
      <button type="button" onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-150 hover:bg-white/70">
        {Icon && (
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${TONE_BG[tone]}`}><Icon className="size-4" /></span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-[color:var(--st-text)]">{label}</span>
          {hint && <span className="block truncate text-xs text-[color:var(--st-text-2)]">{hint}</span>}
        </span>
        <span className="text-lg font-bold tabular-nums text-[color:var(--st-text)]">{count}</span>
        <ChevronRight className="size-4 text-[color:var(--st-text-2)]" aria-hidden />
      </button>
    </li>
  );
}
