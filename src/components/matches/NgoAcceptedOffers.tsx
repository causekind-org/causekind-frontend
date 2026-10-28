"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatISTDate } from "@/lib/formatIST";

import { UiText, useUiText } from "@/components/UiText";
import { useDashCopy } from "@/lib/dashboardCopy";
import { useTranslations } from "next-intl";
/**
 * The donor's offers to NGO drives shown in Matches > NGO: from "Offer sent" until the NGO
 * received the items. Completed ones move to History (with the proof once it's approved).
 */
export const ACCEPTED_DRIVE_OFFER_STATUSES = [
  "PENDING_NGO_REVIEW", "NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK",
  "ISSUE_WINDOW_OPEN", "ISSUE_RAISED",
] as const;

export type AcceptedDriveOffer = {
  id: number;
  status: string;
  driveId?: number | null;
  driveTitle?: string | null;
  ngoName?: string | null;
  driveItemName?: string | null;
  quantity?: number | null;
  driveUnit?: string | null;
  driveStatus?: string | null;
  driveBeneficiariesReached?: number | null;
  driveBeneficiaryGroup?: string | null;
  receivedAt?: string | null;
  receivedQuantity?: number | null;
};

const RECEIVED = new Set(["ISSUE_WINDOW_OPEN", "ISSUE_RAISED"]);
/** "Received on 19 Oct 2026 · 5 pieces". */
type LineT = (key: "receivedWord" | "receivedOn" | "distributedTo", values?: Record<string, string | number>) => string;
const LINE_EN: LineT = (key, v = {}) =>
  key === "receivedOn" ? `Received on ${v.date}` : key === "distributedTo" ? `The NGO has distributed your ${v.what}. This drive reached ${v.who}.` : "Received";
function receivedText(o: AcceptedDriveOffer, t: LineT = LINE_EN): string {
  const when = o.receivedAt ? formatISTDate(o.receivedAt) : null;
  const qty = o.receivedQuantity ?? o.quantity;
  return [when ? t("receivedOn", { date: when }) : t("receivedWord"), qty != null ? `${qty} ${(o.driveUnit ?? "").replaceAll("_", " ").toLowerCase()}`.trim() : null].filter(Boolean).join(" · ");
}

/** The four stages a donor sees, over the real offer statuses. */
export const DRIVE_OFFER_STAGES = ["Offer sent", "Accepted, arrange handover", "Handover scheduled", "Received by NGO"] as const;
export function driveOfferStage(status: string): number {
  if (status === "PENDING_NGO_REVIEW") return 0;
  if (["NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED"].includes(status)) return 1;
  if (["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"].includes(status)) return 2;
  return 3;
}

/** After the proof is approved: "The NGO has distributed your 10 jackets. This drive reached 50 people (children)." */
export function distributedLine(o: AcceptedDriveOffer, t: LineT = LINE_EN, peopleInNeed = "people in need"): string | null {
  if (o.driveStatus !== "FULFILLED") return null;
  const what = o.quantity ? `${o.quantity} ${(o.driveItemName ?? "items").toLowerCase()}` : (o.driveItemName ?? "items").toLowerCase();
  const n = o.driveBeneficiariesReached;
  const group = (o.driveBeneficiaryGroup ?? "").trim().toLowerCase();
  // "elderly" / "children" read as a group word, so say who they are after the number of people.
  const who = !n ? peopleInNeed
    : !group || group === "people" ? `${n} ${n === 1 ? "person" : "people"}`
      : `${n} ${n === 1 ? "person" : "people"} (${group})`;
  return t("distributedTo", { what, who });
}

export function acceptedDriveOffers<T extends { _type?: string; status: string }>(offers: T[]): T[] {
  return offers.filter(o => o._type === "DRIVE_OFFER" && (ACCEPTED_DRIVE_OFFER_STATUSES as readonly string[]).includes(o.status));
}

/** Extra wording only where the stage alone isn't enough. */
const STATUS_TEXT: Record<string, string> = {
  HANDOVER_AT_RISK: "Handover needs attention",
  ISSUE_RAISED: "An issue is being reviewed",
  COMPLETED: "Completed. The NGO's distribution proof shows here once approved.",
};

export type MatchSegment = "donee" | "ngo";

