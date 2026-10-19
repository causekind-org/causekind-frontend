"use client";

import type { ReactNode } from "react";
import type { NgoDriveOfferResponse } from "@/lib/api";
import { formatAgeRange } from "@/features/ngo-drives/driveOfferAge";

export const humanize = (v?: string | null) => (v ? v.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "");

/** One donor offer waiting for the NGO: what, how much, photos/video. Actions come from the caller. */
export function NgoOfferReviewCard({ offer, unit, stillNeeded, label, select, actions }: {
  offer: NgoDriveOfferResponse;
  unit?: string | null;
  /** The drive's live "still needed"; shown next to the offered quantity. */
  stillNeeded?: number | null;
  /** e.g. "Drive covered" when nothing more is needed. */
  label?: string | null;
  select?: ReactNode;
  actions?: ReactNode;
}) {
  const u = humanize(unit);
  const age = formatAgeRange(offer.ageRange) || offer.approximateAge;
  return (
    <li data-testid="offer-review-card" className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 sm:flex-row">
      <div className="flex min-w-0 gap-3">
        {select}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-stone-900 dark:text-stone-100">{offer.donorDisplayName || "Donor"}</h3>
            {offer.distanceKm != null && <span className="text-xs text-stone-500 dark:text-stone-400">{offer.distanceKm.toFixed(1)} km away</span>}
            {label && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-bold text-stone-700 dark:bg-zinc-800 dark:text-stone-200">{label}</span>}
          </div>
          <p className="mt-1 text-sm font-semibold text-ngo-800 dark:text-ngo-200" data-testid="offer-vs-need">
            Offer: {offer.quantity} {u}{stillNeeded != null ? ` · Drive still needs: ${Math.max(0, stillNeeded)}` : ""}
          </p>
          <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
            {offer.condition || "Condition not given"}
            {age ? ` · Age: ${age}` : ""}
            {offer.sizeSpec ? ` · Size: ${offer.sizeSpec}` : ""}
          </p>
          {(offer.confirmedWorking || offer.confirmedClean) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-medium text-stone-700 dark:text-stone-300">
              {offer.confirmedWorking && <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />Tested and works</span>}
              {offer.confirmedClean && <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />Washed and clean</span>}
            </div>
          )}
          {offer.notesForNgo && <p className="mt-2 rounded border border-amber-100 bg-white/60 p-2 text-xs text-stone-600 dark:border-amber-900/30 dark:bg-black/20 dark:text-stone-300">&ldquo;{offer.notesForNgo}&rdquo;</p>}
          {offer.media && offer.media.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {offer.media.filter((m) => m.mediaType !== "VIDEO").map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={m.id ?? m.mediaUrl} src={m.mediaUrl} alt="Offered item" className="h-16 w-16 rounded-lg object-cover" />
              ))}
              {offer.media.filter((m) => m.mediaType === "VIDEO").map((m) => m.playbackUrl ? (
                <video key={m.id} controls preload="metadata" src={m.playbackUrl} aria-label="Donor's item video" className="h-32 w-56 rounded-lg bg-black object-contain" />
              ) : (
                <span key={m.id} className="self-center text-xs text-stone-500">Video being checked</span>
              ))}
            </div>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-row gap-2 sm:flex-col">{actions}</div>}
    </li>
  );
}
