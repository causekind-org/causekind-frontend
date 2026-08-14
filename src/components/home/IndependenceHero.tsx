"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  independenceDayOrdinal,
  ordinalSuffix,
} from "@/lib/independence-day";
import type { PlatformStats } from "@/lib/api";

/**
 * The 15 August pieces of the hero.
 *
 * <p>Kept apart from HeroSection so the campaign is one import to add and one to
 * remove, and so the ordinary hero stays readable underneath it. Everything here
 * is gated by the same `isIndependenceDayCampaignActive()` the strip above uses —
 * one switch for the whole campaign, not two that can disagree.
 *
 * <p><b>The strip above already carries the literal tricolour.</b> Nothing here
 * repeats it at full strength: the sweep is blended light, and the band on the
 * headline exists for barely a second. Two flags stacked would read as noise.
 */

/* ── 1. Tricolour light sweep ─────────────────────────────────────────────── */

/**
 * A band of colour drifting across the hero photograph.
 *
 * <p>Purely decorative and hidden from assistive technology. It sits inside the
 * existing image layer, which is already `pointer-events-none`, so it cannot
 * intercept a click meant for the content above it.
 */
export function TricolourSweep() {
  return <div className="ck-tricolour-sweep" aria-hidden="true" />;
}

/* ── 2. The unfurl ────────────────────────────────────────────────────────── */

/**
 * Reveals its children once, behind a tricolour band, then never again.
 *
 * <p><b>Once per session, and only after mount.</b> Two reasons, both learned the
 * hard way elsewhere in this codebase: an animation that replays on every client
 * navigation stops being a moment and becomes a tic, and a first-paint animation
 * that runs during hydration can flash. Rendering the plain text on the server
 * and upgrading after mount means a visitor with JavaScript off, or a slow
 * connection, sees the headline immediately rather than an empty space waiting
 * for a band to pass.
 */
export function UnfurlReveal({
  children,
  storageKey = "ck_id_unfurl_seen",
}: {
  children: React.ReactNode;
  storageKey?: string;
}) {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(storageKey) === "1";
    } catch {
      // Private mode or a blocked storage partition. Treat it as "already seen"
      // rather than replaying on every navigation for that visitor.
      seen = true;
    }
    if (seen) return;

    try { sessionStorage.setItem(storageKey, "1"); } catch { /* nothing to do */ }
    setPlay(true);
  }, [storageKey]);

  if (!play) return <>{children}</>;

  return (
    <span className="ck-unfurl">
      <span className="ck-unfurl-band" aria-hidden="true" />
      <span className="ck-unfurl-text">{children}</span>
    </span>
  );
}

/* ── 3. The count ─────────────────────────────────────────────────────────── */

/**
 * Counts from zero to `value` on mount.
 *
 * <p>Skips the animation entirely under reduced motion — a number ticking is
 * motion like any other. Also skips it when the value is small enough that the
 * count would be more distracting than impressive.
 */
function useCountUp(value: number, durationMs = 1100): number {
  const [display, setDisplay] = useState(value);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced || value <= 3) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    setDisplay(0);

    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-out cubic: quick off the mark, settling rather than stopping dead.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [value, durationMs]);

  return display;
}

/**
 * The card that fills the hero's right column during the campaign.
 *
 * <p>That column is empty every other day of the year: it holds the monetary
 * campaign card, and `FEATURES.money` is false, so roughly 40% of the desktop
 * hero renders as nothing. The occasion is a good reason to put something real
 * there — and what belongs there is not decoration but the platform's own count
 * of handovers, which is the closest thing it has to a proof point.
 *
 * <p>Renders nothing when the number is unavailable. A card reading "—" is worse
 * than no card: it advertises a fact the page cannot supply.
 */
export function IndependenceCount({ stats }: { stats: PlatformStats | null }) {
  const handovers = stats?.totalDonations ?? 0;
  const givers = stats?.uniqueDonors ?? 0;
  const shown = useCountUp(handovers);

  const ordinal = independenceDayOrdinal();
  const suffix = ordinalSuffix(ordinal);

  if (!stats || handovers <= 0) return null;

  return (
    <div className="ck-count-rise w-full max-w-[320px] rounded-[2rem] border border-white/50 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-1.5 w-9 overflow-hidden rounded-full"
        >
          <span className="flex-1 bg-[#ff9933]" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-[#138808]" />
        </span>
        <span className="text-[11px] font-black uppercase tracking-wider text-[#b04a15] dark:text-[#f0b97a]">
          {ordinal}
          {suffix} Independence Day
        </span>
      </div>

      <p className="mt-4 font-jakarta text-5xl font-extrabold leading-none tracking-tight text-stone-900 tabular-nums dark:text-white">
        {shown.toLocaleString("en-IN")}
      </p>

      <p className="mt-2 text-sm font-semibold leading-snug text-stone-700 dark:text-stone-200">
        things handed over, neighbour to neighbour.
      </p>

      <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        {givers > 0
          ? `${givers.toLocaleString("en-IN")} people gave something they no longer needed. `
          : ""}
        Freedom is easier to feel on a full stomach and under a warm blanket.
      </p>

      <Link
        href="/requests"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#b04a15] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#8f3c11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b04a15]"
      >
        Add one more
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/* ── 4. Campaign quotes ───────────────────────────────────────────────────── */

/**
 * Replaces the hero's usual quote cycle for the campaign window.
 *
 * <p>The everyday quotes are about giving in the abstract — Wilde, Churchill,
 * Mother Teresa. These name what independence means on a platform that moves
 * blankets and school books, which is the only reason to mark the date on a
 * donation site at all rather than decorating around it.
 *
 * <p>Attribution is the occasion rather than a person, deliberately: putting a
 * freedom-fighter's name against copy written this week would be a small lie.
 * It is the plain date rather than a count of years — 2026 is the 80th
 * Independence Day but only 79 years on, and a line that has to be recalculated
 * every August is a line that will eventually be wrong.
 */
export const INDEPENDENCE_QUOTES = [
  { text: "Freedom from going cold at night.", author: "15 August" },
  { text: "Freedom from choosing between a meal and a schoolbook.", author: "15 August" },
  { text: "Freedom from asking twice for the same help.", author: "15 August" },
  { text: "Independence is a full cupboard and a warm room.", author: "15 August" },
  { text: "One nation, one neighbour at a time.", author: "15 August" },
] as const;
