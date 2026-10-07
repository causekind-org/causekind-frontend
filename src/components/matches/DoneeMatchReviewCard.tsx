"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ItemMatch } from "@/lib/api";

/**
 * A match waiting on the donee (AWAITING_DONEE_CONFIRMATION: the donor confirmed
 * they still have the item and an admin approved). The donee's counterpart of
 * DonorMatchReviewCard (owner, 2026-10-07): it shows the DONOR'S ITEM — photos,
 * description, condition, what it covers — because that is what the recipient
 * is deciding on. The donor stays anonymous ("a verified donor nearby").
 *
 * <p>Presentational only: accept and decline are the dashboard's existing donee
 * handlers (doneeAcceptMatch / doneeRejectMatch), passed in.
 */
export function DoneeMatchReviewCard({
  match, busy, onAccept, onDecline,
}: {
  match: ItemMatch;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const photos = (match.listingPhotoUrls?.length ? match.listingPhotoUrls : match.donorImages) ?? [];
  const [shown, setShown] = useState(0);
  const photo = photos[shown] ?? photos[0];
  const item = match.listingTitle || "A donated item";
  const need = match.requestTitle || "your request";
  const description = match.listingDescription || match.donorItemDescription;
  const covered = match.allocatedQuantity ?? null;
  const needed = match.requestQuantity ?? null;
  const km = match.scoreDistanceKm;

  const details: [string, string | null | undefined][] = [
    ["Condition", match.listingCondition],
    ["Working", match.listingWorkingStatus ? match.listingWorkingStatus.replace(/_/g, " ").toLowerCase() : null],
    ["Age", match.listingApproximateAge],
    ["Brand", match.listingBrand],
    ["Known defects", match.listingKnownDefects],
    ["Includes", match.listingAccessoriesIncluded],
  ];
  const shownDetails = details.filter(([, v]) => v && String(v).trim() !== "");

  return (
    <article
      aria-label={`An item matches your request: ${need}`}
      className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_24px_50px_-32px_rgba(20,30,60,0.35)] sm:flex-row sm:gap-6 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-56">
        <div className="h-48 w-full overflow-hidden rounded-2xl bg-stone-100 sm:h-56 dark:bg-zinc-800">
          {photo ? (
            <img src={photo} alt={item} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-stone-400">No photo</div>
          )}
        </div>
        {photos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto">
            {photos.slice(0, 5).map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => setShown(i)}
                aria-label={`Show photo ${i + 1}`}
                className={`h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 ${i === shown ? "border-[var(--ck-role-accent)]" : "border-transparent"}`}
              >
                <img src={p} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--ck-role-accent)]/10 px-3 py-1 text-2xs font-black text-[var(--ck-role-accent)]">
            Waiting for you
          </span>
          <span className="text-xs text-stone-500">The donor confirmed and our team approved it</span>
        </div>

        <h3 className="text-lg font-black leading-snug text-stone-900 sm:text-xl dark:text-stone-100">
          {item} <span className="font-semibold text-stone-500">for your &ldquo;{need}&rdquo;</span>
        </h3>

        {description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{description}</p>
        )}

        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Fact label="Covers" value={covered != null && needed != null ? `${covered} of ${needed} you need` : covered != null ? `${covered}` : "—"} />
          <Fact label="Distance" value={km != null ? `About ${km < 1 ? "<1" : Math.round(km)} km` : "Same city"} />
          <Fact label="Donor" value={`Verified${match.donorCity ? `, ${match.donorCity.split(",")[0]}` : ""}`} />
        </dl>

        {shownDetails.length > 0 && (
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-600 dark:text-stone-300">
            {shownDetails.map(([k, v]) => (
              <div key={k} className="flex gap-1"><dt className="text-stone-400">{k}:</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--ck-role-accent)] px-6 text-sm font-black text-white transition-colors hover:bg-[var(--ck-role-hover,#2d5a96)] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Yes, I want this item
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDecline}
            className="inline-flex h-12 items-center justify-center rounded-full border-[1.5px] border-stone-300 bg-white px-5 text-sm font-extrabold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-transparent dark:text-stone-200"
          >
            This won&apos;t work for me
          </button>
        </div>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-100/70 px-3 py-2.5 dark:bg-zinc-800/70">
      <dt className="text-2xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-black text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}
