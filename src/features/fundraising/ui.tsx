"use client";

import type { FundraisingStatus } from "@/lib/api";
import s from "./fundraising.module.css";

/** Status chip text per handoff §3.1 — icon + words, never colour alone. */
const STATUS: Record<FundraisingStatus, { label: string; tone: string; icon: "check" | "alert" | "clock" | "x" | "edit" | "search" }> = {
  DRAFT: { label: "Draft", tone: s.cW, icon: "edit" },
  SUBMITTED: { label: "Submitted", tone: s.cN, icon: "clock" },
  IN_REVIEW: { label: "In review", tone: s.cN, icon: "search" },
  INFORMATION_REQUESTED: { label: "Action needed", tone: s.cW, icon: "alert" },
  RESUBMITTED: { label: "Resubmitted", tone: s.cN, icon: "clock" },
  APPROVED: { label: "Approved", tone: s.cOk, icon: "check" },
  NOT_APPROVED: { label: "Not approved", tone: s.cM, icon: "x" },
  WITHDRAWN: { label: "Withdrawn", tone: s.cM, icon: "x" },
  EXPIRED: { label: "Expired", tone: s.cM, icon: "x" },
};

export function statusLabel(status: FundraisingStatus) {
  return STATUS[status].label;
}

export function StatusChip({ status }: { status: FundraisingStatus }) {
  const c = STATUS[status];
  return (
    <span className={`${s.chip} ${c.tone}`}>
      <Icon name={c.icon} />
      {c.label}
    </span>
  );
}

export function Icon({ name, className }: { name: "check" | "alert" | "clock" | "x" | "edit" | "search" | "lock" | "file" | "arrow" | "upload"; className?: string }) {
  const cls = className ?? s.icon;
  const common = { className: cls, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, "aria-hidden": true } as const;
  switch (name) {
    case "check": return <svg {...common} strokeWidth={2.4}><path d="M20 6 9 17l-5-5" /></svg>;
    case "alert": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "x": return <svg {...common}><path d="M18 6 6 18M6 6l12 12" /></svg>;
    case "edit": return <svg {...common}><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="m20 20-4-4" /></svg>;
    case "lock": return <svg {...common}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
    case "file": return <svg {...common}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5" /></svg>;
    case "arrow": return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
    case "upload": return <svg {...common}><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>;
  }
}

export type SaveState = "saved" | "saving" | "error";

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") return <span className={`${s.chip} ${s.cN}`} role="status"><Icon name="clock" />Saving…</span>;
  if (state === "error") return <span className={`${s.chip} ${s.cX}`} role="status"><Icon name="alert" />Unable to save</span>;
  return <span className={`${s.chip} ${s.cOk}`} role="status"><Icon name="check" />Saved</span>;
}

export const WIZARD_STEPS = ["About you", "Who needs help", "The need", "Evidence", "Review"] as const;

export function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Application steps">
      <ol className={s.steps}>
        {WIZARD_STEPS.map((label, i) => (
          <li
            key={label}
            className={`${s.st} ${i === current ? s.stOn : ""} ${i < current ? s.stDone : ""}`}
            aria-current={i === current ? "step" : undefined}
          >
            <b>{i < current ? "✓" : i + 1}</b>
            {label}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function formatINR(n: number | null | undefined) {
  if (n == null) return "—";
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const CATEGORY_LABEL = {
  MEDICAL: "Medical",
  EDUCATION: "Education",
  EMERGENCY_HOUSEHOLD: "Emergency household support",
  OTHER: "Other",
} as const;
