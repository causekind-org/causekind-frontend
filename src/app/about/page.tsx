import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Heart, Shield, Milestone, Compass, CheckCircle2, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CursorGlowHero } from "@/components/CursorGlowHero";
import { AboutCtaCard } from "@/components/AboutCtaCard";
import { Reveal } from "@/components/Reveal";
import { BorderBeam } from "@/components/BorderBeam";

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
    "url": "https://causekind.com/about",
    "mainEntity": {
      "@type": "Organization",
      "name": "CauseKind",
      "url": "https://causekind.com",
      "logo": "https://causekind.com/logo-filled.png",
      "description": "Connecting kind hearts directly with verified needs."
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <div className="bg-[#faf8f5] dark:bg-zinc-950 min-h-screen text-stone-800 dark:text-stone-200">

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
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-24">
        <Reveal>
        <div className="grid gap-12 lg:grid-cols-[3fr_2fr] items-center">

          {/* Story text — LEFT, with oversized decorative number */}
          <div className="relative space-y-6">
            {/* Giant decorative "01" */}
            <span className="absolute -left-4 -top-6 text-[8rem] font-black text-stone-100 dark:text-zinc-900 leading-none select-none pointer-events-none">01</span>
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b04a15]/10 text-[#b04a15] text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Direct Support Model
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-white leading-snug">
                {t("storyTitle")}
              </h2>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium text-base sm:text-lg max-w-xl">
                {t("storyText")}
              </p>
              {/* Offset stats — NOT centered, left-aligned */}
              <div className="flex gap-10 pt-4 border-t border-stone-200 dark:border-zinc-800">
                <div>
                  <p className="text-4xl font-black text-[#b04a15]">100%</p>
                  <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mt-1">Verified Handovers</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-[#1e3a60] dark:text-blue-400">10km</p>
                  <p className="text-xs font-bold text-stone-505 dark:text-stone-400 uppercase tracking-wider mt-1">Local Radius</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-[#b04a15]">14+</p>
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
                src="/local_handover.png"
                alt="Local handover donation"
                width={600}
                height={500}
                className="rounded-xl object-cover w-full h-[380px] sm:h-[440px] hover:scale-[1.02] transition-transform duration-500"
                priority
              />
            </div>
            {/* Float badge — bottom-LEFT this time (not right) */}
            <div className="absolute -bottom-4 -left-4 bg-[#b04a15] text-white px-5 py-2.5 rounded-2xl shadow-lg border border-orange-400/20 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 animate-bounce">
              <Heart className="w-4 h-4 fill-white" />
              Verified Safe
            </div>
          </div>

        </div>
        </Reveal>
      </div>

      {/* ── Section 2: Vision & Mission — ALTERNATING OFFSET STAGGER ── */}
      <div className="bg-[#120c04] border-y border-stone-800/60 py-24 overflow-hidden relative">
        <div className="pointer-events-none absolute -top-32 left-[20%] w-[500px] h-[500px] rounded-full bg-[#b04a15]/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-[10%] w-[380px] h-[380px] rounded-full bg-[#1e3a60]/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 sm:px-10">

          {/* Right-flush heading */}
          <div className="flex flex-col lg:flex-row-reverse lg:items-end lg:justify-between gap-4 mb-16">
            <div className="lg:text-right">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-2 block">Our Direction</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-snug">Where We Are Heading</h2>
            </div>
            <p className="text-sm text-stone-400 font-medium max-w-sm">
              Building a transparent platform for community-centered philanthropy.
            </p>
          </div>

          {/* Vision & Mission Cards */}
          <Reveal direction="left">
          <div className="grid md:grid-cols-2 gap-8 items-stretch mb-8">
            <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-10 flex flex-col justify-between gap-6 group hover:bg-white/8 transition-all duration-300">
              <BorderBeam size={160} duration={7} colorFrom="#f0b97a" colorTo="#b04a15" />
              <div className="flex flex-col gap-6">
                <div className="p-3 w-fit rounded-xl bg-[#b04a15]/15 text-[#f0b97a]">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-white mb-3">{t("visionHeadline")}</h3>
                  <p className="text-stone-400 leading-relaxed font-medium text-sm sm:text-base">{t("visionText")}</p>
                </div>
              </div>
              <div className="text-xs font-bold text-[#f0b97a] uppercase tracking-wider">
                Transparent Ecosystem →
              </div>
            </div>

            <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-10 flex flex-col justify-between gap-6 group hover:bg-white/8 transition-all duration-300">
              <BorderBeam size={160} duration={7} delay={3.5} colorFrom="#7fb2f0" colorTo="#1e3a60" reverse />
              <div className="flex flex-col gap-6">
                <div className="p-3 w-fit rounded-xl bg-[#1e3a60]/30 text-blue-300">
                  <Milestone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-white mb-3">{t("missionHeadline")}</h3>
                  <p className="text-stone-400 leading-relaxed font-medium text-sm sm:text-base">{t("missionText")}</p>
                </div>
              </div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Direct Resource Distribution →
              </div>
            </div>
          </div>
          </Reveal>

        </div>
      </div>

      {/* ── Section 3: Core Values — MASONRY ASYMMETRIC ── */}
      <div className="mx-auto max-w-7xl px-6 sm:px-10 py-24">

        {/* Left-flush heading */}
        <Reveal>
        <div className="mb-16">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15] mb-2 block">02</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-white leading-snug max-w-md">
            What We Stand For
          </h2>
        </div>
        </Reveal>

        {/* Row 1: [3fr 2fr] — large community card + small secure card */}
        <Reveal delay={100}>
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] mb-6">
          {/* Large showcase card */}
          <div className="bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 grid sm:grid-cols-2">
            <div className="relative min-h-[240px]">
              <Image
                src="/distribution.png"
                alt="Community donation packing"
                fill
                className="object-cover"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white dark:to-zinc-900 z-10" />
            </div>
            <div className="p-8 flex flex-col justify-center relative z-20">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#b04a15] mb-2 block">Local Focus</span>
              <h3 className="text-xl font-extrabold text-stone-900 dark:text-white mb-3">{t("communityTitle")}</h3>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed font-medium text-sm">{t("communityText")}</p>
            </div>
          </div>

          {/* Small secure card */}
          <div className="p-8 bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800 rounded-3xl hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#1e3a60]/10 flex items-center justify-center text-[#1e3a60] dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-lg text-stone-900 dark:text-white mb-2">Secure Platform</h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                We facilitate direct connections under strict administrative moderation and location matching.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-bold text-stone-400 uppercase tracking-widest">
              Razorpay Secured
            </div>
          </div>
        </div>
        </Reveal>

        {/* Row 2: [1fr 3fr] — small verified card + large dark CTA card */}
        <Reveal delay={200}>
        <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          {/* Small verified card */}
          <div className="p-8 bg-white dark:bg-zinc-900 border border-[#e5e2d5]/60 dark:border-stone-800 rounded-3xl hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#b04a15]/10 flex items-center justify-center text-[#b04a15] mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6 fill-[#b04a15]" />
              </div>
              <h4 className="font-extrabold text-lg text-stone-900 dark:text-white mb-2">Verified Needs Only</h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-medium">
                Our team reviews every listing and request manually. Safe, verified, direct support.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-stone-100 dark:border-zinc-800 text-[11px] font-bold text-stone-400 uppercase tracking-widest">
              Admin Audited
            </div>
          </div>

          {/* Dynamic dynamic CTA card — hidden when authenticated */}
          <AboutCtaCard />
        </div>
        </Reveal>

      </div>

    </>
  );
}
