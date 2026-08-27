"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PublicItemRequest } from "@/lib/api";
import { daysWaiting, longestWaiting, waitingLabel } from "@/lib/raksha-bandhan";

/**
 * "The Unclaimed" — the needs that have waited longest with nobody behind them.
 *
 * <p><b>This is the inversion of every other list on the site.</b> The board,
 * the carousels and the category pages all lead with the newest request, which
 * is the ordinary and correct default: it is fresh, it is likely still relevant,
 * and it rewards a donee for posting. The cost of that default is that a request
 * nobody took slides down the list a little further every day, and the ones most
 * in need of a champion become the least visible. Once a year is a reasonable
 * time to turn the list upside down.
 *
 * <p>Everything here is already unclaimed by construction — see
 * `longestWaiting()` for why the public board and "nobody has taken this" are
 * the same fact rather than an inference.
 */

/** How many to show. Enough to read as a list, few enough to read at all. */
const SHOWN = 6;

export function UnclaimedSection({
  requests,
  /** The one already shown in the hero, so it is not repeated immediately below it. */
  excludeId = null,
}: {
  requests: readonly PublicItemRequest[] | null;
  excludeId?: number | null;
}) {
  const pool = excludeId === null
    ? requests
    : (requests ?? []).filter(r => r.id !== excludeId);

  const items = longestWaiting(pool, SHOWN);

  // No section at all rather than a section with an empty state. "Nothing is
  // waiting" is a claim this page cannot make: the list can be empty because the
  // board is empty, because the fetch failed, or because the hero took the only
  // row. A heading over nothing invites the first reading and the other two are
  // just as likely.
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="ck-unclaimed-heading"
      className="w-full px-6 sm:px-10 lg:px-12 py-14 sm:py-20"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-[3px] w-10 shrink-0 rounded-full"
            style={{
              background:
                "repeating-linear-gradient(90deg, #c9962f 0px, #c9962f 5px, transparent 5px, transparent 9px)",
            }}
          />
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#9a6b12] dark:text-[#e8b45a]">
            Raksha Bandhan
          </span>
        </div>

        <h2
          id="ck-unclaimed-heading"
          className="mt-4 max-w-2xl font-jakarta text-3xl font-extrabold leading-tight tracking-tight text-stone-900 dark:text-white sm:text-4xl"
          style={{ textWrap: "balance" }}
        >
          No one has tied a thread here yet
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600 dark:text-stone-300 sm:text-base">
          Every request below went out to be matched privately, found no one, and
          was put on the open board. These are the ones that have waited longest.
        </p>

        <ul className="mt-9 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200 dark:border-stone-800 dark:bg-stone-800 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(request => {
            const days = daysWaiting(request.createdAt);

            return (
              <li key={request.id} className="bg-[#fbf9f4] dark:bg-zinc-900">
                <Link
                  href={`/requests/${request.id}/offer`}
                  className="group flex h-full flex-col gap-3 p-6 transition-colors hover:bg-white focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-[#9a6b12] dark:hover:bg-zinc-800/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-400 dark:text-stone-500">
                      {request.category}
                    </span>
                    {days !== null && (
                      <span className="shrink-0 text-[11px] font-bold tabular-nums text-[#9a6b12] dark:text-[#e8b45a]">
                        {waitingLabel(days)}
                      </span>
                    )}
                  </div>

                  <p className="font-jakarta text-lg font-extrabold leading-snug tracking-tight text-stone-900 dark:text-white">
                    {request.title}
                  </p>

                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
                    {request.doneeFirstName} · {request.city}
                  </p>

                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-xs font-bold text-[#9a6b12] dark:text-[#e8b45a]">
                    Tie a thread
                    <ArrowRight
                      aria-hidden="true"
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/requests"
          className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-[#9a6b12]/35 px-5 py-2.5 text-sm font-bold text-[#9a6b12] transition-colors hover:bg-[#9a6b12] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a6b12] dark:text-[#e8b45a] dark:hover:text-stone-900"
        >
          See every open need
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
