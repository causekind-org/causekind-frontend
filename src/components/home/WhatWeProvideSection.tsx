"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "framer-motion";
import { Heart, Package, ChevronDown } from "lucide-react";

const STEP_COUNT = 2;

const ROW1 = ["SHARE", "·", "ITEMS", "·", "DONATE", "·", "GIVE", "·", "SHARE", "·", "ITEMS", "·", "DONATE", "·"];
const ROW2 = ["LOCAL", "·", "VERIFIED", "·", "DIRECT", "·", "IMPACT", "·", "LOCAL", "·", "VERIFIED", "·"];

/**
 * Scroll-driven "How it works" panel.
 *
 * <p><b>Why the continuous progress lives in a CSS variable, not React state.</b>
 * This used to call `setProgress` straight out of a `scroll` listener, so every
 * scroll event reconciled the whole subtree — two marquee rows of ~14 spans,
 * the tabs, and both step blocks with their computed inline styles. That is a
 * lot of work per frame, and the resulting judder was doing more damage to the
 * feel of the section than any missing effect.
 *
 * <p>Now the rAF callback writes `--sp` (0→1 across the section) and `--sp1`/
 * `--sp2` (per-step 0→1) onto the panel node, and everything continuous —
 * parallax, glow travel, numerals, reveals, the progress bar — is CSS reading
 * those. React state changes only when the ACTIVE STEP changes, which is twice
 * per full scroll rather than once per frame.
 */
