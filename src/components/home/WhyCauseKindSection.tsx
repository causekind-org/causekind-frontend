"use client";

import { useTranslations } from "next-intl";
import { ShieldCheck, HandCoins, MapPin, Award, CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export function WhyCauseKindSection() {
  const t = useTranslations("landing");

  return (
    <section id="trust" className="mx-auto max-w-7xl px-6 py-24">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <Reveal className="mb-16">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] text-[#b04a15] bg-[#b04a15]/10 px-3 py-1.5 rounded-full mb-4">
              Why CauseKind
            </span>
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white leading-[1.05]">
              {t("why.title")}
            </h2>
          </div>
          <p className="text-base text-stone-500 dark:text-stone-400 font-medium max-w-sm lg:text-right leading-relaxed">
            {t("why.subtitle")}
          </p>
        </div>
      </Reveal>

      {/* ── Mobile: stacked list ─────────────────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {[
          { icon: ShieldCheck, title: t("features.adminVerified"),      desc: t("features.adminVerifiedDesc"),      accent: "#b04a15" },
          { icon: HandCoins,   title: t("features.zeroFees"),           desc: t("features.zeroFeesDesc"),           accent: "#b04a15" },
          { icon: MapPin,      title: t("features.localMatching"),      desc: t("features.localMatchingDesc"),      accent: "#1e3a60" },
          { icon: Award,       title: t("features.impactCertificates"), desc: t("features.impactCertificatesDesc"), accent: "#1e3a60" },
        ].map(f => (
          <div key={f.title} className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800">
            <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: `${f.accent}18`, color: f.accent }}>
              <f.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-stone-900 dark:text-stone-100">{f.title}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tablet: 2 × 2 grid ──────────────────────────────────────── */}
      <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4">
        {/* Card 1 — dark terracotta */}
        <Reveal delay={0}>
          <div className="relative rounded-3xl overflow-hidden p-7 flex flex-col gap-5 text-white min-h-[220px]"
               style={{ background: "linear-gradient(145deg, #b04a15 0%, #7c2e0c 100%)" }}>
            <div aria-hidden className="absolute inset-0 pointer-events-none"
                 style={{ background: "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.13) 0%, transparent 55%)" }} />
            <div className="relative w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="relative space-y-2">
              <h3 className="text-base font-extrabold">{t("features.adminVerified")}</h3>
              <p className="text-white/65 text-sm leading-relaxed">{t("features.adminVerifiedDesc")}</p>
            </div>
          </div>
        </Reveal>

        {/* Card 2 — light */}
        <Reveal delay={80}>
          <div className="relative rounded-3xl overflow-hidden p-7 flex flex-col gap-5 bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 min-h-[220px]">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#b04a15]" />
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#b04a1518", color: "#b04a15" }}>
              <HandCoins className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100">{t("features.zeroFees")}</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{t("features.zeroFeesDesc")}</p>
            </div>
          </div>
        </Reveal>

        {/* Card 3 — light */}
        <Reveal delay={140}>
          <div className="relative rounded-3xl overflow-hidden p-7 flex flex-col gap-5 bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 min-h-[220px]">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#1e3a60]" />
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#1e3a6018", color: "#1e3a60" }}>
              <MapPin className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100">{t("features.localMatching")}</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{t("features.localMatchingDesc")}</p>
            </div>
          </div>
        </Reveal>

        {/* Card 4 — dark navy */}
        <Reveal delay={200}>
          <div className="relative rounded-3xl overflow-hidden p-7 flex flex-col gap-5 text-white min-h-[220px]"
               style={{ background: "linear-gradient(145deg, #1e3a60 0%, #0f1d30 100%)" }}>
            <div aria-hidden className="absolute inset-0 pointer-events-none"
                 style={{ background: "radial-gradient(circle at 85% 15%, rgba(176,74,21,0.22) 0%, transparent 55%)" }} />
            <div className="relative w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Award className="w-6 h-6 text-[#f0b97a]" />
            </div>
            <div className="relative space-y-2">
              <h3 className="text-base font-extrabold">{t("features.impactCertificates")}</h3>
              <p className="text-white/65 text-sm leading-relaxed">{t("features.impactCertificatesDesc")}</p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── Desktop bento: col-1 hero tall | col-2 light | col-3 light ─── */}
      {/*                  col-1 hero tall |    col-2+3 wide dark navy     */}
      <div
        className="hidden lg:grid gap-5"
        style={{ gridTemplateColumns: "1.15fr 1fr 1fr", gridTemplateRows: "auto auto" }}
      >

        {/* ── Card 1: Admin Verified — tall terracotta hero, spans 2 rows ── */}
        <Reveal delay={0} className="row-span-2 h-full">
          <div
            className="relative h-full rounded-3xl overflow-hidden flex flex-col p-9 text-white"
            style={{ background: "linear-gradient(150deg, #b04a15 0%, #8c3510 45%, #5c1f06 100%)", minHeight: 380 }}
          >
            {/* Top-right radial glow */}
            <div aria-hidden className="absolute top-0 right-0 w-80 h-80 pointer-events-none rounded-full"
                 style={{ background: "radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 60%)", transform: "translate(35%, -35%)" }} />
            {/* Bottom-left subtle glow */}
            <div aria-hidden className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none rounded-full"
                 style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)", transform: "translate(-25%, 25%)" }} />

            <div className="relative flex-1 flex flex-col gap-7">
              {/* Top badge */}
              <div className="inline-flex items-center gap-1.5 self-start bg-white/15 border border-white/20 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> Manually checked
              </div>

              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>

              {/* Text */}
              <div className="flex-1 space-y-3">
                <h3 className="text-[1.6rem] font-extrabold leading-snug tracking-tight">
                  {t("features.adminVerified")}
                </h3>
                <p className="text-white/65 text-sm leading-relaxed">
                  {t("features.adminVerifiedDesc")}
                </p>
              </div>

              {/* Bottom rule */}
              <div className="pt-5 border-t border-white/15">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Every listing. Every time.
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Card 2: Secure Platform — light, top middle ── */}
        <Reveal delay={90}>
          <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 p-7 flex flex-col gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 min-h-[190px]">
            {/* Top accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-[#b04a15]" />

            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                 style={{ background: "#b04a1515", color: "#b04a15" }}>
              <HandCoins className="w-6 h-6" />
            </div>

            <div className="space-y-2.5">
              <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 leading-snug">
                {t("features.zeroFees")}
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                {t("features.zeroFeesDesc")}
              </p>
            </div>
          </div>
        </Reveal>

        {/* ── Card 3: Local Matching — light, top right ── */}
        <Reveal delay={150}>
          <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-stone-100 dark:border-zinc-800 p-7 flex flex-col gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 min-h-[190px]">
            {/* Top accent stripe */}
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-[#1e3a60]" />

            <div className="flex items-start justify-between gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                   style={{ background: "#1e3a6015", color: "#1e3a60" }}>
                <MapPin className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: "#1e3a6012", color: "#1e3a60" }}>
                Within 10 km
              </span>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 leading-snug">
                {t("features.localMatching")}
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                {t("features.localMatchingDesc")}
              </p>
            </div>
          </div>
        </Reveal>

        {/* ── Card 4: Impact Certificates — dark navy wide, spans 2 cols ── */}
        <Reveal delay={210} className="col-span-2">
          <div
            className="relative rounded-3xl overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-7 p-8 text-white h-full"
            style={{ background: "linear-gradient(140deg, #1e3a60 0%, #142a4a 50%, #0a1c30 100%)", minHeight: 190 }}
          >
            {/* Top-right terracotta radial glow */}
            <div aria-hidden className="absolute top-0 right-0 w-80 h-80 pointer-events-none rounded-full"
                 style={{ background: "radial-gradient(circle, rgba(176,74,21,0.22) 0%, transparent 60%)", transform: "translate(25%, -30%)" }} />
            {/* Bottom dot grid texture */}
            <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.04]"
                 style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

            {/* Icon */}
            <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center">
              <Award className="w-8 h-8 text-[#f0b97a]" />
            </div>

            {/* Text */}
            <div className="relative flex-1 space-y-2.5">
              <div className="inline-flex items-center gap-2 bg-white/10 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full text-white/70 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f0b97a] shrink-0" />
                Issued on delivery
              </div>
              <h3 className="text-xl font-extrabold leading-snug">{t("features.impactCertificates")}</h3>
              <p className="text-white/60 text-sm leading-relaxed max-w-lg">{t("features.impactCertificatesDesc")}</p>
            </div>

            {/* Decorative mini-certificate preview */}
            <div className="relative shrink-0 hidden xl:flex flex-col items-center justify-center w-32 h-24 rounded-2xl border-2 border-white/15 bg-white/08 gap-2">
              <Award className="w-6 h-6 text-[#f0b97a]" />
              <div className="space-y-1.5 w-20">
                <div className="h-1.5 rounded-full bg-white/25 w-full" />
                <div className="h-1.5 rounded-full bg-white/15 w-4/5" />
                <div className="h-1.5 rounded-full bg-white/15 w-3/5" />
              </div>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
