"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { ArrowRight, Inbox, MapPin, Plus, RotateCw } from "lucide-react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { NewRequestLink } from "@/components/NewRequestLink";
import { getMyItemRequests, type ItemRequest } from "@/lib/api";
import { requestBucket } from "@/lib/dashboardFilters";
import { getRequestFulfilment } from "@/lib/requestFulfilment";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { DoneeSectionHeading, DONEE_CARD, DONEE_HEADING_GAP, DONEE_PILL_BUTTON, DONEE_SECTION } from "./DoneeSectionHeading";

/** Where the donee's full list of their own requests lives. */
const ALL_REQUESTS_HREF = "/dashboard#requests";

type Badge = { label: string; cls: string };

const NEUTRAL = "bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-stone-300";
const SOFT = "bg-[var(--ck-role-soft)] text-[var(--ck-role-on-soft)]";
const SOLID = "bg-[var(--ck-role-accent)] text-[var(--ck-role-on-accent)]";
const DONE = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300";

/**
 * Status badge, read through the dashboard's own `requestBucket` so this card
 * and the dashboard always agree on what state a request is in.
 */
function statusBadge(r: ItemRequest): Badge {
  if (r.status === "PUBLICATION_CONSENT_REQUIRED") return { label: "Action needed", cls: SOLID };
  switch (requestBucket(r)) {
    case "drafts": return { label: "Draft", cls: NEUTRAL };
    case "review": return { label: "Pending verification", cls: NEUTRAL };
    case "open": return { label: "Live", cls: SOFT };
    case "matched": return { label: "Offer received", cls: SOLID };
    case "partial": return { label: "Partly received", cls: SOFT };
    case "completed": return { label: "Fulfilled", cls: DONE };
    default:
      if (r.status === "REJECTED") return { label: "Not approved", cls: NEUTRAL };
      if (r.status === "EXPIRED") return { label: "Expired", cls: NEUTRAL };
      if (r.status === "CANCELLED") return { label: "Withdrawn", cls: NEUTRAL };
      return { label: "Closed", cls: NEUTRAL };
  }
}

/**
 * Only public requests have a detail page (`/requests/[id]` is built on the
 * public endpoint and shows anything else as gone), so every other request
 * opens the donee's own list on the dashboard.
 */
function requestHref(r: ItemRequest) {
  return r.status === "PUBLIC_REQUEST" ? `/requests/${r.id}` : ALL_REQUESTS_HREF;
}

const byNewest = (a: ItemRequest, b: ItemRequest) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

function RequestCard({ r }: { r: ItemRequest }) {
  const badge = statusBadge(r);
  const bucket = requestBucket(r);
  const f = getRequestFulfilment(r);
  // Progress is "received so far" — the only per-request quantity the API
  // returns. Hidden while a request is a draft, in review or closed unfilled.
  const showProgress = f.requested > 0 && (bucket === "open" || bucket === "matched" || bucket === "partial" || bucket === "completed");
  const pct = f.requested > 0 ? Math.round((f.fulfilled / f.requested) * 100) : 0;

  return (
    <li>
      <Link
        href={requestHref(r)}
        className={`${DONEE_CARD} group h-full flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--ck-role-accent)]/40! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-ring)]`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-3xs font-black uppercase tracking-wider ${SOFT}`}>
            {r.category}
          </span>
          <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-3xs font-bold ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        <h3 className="mt-3 text-base font-bold leading-snug text-stone-900 dark:text-stone-100 line-clamp-2 group-hover:text-[var(--ck-role-accent)] transition-colors">
          <TranslatedText text={r.title} />
        </h3>

        {r.city && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
            <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate"><TranslatedText text={r.city} /></span>
          </p>
        )}

        <div className="mt-auto pt-4">
          {showProgress && (
            <>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ck-role-soft)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={f.requested}
                aria-valuenow={f.fulfilled}
                aria-label={`${f.fulfilled} of ${f.requested} received`}
              >
                <div className="h-full rounded-full bg-[var(--ck-role-accent)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
                {f.fulfilled} of {f.requested} received
              </p>
            </>
          )}
        </div>
      </Link>
    </li>
  );
}

function SkeletonCard() {
  return (
    <li aria-hidden="true" className={`${DONEE_CARD} p-5 animate-pulse`}>
      <div className="flex justify-between">
        <div className="h-4 w-20 rounded-full bg-stone-200 dark:bg-zinc-800" />
        <div className="h-4 w-24 rounded-full bg-stone-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-4 h-4 w-3/4 rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="mt-2 h-3 w-1/3 rounded bg-stone-200 dark:bg-zinc-800" />
      <div className="mt-6 h-1.5 w-full rounded-full bg-stone-200 dark:bg-zinc-800" />
    </li>
  );
}

/**
 * Donee landing only: the donee's three most recent requests, from the same
 * `GET /api/v1/item-requests/mine` the dashboard uses.
 */
export function MyRequestsSection() {
  const [requests, setRequests] = useState<ItemRequest[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    setRequests(null);
    getMyItemRequests()
      .then((data) => setRequests([...(data ?? [])].sort(byNewest).slice(0, 3)))
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  // The loaded, empty and error states are different heights from the
  // skeleton, which moves every section below. Re-measure so their scroll
  // reveals (founder's note, reviews) still fire at the right point.
  useEffect(() => {
    if (requests === null && !failed) return;
    const t = setTimeout(() => ScrollTrigger.refresh(), 50);
    return () => clearTimeout(t);
  }, [requests, failed]);

  const loading = requests === null && !failed;
  const empty = requests !== null && requests.length === 0;

  return (
    <section
      id="my-requests"
      aria-labelledby="my-requests-heading"
      aria-busy={loading || undefined}
      data-ck-role-theme="donee"
      className={DONEE_SECTION}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <DoneeSectionHeading
          id="my-requests-heading"
          eyebrow="My requests"
          title="Your requests at a glance."
          lede="Track every need you've posted and see what's on its way."
        />

        <div className={DONEE_HEADING_GAP}>
          {failed ? (
            <div role="alert" className={`${DONEE_CARD} flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5`}>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                We couldn&apos;t load your requests just now.
              </p>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-[var(--ck-role-accent)]/40! px-4 py-2 text-xs font-extrabold text-[var(--ck-role-accent)] hover:bg-[var(--ck-role-soft)] transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : empty ? (
            <div className="rounded-2xl border-2 border-dashed border-[var(--ck-role-border)]! bg-white/60 dark:bg-zinc-900/60 px-6 py-10 flex flex-col items-center text-center">
              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center ${SOFT}`}>
                <Inbox className="w-6 h-6" aria-hidden="true" />
              </span>
              <p className="mt-4 text-base font-bold text-stone-900 dark:text-stone-100">
                You haven&apos;t posted any needs yet
              </p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                Tell us what you need and we&apos;ll help find a donor nearby.
              </p>
              <NewRequestLink href="/requests/new" className={`${DONEE_PILL_BUTTON} mt-5`}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                Post your first need
              </NewRequestLink>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {loading
                ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
                : requests!.map((r) => <RequestCard key={r.id} r={r} />)}
            </ul>
          )}
        </div>

        {/* Below the cards, centered under the centered heading. The empty
            state carries its own "Post your first need" button instead. */}
        {!empty && (
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              href={ALL_REQUESTS_HREF}
              className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--ck-role-accent)] hover:underline underline-offset-4"
            >
              View all <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <NewRequestLink href="/requests/new" className={DONEE_PILL_BUTTON}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              Post a new need
            </NewRequestLink>
          </div>
        )}
      </div>
    </section>
  );
}
