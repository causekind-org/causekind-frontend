"use client";

import { useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import type { CampaignFlowStatus, FundraisingStatus } from "@/lib/api";
import type { SaTheme } from "@/components/super-admin/saTheme";

/** Super-admin console copy stays English (owner rule for admin surfaces). */

export type FrTab = "overview" | "campaigns" | "applications" | "donations" | "reviews" | "settings";

export const FR_TABS: { key: FrTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "campaigns", label: "Campaigns" },
  { key: "applications", label: "Applications" },
  { key: "donations", label: "Donations" },
  { key: "reviews", label: "Reports & updates" },
  { key: "settings", label: "Settings" },
];

export const inr = (n: number | null | undefined) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const dateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

type Tone = "ok" | "warn" | "info" | "muted" | "danger" | "violet";

const TONE: Record<Tone, string> = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  muted: "bg-stone-200 text-stone-700 dark:bg-white/10 dark:text-stone-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
};

export const CAMPAIGN_STATUS: Record<CampaignFlowStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "muted" },
  PUBLICATION_REVIEW: { label: "In review", tone: "warn" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "warn" },
  PUBLICATION_DECLINED: { label: "Declined", tone: "danger" },
  APPROVED_SETUP_INCOMPLETE: { label: "Approved · setup incomplete", tone: "info" },
  APPROVED: { label: "Live", tone: "ok" },
  CANCELLED: { label: "Cancelled", tone: "muted" },
  PENDING_APPROVAL: { label: "Pending approval", tone: "warn" },
  REJECTED: { label: "Rejected", tone: "danger" },
  COLLECTIONS_CLOSED: { label: "Collections closed", tone: "info" },
  PAUSED: { label: "Paused", tone: "muted" },
  OUTCOME_REPORTING: { label: "Outcome reporting", tone: "violet" },
};

export const APPLICATION_STATUS: Record<FundraisingStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "muted" },
  SUBMITTED: { label: "Submitted", tone: "info" },
  IN_REVIEW: { label: "In review", tone: "warn" },
  INFORMATION_REQUESTED: { label: "Info requested", tone: "violet" },
  RESUBMITTED: { label: "Resubmitted", tone: "info" },
  APPROVED: { label: "Approved", tone: "ok" },
  NOT_APPROVED: { label: "Not approved", tone: "danger" },
  WITHDRAWN: { label: "Withdrawn", tone: "muted" },
  EXPIRED: { label: "Expired", tone: "muted" },
};

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE[tone]}`}>{children}</span>;
}

export function CampaignStatusPill({ status }: { status: CampaignFlowStatus }) {
  const s = CAMPAIGN_STATUS[status] ?? { label: status, tone: "muted" as Tone };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function ApplicationStatusPill({ status }: { status: FundraisingStatus }) {
  const s = APPLICATION_STATUS[status] ?? { label: status, tone: "muted" as Tone };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function Chip({ active, onClick, children, t }: { active: boolean; onClick: () => void; children: ReactNode; t: SaTheme }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`min-h-9 rounded-full border px-3 text-[13px] font-medium transition-colors ${active ? t.chipActive : t.chipInactive}`}>
      {children}
    </button>
  );
}

export function Card({ t, className = "", children }: { t: SaTheme; className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border ${t.card} ${className}`}>{children}</div>;
}

export function Stat({ t, label, value, sub }: { t: SaTheme; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card t={t} className="p-4 sm:p-5">
      <div className={`text-xs font-semibold uppercase tracking-wider ${t.muted}`}>{label}</div>
      <div className={`mt-1.5 text-2xl font-extrabold sm:text-[28px] ${t.heading}`}>{value}</div>
      {sub != null && <div className={`mt-1 text-[13px] ${t.muted}`}>{sub}</div>}
    </Card>
  );
}

export function ErrorLine({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {message} {onRetry && <button type="button" onClick={onRetry} className="ml-1 font-semibold underline">Retry</button>}
    </p>
  );
}

export function Spinner({ t }: { t: SaTheme }) {
  return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: t.accent }} aria-label="Loading" /></div>;
}

export const errorText = (e: unknown, fallback: string) =>
  e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string" && (e as { message: string }).message
    ? (e as { message: string }).message
    : fallback;

// ── Confirm dialog (artboard 8): before/after, required reason, details, notify ──

export type ChangeRow = { field: string; before: string; after: string };

