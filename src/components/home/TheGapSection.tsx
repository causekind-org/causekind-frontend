"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { daysWaiting, longestWaiting, waitingLabel } from "@/lib/needTiming";
import type { PublicItemRequest } from "@/lib/api";
import { NeedThread } from "@/components/home/NeedThread";
import { TranslatedText } from "@/hooks/useDynamicTranslation";

/**
 * "The gap" — the problem, stated with the platform's own live data.
 *
 * <p><b>Why this is not a written problem statement.</b> Every donation site
 * explains the problem in a paragraph, and every one of those paragraphs is
 * unfalsifiable. This section makes the same argument out of rows that are
 * true at the moment of rendering: these specific needs, in these specific
 * cities, have been waiting this specific number of days, and nobody has taken
 * them. The argument is stronger because the reader can check it — the same
 * rows are on /requests.
 *
 * <p><b>Why the board is the proof.</b> Under the need-first architecture a
 * request is matched privately first and only reaches the public board once
 * that failed. So everything shown here is, by construction, a need the system
 * could not connect on its own. That is precisely the gap, and it needs no
 * embellishment — which is also why no count, percentage or trend is invented
 * anywhere in this component.
 *
 * <p><b>Empty board.</b> Renders nothing at all rather than a placeholder. An
 * empty board is the one state where this argument is not true, and a
 * "problem" section with no problem in it would be the most dishonest thing on
 * the page.
 */
