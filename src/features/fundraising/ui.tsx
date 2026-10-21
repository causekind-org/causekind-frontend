"use client";

import type { FundraisingStatus } from "@/lib/api";
import s from "./fundraising.module.css";

import { useLocale } from "next-intl";
import { useUiText, UiText } from "@/components/UiText";
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

/** Translated status, category and step labels for donor/donee fundraising screens. */
export function useFundraisingLabels() {
  const ui = useUiText();
  const locale = useLocale();
  const status = (k: FundraisingStatus): string => ({
    DRAFT: ui("Draft", "fundraising status"), SUBMITTED: ui("Submitted", "fundraising status"),
    IN_REVIEW: ui("In review", "fundraising status"), INFORMATION_REQUESTED: ui("Action needed", "fundraising status"),
    RESUBMITTED: ui("Resubmitted", "fundraising status"), APPROVED: ui("Approved", "fundraising status"),
    NOT_APPROVED: ui("Not approved", "fundraising status"), WITHDRAWN: ui("Withdrawn", "fundraising status"),
    EXPIRED: ui("Expired", "fundraising status"),
  })[k];
  const campaign = (k: string): string | undefined => ({
    DRAFT: ui("Draft", "campaign status"), PUBLICATION_REVIEW: ui("Publication review", "campaign status"),
    CHANGES_REQUESTED: ui("Changes requested", "campaign status"), PUBLICATION_DECLINED: ui("Publication declined", "campaign status"),
    APPROVED_SETUP_INCOMPLETE: ui("Approved — setup incomplete", "campaign status"), APPROVED: ui("Live", "campaign status"),
    CANCELLED: ui("Cancelled", "campaign status"), PENDING_APPROVAL: ui("Pending approval", "campaign status"),
    REJECTED: ui("Rejected", "campaign status"), COLLECTIONS_CLOSED: ui("Collections closed", "campaign status"),
    PAUSED: ui("Paused", "campaign status"), OUTCOME_REPORTING: ui("Outcome reporting", "campaign status"),
  } as Record<string, string>)[k];
  const review = (k: string): string | undefined => ({
    DRAFT: ui("Draft", "review status"), SUBMITTED: ui("Submitted", "review status"),
    CHANGES_REQUESTED: ui("Changes requested", "review status"), APPROVED: ui("Published", "review status"),
    DECLINED: ui("Declined", "review status"),
  } as Record<string, string>)[k];
  const category = (k: keyof typeof CATEGORY_LABEL): string => ({
    MEDICAL: ui("Medical", "fundraising category"), EDUCATION: ui("Education", "fundraising category"),
    EMERGENCY_HOUSEHOLD: ui("Emergency household support", "fundraising category"), OTHER: ui("Other", "fundraising category"),
  })[k];
  const wizardSteps = [ui("About you", "wizard step"), ui("Who needs help", "wizard step"), ui("The need", "wizard step"), ui("Evidence", "wizard step"), ui("Review", "wizard step")];
  const campaignSteps = [ui("Basics", "campaign step"), ui("Story", "campaign step"), ui("Target", "campaign step"), ui("Privacy", "campaign step"), ui("Preview", "campaign step")];
  /** Same format as formatDate, in the reader's language. */
  const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—");
  return { status, campaign, review, category, wizardSteps, campaignSteps, date };
}

export function statusLabel(status: FundraisingStatus) {
  return STATUS[status].label;
}

