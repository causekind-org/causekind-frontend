"use client";

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
  /** True when this side is hovered/focused. */
  active: boolean;
  /** True when the other side is active — this one recedes. */
  dimmed: boolean;
  /** True when this side is the one lit through the section scrim. */
  spotlit: boolean;
  inView: boolean;
  /** True when the two halves sit side by side under the diagonal cut. */
  split: boolean;
};

/**
 * The contents of one side of the split slab.
 *
 * This is deliberately *not* a card any more. The visual separation between the
 * two audiences is carried by the diagonal seam cut in the parent
 * (`AudiencePathwaysSection`), so anything here that drew its own frame — a
 * border, a rounded corner, a bracket — would read as a card floating inside
 * the split and undo it. The component paints a full-bleed tint and lays out
 * copy; the clipping, the seam and every pointer handler live in the parent.
 *
 * The emphasis model is unchanged in spirit: hover and keyboard focus drive the
 * same `active` state decided by the parent, and the inactive side is softened,
 * never disabled. What changed is how emphasis is *expressed* — the seam slides
 * toward the quiet side instead of a card growing by a scale factor.
 */
export default function AudiencePathwayPanel({
  tone, eyebrow, heading, body, cta, href, dataTour, Icon, orbitIcons,
  active, dimmed, spotlit, inView, split,
}: PathwayPanelProps) {
  const reduceMotion = useReducedMotion();
  const isDonor = tone === "donor";

  const accent = isDonor ? "text-[#b04a15]" : "text-teal-700 dark:text-teal-400";
  const ctaBg = isDonor
    ? "bg-[#b04a15] hover:bg-[#963e11]"
    : "bg-teal-700 hover:bg-teal-800";
  const ringFocus = isDonor ? "focus-visible:ring-[#b04a15]" : "focus-visible:ring-teal-600";

  // A tint, not a fill. The copy on both sides is stone-900 on light and
  // stone-50 on dark, and a saturated terracotta or teal ground would put one
  // of those two pairs under the contrast floor. Keeping the ground pale means
  // one set of text colours works on both halves in both themes.
  const wash = isDonor
    ? "linear-gradient(150deg, rgb(176 74 21 / 0.13) 0%, rgb(176 74 21 / 0.04) 55%, transparent 100%)"
    : "linear-gradient(210deg, rgb(13 148 136 / 0.13) 0%, rgb(13 148 136 / 0.04) 55%, transparent 100%)";

  return (
    <>
      {/* Side tint, under the scene. */}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: wash }} />

      {/* `frame={false}`: the holographic corner brackets are suppressed here.
          They anchor to the element's own inset box, which under a diagonal
          clip is largely outside the visible wedge — two of the four would be
          sliced off mid-stroke. The grid, scan line and orbit all still run. */}
      <PathwayScene
        tone={tone}
        Icon={Icon}
        orbitIcons={orbitIcons}
        active={active}
        inView={inView}
        frame={false}
        // Split: the motif sits toward the middle of the slab, on this
        // side's own half of the seam. Anchored to a corner it would land
        // in the other side's wedge and be clipped away entirely, because
        // each half is laid out at the full width of the slab.
        //
        // Stacked: back to the trailing corner of the row, where it reads
        // as chrome instead of sitting on top of the copy.
        motif={
          split
            ? isDonor
              ? { x: "44%", y: "24%" }
              : { x: "56%", y: "72%" }
            : { x: "calc(100% - 3.5rem)", y: "3.5rem" }
        }
      />

      {/* The copy column is held to `max-w-sm` and pushed to its own outer edge,
          so neither side's text runs into the seam at the height where the seam
          has leaned furthest across. */}
      <motion.div
        className={`relative z-10 flex h-full flex-col justify-center p-6 sm:p-8 ${isDonor ? "items-start" : "items-end"}`}
        initial={false}
        animate={{
          opacity: spotlit || !dimmed ? 1 : 0.72,
          filter: reduceMotion || spotlit ? "blur(0px)" : dimmed ? "blur(1.5px)" : "blur(0px)",
        }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: "opacity, filter" }}
      >
        <div className="max-w-sm">
          <p className={`me-16 text-[0.6875rem] font-bold uppercase tracking-[0.14em] md:me-0 ${accent}`}>
            {eyebrow}
          </p>
          <h3 className="me-16 mt-1.5 text-[clamp(1.15rem,1rem+0.65vw,1.5rem)] md:me-0 font-bold leading-snug text-stone-900 dark:text-stone-50">
            {heading}
          </h3>
          <p className="mt-1.5 text-[clamp(0.8125rem,0.79rem+0.12vw,0.9rem)] leading-relaxed text-stone-600 dark:text-stone-300">
            {body}
          </p>

          {/* min-h-11 stays: 44px is the touch-target floor and is not something
              a density pass gets to trade away. */}
          <Link
            href={href}
            data-tour={dataTour}
            className={`group mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ctaBg} ${ringFocus}`}
          >
            {cta}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </motion.div>
    </>
  );
}
