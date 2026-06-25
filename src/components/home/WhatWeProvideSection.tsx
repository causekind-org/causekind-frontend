"use client";

/**
 * WhatWeProvideSection — "How it works" two-step dark section.
 * Extracted from HomeClient.tsx for maintainability.
 */

import { useTranslations } from "next-intl";
import { Heart, Package } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export function WhatWeProvideSection() {
  const t = useTranslations("landing");

  const steps = [
    { step: "01", icon: Heart,   title: t("provide.moneyOrItems"),  desc: t("provide.moneyOrItemsDesc")  },
    { step: "02", icon: Package, title: t("provide.localDropoffs"), desc: t("provide.localDropoffsDesc") },
  ];

  return (
    <section id="how" className="relative bg-[#120c04] border-y border-stone-800/60 py-20 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-[10%] w-[500px] h-[500px] rounded-full bg-[#b04a15]/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-[5%]  w-[380px] h-[380px] rounded-full bg-[#1e3a60]/10 blur-3xl" />

      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mb-14">
          <div className="flex flex-col lg:flex-row-reverse lg:items-end lg:justify-between gap-4">
            <div className="lg:text-right">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-2 block">How it works</span>
              <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.05]">{t("what.title")}</h2>
            </div>
            <p className="text-base text-stone-400 font-medium max-w-sm">{t("what.subtitle")}</p>
          </div>
        </Reveal>

        {/* Desktop: 2-col cards */}
        <div className="hidden md:grid md:grid-cols-2 gap-6 items-stretch">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 140}>
              <div className="relative rounded-3xl bg-white/5 border border-white/10 p-10 flex flex-col justify-between min-h-[340px] overflow-hidden group hover:bg-white/8 transition-all duration-300">
                <div className="absolute -right-8 -bottom-8 text-[9rem] font-black text-white/[0.03] leading-none select-none">{s.step}</div>
                <div className="space-y-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${i === 0 ? "bg-[#b04a15] shadow-[#b04a15]/30" : "bg-[#1e3a60] shadow-[#1e3a60]/30"}`}>
                    <s.icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-white mb-3">{s.title}</h3>
                    <p className="text-stone-400 font-medium leading-relaxed">{s.desc}</p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-white/10 text-xs font-bold text-[#f0b97a] uppercase tracking-widest">Step {s.step}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Mobile: vertical list */}
        <div className="md:hidden flex flex-col gap-4">
          {steps.map(s => (
            <div key={s.title} className="flex items-start gap-4 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
              <span className="absolute right-3 top-2 text-3xl font-black text-white/10 select-none leading-none">{s.step}</span>
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#b04a15] text-white shadow-sm">
                <s.icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 pr-6">
                <p className="text-sm font-bold text-white leading-snug">{s.title}</p>
                <p className="text-xs text-stone-400 font-medium leading-relaxed mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
