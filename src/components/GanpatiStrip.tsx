import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import { ModakIcon } from "@/components/home/GanpatiVisuals";
import { GANPATI_CONFIG, GANPATI_START, GANPATI_END, isGanpatiActive } from "@/lib/isGanpatiActive";

/** The site's display serif, as set up in src/app/layout.tsx. */
const SERIF = "var(--font-source-serif-4), Georgia, serif";

/**
 * The festival window runs on IST, and GANPATI_START / GANPATI_END are the UTC
 * instants of those IST boundaries. Formatting them in the viewer's own zone
 * would print "13" in London and "24" in Sydney, so the zone is pinned here.
 * Deriving the label instead of hardcoding it is what keeps the band from
 * drifting out of step with theme.config.ts if the dates are ever moved.
 */
const IST = "Asia/Kolkata";
const istPart = (date: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: IST, ...options }).format(date);

const START_DAY = istPart(GANPATI_START, { day: "numeric" });
const END_DAY = istPart(GANPATI_END, { day: "numeric" });
const MONTH = istPart(GANPATI_START, { month: "short" });

/**
 * GanpatiStrip — the festive band above the hero for Ganeshotsav.
 *
 * HOW THIS DIFFERS FROM THE OTHER TWO STRIPS.
 * The 15 August and Raksha Bandhan bands are the *only* festive element on
 * their day — the page underneath them stays ordinary. Ganpati is not like
 * that: for its fourteen days HomeClient swaps the hero, live needs, pathways,
 * CTA and footer for festive variants, so this band arrives on top of a page
 * that is already saffron end to end.
 *
 * That is the whole design constraint. A second announcement here would repeat
 * what HeroGanpati's eyebrow already says a few hundred pixels lower, so this
 * band does not announce the festival. It carries the greeting and the window
 * — the two things the festive page itself never states — and then gets out of
 * the way. If it ever starts competing with the hero for attention, it has
 * stopped doing its job.
 *
 * PALETTE, following the rules RakshaBandhanStrip paid for the hard way:
 * one colour family shifting in value only (deep maroon, from
 * GANPATI_CONFIG.colors), the site's own serif against Plus Jakarta, cream
 * rather than yellow for body text with gold kept as an accent, and no
 * texture — diagonal stripes read as moiré at band height.
 *
 * Renders nothing outside the window. See src/lib/isGanpatiActive.ts.
 */
export function GanpatiStrip() {
  if (!isGanpatiActive()) return null;

  const spoken = `${GANPATI_CONFIG.greeting}. ${GANPATI_CONFIG.title}, ${START_DAY} to ${END_DAY} ${MONTH}. ${GANPATI_CONFIG.tagline}.`;

  return (
    <section
      aria-label="Causekind Ganeshotsav announcement"
      className="relative isolate w-full overflow-hidden bg-[#5b1414] text-[#fffbf5]"
    >
      {/* One colour family, shifting in value only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,#6d1a17_0%,#5b1414_48%,#450a0a_100%)] dark:bg-[linear-gradient(100deg,#4d1010_0%,#3d0c0c_48%,#2a0606_100%)]"
      >
        {/* A single warm light from the left, behind the date — depth without
            introducing a second colour. */}
        <div className="absolute inset-0 bg-[radial-gradient(90%_150%_at_6%_50%,rgba(234,179,8,0.22)_0%,rgba(217,119,6,0.07)_38%,transparent_70%)]" />
      </div>

      {/* Hairline accents, both 1px. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#d97706]/30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(to_right,transparent_0%,rgba(234,179,8,0.5)_18%,rgba(234,179,8,0.8)_50%,rgba(234,179,8,0.5)_82%,transparent_100%)]"
      />

      <div className="relative flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 sm:min-h-[3.75rem] sm:gap-4 sm:px-6 lg:px-8">
        {/* The window as editorial furniture rather than a bordered chip — the
            box was fighting the rounded buttons at the other end of the band. */}
        <div className="hidden shrink-0 flex-col items-center leading-none min-[480px]:flex">
          <span
            className="text-[1.2rem] font-semibold tracking-[-0.02em] whitespace-nowrap"
            style={{ fontFamily: SERIF }}
          >
            {START_DAY}&ndash;{END_DAY}
          </span>
          <span className="mt-1 text-[0.5rem] font-bold uppercase tracking-[0.22em] text-[#eab308]">
            {MONTH}
          </span>
        </div>

        {/* Gold rule separating the window from the greeting. */}
        <div
          aria-hidden="true"
          className="hidden h-8 w-px shrink-0 bg-[linear-gradient(to_bottom,transparent,rgba(234,179,8,0.65),transparent)] min-[480px]:block"
        />

        {/* One small, crisp modak as an ornament. It carries its own gold
            gradient, so it reads at 18px against the maroon without help. */}
        <ModakIcon className="hidden size-[18px] shrink-0 min-[560px]:block" />

        <div className="min-w-0 flex-1">
          <span className="sr-only">{spoken}</span>
          {/* No marquee. This is one line meant to be read once, and moving it
              would only make that harder. It wraps when narrow. */}
          <p
            aria-hidden="true"
            className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 leading-snug"
          >
            <span
              className="text-[0.95rem] italic tracking-[0.005em] text-[#fffbf5] sm:text-[1.05rem]"
              style={{ fontFamily: SERIF }}
            >
              {GANPATI_CONFIG.greeting}
            </span>
            <span className="text-[0.72rem] font-medium tracking-[0.01em] text-[#fffbf5]/70 sm:text-[0.8rem]">
              {GANPATI_CONFIG.tagline}
            </span>
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 min-[720px]:flex">
          {/* Ghost first, so the pair reads secondary-then-primary rather than
              as two competing filled buttons. */}
          <Link
            href="/items/new"
            className="inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#fffbf5]/30 px-4 py-1.5 text-xs font-semibold text-[#fffbf5] transition-[background-color,border-color] duration-200 hover:border-[#fffbf5]/55 hover:bg-[#fffbf5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eab308] focus-visible:ring-offset-2 focus-visible:ring-offset-[#5b1414] motion-reduce:transition-none"
          >
            List an item
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/requests"
            className="inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#eab308] px-4 py-1.5 text-xs font-bold text-[#450a0a] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] transition-[background-color,transform] duration-200 hover:bg-[#facc15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fffbf5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#5b1414] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Browse verified needs
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
