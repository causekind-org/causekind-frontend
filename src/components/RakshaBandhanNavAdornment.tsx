"use client";

import { useEffect, useState } from "react";

import { RakhiMotif } from "@/components/RakhiMotif";
import { isRakshaBandhanCampaignActive } from "@/lib/raksha-bandhan";

/**
 * Degrees of spin per pixel scrolled. One full turn takes ~9000px — a slow
 * drift you notice rather than a wheel that spins.
 */
const SPIN_PER_PIXEL = 0.04;


/**
 * RakshaBandhanNavAdornment — a one-day festive dressing for the site header.
 *
 * THE IDEA.
 * A literal illustration of a sister tying a rakhi onto her brother's wrist
 * would be a picture of somebody else's family, and it would say nothing about
 * Causekind. So the gesture is abstracted to the part that is ours: a thread
 * draws outward from the centre and *ties*, and a rakhi blooms at the knot.
 * Two ends that did not start together, joined by a thread — a donor on one
 * side, a family on the other.
 *
 * <p>The tie plays once, on load. It does not loop: a header that re-runs its
 * animation every few seconds pulls the eye off the page for the whole visit.
 * After it lands, the rakhi hangs from the header like a pendant and **turns as
 * you scroll**, and the tassels keep a slow sway. The rotation tracks the
 * scroll position exactly, with no easing — easing made it lag behind and keep
 * turning after the page had stopped.
 *
 * <p>Everything here is decorative — `aria-hidden`, `pointer-events-none`, and
 * behind the header content. The message itself lives in the announcement
 * strip, where a screen reader can reach it. See RakshaBandhanStrip.
 *
 * <p>Renders nothing outside its one-day window. See src/lib/raksha-bandhan.ts.
 */
export function RakshaBandhanNavAdornment() {
  const active = isRakshaBandhanCampaignActive();
  const [spin, setSpin] = useState(0);

  // Scroll-driven rotation. Hooks cannot sit behind the early return, so this
  // is declared unconditionally and does nothing when the campaign is off.
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;

    const onScroll = () => {
      // Coalesce to one update per frame. A bare scroll handler calling
      // setState fires far more often than the screen can repaint.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setSpin(window.scrollY * SPIN_PER_PIXEL);
      });
    };

    onScroll(); // Pick up a restored scroll position on load.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="rakhi-nav-adornment"
      /* Deliberately NOT overflow-hidden. The rakhi hangs below the header
         edge, and clipping it was what made it look like a small cut-off
         flower rather than something tied on. */
      className="pointer-events-none absolute inset-0 z-0"
    >
      {/* A warm wash, kept low in opacity. The header carries navigation and a
          search field; anything stronger than a tint starts costing legibility,
          which no festive day is worth.

          It now starts fully transparent and stays that way across the first
          fifth of the header. That band is where the CauseKind logo sits, and
          the previous version opened at 14% burnt orange directly behind it —
          which put a peach panel behind the wordmark and changed the brand's
          own colours. The logo renders against the plain header background on
          this day exactly as on any other. */}
      <div className="ck-rakhi-nav-wash absolute inset-0 overflow-hidden bg-[linear-gradient(100deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_20%,rgba(253,224,71,0.10)_34%,rgba(255,255,255,0)_56%,rgba(154,44,63,0.10)_100%)] dark:bg-[linear-gradient(100deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_20%,rgba(180,83,9,0.18)_34%,rgba(0,0,0,0)_56%,rgba(92,26,41,0.30)_100%)]" />

      {/* Marigold glow behind the tie point, so the rakhi has something to sit
          on rather than floating on the header's flat background. */}
      <div className="ck-rakhi-nav-glow absolute bottom-0 left-1/2 h-16 w-64 -translate-x-1/2 translate-y-1/3 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(253,224,71,0.5)_0%,rgba(245,158,11,0.2)_45%,transparent_72%)] blur-[7px] dark:bg-[radial-gradient(ellipse_at_center,rgba(253,224,71,0.28)_0%,rgba(245,158,11,0.13)_45%,transparent_72%)]" />

      {/* ── The thread ──────────────────────────────────────────────────────
          Two halves, each drawn outward from the centre. Drawing from the
          middle rather than end-to-end is what makes it read as being *tied*
          at the middle, instead of a loading bar crossing the page. */}
      <div className="absolute inset-x-0 bottom-0 h-px">
        <div className="ck-rakhi-thread-left absolute right-1/2 h-px w-1/2 origin-right bg-[linear-gradient(to_left,rgba(245,158,11,0.95),rgba(253,224,71,0.7)_45%,rgba(253,224,71,0)_100%)]" />
        <div className="ck-rakhi-thread-right absolute left-1/2 h-px w-1/2 origin-left bg-[linear-gradient(to_right,rgba(245,158,11,0.95),rgba(253,224,71,0.7)_45%,rgba(253,224,71,0)_100%)]" />
      </div>

      {/* ── The rakhi ───────────────────────────────────────────────────────
          Positioning lives on the wrapper and the bloom on the child, so the
          entrance animation never has to carry the centring translate. */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
        <div className="ck-rakhi-knot">
          <RakhiMotif
            idPrefix="ck-rakhi-nav"
            petalRotation={spin}
            className="h-[46px] w-[46px] drop-shadow-[0_3px_6px_rgba(120,53,15,0.45)]"
          />
        </div>
      </div>

      <style jsx>{`
        /* The tie, in order: thread out from the centre, then the rakhi blooms
           on top of it. Each step waits for the one before via its delay. */
        @keyframes ck-rakhi-draw {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }

        @keyframes ck-rakhi-bloom {
          0%   { opacity: 0; transform: scale(0.2) rotate(-150deg); }
          65%  { opacity: 1; transform: scale(1.16) rotate(10deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        @keyframes ck-rakhi-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes ck-rakhi-glow-settle {
          0%   { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }

        .ck-rakhi-nav-wash {
          animation: ck-rakhi-fade-in 900ms ease-out both;
        }

        .ck-rakhi-thread-left,
        .ck-rakhi-thread-right {
          animation: ck-rakhi-draw 900ms cubic-bezier(0.22, 1, 0.36, 1) 250ms both;
        }

        .ck-rakhi-knot {
          transform-origin: 50% 50%;
          animation: ck-rakhi-bloom 850ms cubic-bezier(0.34, 1.56, 0.64, 1) 1000ms both;
        }

        .ck-rakhi-nav-glow {
          animation: ck-rakhi-glow-settle 1100ms ease-out 1000ms both;
        }

        /* Reduced motion gets the tied rakhi, immediately and permanently.
           The destination, not the journey — never a blank header. The scroll
           rotation is disabled in the effect above for the same reason. */
        @media (prefers-reduced-motion: reduce) {
          .ck-rakhi-nav-wash,
          .ck-rakhi-thread-left,
          .ck-rakhi-thread-right,
          .ck-rakhi-knot,
          .ck-rakhi-nav-glow {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      {/* The tassel sway is styled globally rather than through styled-jsx,
          because the element it targets is rendered inside RakhiMotif and so
          carries no styled-jsx scoping attribute of this component. */}
      <style>{`
        @keyframes ck-rakhi-sway {
          0%, 100% { transform: rotate(-5deg); }
          50%      { transform: rotate(5deg); }
        }
        .ck-rakhi-tassels {
          transform-origin: 24px 28px;
          animation: ck-rakhi-sway 3.6s ease-in-out 1900ms infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ck-rakhi-tassels { animation: none; }
        }
      `}</style>
    </div>
  );
}