/** "Donee | NGO" beside the Match opportunities heading. Donee is the default. */
export function MatchSegmentControl({ value, onChange, doneeCount, ngoCount }: {
  value: MatchSegment; onChange: (v: MatchSegment) => void; doneeCount: number; ngoCount: number;
}) {
  const ui = useUiText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const option = (key: MatchSegment, label: string, count: number) => (
    <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] ${
        value === key ? "bg-[var(--ck-role-accent)] text-white" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-zinc-800"}`}>
      {label}
      <span className={`rounded-full px-1.5 text-3xs ${value === key ? "bg-white/25" : "bg-stone-200 dark:bg-zinc-700"}`}>{count}</span>
    </button>
  );
  return (
    <div role="radiogroup" aria-label={ui("Show matches with")} data-testid="match-segment"
      className="inline-flex shrink-0 rounded-full border border-stone-200 p-0.5 dark:border-zinc-700">
      {option("donee", ui("Donee"), doneeCount)}
      {option("ngo", "NGO", ngoCount)}
    </div>
  );
}

/** The NGO segment: accepted drive offers, each leading to its handover page. */
export function NgoAcceptedOffersList({ offers }: { offers: AcceptedDriveOffer[] }) {
  const ui = useUiText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  if (offers.length === 0) {
    return (
      <div className="py-8 text-center" data-testid="ngo-matches-empty">
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400"><UiText>No offers to NGO drives yet.</UiText></p>
        <Link href="/#ngo-drives-section" className="mt-2 inline-block text-xs font-bold text-ngo-700 underline underline-offset-2 dark:text-ngo-300">
          <UiText>Browse NGO drives</UiText>
        </Link>
      </div>
    );
  }
  return (
    <ul className="space-y-3" data-testid="ngo-matches">
      {offers.map(o => (
        <li key={o.id} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-stone-900 dark:text-stone-100">{o.driveTitle ?? ui("NGO drive")}</p>
              {o.ngoName && <p className="text-xs text-stone-500 dark:text-stone-400">{o.ngoName}</p>}
              <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                {o.quantity ?? ""} {o.driveUnit ? o.driveUnit.replaceAll("_", " ").toLowerCase() : ""}{o.driveItemName ? ` · ${o.driveItemName}` : ""}
              </p>
              {distributedLine(o) ? (
                <p className="mt-1 text-sm font-semibold text-ngo-800 dark:text-ngo-200" data-testid="drive-offer-distributed">{distributedLine(o, (k, v) => dt(k, v), ui("people in need"))}</p>
              ) : (
                <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label={ui("Offer progress")} data-testid="drive-offer-stages">
                  {DRIVE_OFFER_STAGES.map((label, i) => {
                    const at = driveOfferStage(o.status);
                    return (
                      <li key={label} aria-current={i === at ? "step" : undefined}
                        className={`inline-flex items-center gap-1.5 ${i === at ? "font-bold text-ngo-800 dark:text-ngo-200" : i < at ? "text-stone-500 dark:text-stone-400" : "text-stone-400 dark:text-stone-500"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${i <= at ? "bg-ngo-600 dark:bg-ngo-400" : "bg-stone-300 dark:bg-zinc-600"}`} aria-hidden />
                        {dc(label)}
                      </li>
                    );
                  })}
                </ol>
              )}
              {RECEIVED.has(o.status) && <p className="mt-1 text-xs text-stone-600 dark:text-stone-300" data-testid="drive-offer-received">{receivedText(o, (k, v) => dt(k, v))}</p>}
              {STATUS_TEXT[o.status] && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{dc(STATUS_TEXT[o.status])}</p>}
            </div>
            {distributedLine(o) && o.driveId ? (
              <Link href={`/drives/${o.driveId}/proof`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ngo-700 px-4 text-xs font-bold text-white hover:bg-ngo-800">
                <UiText>View proof</UiText> <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : RECEIVED.has(o.status) ? (
              // Received: no chat or handover actions, just a small link to the record.
              <Link href={`/ngo-drive-offers/${o.id}/handover`} className="text-xs font-semibold text-ngo-700 underline dark:text-ngo-300"><UiText>View handover</UiText></Link>
            ) : o.status !== "PENDING_NGO_REVIEW" && (
              <Link href={`/ngo-drive-offers/${o.id}/handover`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ngo-700 px-4 text-xs font-bold text-white hover:bg-ngo-800">
                <UiText>Open handover</UiText> <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