export function WhatWeProvideSection() {
  const t = useTranslations("landing");
  const reduceMotion = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: "01",
      icon: Heart,
      title: t("provide.moneyOrItems"),
      desc: t("provide.moneyOrItemsDesc"),
      accent: "#b04a15",
    },
    {
      step: "02",
      icon: Package,
      title: t("provide.localDropoffs"),
      desc: t("provide.localDropoffsDesc"),
      accent: "#1e3a60",
    },
  ];

  useEffect(() => {
    const el = sectionRef.current;
    const panel = panelRef.current;
    if (!el || !panel) return;

    let ticking = false;
    let lastStep = -1;

    function apply() {
      ticking = false;
      const rect = el!.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      const p = Math.max(0, Math.min(1, -rect.top / scrollable));

      // Continuous values go to CSS. No React work on this path at all.
      panel!.style.setProperty("--sp", String(p));
      for (let i = 0; i < STEP_COUNT; i++) {
        panel!.style.setProperty(`--sp${i + 1}`, String(Math.min(1, Math.max(0, p * STEP_COUNT - i))));
      }

      // React only hears about a STEP CHANGE — twice per scroll, not per frame.
      const next = Math.min(Math.floor(p * STEP_COUNT), STEP_COUNT - 1);
      if (next !== lastStep) {
        lastStep = next;
        setActiveStep(next);
      }
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

  const step = steps[activeStep];

  return (
    <section ref={sectionRef} id="how" className="relative" style={{ height: "180vh" }}>
      <div
        ref={panelRef}
        className="ck-scrolly-panel overflow-hidden bg-[#120c04] border-b border-stone-800/60 flex flex-col"
        style={{ ["--sp" as string]: 0, ["--sp1" as string]: 0, ["--sp2" as string]: 0 }}
      >

        {/* ── Accent glow. Travels with scroll now rather than only cross-fading
             on step change: the horizontal origin is driven by --sp, so the light
             moves across the frame as you scroll. ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 55% 50% at calc(18% + var(--sp) * 24%) 60%, ${step.accent}22 0%, transparent 62%)`,
            transition: "background-color 0.85s ease",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 30% 35% at calc(85% - var(--sp) * 18%) 20%, ${step.accent}12 0%, transparent 55%)`,
            transition: "background-color 0.85s ease",
          }}
        />

        {/* ── VFX: scroll-driven background text.
             The two rows travel at genuinely different rates AND scale slightly,
             so the background reads as two planes at different depths instead of
             one sheet sliding sideways. ── */}
        <div
          className="absolute inset-0 pointer-events-none flex flex-col justify-center gap-6 overflow-hidden select-none"
          aria-hidden
        >
          <div
            className="ck-scrolly-parallax flex items-center gap-10 whitespace-nowrap"
            style={{
              transform: "translate3d(calc(var(--sp) * -900px), 0, 0) scale(calc(1 + var(--sp) * 0.06))",
              opacity: 0.07,
              willChange: "transform",
            }}
          >
            {ROW1.map((w, i) => (
              <span key={i} className="font-black text-white leading-none" style={{ fontSize: "clamp(3rem, 2rem + 5vw, 6rem)" }}>
                {w}
              </span>
            ))}
          </div>

          <div
            className="ck-scrolly-parallax flex items-center gap-8 whitespace-nowrap"
            style={{
              transform: "translate3d(calc(var(--sp) * 420px - 180px), 0, 0) scale(calc(1 - var(--sp) * 0.04))",
              opacity: 0.05,
              willChange: "transform",
            }}
          >
            {ROW2.map((w, i) => (
              <span key={i} className="font-black text-white leading-none" style={{ fontSize: "clamp(2rem, 1.3333rem + 3.3333vw, 4rem)" }}>
                {w}
              </span>
            ))}
          </div>
        </div>

        {/* ── Giant numeral passing through the frame. The focal shape the small
             dim number only hinted at; it drifts up and fades as its step
             completes, so scrolling feels like moving past something. ── */}
        <div
          className="ck-scrolly-parallax absolute inset-0 pointer-events-none select-none hidden lg:flex items-center justify-end pr-[6vw] overflow-hidden"
          aria-hidden
        >
          <span
            className="font-black leading-none"
            style={{
              fontSize: "38vh",
              color: "transparent",
              WebkitTextStroke: `1px ${step.accent}30`,
              transform: `translate3d(0, calc(22vh - var(--sp) * 44vh), 0)`,
              opacity: 0.9,
              willChange: "transform",
              transition: "-webkit-text-stroke-color 0.85s ease",
            }}
          >
            {step.step}
          </span>
        </div>

        {/* Depth stack — static paint, no per-frame cost. */}
        <div className="ck-scrolly-vignette absolute inset-0 pointer-events-none" aria-hidden />
        <div className="ck-scrolly-grain absolute inset-0 pointer-events-none" aria-hidden />

        {/* ── HEADER ── */}
        <div className="relative z-10 flex-shrink-0 flex items-end justify-between px-6 lg:px-20 pt-6 pb-4 border-b border-stone-800/30">
          <p className="text-xs text-stone-500 font-medium max-w-xs hidden lg:block">{t("what.subtitle")}</p>
          <div className="lg:text-right">
            <span className="text-3xs font-black uppercase tracking-widest text-[#f0b97a] mb-1 block">How it works</span>
            <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tight text-white leading-[1.05]">{t("what.title")}</h2>
          </div>
        </div>

        {/* ── STEP TABS (scroll-driven fill, straight from the CSS var) ── */}
        <div className="relative z-10 flex-shrink-0 flex px-6 lg:px-20">
          {steps.map((s, i) => (
            <div key={s.step} className="relative flex-1 py-4 pr-8">
              <span
                className="block text-3xs font-black uppercase tracking-widest mb-1"
                style={{ color: i === activeStep ? s.accent : "#57534e", transition: "color 0.35s ease" }}
              >
                Step {s.step}
              </span>
              <span
                className="block text-base lg:text-lg font-extrabold tracking-tight"
                style={{ color: i === activeStep ? "#ffffff" : "#78716c", transition: "color 0.35s ease" }}
              >
                {s.title}
              </span>
              <div className="absolute bottom-0 left-0 right-8 h-[2px] bg-stone-800/70">
                <div
                  className="h-full origin-left"
                  style={{
                    backgroundColor: s.accent,
                    transform: `scaleX(clamp(0, var(--sp${i + 1}), 1))`,
                    willChange: "transform",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT — each element reveals via scroll ── */}
        <div className="relative z-10 flex-1 flex items-center overflow-hidden">
          {steps.map((s, i) => {
            const SIcon = s.icon;
            const isActive = i === activeStep;
            const sp = `var(--sp${i + 1})`;
            // Each ramp is a clamped slice of the step's own progress, so the
            // pieces land in sequence: icon, number, title, desc, hint.
            const ramp = (mul: number, off = 0) => `clamp(0, calc(${sp} * ${mul} - ${off}), 1)`;

            return (
              <div
                key={s.step}
                className="absolute inset-x-6 lg:inset-x-20"
                style={{
                  // A real handoff rather than an instant swap: the outgoing step
                  // slides and fades out while the incoming one arrives.
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? "translate3d(0,0,0)" : "translate3d(0, 28px, 0)",
                  filter: isActive ? "blur(0px)" : "blur(6px)",
                  transition: reduceMotion
                    ? "opacity 0.2s linear"
                    : "opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1), filter 0.55s ease",
                  pointerEvents: isActive ? "auto" : "none",
                }}
              >
                <div className="flex items-center gap-6 lg:gap-10">

                  {/* Left — the dim step number IS the focal shape; the icon rides on
                      top as a small tilted badge instead of its own big colored tile. */}
                  <div className="relative flex items-center flex-shrink-0 lg:w-[clamp(3rem,5vw,5rem)]">
                    <span
                      className="hidden lg:block font-black leading-none select-none"
                      style={{
                        fontSize: "clamp(3rem, 2.3333rem + 3.3333vw, 5rem)",
                        color: `${s.accent}22`,
                        WebkitTextStroke: `1px ${s.accent}45`,
                        opacity: ramp(3),
                        willChange: "opacity",
                      }}
                    >
                      {s.step}
                    </span>
                    <div
                      className="ck-scrolly-parallax relative lg:absolute lg:-right-4 lg:-bottom-3 w-14 h-14 lg:w-11 lg:h-11 rounded-2xl lg:rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: s.accent,
                        boxShadow: `0 12px 28px ${s.accent}50, 0 0 0 3px #120c04`,
                        transform: `scale(calc(0.55 + ${ramp(4)} * 0.45)) rotate(-8deg)`,
                        opacity: ramp(5),
                        willChange: "transform, opacity",
                      }}
                    >
                      <SIcon className="h-7 w-7 lg:h-5 lg:w-5 text-white" strokeWidth={2.25} />
                    </div>
                  </div>

                  {/* Right — title slides up, then desc slides up after */}
                  <div>
                    <h3
                      className="ck-scrolly-parallax text-2xl lg:text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-3"
                      style={{
                        transform: `translate3d(0, calc((1 - ${ramp(3.5)}) * 56px), 0)`,
                        opacity: ramp(3.5),
                        willChange: "transform, opacity",
                      }}
                    >
                      {s.title}
                    </h3>
                    <p
                      className="ck-scrolly-parallax text-sm lg:text-base text-stone-400 leading-relaxed mb-4 max-w-lg"
                      style={{
                        transform: `translate3d(0, calc((1 - ${ramp(4, 0.8)}) * 40px), 0)`,
                        opacity: ramp(4, 0.8),
                        willChange: "transform, opacity",
                      }}
                    >
                      {s.desc}
                    </p>
                    <div
                      className="inline-flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest"
                      style={{ color: s.accent, opacity: `calc(${ramp(5, 1.8)} * 0.65)` }}
                    >
                      {i < STEP_COUNT - 1 ? (
                        <>
                          <ChevronDown className="h-3.5 w-3.5 animate-bounce motion-reduce:animate-none" />
                          <span>Scroll for next step</span>
                        </>
                      ) : (
                        <span>That&apos;s how it works</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── BOTTOM — global progress bar + dots ── */}
        <div className="relative z-10 flex-shrink-0">
          <div className="h-[2px] bg-stone-900">
            <div
              className="h-full origin-left"
              style={{
                // scaleX rather than width: a transform is composited, a width
                // change relayouts the bar on every frame.
                transform: "scaleX(var(--sp))",
                backgroundColor: step.accent,
                transition: "background-color 0.5s ease",
                willChange: "transform",
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-2.5 py-4">
            {steps.map((s, i) => (
              <div
                key={s.step}
                className="h-1.5 rounded-full"
                style={{
                  width: i === activeStep ? "2rem" : "0.375rem",
                  backgroundColor: i === activeStep ? s.accent : "#44403c",
                  transition: "all 0.35s ease",
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