export function TheGapSection({ requests = [] }: { requests?: PublicItemRequest[] }) {
  const reduceMotion = useReducedMotion();

  /*
   * The four longest-waiting needs.
   *
   * Oldest-first is the whole point: every other surface on the site shows the
   * board newest-first, which systematically hides the needs this section is
   * about. Four because the column has to stay readable on a laptop without
   * scrolling — this is an argument, not the board itself, and /requests is one
   * click away.
   */
  const waiting = useMemo(() => longestWaiting(requests, 4), [requests]);

  // Nothing waiting, nothing to argue. See the class comment.
  if (waiting.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden bg-[var(--ck-gap-bg,#fbf7f2)] py-20 sm:py-28 dark:bg-zinc-950"
      aria-labelledby="ck-gap-heading"
    >
      {/*
        A single hairline grid, not a gradient wash and not floating shapes.
        It reads as a ledger — the visual register this section is arguing in —
        and it is one repeating-linear-gradient rather than any DOM.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-[0.25]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 63px, rgba(176,74,21,0.06) 63px 64px)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          {/* ── The claim ─────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-3xs font-extrabold uppercase tracking-[0.18em] text-[var(--ck-home-ink,#b04a15)]">
              <TranslatedText text="The gap" />
            </p>

            <h2
              id="ck-gap-heading"
              className="mt-4 text-balance text-3xl font-black leading-[1.08] tracking-tight text-stone-900 sm:text-4xl lg:text-[2.9rem] dark:text-stone-50"
            >
              <TranslatedText text="The problem isn't that nobody cares." />
              <span className="mt-2 block text-[var(--ck-home-accent,#c54805)]">
                <TranslatedText text="It's that caring rarely finds the right address." />
              </span>
            </h2>

            <p className="mt-6 max-w-prose text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-300">
              <TranslatedText text="CauseKind matches every need privately first — to donors nearby who already listed the right thing. The needs on this list are the ones that search could not place." />
            </p>

            <p className="mt-4 max-w-prose text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              <TranslatedText text="So they are still here. Still waiting. Each one is a real request from a verified person, and each one is a specific object somebody already owns." />
            </p>

            <Link
              href="/requests"
              className="group mt-8 inline-flex items-center gap-2 rounded-xl border border-[var(--ck-home-soft,#fed7aa)] bg-white px-5 py-3 text-sm font-bold text-stone-800 transition-colors hover:bg-[var(--ck-home-surface,#fff7ed)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#c54805)] focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-100 dark:hover:bg-zinc-800"
            >
              <TranslatedText text="See every open request" />
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                aria-hidden
              />
            </Link>
          </div>

          {/* ── The evidence ──────────────────────────────────────────── */}
          <div className="relative">
            {/* The thread runs the length of the list, dashed: every row below
                it is a connection that has NOT been made. */}
            <NeedThread
              pending
              className="absolute -left-1 top-2 bottom-2 hidden sm:block"
            />

            <ul className="space-y-3 sm:pl-8">
              {waiting.map((need, i) => (
                <WaitingRow key={need.id} need={need} index={i} reduceMotion={!!reduceMotion} />
              ))}
            </ul>

            <p className="mt-6 text-xs leading-relaxed text-stone-500 sm:pl-8 dark:text-stone-500">
              <TranslatedText text="Longest-waiting open requests, oldest first. Waiting time is counted from when the request was posted." />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * One waiting need.
 *
 * <p>Shows only fields the public endpoint actually returns: title, category,
 * city, quantity and the age of the row. There is deliberately no progress bar
 * — `PublicItemRequest` carries no fulfilled count, so any "3 of 10 fulfilled"
 * on this card would be invented. The wait is the number that matters here
 * anyway, and it is real.
 */
function WaitingRow({
  need,
  index,
  reduceMotion,
}: {
  need: PublicItemRequest;
  index: number;
  reduceMotion: boolean;
}) {
  const days = daysWaiting(need.createdAt);
  const visual = CATEGORY_VISUALS[need.category];
  const Icon = visual?.Icon;

  return (
    <motion.li
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{
        type: "spring",
        stiffness: 90,
        damping: 20,
        // Staggered by row, inside the guidance's 30–50ms band. Any slower and
        // the list feels like it is loading rather than arriving.
        delay: index * 0.045,
      }}
    >
      <Link
        href="/requests"
        className="group relative flex items-start gap-4 rounded-2xl border border-stone-200/90 bg-white p-4 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-[var(--ck-home-soft,#fed7aa)] hover:shadow-[0_10px_30px_-18px_rgba(176,74,21,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#c54805)] focus-visible:ring-offset-2 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
      >
        {/* The node where this row meets the thread. Solid ring, hollow centre:
            an endpoint that has not been connected to anything yet. */}
        <span
          aria-hidden
          className="absolute -left-[2.05rem] top-7 hidden h-2.5 w-2.5 rounded-full border-2 border-[var(--ck-thread,#c54805)] bg-[var(--ck-gap-bg,#fbf7f2)] sm:block dark:bg-zinc-950"
        />

        {Icon ? (
          <span
            aria-hidden
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${visual.iconBg} ${visual.text}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="truncate text-base font-bold text-stone-900 dark:text-stone-50">
              <TranslatedText text={need.title} />
            </span>
            {need.quantity > 1 ? (
              <span className="shrink-0 text-xs font-bold tabular-nums text-stone-500 dark:text-stone-400">
                ×{need.quantity}
              </span>
            ) : null}
          </span>

          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
            <span className="font-semibold">
              <TranslatedText text={need.category} />
            </span>
            <span aria-hidden>·</span>
            <span>
              <TranslatedText text={need.city} />
            </span>
          </span>
        </span>

        {/*
          The wait, as the row's loudest number.
          Rendered only when it is actually known — `daysWaiting` returns null
          for an unparseable timestamp and a confident "0 days" would look like
          an answer rather than an absence.
        */}
        {days !== null ? (
          <span className="shrink-0 self-center text-right">
            <span className="block text-2xl font-black leading-none tabular-nums text-[var(--ck-home-accent,#c54805)]">
              {days}
            </span>
            <span className="mt-1 block text-3xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              <TranslatedText text={days === 1 ? "day waiting" : "days waiting"} />
            </span>
            <span className="sr-only">{waitingLabel(days)}</span>
          </span>
        ) : null}
      </Link>
    </motion.li>
  );
}
