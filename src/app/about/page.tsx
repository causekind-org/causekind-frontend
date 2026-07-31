import Link from "next/link";
import { BeamDivider } from "@/components/about/BeamDivider";
import Image from "next/image";
import { ArrowLeft, Heart, Shield, Milestone, Compass, CheckCircle2, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CursorGlowHero } from "@/components/CursorGlowHero";
import { AboutCtaCard } from "@/components/AboutCtaCard";
import { Reveal } from "@/components/Reveal";

export const metadata = {
  title: "About Us — CauseKind",
  description: "Learn about CauseKind's mission, story, and how we facilitate verified in-kind donations.",
};

export default async function AboutPage() {
  const t = await getTranslations("about");

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About Us — CauseKind",
    "description": "Learn about CauseKind's mission, story, and how we facilitate verified in-kind donations.",
    "url": "https://www.causekind.com/about",
    "mainEntity": {
      "@type": "Organization",
      "name": "CauseKind",
      "url": "https://www.causekind.com",
      "logo": "https://www.causekind.com/logo-filled.webp",
      "description": "Connecting kind hearts directly with verified needs."
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <div className="bg-[#faf8f5] dark:bg-zinc-950 min-h-screen overflow-x-clip text-stone-800 dark:text-stone-200">

      {/* ── Hero with cursor glow + LEFT-FLUSH oversized heading ── */}
      <CursorGlowHero>
        <div className="mx-auto max-w-7xl px-6 sm:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-stone-400 hover:text-white text-xs font-semibold mb-8 transition-all duration-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("backToHome")}
          </Link>
          {/* Asymmetric: label left, heading oversized left-aligned */}
          <p className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-3">
            {t("aboutUs")}
          </p>
          <div className="grid lg:grid-cols-[1fr_auto] items-end gap-8">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.02]">
              {t("headline")}
            </h1>
            <p className="text-sm sm:text-base text-stone-300 font-medium leading-relaxed max-w-xs lg:max-w-[220px] lg:text-right opacity-85 lg:pb-1">
              {t("subheadline")}
            </p>
          </div>
        </div>
      </CursorGlowHero>

      {/* ── Section 1: Our Story — PHOTO RIGHT (7/5 split reversed) ── */}
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-10 md:py-14">
        <Reveal>
        <div className="grid gap-6 md:gap-10 lg:grid-cols-[3fr_2fr] items-center">

          {/* Story text — LEFT, with oversized decorative number */}
          <div className="relative space-y-3 md:space-y-5">
            {/* Giant decorative "01" */}
            <span className="absolute -left-4 -top-6 text-[4.5rem] md:text-[8rem] font-black text-stone-100 dark:text-zinc-900 leading-none select-none pointer-events-none">01</span>
            <div className="relative space-y-3 md:space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b04a15]/10 text-[#b04a15] text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Direct Support Model
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-white leading-snug">
                {t("storyTitle")}
              </h2>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium text-sm md:text-base max-w-xl">
                {t("storyText")}
              </p>
              {/* Offset stats — NOT centered, left-aligned */}
              <div className="flex flex-wrap gap-x-6 gap-y-4 sm:gap-10 pt-4 border-t border-stone-200 dark:border-zinc-800">
                <div>
                  <p className="text-2xl md:text-3xl font-black text-[#b04a15]">100%</p>
                  <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-1">Verified Handovers</p>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-black text-[#1e3a60] dark:text-blue-400">10km</p>
                  <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-1">Local Radius</p>
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-black text-[#b04a15]">14+</p>
                  <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-1">Languages</p>
                </div>
              </div>
            </div>
          </div>

          {/* Photo — RIGHT, taller and offset with asymmetric glow */}
          <div className="relative group lg:mt-12">
            <div className="absolute -inset-3 bg-gradient-to-bl from-[#b04a15] to-[#1e3a60] rounded-3xl blur-md opacity-20 group-hover:opacity-35 transition duration-500" />
            <div className="relative bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-[#e5e2d5]/60 dark:border-stone-800 shadow-2xl overflow-hidden">
              <Image
                src="/local_handover.webp"
                alt="Local handover donation"
                width={600}
                height={500}
                className="rounded-xl object-cover w-full aspect-[4/3] h-auto sm:aspect-auto sm:h-[440px] hover:scale-[1.02] transition-transform duration-500"
                priority
              />
            </div>
            {/* Float badge — bottom-LEFT this time (not right) */}
            <div className="absolute -bottom-3 -left-3 md:-bottom-4 md:-left-4 bg-[#b04a15] text-white px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl shadow-lg border border-orange-400/20 text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 animate-bounce">
              <Heart className="w-3 h-3 md:w-4 md:h-4 fill-white" />
              Verified Safe
            </div>
          </div>

        </div>
        </Reveal>
      </div>

      {/* ── Section 2: Vision & Mission — ALTERNATING OFFSET STAGGER ── */}
      <div className="bg-[#120c04] border-y border-stone-800/60 py-10 md:py-14 overflow-hidden relative">
        <div className="pointer-events-none absolute -top-32 left-[20%] w-[500px] h-[500px] rounded-full bg-[#b04a15]/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-[10%] w-[380px] h-[380px] rounded-full bg-[#1e3a60]/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 sm:px-10">

          {/* Right-flush heading */}
          <div className="flex flex-col lg:flex-row-reverse lg:items-end lg:justify-between gap-4 mb-7 md:mb-10">
            <div className="lg:text-right">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-2 block">Our Direction</span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-snug">Where We Are Heading</h2>
            </div>
            <p className="text-sm text-stone-400 font-medium max-w-sm">
              Building a transparent platform for community-centered philanthropy.
            </p>
          </div>

          {/* ── Vision & Mission — two columns sharing ONE animated rule.
                 No cards: two bordered boxes read as two disconnected objects,
                 while a single beam running down the rule between them reads as
                 one system with a current passing through it. `minmax(0,1fr)`
                 rather than `1fr` so a long word cannot push a column past its
                 share; the side padding is what keeps text off the rule. ── */}
          <Reveal direction="left">
          <div className="relative mb-4 md:mb-6">
            <BeamDivider />
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">

              <div className="min-w-0 pr-3 md:pr-8">
                <div className="p-2 md:p-3 w-fit rounded-xl bg-[#b04a15]/15 text-[#f0b97a] mb-3 md:mb-5">
                  <Compass className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-base md:text-xl font-extrabold text-white mb-1.5 md:mb-3">{t("visionHeadline")}</h3>
                <p className="text-stone-400 leading-relaxed font-medium text-xs md:text-base">{t("visionText")}</p>
                <div className="mt-3 md:mt-5 text-[10px] md:text-xs font-bold leading-tight text-[#f0b97a] uppercase tracking-wider">
                  Transparent Ecosystem →
                </div>
              </div>

              <div className="min-w-0 pl-3 md:pl-8">
                <div className="p-2 md:p-3 w-fit rounded-xl bg-[#1e3a60]/30 text-blue-300 mb-3 md:mb-5">
                  <Milestone className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-base md:text-xl font-extrabold text-white mb-1.5 md:mb-3">{t("missionHeadline")}</h3>
                <p className="text-stone-400 leading-relaxed font-medium text-xs md:text-base">{t("missionText")}</p>
                <div className="mt-3 md:mt-5 text-[10px] md:text-xs font-bold leading-tight text-blue-400 uppercase tracking-wider">
                  Direct Resource Distribution →
                </div>
              </div>

            </div>
          </div>
          </Reveal>

        </div>
      </div>

      {/* ── Section 3: Core Values — MASONRY ASYMMETRIC ── */}
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-10 md:py-14">

        {/* Left-flush heading */}
        <Reveal>
        <div className="mb-7 md:mb-10">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15] mb-2 block">02</span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-stone-900 dark:text-white leading-snug max-w-md">
            {t("standForHeading")}
          </h2>
        </div>
        </Reveal>

        {/* Row 1: [3fr 2fr] — large community card + small secure card */}
        <Reveal delay={100}>
        <div className="grid gap-3 md:gap-5 lg:grid-cols-[3fr_2fr] mb-3 md:mb-5">
          {/* Large showcase card */}
          <div className="bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 grid sm:grid-cols-2">
            <div className="relative min-h-[150px] md:min-h-[240px]">
              <Image
                src="/Distribution.webp"
                alt="Community donation packing"
                fill
                className="object-cover"
                sizes="(min-width: 640px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white dark:to-zinc-900 z-10" />
            </div>
            <div className="p-4 md:p-6 flex flex-col justify-center relative z-20">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#b04a15] mb-2 block">{t("localFocus")}</span>
              <h3 className="text-base md:text-lg font-extrabold text-stone-900 dark:text-white mb-2 md:mb-3">{t("communityTitle")}</h3>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium text-sm">{t("communityText")}</p>
            </div>
          </div>

          {/* Small secure card */}
          <div className="p-4 md:p-6 bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800 rounded-3xl hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-2xl bg-[#1e3a60]/10 flex items-center justify-center text-[#1e3a60] dark:text-blue-400 mb-3 md:mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h4 className="font-extrabold text-[15px] md:text-base text-stone-900 dark:text-white mb-1.5 md:mb-2">{t("securePlatformTitle")}</h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                {t("securePlatformText")}
              </p>
            </div>
            <div className="pt-4 mt-4 md:pt-6 md:mt-6 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-bold text-stone-400 uppercase tracking-widest">
              {t("razorpaySecured")}
            </div>
          </div>
        </div>
        </Reveal>

        {/* Row 2: [1fr 3fr] — small verified card + large dark CTA card */}
        <Reveal delay={200}>
        <div className="grid gap-3 md:gap-5 lg:grid-cols-[2fr_3fr]">
          {/* Small verified card */}
          <div className="p-4 md:p-6 bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800 rounded-3xl hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-2xl bg-[#b04a15]/10 flex items-center justify-center text-[#b04a15] mb-3 md:mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-5 h-5 md:w-6 md:h-6 fill-[#b04a15]" />
              </div>
              <h4 className="font-extrabold text-[15px] md:text-base text-stone-900 dark:text-white mb-1.5 md:mb-2">{t("verifiedNeedsTitle")}</h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                {t("verifiedNeedsText")}
              </p>
            </div>
            <div className="pt-4 mt-4 md:pt-6 md:mt-6 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-bold text-stone-400 uppercase tracking-widest">
              {t("adminAudited")}
            </div>
          </div>

          {/* Dynamic dynamic CTA card — hidden when authenticated */}
          <AboutCtaCard />
        </div>
        </Reveal>

      </div>
      </div>

    </>
  );
}
