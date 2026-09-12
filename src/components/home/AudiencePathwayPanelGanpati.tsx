"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import PathwaySceneGanpati, { type PathwayTone } from "./PathwaySceneGanpati";

export type PathwayPanelGanpatiProps = {
  tone: PathwayTone;
  eyebrow: string;
  heading: string;
  body: string;
  cta: string;
  href: string;
  dataTour?: string;
  Icon: React.ComponentType<{ className?: string }>;
  orbitIcons: React.ComponentType<{ className?: string }>[];
  active: boolean;
  dimmed: boolean;
  spotlit: boolean;
  inView: boolean;
  split: boolean;
};

/**
 * AudiencePathwayPanelGanpati — Reskinned split panel half for the Ganpati festival theme.
 *
 * Saffron/terracotta on the donor side; temple maroon into gold on the donee side.
 * Keeps exact hover interaction, copy structure, and navigation intact.
 */
export default function AudiencePathwayPanelGanpati({
  tone,
  eyebrow,
  heading,
  body,
  cta,
  href,
  dataTour,
  Icon,
  orbitIcons,
  active,
  dimmed,
  spotlit,
  inView,
  split,
}: PathwayPanelGanpatiProps) {
  const reduceMotion = useReducedMotion();
  const isDonor = tone === "donor";

  /*
    Both halves are warm, and that is the point.

    The donee side used to answer the donor's saffron with magenta and forest
    green: the CTA ran `#701a2d → #831843 → #14532d`, which is 179° of hue in
    one button. Its right half landed on `#4c3638` — 17% saturation, a grey
    mauve — while the donor's ramp travels 23° and never drops below 92%. Next
    to it the donee CTA read as a different product's button, and `#831843`
    appeared nowhere else in the festive skin.

    Green was the other half of the mistake, and a subtler one. There are 134
    green values across this theme and every one of them is *foliage* — mango
    leaves in the torans, the banana-leaf strips, the garland gradients. Green
    is the festival's plant colour, not its interface colour, and the moment it
    became a button it stopped reading as a banana leaf and started reading as
    a success state.

    So the two doors are told apart by value, not hue: the donor is bright
    saffron, the donee is deep temple maroon warming into gold. Both sit inside
    the theme's documented palette, one step below `GANPATI_CONFIG.colors.maroon`
    (#7f1d1d) so the filled control sits under the palette's reference rather
    than level with it — a button carries more area than a swatch does, and at
    the reference value it read hotter than the rest of the section. The donee
    half now also matches its own decorative scene, which was already wine and
    gold while the CTA was magenta and green.

    <p><b>The CTA alone breaks from that maroon, into sindoor.</b> "Join as a
    donee" sits beside "Join as a donor" in this split, and at 21° of hue from
    the donor's saffron the maroon button read as the same button in a darker
    shade rather than as the other choice. Sindoor #9f1239 puts 37° between
    them, which is the widest gap available without leaving the palette. It
    used to have a second claim on that spot — the hero carried a Zero Fees pill
    in the same sindoor, so the colour was already established a screen above.
    That pill is gone, and this is now the first place the skin uses sindoor,
    but the 37° is the reason that mattered and it is unchanged. The section
    keeps its maroon; only the control moves, so the button reads as the action
    inside the half rather than as a second accent competing with it.
  */
  const accent = isDonor
    ? "text-[#ea580c] dark:text-[#fb923c]"
    : "text-[#6b1717] dark:text-[#f87171]";

  const ctaBg = isDonor
    ? "bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#ea580c] hover:from-[#c2410c] hover:to-[#b45309] text-white shadow-md shadow-orange-700/25"
    : "bg-gradient-to-r from-[#9f1239] via-[#881337] to-[#7a1030] hover:from-[#6b1130] hover:to-[#5a0d28] text-white shadow-md shadow-rose-950/30";

  const ringFocus = isDonor
    ? "focus-visible:ring-[#ea580c]"
    : "focus-visible:ring-[#9f1239]";

  // Side ambient wash. The donee's now falls maroon → temple gold → marigold,
  // the same three the ramp above walks, so the panel and the button agree.
  const wash = isDonor
    ? "linear-gradient(150deg, rgba(234, 88, 12, 0.15) 0%, rgba(217, 119, 6, 0.06) 55%, transparent 100%)"
    : "linear-gradient(210deg, rgba(107, 23, 23, 0.18) 0%, rgba(146, 64, 14, 0.10) 48%, rgba(180, 83, 9, 0.05) 82%, transparent 100%)";

  return (
    <>
      {/* Side tint */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: wash }} />

      {/* Decorative holographic scene with orbit animation */}
      <PathwaySceneGanpati
        tone={tone}
        Icon={Icon}
        orbitIcons={orbitIcons}
        active={active}
        inView={inView}
        frame={false}
        motif={
          split
            ? isDonor
              ? { x: "44%", y: "24%" }
              : { x: "56%", y: "72%" }
            : { x: "calc(100% - 3.5rem)", y: "3.5rem" }
        }
      />

      {/* Content column */}
      <motion.div
        className={`relative z-10 flex h-full flex-col justify-center p-6 sm:p-8 ${
          isDonor ? "items-start" : "items-end text-end sm:text-start md:items-end md:text-start"
        }`}
        initial={false}
        animate={{
          opacity: spotlit || !dimmed ? 1 : 0.72,
          filter: reduceMotion || spotlit ? "blur(0px)" : dimmed ? "blur(1.5px)" : "blur(0px)",
        }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: "opacity, filter" }}
      >
        <div className="max-w-sm text-left">
          <p className={`me-16 text-[0.6875rem] font-bold uppercase tracking-[0.14em] md:me-0 ${accent}`}>
            {eyebrow}
          </p>
          <h3 className="me-16 mt-1.5 text-[clamp(1.15rem,1rem+0.65vw,1.5rem)] md:me-0 font-bold leading-snug text-stone-900 dark:text-stone-50">
            {heading}
          </h3>
          <p className="mt-1.5 text-[clamp(0.8125rem,0.79rem+0.12vw,0.9rem)] leading-relaxed text-stone-600 dark:text-stone-300">
            {body}
          </p>

          <Link
            href={href}
            data-tour={dataTour}
            className={`group mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${ctaBg} ${ringFocus}`}
          >
            {cta}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </motion.div>
    </>
  );
}