export const REASONS = ["Donee request", "Policy / safety", "Correction of error", "Donor reports", "Other"];

export type ConfirmResult = { reason: string; details: string; notifyPrimary: boolean; notifySecondary: boolean };

export function ConfirmDialog({
  t, title, changes, primaryNotify = "Notify the donee", secondaryNotify, defaultNotify = true, confirmLabel = "Confirm and save",
  danger = false, extra, onCancel, onConfirm,
}: {
  t: SaTheme; title: string; changes: ChangeRow[]; primaryNotify?: string | null; secondaryNotify?: string | null;
  defaultNotify?: boolean; confirmLabel?: string; danger?: boolean; extra?: ReactNode;
  onCancel: () => void; onConfirm: (r: ConfirmResult) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [notifyPrimary, setNotifyPrimary] = useState(defaultNotify);
  const [notifySecondary, setNotifySecondary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finalReason = reason === "Other" ? details.trim() : reason;
  const canSave = !!reason && (reason !== "Other" || details.trim().length > 0) && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm({ reason: finalReason, details: details.trim(), notifyPrimary, notifySecondary });
    } catch (e) {
      setError(errorText(e, "That didn't save. Check your connection and try again."));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className={`absolute inset-0 ${t.overlay}`} aria-hidden="true" onClick={busy ? undefined : onCancel} />
      <div role="dialog" aria-modal="true" aria-labelledby="fr-confirm-title"
        className={`relative flex max-h-[90dvh] w-full max-w-[620px] flex-col gap-4 overflow-y-auto rounded-[20px] border p-6 shadow-2xl sm:p-7 ${t.surface}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="fr-confirm-title" className={`text-xl font-extrabold ${t.heading}`}>{title}</h2>
            <p className={`mt-1 text-sm ${t.muted}`}>Review what will change. This is recorded in the audit log with your name.</p>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Close" className={`rounded-lg p-1 ${t.muted}`}><X className="h-5 w-5" /></button>
        </div>
        {changes.length > 0 && (
          <div className={`overflow-hidden rounded-xl border text-sm ${t.cardFlat}`}>
            <div className={`grid grid-cols-[120px_1fr_1fr] gap-2 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider ${t.tableHead} ${t.muted}`}>
              <span>Field</span><span>Before</span><span>After</span>
            </div>
            {changes.map((c) => (
              <div key={c.field} className={`grid grid-cols-[120px_1fr_1fr] gap-2 border-t px-3.5 py-3 ${t.cardFlat}`}>
                <span className={t.muted}>{c.field}</span>
                <span className={`break-words line-through ${t.dim}`}>{c.before || "—"}</span>
                <b className={`break-words ${t.heading}`}>{c.after || "—"}</b>
              </div>
            ))}
          </div>
        )}
        {extra}
        <label className={`flex flex-col gap-1.5 text-[13px] font-medium ${t.text}`}>
          Reason (required)
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={`min-h-11 rounded-xl border px-3 text-sm ${t.input}`}>
            <option value="">Choose a reason…</option>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className={`flex flex-col gap-1.5 text-[13px] font-medium ${t.text}`}>
          Details{reason === "Other" ? " (required)" : ""}
          <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What happened and why this change is needed"
            className={`rounded-xl border px-3 py-2.5 text-sm ${t.input}`} />
        </label>
        {(primaryNotify || secondaryNotify) && (
          <div className={`flex flex-col gap-2 text-sm ${t.text}`}>
            {primaryNotify && <label className="flex items-center gap-2"><input type="checkbox" checked={notifyPrimary} onChange={(e) => setNotifyPrimary(e.target.checked)} /> {primaryNotify}</label>}
            {secondaryNotify && <label className="flex items-center gap-2"><input type="checkbox" checked={notifySecondary} onChange={(e) => setNotifySecondary(e.target.checked)} /> {secondaryNotify}</label>}
          </div>
        )}
        {error && <ErrorLine message={error} />}
        <div className={`flex justify-end gap-2.5 border-t pt-4 ${t.cardFlat}`}>
          <button type="button" onClick={onCancel} disabled={busy} className={`min-h-11 rounded-xl border px-4 text-sm ${t.btn}`}>Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={!canSave}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 text-sm font-semibold disabled:opacity-50 ${danger ? "border-red-600 bg-red-600 text-white hover:bg-red-700" : t.btnAccent}`}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
