"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Drive offers the NGO has accepted and that are not finished: the statuses that share the NGO's contact. */
export const ACCEPTED_DRIVE_OFFER_STATUSES = [
  "NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK",
] as const;

export type AcceptedDriveOffer = {
  id: number;
  status: string;
  driveTitle?: string | null;
  ngoName?: string | null;
  driveItemName?: string | null;
  quantity?: number | null;
  driveUnit?: string | null;
};

export function acceptedDriveOffers<T extends { _type?: string; status: string }>(offers: T[]): T[] {
  return offers.filter(o => o._type === "DRIVE_OFFER" && (ACCEPTED_DRIVE_OFFER_STATUSES as readonly string[]).includes(o.status));
}

const STATUS_TEXT: Record<string, string> = {
  NGO_ACCEPTED: "Accepted, plan the handover",
  PENDING_ADMIN_APPROVAL: "Accepted, plan the handover",
  ADMIN_APPROVED: "Accepted, plan the handover",
  HANDOVER_IN_PROGRESS: "Handover planned",
  HANDOVER_AT_RISK: "Handover needs attention",
};

export type MatchSegment = "donee" | "ngo";

/** "Donee | NGO" beside the Match opportunities heading. Donee is the default. */
export function MatchSegmentControl({ value, onChange, doneeCount, ngoCount }: {
  value: MatchSegment; onChange: (v: MatchSegment) => void; doneeCount: number; ngoCount: number;
}) {
  const option = (key: MatchSegment, label: string, count: number) => (
    <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] ${
        value === key ? "bg-[var(--ck-role-accent)] text-white" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-zinc-800"}`}>
      {label}
      <span className={`rounded-full px-1.5 text-3xs ${value === key ? "bg-white/25" : "bg-stone-200 dark:bg-zinc-700"}`}>{count}</span>
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Show matches with" data-testid="match-segment"
      className="inline-flex shrink-0 rounded-full border border-stone-200 p-0.5 dark:border-zinc-700">
      {option("donee", "Donee", doneeCount)}
      {option("ngo", "NGO", ngoCount)}
    </div>
  );
}

/** The NGO segment: accepted drive offers, each leading to its handover page. */
export function NgoAcceptedOffersList({ offers }: { offers: AcceptedDriveOffer[] }) {
  if (offers.length === 0) {
    return (
      <div className="py-8 text-center" data-testid="ngo-matches-empty">
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No accepted drive offers yet.</p>
        <Link href="/#ngo-drives-section" className="mt-2 inline-block text-xs font-bold text-ngo-700 underline underline-offset-2 dark:text-ngo-300">
          Browse NGO drives
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
              <p className="font-semibold text-stone-900 dark:text-stone-100">{o.driveTitle ?? "NGO drive"}</p>
              {o.ngoName && <p className="text-xs text-stone-500 dark:text-stone-400">{o.ngoName}</p>}
              <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                {o.quantity ?? ""} {o.driveUnit ? o.driveUnit.replaceAll("_", " ").toLowerCase() : ""}{o.driveItemName ? ` · ${o.driveItemName}` : ""}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-ngo-800 dark:text-ngo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-ngo-600 dark:bg-ngo-400" aria-hidden />
                {STATUS_TEXT[o.status] ?? "Accepted"}
              </p>
            </div>
            <Link href={`/ngo-drive-offers/${o.id}/handover`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ngo-700 px-4 text-xs font-bold text-white hover:bg-ngo-800">
              Open handover <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
