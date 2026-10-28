"use client";

import { Loader2 } from "lucide-react";
import type { ItemMatch } from "@/lib/api";

import { UiText, useUiText } from "@/components/UiText";
import { useDashCopy, useTimeAgo } from "@/lib/dashboardCopy";
import { useTranslations } from "next-intl";
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
  const ui = useUiText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const timeAgo = useTimeAgo();
  const photo = match.listingPhotoUrls?.[0];
  const item = match.listingTitle || match.donorItemDescription || ui("your item");
  const need = match.requestTitle || ui("a nearby need");
  const covered = match.allocatedQuantity ?? null;
  const needed = match.requestQuantity ?? null;
  const km = match.scoreDistanceKm;

  return (
    <article
      aria-label={dt("matchWaiting", { need })}
      className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_24px_50px_-32px_rgba(28,20,16,0.35)] sm:flex-row sm:gap-6 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="h-44 w-full shrink-0 overflow-hidden rounded-2xl bg-stone-100 sm:h-48 sm:w-48 dark:bg-zinc-800">
        {photo ? (
          <img src={photo} alt={item} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-stone-400"><UiText>No photo</UiText></div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--ck-role-accent)]/10 px-3 py-1 text-2xs font-black text-[var(--ck-role-accent)]">
            <UiText>Waiting for you</UiText>
          </span>
          <span className="text-xs text-stone-500">{dt("matchedAgo", { ago: timeAgo(match.createdAt) })}</span>
        </div>

        <h3 className="text-lg font-black leading-snug text-stone-900 sm:text-xl dark:text-stone-100">
          {dt("yourItemMatchesNeed", { item, need })}
        </h3>

        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Fact label={ui("Covers")} value={covered != null && needed != null ? dt("coversOfNeeded", { covered, needed }) : covered != null ? `${covered}` : "—"} />
          <Fact label={ui("Distance")} value={km != null ? dt("aboutKm", { km: km < 1 ? "<1" : Math.round(km) }) : ui("Same city")} />
          <Fact label={ui("Recipient")} value={match.doneeCity ? dt("verifiedIn", { city: match.doneeCity.split(",")[0] }) : ui("Verified")} />
        </dl>

        <p className="text-xs text-stone-500">
          <UiText>The recipient&apos;s details stay private until you confirm and an admin approves.</UiText>
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--ck-role-accent)] px-6 text-sm font-black text-white transition-colors hover:bg-[var(--ck-role-hover,#c45520)] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            <UiText>Yes, I still have it</UiText>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDecline}
            className="inline-flex h-12 items-center justify-center rounded-full border-[1.5px] border-stone-300 bg-white px-5 text-sm font-extrabold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-transparent dark:text-stone-200"
          >
            <UiText>Not available any more</UiText>
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

