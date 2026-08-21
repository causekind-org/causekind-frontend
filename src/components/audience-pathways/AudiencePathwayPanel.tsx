"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";
import PathwayScene, { type PathwayTone } from "./PathwayScene";

export type PathwayPanelProps = {
  tone: PathwayTone;
  eyebrow: string;
  heading: string;
  body: string;
  cta: string;
  href: string;
  /** Guest-tour anchor for the CTA, when the caller opts in. Undefined emits nothing. */
  dataTour?: string;
  Icon: LucideIcon;
  orbitIcons: LucideIcon[];
  /** True when this panel is hovered/focused, or when neither is (balanced state). */
  active: boolean;
  /** True when another panel is active — this one recedes. */
  dimmed: boolean;
  /** True when this panel is the one lit through the section scrim. */
  spotlit: boolean;
  inView: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
};

/**
 * One side of the two-audience section.
 *
 * The emphasis model is the whole point, so it is worth stating: hover and
 * keyboard focus drive the *same* `active` state, decided by the parent. There
 * is no CSS `:hover` rule doing extra work that a keyboard user would miss.
 *
 * The dimmed panel is softened, never disabled — `blur(1.5px)` and 0.72 opacity
 * keep it comfortably readable, and nothing about it is `pointer-events: none`.
 * Tabbing into a dimmed panel's CTA promotes it, so a keyboard user can never
 * be stuck reading through a blur.
 */
export default function AudiencePathwayPanel({
  tone, eyebrow, heading, body, cta, href, dataTour, Icon, orbitIcons,
  active, dimmed, spotlit, inView, onActivate, onDeactivate,
}: PathwayPanelProps) {
  const reduceMotion = useReducedMotion();
  const isDonor = tone === "donor";

  const accent = isDonor ? "text-[#b04a15]" : "text-teal-700 dark:text-teal-400";
  const ctaBg = isDonor
    ? "bg-[#b04a15] hover:bg-[#963e11]"
    : "bg-teal-700 hover:bg-teal-800";
  const ringFocus = isDonor ? "focus-visible:ring-[#b04a15]" : "focus-visible:ring-teal-600";

  // Where a touch went down, so a scroll can be told apart from a tap.
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <motion.div
      className="relative flex-1 overflow-hidden rounded-3xl border border-stone-200/80 bg-white/70 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]"
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
      // Focus anywhere inside (the CTA) promotes the panel; focus leaving it
      // releases. `onFocus`/`onBlur` bubble in React, which is exactly what is
      // wanted here — the parent element hears its child's focus.
      onFocus={onActivate}
      onBlur={onDeactivate}
      // Touch activation. Without this the panel had no interactive state at
      // all on a phone: hover does not exist, and the section scrim is gated to
      // fine pointers, so tapping a card did nothing.
      //
      // Guarded on movement rather than using onClick. A tap that begins on the
      // card and ends 40px away is a scroll, and treating it as a tap makes the
      // section feel like it is grabbing at the page. The threshold is compared
      // against where the pointer went down, so a genuine tap (a few pixels of
      // finger roll) still registers.
      //
      // Nothing here calls preventDefault or stopPropagation, so the CTA link
      // keeps working normally — the panel lights up and the link still
      // navigates.
      onPointerDown={e => {
        if (e.pointerType === "mouse") return;
        touchStart.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={e => {
        if (e.pointerType === "mouse") return;
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        if (moved > 12) return; // a scroll, not a tap
        active ? onDeactivate() : onActivate();
      }}
      onPointerCancel={() => { touchStart.current = null; }}
      // On a fine pointer the section scrim does the dimming for everything at
      // once, so a second per-panel blur here would just double-darken the
      // inactive side. The local fallback stays for coarse pointers and for
      // when the scrim is off — the inactive panel still recedes, never becomes
      // unreadable, and is never pointer-events-none.
      animate={{
        opacity: spotlit || !dimmed ? 1 : 0.72,
        // Reduced motion keeps the emphasis hierarchy but drops scale and blur,
        // which are the parts that read as movement.
        scale: reduceMotion ? 1 : active ? 1.015 : 1,
        filter: reduceMotion || spotlit ? "blur(0px)" : dimmed ? "blur(1.5px)" : "blur(0px)",
      }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        willChange: "transform, opacity, filter",
        // Above the scrim (z-20) while lit, back into the flow otherwise.
        // A number, not a Tailwind class, so it can animate off cleanly.
        zIndex: spotlit ? 30 : 10,
      }}
    >
      <PathwayScene tone={tone} Icon={Icon} orbitIcons={orbitIcons} active={active} inView={inView} />

      {/* Content sits above the decorative layer. min-h keeps both panels the
          same height regardless of copy length, so the grid does not reflow as
          text is translated — but it is now a floor, not a reservation: the
          motif moved to the top-end corner, so the copy no longer has to be
          pushed below a full-panel graphic. */}
      <div className="relative z-10 flex min-h-[11.5rem] flex-col p-4 sm:min-h-[13rem] sm:p-6">
        <div className="mt-auto">
          {/*
            The eyebrow and heading are held clear of the motif on small screens.
            Even scaled to 62% the orbit reaches into the top-right of the card,
            and these are the two lines that sit at that height — the body copy
            below is already clear of it.

            A right margin rather than a narrower container: the body and CTA
            should still use the full width, so constraining the whole column
            would waste space on the lines that do not need it.
          */}
          <p className={`me-16 text-[0.6875rem] font-bold uppercase tracking-[0.14em] sm:me-0 ${accent}`}>
            {eyebrow}
          </p>
          <h3 className="me-16 mt-1.5 text-[clamp(1.15rem,1rem+0.65vw,1.5rem)] font-bold leading-snug text-stone-900 sm:me-0 dark:text-stone-50">
            {heading}
          </h3>
          <p className="mt-1.5 max-w-md text-[clamp(0.8125rem,0.79rem+0.12vw,0.9rem)] leading-relaxed text-stone-600 dark:text-stone-300">
            {body}
          </p>

          {/* min-h-11 stays: 44px is the touch-target floor and is not something
              a density pass gets to trade away. */}
          <Link
            href={href}
            data-tour={dataTour}
            className={`mt-3.5 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ctaBg} ${ringFocus}`}
          >
            {cta}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
