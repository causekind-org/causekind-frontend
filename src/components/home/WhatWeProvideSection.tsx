"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "framer-motion";
import { Heart, Package, ChevronDown } from "lucide-react";

const STEP_COUNT = 2;

const ROW1 = ["SHARE", "·", "ITEMS", "·", "DONATE", "·", "GIVE", "·", "SHARE", "·", "ITEMS", "·", "DONATE", "·"];
const ROW2 = ["LOCAL", "·", "VERIFIED", "·", "DIRECT", "·", "IMPACT", "·", "LOCAL", "·", "VERIFIED", "·"];

export function WhatWeProvideSection() {
  const t = useTranslations("landing");
  // This section is built almost entirely of motion and had no reduced-motion
  // path at all. Travel and scale collapse to their settled values below; the
  // steps still change with scroll and every opacity reveal stays, so nobody
  // loses information — only the movement goes.
  const reduceMotion = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

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
    if (!el) return;

    // Coalesced to one update per frame. This used to call setProgress straight
    // out of the scroll listener, so every scroll event reconciled the whole
    // subtree — two marquee rows of ~14 spans, the tabs and both step blocks
    // with their computed inline styles. The visuals are unchanged; this only
    // stops the same work happening several times per frame.
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

  return (
    <section
      ref={sectionRef}
      id="how"
      className="relative"
      style={{ height: "180vh" }}
    >
      {/* The panel's offset comes from --ck-nav-h, the header's MEASURED height
          (published by SiteHeader via ResizeObserver), not a constant. The old
          4.5rem assumed a 72px bar against a desktop header that measures
          ~118px, so roughly 46px of this panel sat behind it.

          Written inline rather than as a class in styles.css on purpose: it
          keeps the value on the element itself, with no cascade-layer
          interaction between Tailwind's utilities and an unlayered rule. The
          fallback is deliberately the OLD 4.5rem, so before hydration this
          behaves exactly as it does today and the change can only improve on
          it, never regress. */}
      <div
        className="sticky overflow-hidden bg-[#120c04] border-b border-stone-800/60 flex flex-col"
        style={{
          top: "var(--ck-nav-h, 4.5rem)",
          height: "calc(100vh - var(--ck-nav-h, 4.5rem))",
        }}
      >

        {/* Shifting accent glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 55% 50% at 18% 60%, ${step.accent}1c 0%, transparent 62%)`,
            transition: "background 0.85s ease",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 30% 35% at 85% 20%, ${step.accent}0d 0%, transparent 55%)`,
            transition: "background 0.85s ease",
          }}
        />

        {/* ── VFX: scroll-driven background text ── */}
        <div
          className="absolute inset-0 pointer-events-none flex flex-col justify-center gap-6 overflow-hidden select-none"
          aria-hidden
        >
          {/* Row 1 — slides LEFT as you scroll down */}
          <div
            className="flex items-center gap-10 whitespace-nowrap"
            style={{
              transform: reduceMotion ? "none" : `translateX(${-progress * 520}px)`,
              opacity: 0.045,
              willChange: "transform",
            }}
          >
            {ROW1.map((w, i) => (
              <span
                key={i}
                className="font-black text-white leading-none"
                style={{ fontSize: "clamp(3rem, 2rem + 5vw, 6rem)" }}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Row 2 — slides RIGHT as you scroll down */}
          <div
            className="flex items-center gap-8 whitespace-nowrap"
            style={{
              transform: reduceMotion ? "none" : `translateX(${progress * 360 - 180}px)`,
              opacity: 0.028,
              willChange: "transform",
            }}
          >
            {ROW2.map((w, i) => (
              <span
                key={i}
                className="font-black text-white leading-none"
                style={{ fontSize: "clamp(2rem, 1.3333rem + 3.3333vw, 4rem)" }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>

        {/* ── HEADER ── */}
        <div className="relative z-10 flex-shrink-0 flex items-end justify-between px-6 lg:px-20 pt-6 pb-4 border-b border-stone-800/30">
          <p className="text-xs text-stone-500 font-medium max-w-xs hidden lg:block">
            {t("what.subtitle")}
          </p>
          <div className="lg:text-right">
            <span className="text-3xs font-black uppercase tracking-widest text-[#f0b97a] mb-1 block">
              How it works
            </span>
            <h2 className="text-2xl lg:text-4xl font-extrabold tracking-tight text-white leading-[1.05]">
              {t("what.title")}
            </h2>
          </div>
        </div>

        {/* ── STEP TABS (scroll-driven fill) ── */}
        <div className="relative z-10 flex-shrink-0 flex px-6 lg:px-20">
          {steps.map((s, i) => {
            const fillPct = Math.max(0, Math.min(100, (progress * STEP_COUNT - i) * 100));
            return (
              <div key={s.step} className="relative flex-1 py-4 pr-8">
                <span
                  className="block text-3xs font-black uppercase tracking-[0.2em] mb-1.5"
                  style={{ color: i === activeStep ? s.accent : "#78716c", transition: "color 0.5s" }}
                >
                  Step {s.step}
                </span>
                <span
                  className="block text-base md:text-lg font-bold"
                  style={{ color: i === activeStep ? "#ffffff" : "#57534e", transition: "color 0.5s" }}
                >
                  {s.title}
                </span>
                <div className="absolute bottom-0 left-0 h-[2px] w-full bg-stone-800/80" />
                <div
                  className="absolute bottom-0 left-0 h-[2px]"
                  style={{
                    width: `${fillPct}%`,
                    backgroundColor: s.accent,
                    transition: "background-color 0.4s ease",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* ── MAIN CONTENT — each element reveals via scroll ── */}
        <div className="relative z-10 flex-1 flex items-center overflow-hidden">
          {steps.map((s, i) => {
            const SIcon   = s.icon;
            const isActive = i === activeStep;
            // per-step progress 0→1
            const sp = Math.min(1, Math.max(0, progress * STEP_COUNT - i));

            // Opacity reveals are kept under reduced motion — they carry the
            // sequencing without moving anything. Only travel and scale go.
            const iconOp   = Math.min(1, sp * 5);
            const iconSc   = reduceMotion ? 1 : 0.55 + Math.min(1, sp * 4) * 0.45;
            const numOp    = Math.min(1, sp * 3);
            const titleOp  = Math.min(1, sp * 3.5);
            const titleY   = reduceMotion ? 0 : (1 - titleOp) * 56;
            const descOp   = Math.min(1, Math.max(0, sp * 4 - 0.8));
            const descY    = reduceMotion ? 0 : (1 - descOp) * 40;
            const hintOp   = Math.min(1, Math.max(0, sp * 5 - 1.8));

            return (
              <div
                key={s.step}
                className="absolute inset-x-6 lg:inset-x-20"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive || reduceMotion
                    ? "none"
                    : `translateX(${i < activeStep ? -64 : 64}px)`,
                  transition: reduceMotion
                    ? "opacity 0.2s linear"
                    : "opacity 0.5s ease, transform 0.5s ease",
                  pointerEvents: isActive ? "auto" : "none",
                }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] items-center gap-10 lg:gap-16">

                  {/* Left — the dim step number IS the focal shape; the icon rides on
                      top as a small tilted badge instead of its own big colored tile
                      (a large Lucide glyph centered in a flat rounded square reads as
                      generic AI-poster iconography — this keeps the icon as an accent,
                      not the main event). */}
                  <div className="relative flex items-center flex-shrink-0 lg:w-[clamp(3rem,5vw,5rem)]">
                    <span
                      className="hidden lg:block font-black leading-none select-none"
                      style={{
                        fontSize: "clamp(3rem, 2.3333rem + 3.3333vw, 5rem)",
                        color: `${s.accent}22`,
                        WebkitTextStroke: `1px ${s.accent}45`,
                        opacity: numOp,
                        willChange: "opacity",
                      }}
                    >
                      {s.step}
                    </span>
                    <div
                      className="relative lg:absolute lg:-right-4 lg:-bottom-3 w-14 h-14 lg:w-11 lg:h-11 rounded-2xl lg:rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: s.accent,
                        boxShadow: `0 12px 28px ${s.accent}50, 0 0 0 3px #120c04`,
                        transform: `scale(${iconSc}) rotate(-8deg)`,
                        opacity: iconOp,
                        willChange: "transform, opacity",
                      }}
                    >
                      <SIcon className="h-7 w-7 lg:h-5 lg:w-5 text-white" strokeWidth={2.25} />
                    </div>
                  </div>

                  {/* Right — title slides up, then desc slides up after */}
                  <div>
                    <h3
                      className="text-2xl lg:text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-3"
                      style={{
                        transform: `translateY(${titleY}px)`,
                        opacity: titleOp,
                        willChange: "transform, opacity",
                      }}
                    >
                      {s.title}
                    </h3>
                    <p
                      className="text-sm lg:text-base text-stone-400 leading-relaxed mb-4 max-w-lg"
                      style={{
                        transform: `translateY(${descY}px)`,
                        opacity: descOp,
                        willChange: "transform, opacity",
                      }}
                    >
                      {s.desc}
                    </p>
                    <div
                      className="inline-flex items-center gap-1.5 text-2xs font-black uppercase tracking-widest"
                      style={{ color: s.accent, opacity: hintOp * 0.65 }}
                    >
                      {i < STEP_COUNT - 1 ? (
                        <>
                          <ChevronDown className="h-3.5 w-3.5 animate-bounce motion-reduce:animate-none" />
                          <span>Scroll for next step</span>
                        </>
                      ) : (
                        <span>That's how it works</span>
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
              className="h-full"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: step.accent,
                transition: "background-color 0.5s ease",
                willChange: "width",
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
