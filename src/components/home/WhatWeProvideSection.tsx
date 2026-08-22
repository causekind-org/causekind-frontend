"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "framer-motion";
import { Package, User, Home } from "lucide-react";

const STEP_COUNT = 2;

/** Where the parcel sits on the belt, as a percentage of the panel width. */
const BELT_START = 13;
const BELT_END = 87;

/**
 * "How it works", built in the Conveyor direction: the item itself travels.
 *
 * <p>A sticky panel with a belt running across it. As you scroll, the parcel
 * moves from the donor end to the donee end and the copy changes around it —
 * the scroll is not paging through slides, it is carrying the thing being
 * given. That is the whole idea of the direction, so the parcel's position is
 * the one value everything else is timed against.
 *
 * <p><b>Everything animates from `progress` through plain inline styles.</b>
 * That is deliberate and worth keeping: an earlier attempt at this section
 * drove the visuals from CSS custom properties and moved the panel's layout
 * into an unlayered rule in `styles.css`, and shipped a white screen whose
 * cause was never found. This pattern is the one that demonstrably works here.
 */
export function WhatWeProvideSection() {
  const t = useTranslations("landing");
  // The section is built almost entirely of motion. Under reduced motion the
  // travel collapses to its settled position: the parcel rests at the end of
  // the belt, nothing slides, and the steps still change with scroll — so the
  // information survives and only the movement goes.
  const reduceMotion = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      step: "01",
      title: t("provide.moneyOrItems"),
      desc: t("provide.moneyOrItemsDesc"),
    },
    {
      step: "02",
      title: t("provide.localDropoffs"),
      desc: t("provide.localDropoffsDesc"),
    },
  ];

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Coalesced to one update per frame. Calling setProgress straight from the
    // scroll listener reconciled the whole subtree several times per frame.
    let ticking = false;

    function apply() {
      ticking = false;
      const rect = el!.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      setProgress(Math.max(0, Math.min(1, -rect.top / scrollable)));
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const activeStep = Math.min(Math.floor(progress * STEP_COUNT), STEP_COUNT - 1);
  const step = steps[activeStep];

  // The parcel's journey. Under reduced motion it rests at the far end rather
  // than jumping about as the step changes.
  const travel = reduceMotion ? 1 : progress;
  const parcelLeft = BELT_START + (BELT_END - BELT_START) * travel;
  // The donee end lights up as the parcel approaches, so arrival is felt
  // rather than announced.
  const arrival = Math.max(0, Math.min(1, (travel - 0.55) / 0.4));

  return (
    <section ref={sectionRef} id="how" className="relative" style={{ height: "180vh" }}>
      {/* The panel's offset comes from --ck-nav-h, the header's MEASURED height
          (published by SiteHeader via ResizeObserver), not a constant. The old
          4.5rem assumed a 72px bar against a desktop header that measures
          ~118px, so roughly 46px of this panel sat behind it.

          Inline rather than a class in styles.css on purpose: the value stays
          on the element, with no cascade-layer interaction between Tailwind's
          utilities and an unlayered rule. The fallback is the old 4.5rem, so
          before hydration this behaves exactly as it did. */}
      <div
        className="sticky overflow-hidden bg-[#12100e] border-b border-stone-800/60 flex flex-col"
        style={{
          top: "var(--ck-nav-h, 4.5rem)",
          height: "calc(100vh - var(--ck-nav-h, 4.5rem))",
        }}
      >

        {/* Warm floor light, following the parcel down the belt. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 46% 40% at ${parcelLeft}% 62%, rgba(176,74,21,0.20) 0%, transparent 64%)`,
          }}
        />

        {/* ── Background, three planes deep, all driven by the same scroll ──
             The section is a conveyor, so the background is the room it runs
             in: a floor grid, other crates further back, and a belt texture
             that makes the line read as actually running rather than drawn.

             Each plane moves at its own rate — that difference is the depth.
             Transform-only, so it composites; opacity stays low enough that the
             copy never competes with it. All of it sits below the `z-10`
             content and is hidden from assistive tech. ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>

          {/* Floor grid — the furthest plane, barely moving. */}
          <div
            className="absolute inset-y-0 -left-[20%] -right-[20%]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 88px)",
              transform: reduceMotion ? "none" : `translate3d(${-progress * 120}px, 0, 0)`,
              willChange: "transform",
            }}
          />

          {/* Other crates, further back and out of focus — the sense that this
              is one handover among many, not a diagram of a single parcel. */}
          {[
            { top: "16%", size: 120, rate: 300, tilt: -8, alpha: 0.05 },
            { top: "72%", size: 172, rate: 520, tilt: 6, alpha: 0.04 },
            { top: "34%", size: 84, rate: 680, tilt: 14, alpha: 0.055 },
            { top: "84%", size: 108, rate: 420, tilt: -12, alpha: 0.035 },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                top: c.top,
                // Spread across the width, then carried leftward by scroll at
                // their own rate — nearer crates move faster.
                left: `${12 + i * 26}%`,
                width: c.size,
                height: c.size,
                border: `2px solid rgba(255,255,255,${c.alpha})`,
                borderRadius: 18,
                transform: reduceMotion
                  ? `rotate(${c.tilt}deg)`
                  : `translate3d(${-progress * c.rate}px, 0, 0) rotate(${c.tilt}deg)`,
                willChange: "transform",
              }}
            />
          ))}

        </div>

        {/* ── HEADER ── */}
        <div className="relative z-10 flex-shrink-0 flex items-end justify-between gap-6 px-6 lg:px-12 pt-7 pb-5 border-b border-white/10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#e07b3a]">
            How it works
          </p>
          <p className="text-xs text-white/40 tabular-nums">
            Step {step.step} of 0{STEP_COUNT}
          </p>
        </div>

        {/* ── STAGE ── */}
        <div className="relative z-10 flex-1">

          {/* Copy rides above the belt and swaps with the step. */}
          <div className="absolute left-6 right-6 lg:left-12 lg:right-12 top-[6%] max-w-[560px]">
            {steps.map((s, i) => (
              <div
                key={s.step}
                className="absolute inset-x-0 top-0"
                style={{
                  opacity: i === activeStep ? 1 : 0,
                  transform: i === activeStep || reduceMotion ? "none" : "translateY(14px)",
                  transition: reduceMotion
                    ? "opacity 0.2s linear"
                    : "opacity 0.45s ease, transform 0.45s ease",
                  pointerEvents: i === activeStep ? "auto" : "none",
                }}
              >
                <h3
                  className="font-extrabold text-white leading-[1.02] tracking-[-0.035em] mb-3"
                  style={{ fontSize: "clamp(2rem, 1.2rem + 3.4vw, 3.4rem)" }}
                >
                  {s.title}
                </h3>
                <p className="text-sm lg:text-[17px] leading-relaxed text-white/55 max-w-[460px]">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          {/* ── The belt ── */}
          <div className="absolute inset-x-0" style={{ top: "62%" }}>
            {/* Belt texture: dashes sliding along the line, so it reads as a
                belt that is running rather than a rule that was drawn. Lives
                here, inside the stage, because the belt's 62% is a percentage
                of the STAGE — putting this in the panel's background layer
                would sit it at 62% of the panel and miss the line entirely. */}
            <div
              className="absolute inset-x-0 h-[3px] pointer-events-none overflow-hidden"
              style={{ top: -1 }}
              aria-hidden
            >
              <div
                className="absolute inset-y-0 -left-[10%] -right-[10%]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(176,74,21,0.5) 0 18px, transparent 18px 46px)",
                  transform: reduceMotion ? "none" : `translate3d(${-progress * 240}px, 0, 0)`,
                  willChange: "transform",
                }}
              />
            </div>
            <div className="relative h-px bg-white/10">
              {/* The travelled part, drawn behind the parcel. */}
              <div
                className="absolute left-0 top-0 h-px"
                style={{
                  width: `${parcelLeft}%`,
                  background: "linear-gradient(90deg, rgba(176,74,21,0.15), #b04a15)",
                }}
              />
            </div>
            <div
              className="h-16 pointer-events-none"
              style={{ background: "linear-gradient(180deg, rgba(176,74,21,0.10), transparent)" }}
            />
          </div>

          {/* Donor end */}
          <div
            className="absolute flex flex-col items-center gap-2.5"
            style={{ left: `${BELT_START}%`, top: "62%", transform: "translate(-50%, -50%)" }}
          >
            <span className="w-12 h-12 lg:w-14 lg:h-14 rounded-full border-2 border-white/25 bg-[#12100e] flex items-center justify-center">
              <User className="w-5 h-5 lg:w-6 lg:h-6 text-white/55" strokeWidth={1.7} />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/35">
              Donor
            </span>
          </div>

          {/* Donee end — resolves from dashed outline to solid as the parcel nears */}
          <div
            className="absolute flex flex-col items-center gap-2.5"
            style={{ left: `${BELT_END}%`, top: "62%", transform: "translate(-50%, -50%)" }}
          >
            <span
              className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-[#12100e] flex items-center justify-center"
              style={{
                border: `2px ${arrival > 0.9 ? "solid" : "dashed"} rgba(255,255,255,${0.18 + arrival * 0.5})`,
              }}
            >
              <Home
                className="w-5 h-5 lg:w-6 lg:h-6"
                strokeWidth={1.7}
                style={{ color: `rgba(255,255,255,${0.3 + arrival * 0.6})` }}
              />
            </span>
            <span
              className="text-[11px] font-extrabold uppercase tracking-[0.18em]"
              style={{ color: `rgba(255,255,255,${0.35 + arrival * 0.5})` }}
            >
              Donee
            </span>
          </div>

          {/* The parcel — the thing actually being given, mid-journey */}
          <div
            className="absolute"
            style={{
              left: `${parcelLeft}%`,
              top: "62%",
              transform: "translate(-50%, -50%)",
              willChange: "left",
            }}
          >
            <span
              className="flex w-[68px] h-[68px] lg:w-[76px] lg:h-[76px] rounded-[18px] items-center justify-center"
              style={{
                background: "#b04a15",
                boxShadow: "0 18px 44px rgba(176,74,21,0.55)",
              }}
            >
              <Package className="w-8 h-8 lg:w-9 lg:h-9 text-white" strokeWidth={1.7} />
            </span>
          </div>

        </div>

        {/* ── BOTTOM ── */}
        <div className="relative z-10 flex-shrink-0 flex items-center gap-4 px-6 lg:px-12 pb-7">
          <div className="flex-1 h-[2px] bg-white/10">
            <div
              className="h-full origin-left bg-[#b04a15]"
              style={{ transform: `scaleX(${progress})`, willChange: "transform" }}
            />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/30 whitespace-nowrap">
            {progress > 0.92 ? "That’s how it works" : "Keep scrolling"}
          </span>
        </div>

      </div>
    </section>
  );
}
