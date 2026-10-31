"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { NgoDrive } from "@/lib/api";
import { humanize } from "./NgoOfferReviewCard";
import { DRIVE_STATUS_LABEL } from "./driveActivity";
import type { DriveOffer } from "./useNgoOffers";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useDriveCopy } from "@/features/ngo-drives/driveCopy";
const OFFER_ENDING: Record<string, string> = { NGO_DECLINED: "Declined", ENDED: "Ended" };
/** Only declined and ended offers: received ones are in each drive's report (Donors). */
export const isDeclinedOffer = (o: { status: string }) => o.status in OFFER_ENDING;

/** Drives with proof approved or ended, plus declined/ended offers with their reason. Searchable. */
export function HistoryTab({ drives, offers }: { drives: NgoDrive[]; offers: DriveOffer[] }) {
  const ui = useUiText();
  const df = useTranslations("driveFlow");
  const dc = useDriveCopy();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const hit = (...parts: (string | null | undefined)[]) => !needle || parts.some((p) => (p ?? "").toLowerCase().includes(needle));
  const shownDrives = drives.filter((d) => hit(d.title, d.itemName, d.category, d.beneficiaryGroup));
  const shownOffers = offers.filter(isDeclinedOffer).filter((o) => hit(o.drive.title, o.ngoDeclineReason, OFFER_ENDING[o.status]));

  return (
    <div className="space-y-6">
      <label className="relative block">
        <span className="sr-only"><UiText>Search history</UiText></span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={ui("Search drives or reasons")} data-testid="history-search"
          className="min-h-11 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </label>

      <section aria-labelledby="history-drives" className="space-y-3">
        <h3 id="history-drives" className="text-3xs font-black uppercase tracking-[0.24em] text-ngo-700 dark:text-ngo-400"><UiText>Completed and ended drives</UiText></h3>
        {shownDrives.length === 0 ? <p className="text-sm text-stone-500">{needle ? ui("No drives match.") : ui("No completed drives yet.")}</p> : (
          <ul className="space-y-3">
            {shownDrives.map((d) => (
              <li key={d.id} data-testid="history-drive" className="flex flex-col justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">{d.title}</h4>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    {df("qtyUnitOfItem", { qty: d.quantityReceived, unit: humanize(d.unit), item: d.itemName ?? "" })}{d.beneficiariesReached ? ` · ${df("peopleReached", { count: d.beneficiariesReached })}` : ""}
                  </p>
                </div>
                {d.status === "FULFILLED"
                  ? <Link href={`/ngo/drives/${d.id}/report`} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-ngo-700 px-4 text-sm font-bold text-white hover:bg-ngo-800"><UiText>View proof</UiText></Link>
                  : <span data-testid="history-drive-status" className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 dark:bg-zinc-800 dark:text-stone-200">{DRIVE_STATUS_LABEL[d.status] ? dc(DRIVE_STATUS_LABEL[d.status]) : d.status}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {shownOffers.length > 0 && (
        <section aria-labelledby="history-declined" className="space-y-3">
          <h3 id="history-declined" className="text-3xs font-black uppercase tracking-[0.24em] text-ngo-700 dark:text-ngo-400"><UiText>Declined offers</UiText></h3>
          <ul className="space-y-2">
            {shownOffers.map((o) => (
              <li key={o.id} data-testid="history-offer" className="rounded-xl border border-stone-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="font-semibold text-stone-900 dark:text-stone-100">{o.quantity} {humanize(o.drive.unit)} · {o.drive.title} · {OFFER_ENDING[o.status] ? dc(OFFER_ENDING[o.status]) : humanize(o.status)}</p>
                {o.ngoDeclineReason && <p className="text-stone-600 dark:text-stone-400"><UiText>Reason:</UiText> {o.ngoDeclineReason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
