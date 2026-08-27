import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import { RakhiMotif } from "@/components/RakhiMotif";
import {
  RAKSHA_BANDHAN_CAMPAIGN,
  isRakshaBandhanCampaignActive,
} from "@/lib/raksha-bandhan";

/** The site's display serif, as set up in src/app/layout.tsx. */
const SERIF = "var(--font-source-serif-4), Georgia, serif";

/**
 * RakshaBandhanStrip — a one-day festive band above the hero.
 *
 * WHY A STRIP AND NOT A TAKEOVER?
 * The retail apps run a full festive skin on this date because they are selling
 * rakhis; the merchandising *is* the product. Causekind is not, so the same
 * layout would read as off-brand. This keeps the format we already use for
 * 15 August — same slot, same action pair — and changes the palette and message.
 *
 * DESIGN NOTES, because the first two attempts got this wrong.
 * The band began as an orange-to-maroon gradient with a gold hairline through
 * the middle, a diagonal stripe texture, and neon-yellow sans-serif copy. That
 * combination reads as a discount ribbon, which is the one thing this must not
 * look like. What fixed it:
 *
 *   1. ONE colour family. A single deep plum, shifting only in value across the
 *      band. The jump to orange was what made it look like retail signage.
 *   2. The site's own serif. Source Serif 4 italic for the headline, against
 *      Plus Jakarta for the supporting line. The serif/sans pairing is what
 *      makes it look composed rather than shouted, and it matches the rest of
 *      the site instead of arriving as a foreign element.
 *   3. Ivory, not yellow. `#fde047` on warm red is both low-contrast and cheap.
 *      Gold is now an accent only — the rule, the date, the primary action.
 *   4. No texture. The diagonal stripes read as moiré noise at band height.
 *
 * Renders nothing outside its window. See src/lib/raksha-bandhan.ts.
 */
export function RakshaBandhanStrip() {
  if (!isRakshaBandhanCampaignActive()) return null;

  return (
    <section
      aria-label="Causekind Raksha Bandhan announcement"
      className="relative isolate w-full overflow-hidden bg-[#4a1526] text-[#f7f0e4]"
    >
      {/* One colour family, shifting in value only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,#58182f_0%,#4a1526_48%,#3b0f1e_100%)] dark:bg-[linear-gradient(100deg,#43142a_0%,#360f1d_48%,#280a15_100%)]"
      >
        {/* A single warm light from the left, behind the date. Enough to give
            the band depth; not enough to become a second colour. */}
        <div className="absolute inset-0 bg-[radial-gradient(90%_150%_at_6%_50%,rgba(224,172,72,0.20)_0%,rgba(224,172,72,0.06)_38%,transparent_70%)]" />
      </div>

      {/* Hairline accents. Both are 1px — the 3px gold bar this replaces was
          the loudest thing on the page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#e0ac48]/30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(to_right,transparent_0%,rgba(224,172,72,0.5)_18%,rgba(224,172,72,0.8)_50%,rgba(224,172,72,0.5)_82%,transparent_100%)]"
      />

      <div className="relative flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 sm:min-h-[3.75rem] sm:gap-4 sm:px-6 lg:px-8">
        {/* The date, set as editorial furniture rather than a bordered chip.
            A numeral in the serif with a letterspaced month beneath it needs no
            box to read as a date, and the box was fighting the rounded buttons
            at the other end of the band. */}
        <div className="hidden shrink-0 flex-col items-center leading-none min-[480px]:flex">
          <span className="text-[1.35rem] font-semibold tracking-[-0.02em]" style={{ fontFamily: SERIF }}>
            {RAKSHA_BANDHAN_CAMPAIGN.dateDay}
          </span>
          <span className="mt-1 text-[0.5rem] font-bold uppercase tracking-[0.22em] text-[#e0ac48]">
            {RAKSHA_BANDHAN_CAMPAIGN.dateMonth}
          </span>
        </div>

        {/* Gold rule separating date from message. */}
        <div
          aria-hidden="true"
          className="hidden h-8 w-px shrink-0 bg-[linear-gradient(to_bottom,transparent,rgba(224,172,72,0.65),transparent)] min-[480px]:block"
        />

        {/* One small, crisp rakhi as an ornament. The faint oversized
            watermarks that were here read as smudges at band height; a single
            sharp one at 18px reads as intent. */}
        <RakhiMotif
          idPrefix="ck-rakhi-strip"
          withTassels={false}
          className="hidden h-[18px] w-[18px] shrink-0 opacity-90 min-[560px]:block"
        />

        <div className="min-w-0 flex-1">
          <span className="sr-only">{RAKSHA_BANDHAN_CAMPAIGN.spokenMessage}</span>
          {/* No marquee. The Independence strip scrolls a repeated slogan; this
              is a single sentence meant to be read once, and moving it would
              only make that harder. It wraps to two lines when narrow. */}
          <p
            aria-hidden="true"
            className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 leading-snug"
          >
            <span
              className="text-[0.95rem] italic tracking-[0.005em] text-[#f7f0e4] sm:text-[1.05rem]"
              style={{ fontFamily: SERIF }}
            >
              {RAKSHA_BANDHAN_CAMPAIGN.headline}
            </span>
            <span className="text-[0.72rem] font-medium tracking-[0.01em] text-[#f7f0e4]/70 sm:text-[0.8rem]">
              {RAKSHA_BANDHAN_CAMPAIGN.subhead}
            </span>
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-2 min-[720px]:flex">
          {/* Ghost, so the two actions read as secondary-then-primary rather
              than as two competing filled buttons. */}
          <Link
            href={RAKSHA_BANDHAN_CAMPAIGN.secondaryCtaHref}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#f7f0e4]/30 px-4 py-1.5 text-xs font-semibold text-[#f7f0e4] transition-[background-color,border-color] duration-200 hover:border-[#f7f0e4]/55 hover:bg-[#f7f0e4]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0ac48] focus-visible:ring-offset-2 focus-visible:ring-offset-[#4a1526] motion-reduce:transition-none"
          >
            {RAKSHA_BANDHAN_CAMPAIGN.secondaryCtaLabel}
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={RAKSHA_BANDHAN_CAMPAIGN.ctaHref}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#e0ac48] px-4 py-1.5 text-xs font-bold text-[#3b0f1e] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] transition-[background-color,transform] duration-200 hover:bg-[#eec066] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7f0e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#4a1526] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            {RAKSHA_BANDHAN_CAMPAIGN.ctaLabel}
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
