import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import {
  INDEPENDENCE_DAY_CAMPAIGN,
  isIndependenceDayCampaignActive,
} from "@/lib/independence-day";

const tickerPhrase = "HAPPY INDEPENDENCE DAY · GIVE WITH PURPOSE · ";
const tickerContent = tickerPhrase.repeat(5);

export function IndependenceDayStrip() {
  if (!isIndependenceDayCampaignActive()) return null;

  return (
    <section
      aria-label="Causekind Independence Day announcement"
      className="relative isolate w-full overflow-hidden bg-[#075942] text-white shadow-[0_8px_24px_-18px_rgba(7,89,66,0.82)]"
    >
      {/* The flag runs the full width. It used to stop at 38rem and dissolve
          into solid green, which left the right-hand two thirds of the strip a
          plain dark band — and put the ticker's near-black lettering over dark
          green, where it barely read. Carrying the white centre band all the way
          across fixes the look and the contrast in one go. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden bg-[linear-gradient(to_bottom,#ff9933_0%,#ff9933_33.333%,#ffffff_33.333%,#ffffff_66.666%,#138808_66.666%,#138808_100%)]"
      >
        {/* A whisper of depth at each end. Not the old fade-to-green, which was
            what killed the tricolour. */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-black/15" />
        {/* Chakra in the centre, where it sits on the flag.
            Twenty-four real spokes rather than the dashed ring this had before —
            at this size a dash pattern read as a dotted circle, not as the
            wheel. It stays in the decorative layer beneath the ticker: a wheel
            drawn over moving text would make both harder to read. */}
        <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#123f75] shadow-[0_0_0_2px_rgba(255,255,255,0.55)] sm:h-10 sm:w-10">
          <div
            className="absolute inset-[3px] rounded-full"
            style={{
              // 360 / 24 = one spoke every 15 degrees.
              background:
                "repeating-conic-gradient(from 0deg, #123f75 0deg 1.4deg, transparent 1.4deg 15deg)",
              // Hollow out the hub so the spokes read as spokes.
              WebkitMaskImage:
                "radial-gradient(circle, transparent 0 22%, #000 24% 100%)",
              maskImage:
                "radial-gradient(circle, transparent 0 22%, #000 24% 100%)",
            }}
          />
          <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#123f75]" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-[#ff9933] via-white to-[#138808]"
      />

      <div className="relative flex min-h-12 w-full items-center gap-3 px-4 py-1.5 sm:min-h-14 sm:gap-4 sm:px-6 lg:px-8">
        <div className="hidden h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-white/40 bg-[#075942]/90 text-center shadow-sm backdrop-blur-[1px] min-[480px]:flex">
          <span className="text-sm font-black leading-none tracking-[-0.07em]">15</span>
          <span className="mt-0.5 text-[0.5rem] font-bold uppercase tracking-[0.16em] text-white/80">Aug</span>
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden" aria-live="off">
          <span className="sr-only">Happy Independence Day. Give with purpose.</span>
          <div aria-hidden="true" className="ck-independence-marquee flex w-max whitespace-nowrap">
            <span className="pr-7 text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-[#111827] drop-shadow-[0_1px_0_rgba(255,255,255,0.35)] sm:pr-9 sm:text-xs sm:tracking-[0.2em]">
              {tickerContent}
            </span>
            <span className="pr-7 text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-[#111827] drop-shadow-[0_1px_0_rgba(255,255,255,0.35)] sm:pr-9 sm:text-xs sm:tracking-[0.2em]">
              {tickerContent}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 min-[720px]:flex">
          <Link
            href="/items/new"
            /* Opaque now, not 80%. Over a solid green band the translucency was
               invisible; over the full-width flag it let saffron and white show
               through and the label lost its footing. */
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/45 bg-[#075942] px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition-[transform,background-color,border-color] duration-200 hover:border-white/70 hover:bg-[#0a6e52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#075942] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            List an item
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={INDEPENDENCE_DAY_CAMPAIGN.ctaHref}
            /* A white button on a flag with a white centre band needs an edge of
               its own, or it dissolves into the stripe behind it. */
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#075942]/35 bg-white px-3.5 py-2 text-xs font-extrabold text-[#075942] shadow-sm transition-[transform,background-color,color] duration-200 hover:bg-[#fff5e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075942] focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Browse Needs
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes ck-independence-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .ck-independence-marquee {
          animation: ck-independence-marquee-scroll 26s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .ck-independence-marquee {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
