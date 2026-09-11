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
 * Saffron/terracotta palette on donor side; deep maroon to temple-gold-green on donee side.
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

  // Donor: warm saffron-to-terracotta
  // Donee: deep maroon-to-temple-gold-green
  const accent = isDonor
    ? "text-[#ea580c] dark:text-[#fb923c]"
    : "text-[#831843] dark:text-[#f472b6]";

  const ctaBg = isDonor
    ? "bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#ea580c] hover:from-[#c2410c] hover:to-[#b45309] text-white shadow-md shadow-orange-700/25"
    : "bg-gradient-to-r from-[#701a2d] via-[#831843] to-[#14532d] hover:from-[#500724] hover:to-[#0f3d1e] text-white shadow-md shadow-pink-950/25";

  const ringFocus = isDonor
    ? "focus-visible:ring-[#ea580c]"
    : "focus-visible:ring-[#701a2d]";

  // Side ambient wash
  const wash = isDonor
    ? "linear-gradient(150deg, rgba(234, 88, 12, 0.15) 0%, rgba(217, 119, 6, 0.06) 55%, transparent 100%)"
    : "linear-gradient(210deg, rgba(112, 26, 45, 0.16) 0%, rgba(20, 83, 45, 0.11) 48%, rgba(133, 77, 14, 0.06) 82%, transparent 100%)";

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
