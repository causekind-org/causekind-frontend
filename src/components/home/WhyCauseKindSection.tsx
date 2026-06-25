"use client";

/**
 * WhyCauseKindSection — 4-feature asymmetric grid ("Why raise funds through us").
 * Extracted from HomeClient.tsx for maintainability.
 */

import { useTranslations } from "next-intl";
import { ShieldCheck, HandCoins, MapPin, Award } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export function WhyCauseKindSection() {
  const t = useTranslations("landing");

  const features = [
    { icon: ShieldCheck, title: t("features.adminVerified"),       desc: t("features.adminVerifiedDesc"),       color: "from-[#b04a15]/10 to-[#e07b3a]/10 text-[#b04a15]",     accent: "#b04a15" },
    { icon: HandCoins,   title: t("features.zeroFees"),            desc: t("features.zeroFeesDesc"),            color: "from-[#e07b3a]/10 to-[#f59e0b]/10 text-[#c2660a]",     accent: "#1e3a60" },
    { icon: MapPin,      title: t("features.localMatching"),       desc: t("features.localMatchingDesc"),       color: "from-[#1e3a60]/10 to-[#2d5a96]/10 text-[#1e3a60]",     accent: "#b04a15" },
    { icon: Award,       title: t("features.impactCertificates"), desc: t("features.impactCertificatesDesc"), color: "from-amber-500/10 to-yellow-500/10 text-amber-700",       accent: "#1e3a60" },
  ];

  return (
    <section id="trust" className="mx-auto max-w-7xl px-6 py-20">
      <Reveal className="mb-14">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15] mb-2 block">Why CauseKind</span>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white leading-[1.05]">{t("why.title")}</h2>
          </div>
          <p className="text-base text-stone-500 dark:text-stone-400 font-medium max-w-sm lg:text-right">{t("why.subtitle")}</p>
        </div>
      </Reveal>

      {/* Mobile: simple list */}
      <div className="sm:hidden flex flex-col gap-3">
        {features.map(f => (
          <div key={f.title} className="flex items-start gap-4 px-4 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-orange-100/60 dark:border-zinc-800 shadow-xs">
            <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-xs`}>
              <f.icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">{f.title}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: asymmetric tall|short|short|tall */}
      <div className="hidden sm:grid grid-cols-4 gap-4 items-start">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={i * 90}>
            <div className={`relative rounded-3xl border bg-white dark:bg-zinc-900 border-[#e5e2d5]/60 dark:border-stone-800 p-7 flex flex-col gap-5 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
              i === 0 || i === 3 ? "min-h-[340px]" : "min-h-[240px]"
            }`}>
              {/* Left accent stripe */}
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl" style={{ background: f.accent }} />
              {/* Ghost step number */}
              <span className="absolute right-3 bottom-3 text-[5rem] font-black leading-none select-none pointer-events-none opacity-[0.04] dark:opacity-[0.06]">
                0{i + 1}
              </span>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} shadow-sm`}>
                <f.icon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 leading-snug">{f.title}</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed">{f.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
