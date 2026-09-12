"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  PackageOpen, Truck, Sparkles, Home, Users
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import AudiencePathwayPanelGanpati from "./AudiencePathwayPanelGanpati";
import { ModakIcon, DiyaIcon, GhantiIcon, LotusIcon, RangoliBorderStrip, FloatingFestiveBadge } from "./GanpatiVisuals";

/**
 * AudiencePathwaysSectionGanpati — Festive Ganeshotsav edition of "Two Sides, One Platform".
 *
 * Dedicated sibling to AudiencePathwaysSection.tsx for the Ganpati festival theme.
 * Keeps existing hover interactions and structure while updating:
 * 1. Headline: "This Ganeshotsav, Whichever Side You're On — CauseKind Connects You"
 * 2. Warm saffron-terracotta (donor) and deep maroon-temple-gold-green (donee) palettes
 * 3. Slim rangoli/toran-inspired top border on the rounded card
 * 4. Reskinned icon clusters with Modak, Lotus, Bell, and Diya motifs
 * 5. Trunk-swirl S-curve shape dividing the two halves
 * 6. Harmonious warm festive bottom line
 */
export default function AudiencePathwaysSectionGanpati({
  tourAnchors = false,
}: { tourAnchors?: boolean } = {}) {
  const t = useTranslations("audiencePathways");
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.15 });
  const reduceMotion = useReducedMotion();

  // null = balanced (50/50). Hovering moves the seam away from the active side.
  const [focused, setFocused] = useState<"donor" | "donee" | null>(null);

  const [spotlightEnabled, setSpotlightEnabled] = useState(false);
  const [split, setSplit] = useState(false);

  useEffect(() => {
    const watch = (query: string, set: (v: boolean) => void) => {
      const mq = window.matchMedia(query);
      set(mq.matches);
      const onChange = (e: MediaQueryListEvent) => set(e.matches);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    };
    const offPointer = watch("(pointer: fine)", setSpotlightEnabled);
    const offSplit = watch("(min-width: 768px)", setSplit);
    return () => {
      offPointer();
      offSplit();
    };
  }, []);

  const panels = [
    {
      tone: "donor" as const,
      eyebrow: t("donor.eyebrow"),
      heading: t("donor.heading"),
      body: t("donor.body"),
      cta: t("donor.cta"),
      href: "/register?role=DONOR",
      dataTour: tourAnchors ? "guest-join" : undefined,
      Icon: ModakIcon,
      orbitIcons: [PackageOpen, DiyaIcon, Truck, Sparkles],
    },
    {
      tone: "donee" as const,
      eyebrow: t("donee.eyebrow"),
      heading: t("donee.heading"),
      body: t("donee.body"),
      cta: t("donee.cta"),
      href: "/register?role=DONEE",
      Icon: LotusIcon,
      orbitIcons: [Home, Users, GhantiIcon, Sparkles],
    },
  ];

  /*
    Trunk-Swirl S-Curve Seam Geometry:
    Seam centre percentage across the slab width:
    At rest: 50%
    Donor focused: 58%
    Donee focused: 42%
    LEAN: 7%
  */
  const LEAN = 7;
  const seam = reduceMotion || !focused ? 50 : focused === "donor" ? 58 : 42;
  const top = seam + LEAN;
  const bottom = seam - LEAN;

  // S-curve points mimicking Ganpati's trunk sweep from (top, 0%) to (bottom, 100%)
  const p0 = `${top}% 0%`;
  const p1 = `${top - 1.8}% 16%`;
  const p2 = `${top - 4.8}% 34%`;
  const p3 = `${seam}% 50%`;
  const p4 = `${bottom + 4.8}% 66%`;
  const p5 = `${bottom + 1.8}% 84%`;
  const p6 = `${bottom}% 100%`;

  const clip = {
    donor: `polygon(0% 0%, ${p0}, ${p1}, ${p2}, ${p3}, ${p4}, ${p5}, ${p6}, 0% 100%)`,
    donee: `polygon(${p0}, 100% 0%, 100% 100%, ${p6}, ${p5}, ${p4}, ${p3}, ${p2}, ${p1})`,
  };

  const trunkPath = `M ${top} 0 L ${top - 1.8} 16 L ${top - 4.8} 34 L ${seam} 50 L ${bottom + 4.8} 66 L ${bottom + 1.8} 84 L ${bottom} 100`;

  // FIX: derived visibility flags — clearer than repeating the ternaries inline
  const mouseVisible = focused === null || focused === "donor";
  const ganpatiVisible = focused === null || focused === "donee";

  return (
    <section
      ref={ref}
      aria-labelledby="audience-pathways-heading"
      // FIX: clip horizontal overflow at the section level so the mascot spilling
      // past the card can never create a page-wide horizontal scrollbar.
      className="relative w-full overflow-x-clip bg-[var(--surface-cream,#faf8f5)] py-9 sm:py-12 dark:bg-zinc-950"
    >
      {/* Spotlight scrim */}
      {spotlightEnabled && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 bg-black/60 backdrop-blur-[3px]"
          initial={false}
          animate={{ opacity: focused ? 0.72 : 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header Block */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="flex items-center justify-center mb-2.5">
            <FloatingFestiveBadge
              icon={<Sparkles className="size-3.5 text-amber-500" />}
              text="Shubh Labh ✨"
              delay={0.5}
            />
          </div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-[#ea580c] dark:text-[#f59e0b]">
            {t("eyebrow")}
          </p>
          <h2
            id="audience-pathways-heading"
            className="mt-1.5 text-[clamp(1.3rem,1.1rem+1vw,1.85rem)] font-bold leading-tight text-stone-900 dark:text-stone-50"
          >
            This Ganeshotsav, Whichever Side You&apos;re On — CauseKind Connects You
          </h2>
          <p className="mt-2 text-[clamp(0.85rem,0.83rem+0.12vw,0.95rem)] leading-relaxed text-stone-600 dark:text-stone-300">
            {t("subheading")}
          </p>
        </motion.div>

        {/* Card Wrapper with Peeking Mascots */}
        <div className="relative mt-5">
          {/* Mouse Peeking Mascot (Top-Left, Donor Side) */}
          <motion.div
            aria-hidden="true"
            initial={false}
            animate={
              reduceMotion
                ? { opacity: mouseVisible ? 1 : 0 }
                : {
                  opacity: mouseVisible ? 1 : 0,
                  scale: mouseVisible ? 1 : 0.88,
                  y: mouseVisible ? 0 : 8,
                }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
            }
            // FIX: z-30 → z-40. The active panel inside the slab sets zIndex: 30 when
            // spotlit, which tied with the mascot; because the slab comes later in the
            // DOM the panel won and painted over the mascot. z-40 clears it for good.
            className={`pointer-events-none absolute left-6 sm:left-10 top-0 z-40 hidden md:block w-[90px] lg:w-[120px] -translate-y-[85%] ${mouseVisible ? "visible" : "invisible"
              }`}
            style={{
              transition: reduceMotion
                ? undefined
                : `visibility 0s linear ${mouseVisible ? "0s" : "250ms"}`,
            }}
          >
            <motion.div
              animate={
                reduceMotion || !mouseVisible ? undefined : { y: [0, -3, 0] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <Image
                src="/images/mouse-peek.webp"
                alt=""
                width={120}
                height={120}
                className="w-full h-auto select-none"
                priority
              />
            </motion.div>
          </motion.div>

          {/* Ganpati Peeking Mascot (Right Edge, Donee Side) */}
          <motion.div
            aria-hidden="true"
            initial={false}
            animate={
              reduceMotion
                ? { opacity: ganpatiVisible ? 1 : 0 }
                : {
                  opacity: ganpatiVisible ? 1 : 0,
                  scale: ganpatiVisible ? 1 : 0.88,
                  x: ganpatiVisible ? 0 : -8,
                }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
            }
            // FIX: z-30 → z-40 (same layering bug as the mouse), and
            // translate-x-[60%] → translate-x-[65%] so more of the figure — including
            // the flat left edge baked into the source art — sits clear of the card.
            className={`pointer-events-none absolute right-0 top-1/2 z-40 hidden md:block w-[100px] lg:w-[140px] xl:w-[150px] translate-x-[65%] -translate-y-1/2 ${ganpatiVisible ? "visible" : "invisible"
              }`}
            style={{
              transition: reduceMotion
                ? undefined
                : `visibility 0s linear ${ganpatiVisible ? "0s" : "250ms"}`,
            }}
          >
            <motion.div
              animate={
                reduceMotion || !ganpatiVisible ? undefined : { y: [0, 3, 0] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <Image
                src="/images/ganpati-peek.webp"
                alt=""
                width={150}
                height={200}
                className="w-full h-auto select-none"
                priority
              />
            </motion.div>
          </motion.div>

          {/* The Split Slab */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-900/20 shadow-md md:min-h-[19rem] md:rtl:-scale-x-100 dark:border-amber-500/20">
            {panels.map((p) => {
              const isActive = focused === p.tone;
              const spotlit = spotlightEnabled && isActive;

              return (
                <div
                  key={p.tone}
                  className={`relative overflow-hidden bg-white/80 md:absolute md:inset-0 md:rtl:-scale-x-100 dark:bg-stone-900/60 ${p.tone === "donee"
                    ? "border-t border-amber-900/20 md:border-t-0 dark:border-amber-500/20"
                    : ""
                    }`}
                  style={{
                    clipPath: split ? clip[p.tone] : undefined,
                    // FIX: 30 → 25. Keeps the spotlit panel above its sibling panel and
                    // above the seam SVG (z-16), but safely below the z-40 mascots.
                    zIndex: spotlit ? 25 : 10,
                    transition: reduceMotion
                      ? undefined
                      : "clip-path 450ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={() => setFocused(p.tone)}
                  onMouseLeave={() => setFocused(null)}
                  onFocus={() => setFocused(p.tone)}
                  onBlur={() => setFocused(null)}
                >
                  {/* Top Toran-Style Decorative Strip Border (Clipped to this panel) */}
                  <div
                    className="absolute inset-x-0 top-0 z-20 transition-opacity duration-300"
                    style={{ opacity: focused === null || isActive ? 1 : 0 }}
                    aria-hidden="true"
                  >
                    <RangoliBorderStrip />
                  </div>

                  <AudiencePathwayPanelGanpati
                    {...p}
                    active={isActive}
                    dimmed={focused !== null && !isActive}
                    spotlit={spotlit}
                    inView={inView}
                    split={split}
                  />
                </div>
              );
            })}

            {/* S-Curve Ganpati Trunk Dividing Seam (Desktop split mode only) */}
            {split && (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[16] h-full w-full"
              >
                <defs>
                  <linearGradient id="trunkSeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ea580c" stopOpacity="0.9" />
                    <stop offset="35%" stopColor="#f59e0b" stopOpacity="0.95" />
                    <stop offset="70%" stopColor="#ca8a04" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#701a2d" stopOpacity="0.85" />
                  </linearGradient>
                </defs>

                {/* Soft ambient glow along the trunk seam */}
                <path
                  d={trunkPath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="4"
                  opacity="0.25"
                  vectorEffect="non-scaling-stroke"
                  style={{
                    transition: reduceMotion
                      ? undefined
                      : "d 450ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />

                {/* Primary Trunk-Swirl S-Curve Line */}
                <path
                  d={trunkPath}
                  fill="none"
                  stroke="url(#trunkSeamGrad)"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  style={{
                    transition: reduceMotion
                      ? undefined
                      : "d 450ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </svg>
            )}
          </div>
        </div>

        {/* Bottom Line Footnote */}
        <p className="mt-3.5 text-center text-xs text-stone-600/90 dark:text-stone-400">
          {t("footnote")}
        </p>
      </div>
    </section>
  );
}