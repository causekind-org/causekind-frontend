"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { NgoDrive } from "@/lib/api";
import { humanize } from "./NgoOfferReviewCard";
import { DRIVE_STATUS_LABEL } from "./driveActivity";
import type { DriveOffer } from "./useNgoOffers";

const OFFER_ENDING: Record<string, string> = {
  NGO_DECLINED: "Declined", CANCELLED: "Cancelled", ENDED: "Ended", WITHDRAWN: "Withdrawn by the donor",
};

/** Drives with proof approved, ended/rejected/cancelled drives, and offers that ended. Searchable. */
export function HistoryTab({ drives, offers }: { drives: NgoDrive[]; offers: DriveOffer[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const hit = (...parts: (string | null | undefined)[]) => !needle || parts.some((p) => (p ?? "").toLowerCase().includes(needle));
  const shownDrives = drives.filter((d) => hit(d.title, d.itemName, d.category, d.beneficiaryGroup));
  const shownOffers = offers.filter((o) => hit(o.donorDisplayName, o.drive.title, o.ngoDeclineReason, OFFER_ENDING[o.status]));

  return (
    <div className="space-y-6">
      <label className="relative block">
        <span className="sr-only">Search history</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drives, donors or reasons" data-testid="history-search"
          className="min-h-11 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
      </label>

      <section aria-labelledby="history-drives" className="space-y-3">
        <h3 id="history-drives" className="text-3xs font-black uppercase tracking-[0.24em] text-ngo-700 dark:text-ngo-400">Completed and ended drives</h3>
        {shownDrives.length === 0 ? <p className="text-sm text-stone-500">{needle ? "No drives match." : "No completed drives yet."}</p> : (
          <ul className="space-y-3">
            {shownDrives.map((d) => (
              <li key={d.id} data-testid="history-drive" className="flex flex-col justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">{d.title}</h4>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    {d.quantityReceived} {humanize(d.unit)} of {d.itemName}{d.beneficiariesReached ? ` · ${d.beneficiariesReached} people reached` : ""}
                  </p>
                </div>
                {d.status === "FULFILLED"
                  ? <Link href={`/drives/${d.id}/proof`} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-ngo-700 px-4 text-sm font-bold text-white hover:bg-ngo-800">View proof</Link>
                  : <span data-testid="history-drive-status" className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700 dark:bg-zinc-800 dark:text-stone-200">{DRIVE_STATUS_LABEL[d.status] ?? d.status}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="history-offers" className="space-y-3">
        <h3 id="history-offers" className="text-3xs font-black uppercase tracking-[0.24em] text-ngo-700 dark:text-ngo-400">Past offers</h3>
        {shownOffers.length === 0 ? <p className="text-sm text-stone-500">{needle ? "No offers match." : "None yet."}</p> : (
          <ul className="space-y-2">
            {shownOffers.map((o) => (
              <li key={o.id} data-testid="history-offer" className="rounded-xl border border-stone-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  {o.donorDisplayName || "Donor"} · {o.quantity} {humanize(o.drive.unit)} · {o.drive.title}
                </p>
                <p className="text-stone-600 dark:text-stone-400">{OFFER_ENDING[o.status] ?? humanize(o.status)}{o.ngoDeclineReason ? `: ${o.ngoDeclineReason}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
