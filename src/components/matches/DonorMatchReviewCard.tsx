"use client";

import { Loader2 } from "lucide-react";
import type { ItemMatch } from "@/lib/api";

/**
 * A match waiting on the donor (DONOR_REVIEW), as a full card on the dashboard's
 * Match opportunities tab. Design B of https://claude.ai/artifact/DRtcEBQ6VcDHQ4cjJw7fsR
 * (chosen 2026-10-07): the item photo, what the match covers, how far away, and the
 * two answers. The recipient stays anonymous here: their details unlock only after
 * the donor confirms and an admin approves (need-first privacy).
 *
 * <p>Presentational only. Accepting and declining are the dashboard's existing
 * handlers (donorAcceptMatch, and the decline form with its reason and
 * condition-changed checkbox), passed in.
 */
export function DonorMatchReviewCard({
  match, busy, onAccept, onDecline,
}: {
  match: ItemMatch;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const photo = match.listingPhotoUrls?.[0];
  const item = match.listingTitle || "your item";
  const need = match.requestTitle || "a nearby need";
  const covered = match.allocatedQuantity ?? null;
  const needed = match.requestQuantity ?? null;
  const km = match.scoreDistanceKm;

  return (
    <article
      aria-label={`Match waiting for you: ${need}`}
      className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_24px_50px_-32px_rgba(28,20,16,0.35)] sm:flex-row sm:gap-6 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="h-44 w-full shrink-0 overflow-hidden rounded-2xl bg-stone-100 sm:h-48 sm:w-48 dark:bg-zinc-800">
        {photo ? (
          <img src={photo} alt={item} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-stone-400">No photo</div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--ck-role-accent)]/10 px-3 py-1 text-2xs font-black text-[var(--ck-role-accent)]">
            Waiting for you
          </span>
          <span className="text-xs text-stone-500">Matched {timeAgo(match.createdAt)}</span>
        </div>

        <h3 className="text-lg font-black leading-snug text-stone-900 sm:text-xl dark:text-stone-100">
          Your &ldquo;{item}&rdquo; matches a need for &ldquo;{need}&rdquo;
        </h3>

        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Fact label="Covers" value={covered != null && needed != null ? `${covered} of ${needed} needed` : covered != null ? `${covered}` : "—"} />
          <Fact label="Distance" value={km != null ? `About ${km < 1 ? "<1" : Math.round(km)} km` : "Same city"} />
          <Fact label="Recipient" value={`Verified${match.doneeCity ? `, ${match.doneeCity.split(",")[0]}` : ""}`} />
        </dl>

        <p className="text-xs text-stone-500">
          The recipient&apos;s details stay private until you confirm and an admin approves.
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--ck-role-accent)] px-6 text-sm font-black text-white transition-colors hover:bg-[var(--ck-role-hover,#c45520)] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Yes, I still have it
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDecline}
            className="inline-flex h-12 items-center justify-center rounded-full border-[1.5px] border-stone-300 bg-white px-5 text-sm font-extrabold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-transparent dark:text-stone-200"
          >
            Not available any more
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

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "recently";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
