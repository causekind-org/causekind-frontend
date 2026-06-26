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
      iconColor: "#e07b3a",
      tag: "Donate items or funds",
      titleKey: "provide.moneyOrItems" as const,
      descKey: "provide.moneyOrItemsDesc" as const,
    },
    {
      n: "02",
      icon: Package,
      iconColor: "#7ba7d4",
      tag: "10 km local radius",
      titleKey: "provide.localDropoffs" as const,
      descKey: "provide.localDropoffsDesc" as const,
    },
  ] as const;

  return (
    <section id="how" className="relative bg-[#090705] border-y border-white/[0.06] py-20 lg:py-28 overflow-hidden">
      
      {/* ── Deep ambient orbs (very soft) ────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-[20%] w-[700px] h-[700px] -translate-y-1/2"
        style={{ background: "radial-gradient(circle, rgba(176,74,21,0.04) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-[15%] w-[600px] h-[600px] translate-y-1/2"
        style={{ background: "radial-gradient(circle, rgba(30,58,96,0.05) 0%, transparent 70%)" }}
      />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr] gap-16 lg:gap-24 items-start">
          
          {/* ── Left Column: Section Header ── */}
          <div className="lg:sticky lg:top-28 flex flex-col gap-6">
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
          </div>

          {/* ── Right Column: Typographic List of Steps (No Cards, No Boxes) ── */}
          <div className="flex flex-col">
            
            {steps.map((s, i) => {
              const isHovered = hoveredIdx === i;
              const Icon = s.icon;

              return (
                <Reveal key={s.n} delay={i * 120}>
                  <div
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="group flex gap-8 items-start py-10 border-b border-white/[0.08] first:pt-0 last:border-b-0 transition-colors duration-300"
                  >
                    
                    {/* Big Typographic Step Number (Left aligned) */}
                    <span className="text-3xl lg:text-4xl font-extrabold text-white/20 select-none font-mono tracking-tighter shrink-0 pt-1 group-hover:text-[#f0b97a]/80 transition-colors duration-300">
                      {s.n}
                    </span>

                    {/* Step Icon (Floating cleanly, no background or card wrap) */}
                    <div className="shrink-0 pt-1.5">
                      <Icon
                        className="w-6 h-6 transition-all duration-300 group-hover:scale-110"
                        style={{
                          color: isHovered ? s.iconColor : "rgba(255,255,255,0.3)",
                          filter: isHovered ? "drop-shadow(0 0 8px currentColor)" : "none"
                        }}
                      />
                    </div>

                    {/* Step Details */}
                    <div className="flex-1 space-y-2.5 min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-stone-500 group-hover:text-[#f0b97a] transition-colors duration-300">
                        {s.tag}
                      </span>
                      
                      <h3 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight group-hover:translate-x-1 transition-transform duration-300">
                        {t(s.titleKey)}
                      </h3>
                      
                      <p className="text-sm lg:text-base text-stone-400 font-medium leading-relaxed max-w-xl group-hover:text-stone-300 transition-colors duration-300">
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
