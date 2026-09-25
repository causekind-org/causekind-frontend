"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import type { InKindStats } from "@/lib/api";
import { TranslatedText } from "@/hooks/useDynamicTranslation";

/**
 * The only three numbers on this page, and all three are real.
 *
 * <p><b>Why so few.</b> The landing pattern this page follows warns against two
 * failure modes above all others: "no impact data" and "hidden financials". The
 * tempting fix is a row of six big numbers, and that is how every site in this
 * category ends up with "12,450+ lives changed" — a figure nobody can define,
 * let alone check. CauseKind's backend exposes exactly three in-kind counts via
 * `/api/v1/stats/in-kind`, each with an unambiguous definition, so exactly
 * three are shown.
 *
 * <p><b>`verifiedHandovers` is the one that matters.</b> Items listed and needs
 * posted are inputs — anyone can inflate them by signing up. A verified
 * handover only increments when two people met in person and both confirmed it
 * with a one-time code. It is the hardest number on the site to fake, which is
 * why it is given the most weight here.
 *
 * <p><b>Honest absence.</b> When the stats call fails or returns null the
 * section renders nothing rather than zeros. A zero is a claim; a missing
 * section is not. And a value of 0 that is genuinely returned still renders —
 * "0 verified handovers" is true and a young platform saying so is worth more
 * than a young platform hiding it.
 */
export function InKindProof({ stats }: { stats: InKindStats | null }) {
  /*
   * HomeClient renders this in BOTH responsive trees — one is hidden by CSS,
   * but both are in the DOM. A hardcoded heading id would therefore appear
   * twice on every page, which is invalid HTML and leaves the section's
   * `aria-labelledby` pointing at an ambiguous target.
   */
  const headingId = useId();
  // No data is not the same as no activity — say nothing rather than imply zero.
  if (!stats) return null;

  const figures: { value: number; label: string; note: string; emphasis?: boolean }[] = [
    {
      value: stats.verifiedHandovers,
      label: "verified handovers",
      note: "Both people confirmed it in person, with a one-time code.",
      emphasis: true,
    },
    {
      value: stats.needsPosted,
      label: "needs posted",
      note: "Each from a recipient whose ID and address were checked first.",
    },
    {
      value: stats.itemsListed,
      label: "items listed",
      note: "Real objects, photographed, with their condition stated.",
    },
  ];

  return (
    <section
      // See HandoverJourney: no own gutter or background below lg, because the
      // mobile column already provides both.
      className="relative overflow-hidden py-0 lg:bg-[var(--ck-gap-bg,#fbf7f2)] lg:py-24 dark:lg:bg-zinc-950"
      aria-labelledby={headingId}
    >
      <div className="mx-auto max-w-6xl px-0 lg:px-6">
        <h2
          id={headingId}
          className="max-w-2xl text-balance text-2xl font-black leading-tight tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50"
        >
          <TranslatedText text="Three numbers, and what each one actually counts." />
        </h2>

        <dl className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {figures.map((f) => (
            <div
              key={f.label}
              className={[
                "rounded-2xl border p-6",
                f.emphasis
                  ? "border-[var(--ck-home-soft,#fed7aa)] bg-white sm:p-7 dark:border-zinc-700 dark:bg-zinc-900"
                  : "border-stone-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/60",
              ].join(" ")}
            >
              {/*
                The label is the real <dt> rather than a visually-hidden copy
                of itself. An earlier revision had both — an `sr-only` <dt> and
                a visible <span> with identical text — which read the term out
                twice to a screen reader and put two matching nodes in the
                accessibility tree.

                Visual order (big number first, then label) is restored with
                flex `order`, so the DOM keeps the term-then-definition
                sequence a description list is required to have.
              */}
              <div className="flex flex-col">
                <dt className="order-2 mt-3 text-sm font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-200">
                  <TranslatedText text={f.label} />
                </dt>
                <dd className="order-1">
                  <CountUp
                    value={f.value}
                    className={[
                      "block font-black leading-none tabular-nums tracking-tight",
                      f.emphasis
                        ? "text-5xl text-[var(--ck-home-accent,#c54805)] sm:text-6xl"
                        : "text-4xl text-stone-900 sm:text-5xl dark:text-stone-50",
                    ].join(" ")}
                  />
                </dd>
                <dd className="order-3 mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  <TranslatedText text={f.note} />
                </dd>
              </div>
            </div>
          ))}
        </dl>

        <p className="mt-8 max-w-prose text-xs leading-relaxed text-stone-500 dark:text-stone-500">
          <TranslatedText text="Counted live from the platform. We don't publish a 'lives changed' figure, because we would not be able to tell you how it was calculated." />
        </p>
      </div>
    </section>
  );
}

/**
 * A number that counts up once, when it is first scrolled into view.
 *
 * <p>Locale-formatted through `Intl` so an Indian reader gets 1,23,456 rather
 * than 123,456, and rendered with tabular figures so the width does not jitter
 * while it climbs.
 *
 * <p>Under reduced motion it renders the final value immediately — the number
 * is the information; the counting is not. Same when `IntersectionObserver` is
 * unavailable: showing the truth without the flourish always beats showing
 * nothing.
 */
function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(() => (reduceMotion ? value : 0));

  useEffect(() => {
    if (reduceMotion) {
      setShown(value);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(value);
      return;
    }

    let raf = 0;
    let start = 0;
    // Short enough not to be a wait, long enough to register as a count.
    const DURATION = 900;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();

        const tick = (now: number) => {
          if (!start) start = now;
          const t = Math.min(1, (now - start) / DURATION);
          // Decelerating: fast off the mark, easing into the final value, which
          // is what makes the last digits readable rather than a blur.
          const eased = 1 - Math.pow(1 - t, 3);
          setShown(Math.round(value * eased));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, reduceMotion]);

  return (
    <span ref={ref} className={className}>
      {/* The accessible name is always the real figure — a screen reader must
          never be read a half-counted number. */}
      <span aria-hidden>{new Intl.NumberFormat("en-IN").format(shown)}</span>
      <span className="sr-only">{new Intl.NumberFormat("en-IN").format(value)}</span>
    </span>
  );
}