/** `localize`: translate the label (donor/donee screens). Admin screens leave it off. */
export function StatusChip({ status, localize = false }: { status: FundraisingStatus; localize?: boolean }) {
  const c = STATUS[status];
  const labels = useFundraisingLabels();
  return (
    <span className={`${s.chip} ${c.tone}`}>
      <Icon name={c.icon} />
      {localize ? labels.status(status) : c.label}
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
  if (state === "saving") return <span className={`${s.chip} ${s.cN}`} role="status"><Icon name="clock" /><UiText>Saving…</UiText></span>;
  if (state === "error") return <span className={`${s.chip} ${s.cX}`} role="status"><Icon name="alert" /><UiText>Unable to save</UiText></span>;
  return <span className={`${s.chip} ${s.cOk}`} role="status"><Icon name="check" /><UiText>Saved</UiText></span>;
}

export const WIZARD_STEPS = ["About you", "Who needs help", "The need", "Evidence", "Review"] as const;

export function Stepper({ current }: { current: number }) {
  const ui = useUiText();
  const labels = useFundraisingLabels();
  return (
    <nav aria-label={ui("Application steps")}>
      <ol className={s.steps}>
        {labels.wizardSteps.map((label, i) => (
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

/** Campaign status chip per handoff §3.3. */
const CAMPAIGN: Record<string, { label: string; tone: string; icon: "check" | "alert" | "clock" | "x" | "edit" | "search" | "lock" }> = {
  DRAFT: { label: "Draft", tone: s.cW, icon: "edit" },
  PUBLICATION_REVIEW: { label: "Publication review", tone: s.cN, icon: "search" },
  CHANGES_REQUESTED: { label: "Changes requested", tone: s.cW, icon: "edit" },
  PUBLICATION_DECLINED: { label: "Publication declined", tone: s.cM, icon: "x" },
  APPROVED_SETUP_INCOMPLETE: { label: "Approved — setup incomplete", tone: s.cOk, icon: "check" },
  APPROVED: { label: "Live", tone: s.cOk, icon: "check" },
  CANCELLED: { label: "Cancelled", tone: s.cM, icon: "x" },
  PENDING_APPROVAL: { label: "Pending approval", tone: s.cN, icon: "clock" },
  REJECTED: { label: "Rejected", tone: s.cM, icon: "x" },
  COLLECTIONS_CLOSED: { label: "Collections closed", tone: s.cM, icon: "lock" },
  PAUSED: { label: "Paused", tone: s.cW, icon: "clock" },
  OUTCOME_REPORTING: { label: "Outcome reporting", tone: s.cM, icon: "lock" },
};

export function CampaignChip({ status, localize = false }: { status: string; localize?: boolean }) {
  const c = CAMPAIGN[status] ?? { label: status, tone: s.cM, icon: "clock" as const };
  const labels = useFundraisingLabels();
  return <span className={`${s.chip} ${c.tone}`}><Icon name={c.icon} />{(localize && labels.campaign(status)) || c.label}</span>;
}

export const CAMPAIGN_STEPS = ["Basics", "Story", "Target", "Privacy", "Preview"] as const;

export function CampaignStepper({ current }: { current: number }) {
  const ui = useUiText();
  const labels = useFundraisingLabels();
  return (
    <nav aria-label={ui("Campaign steps")}>
      <ol className={s.steps}>
        {labels.campaignSteps.map((label, i) => (
          <li key={label} className={`${s.st} ${i === current ? s.stOn : ""} ${i < current ? s.stDone : ""}`} aria-current={i === current ? "step" : undefined}>
            <b>{i < current ? "✓" : i + 1}</b>{label}
          </li>
        ))}
      </ol>
    </nav>
  );
}

const REVIEW_ITEM: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "Draft", tone: s.cN },
  SUBMITTED: { label: "Submitted", tone: s.cN },
  CHANGES_REQUESTED: { label: "Changes requested", tone: s.cW },
  APPROVED: { label: "Published", tone: s.cOk },
  DECLINED: { label: "Declined", tone: s.cX },
};

/** Status of an update, page change or closure request (Phase C2). `approvedLabel` overrides "Published". */
/** Only used on the organiser's own workspace, so it always translates. `approvedLabel` must already be translated. */
export function ReviewChip({ status, approvedLabel }: { status: string; approvedLabel?: string }) {
  const c = REVIEW_ITEM[status] ?? { label: status, tone: s.cM };
  const labels = useFundraisingLabels();
  return <span className={`${s.chip} ${c.tone}`}>{status === "APPROVED" && approvedLabel ? approvedLabel : (labels.review(status) ?? c.label)}</span>;
}
