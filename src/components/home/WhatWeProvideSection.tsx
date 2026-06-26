"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Heart, Package } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export function WhatWeProvideSection() {
  const t = useTranslations("landing");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const steps = [
    {
      n: "01",
      icon: Heart,
      glowRgb: "176,74,21", // terracotta orange
      accentHex: "#b04a15",
      iconColor: "#e07b3a",
      tag: "Donate items or funds",
      titleKey: "provide.moneyOrItems" as const,
      descKey: "provide.moneyOrItemsDesc" as const,
    },
    {
      n: "02",
      icon: Package,
      glowRgb: "30,58,96", // deep blue/slate
      accentHex: "#1e3a60",
      iconColor: "#7ba7d4",
      tag: "10 km local radius",
      titleKey: "provide.localDropoffs" as const,
      descKey: "provide.localDropoffsDesc" as const,
    },
  ] as const;

  return (
    <section id="how" className="relative bg-[#090705] border-y border-white/[0.06] py-20 lg:py-28 overflow-hidden">
      
      {/* ── Deep ambient orbs ─────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-[20%] w-[700px] h-[700px] -translate-y-1/2"
        style={{ background: "radial-gradient(circle, rgba(176,74,21,0.06) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-[15%] w-[600px] h-[600px] translate-y-1/2"
        style={{ background: "radial-gradient(circle, rgba(30,58,96,0.08) 0%, transparent 70%)" }}
      />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-16 lg:gap-24 items-start">
          
          {/* ── Left Column: Section Header & Sticky Timeline indicator ── */}
          <div className="lg:sticky lg:top-28 flex flex-col gap-8">
            <Reveal>
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f0b97a] bg-[#b04a15]/10 border border-[#b04a15]/20 rounded-full px-3.5 py-1 w-fit">
                  How it works
                </span>
                <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight font-sans">
                  {t("what.title")}
                </h2>
                <p className="text-base text-stone-400 font-medium leading-relaxed max-w-sm">
                  {t("what.subtitle")}
                </p>
              </div>
            </Reveal>

            {/* Glowing line visualizer (Desktop Only) */}
            <div className="hidden lg:flex items-center gap-6 mt-6">
              <div className="relative w-[3px] h-32 bg-white/10 rounded-full overflow-hidden">
                {/* Active glow track */}
                <div
                  className="absolute left-0 w-full bg-gradient-to-b from-[#b04a15] to-[#f0b97a] transition-all duration-500 rounded-full"
                  style={{
                    height: hoveredIdx !== null ? "50%" : "0%",
                    top: hoveredIdx === 1 ? "50%" : "0%",
                    opacity: hoveredIdx !== null ? 1 : 0,
                  }}
                />
              </div>
              <div className="flex flex-col gap-10 text-xs font-bold uppercase tracking-widest text-stone-500">
                <span className={`transition-colors duration-300 ${hoveredIdx === 0 ? "text-[#f0b97a]" : ""}`}>Step 01</span>
                <span className={`transition-colors duration-300 ${hoveredIdx === 1 ? "text-[#f0b97a]" : ""}`}>Step 02</span>
              </div>
            </div>
          </div>

          {/* ── Right Column: Stack of Steps (Connected Timeline List) ── */}
          <div className="relative flex flex-col gap-10 lg:gap-16">
            
            {/* The vertical timeline connector running behind the items */}
            <div className="absolute left-12 lg:left-14 top-10 bottom-10 w-[2px] bg-white/[0.04]" />

            {steps.map((s, i) => {
              const isHovered = hoveredIdx === i;
              const Icon = s.icon;

              return (
                <Reveal key={s.n} delay={i * 150}>
                  <div
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="group relative flex gap-6 lg:gap-10 items-start p-4 lg:p-6 rounded-3xl border border-transparent hover:border-white/[0.04] hover:bg-white/[0.01] transition-all duration-500"
                  >
                    
                    {/* Step Icon Container with relative z-index to stand out */}
                    <div className="relative z-10 shrink-0">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500"
                        style={{
                          background: isHovered ? `rgba(${s.glowRgb}, 0.20)` : "rgba(255,255,255,0.02)",
                          border: isHovered ? `1px solid rgba(${s.glowRgb}, 0.40)` : "1px solid rgba(255,255,255,0.06)",
                          boxShadow: isHovered
                            ? `0 0 30px rgba(${s.glowRgb},0.25), 0 0 10px rgba(${s.glowRgb},0.12)`
                            : "none",
                          transform: isHovered ? "translateY(-4px) scale(1.05)" : "none",
                        }}
                      >
                        <Icon
                          className="w-7 h-7 transition-colors duration-500"
                          style={{ color: isHovered ? s.iconColor : "rgba(255,255,255,0.4)" }}
                        />
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500"
                          style={{ color: isHovered ? "#f0b97a" : s.accentHex }}
                        >
                          {s.tag}
                        </span>
                        {/* Huge ghost number in top corner */}
                        <span
                          className="text-5xl lg:text-7xl font-black tracking-tighter select-none font-sans transition-colors duration-500"
                          style={{
                            color: isHovered ? `rgba(${s.glowRgb}, 0.15)` : "rgba(255,255,255,0.03)",
                            WebkitTextStroke: isHovered ? "none" : "1px rgba(255,255,255,0.04)",
                          }}
                        >
                          {s.n}
                        </span>
                      </div>

                      <h3 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight group-hover:text-[#f0b97a] transition-colors duration-500">
                        {t(s.titleKey)}
                      </h3>
                      
                      <p className="text-sm lg:text-base text-stone-400 font-medium leading-relaxed max-w-xl group-hover:text-stone-300 transition-colors duration-500">
                        {t(s.descKey)}
                      </p>
                    </div>

                  </div>
                </Reveal>
              );
            })}

          </div>
        </div>
      </div>
    </section>
  );
}
