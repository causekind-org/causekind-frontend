"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, HandCoins, MapPin, Award } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const AUTO_MS = 4000;
const FEATURE_COUNT = 4;

export function WhyCauseKindSection() {
  const t = useTranslations("landing");
  const [active, setActive] = useState(0);
  const [pct, setPct] = useState(0);

  const features = [
    { num: "01", icon: ShieldCheck, title: t("features.adminVerified"),      desc: t("features.adminVerifiedDesc"),      accent: "#b04a15" },
    { num: "02", icon: HandCoins,   title: t("features.zeroFees"),           desc: t("features.zeroFeesDesc"),           accent: "#1e3a60" },
    { num: "03", icon: MapPin,      title: t("features.localMatching"),      desc: t("features.localMatchingDesc"),      accent: "#c2660a" },
    { num: "04", icon: Award,       title: t("features.impactCertificates"), desc: t("features.impactCertificatesDesc"), accent: "#1e3a60" },
  ];

  useEffect(() => {
    setPct(0);
    let elapsed = 0;
    const TICK = 40;
    const id = setInterval(() => {
      elapsed += TICK;
      setPct(Math.min((elapsed / AUTO_MS) * 100, 100));
      if (elapsed >= AUTO_MS) {
        clearInterval(id);
        setActive(a => (a + 1) % FEATURE_COUNT);
      }
    }, TICK);
    return () => clearInterval(id);
  }, [active]);

  return (
    <section id="trust" className="mx-auto max-w-7xl px-6 py-10">
      <Reveal className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15] mb-2 block">
              Why CauseKind
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white leading-[1.05]">
              {t("why.title")}
            </h2>
          </div>
          <p className="text-base text-stone-500 dark:text-stone-400 font-medium max-w-sm lg:text-right">
            {t("why.subtitle")}
          </p>
        </div>
      </Reveal>

      {/*
        Dribbble-inspired split panel:
        Left — vertical stacked feature selector
        Right — large animated spotlight panel
        Outer border unifies the two as one widget, not separate cards.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] border border-stone-200 dark:border-stone-800">

        {/* ── LEFT: feature list ── */}
        <div className="lg:border-r border-stone-200 dark:border-stone-800 flex flex-col">
          {features.map((f, i) => {
            const isActive = i === active;
            const Icon = f.icon;
            return (
              <div
                key={f.num}
                onClick={() => setActive(i)}
                className="relative cursor-pointer border-b border-stone-200 dark:border-stone-800 last:border-b-0 px-6 py-5 flex items-center gap-4 transition-colors duration-200 group"
                style={isActive ? { backgroundColor: `${f.accent}08` } : undefined}
              >
                {/* Left accent stripe */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-sm transition-all duration-300"
                  style={{ backgroundColor: isActive ? f.accent : "transparent" }}
                />

                {/* Step number */}
                <span
                  className="text-[10px] font-black tracking-[0.15em] flex-shrink-0 w-5 transition-colors duration-200"
                  style={{ color: isActive ? f.accent : "#c7c3bd" }}
                >
                  {f.num}
                </span>

                {/* Title */}
                <span
                  className={`flex-1 text-sm md:text-[0.9375rem] font-bold leading-snug transition-colors duration-200 ${
                    isActive ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-300"
                  }`}
                >
                  {f.title}
                </span>

                {/* Icon chip */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? `${f.accent}18` : "transparent",
                    color: isActive ? f.accent : "#d6d3d1",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Progress fill bar (bottom of row) */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 h-[2px] w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, backgroundColor: f.accent }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── RIGHT: spotlight panel ── */}
        <div className="relative min-h-[300px] lg:min-h-[unset] flex items-center justify-center overflow-hidden">

          {/* Animated radial glow — reacts to active accent */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{
              background: `radial-gradient(ellipse 70% 70% at 50% 50%, ${features[active].accent}0e 0%, transparent 75%)`,
            }}
          />

          {/* One panel per feature, stacked via absolute positioning */}
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.num}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 py-10 md:px-12"
                style={{
                  opacity: i === active ? 1 : 0,
                  transform: `translateY(${i === active ? 0 : 14}px)`,
                  transition: "opacity 0.4s ease, transform 0.4s ease",
                  pointerEvents: i === active ? "auto" : "none",
                }}
              >
                {/* Large icon with accent glow */}
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 flex-shrink-0"
                  style={{
                    backgroundColor: f.accent,
                    boxShadow: `0 16px 56px ${f.accent}45`,
                  }}
                >
                  <Icon className="h-10 w-10 text-white" />
                </div>

                {/* Feature number badge */}
                <span
                  className="text-[10px] font-black tracking-[0.25em] uppercase mb-2"
                  style={{ color: f.accent }}
                >
                  {f.num} / 0{FEATURE_COUNT}
                </span>

                {/* Title */}
                <h3 className="text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-white leading-tight mb-3">
                  {f.title}
                </h3>

                {/* Description */}
                <p className="text-sm md:text-base text-stone-500 dark:text-stone-400 leading-relaxed max-w-[26rem]">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
