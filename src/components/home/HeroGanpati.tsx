"use client";

import Link from "next/link";
import { NewRequestLink } from "@/components/NewRequestLink";
import { ArrowRight, MapPin, UsersRound, Sparkles, ShieldCheck, HandHeart } from "lucide-react";
import { useTranslations } from "next-intl";

import { CategoryStripGanpati } from "@/components/home/CategoryStripGanpati";
import { TrustBandGanpati } from "@/components/home/TrustBandGanpati";
import {
  GanpatiToran,
  GanpatiHeroIllo,
  DriftingPetals,
  RangoliBackdrop,
  ModakIcon,
} from "@/components/home/GanpatiVisuals";
import { useAuth } from "@/hooks/useAuth";
import { registerUrlPreserving } from "@/lib/postAuthDestination";

function usePrimaryAction() {
  const t = useTranslations("hero");
  const { user, isLoading } = useAuth();
  const role = user?.role.replace(/^ROLE_/, "");

  if (isLoading) {
    return { href: null, label: t("ctaStartGiving") };
  }

  if (role === "DONOR") {
    return { href: "/items/new", label: t("ctaListItem") };
  }

  if (role === "DONEE") {
    return { href: "/requests/new", label: t("ctaRequestItem") };
  }

  if (role === "ADMIN") {
    return { href: "/admin/dashboard", label: t("ctaOpenDashboard") };
  }

  if (role === "SUPER_ADMIN") {
    return { href: "/super-admin", label: t("ctaOpenDashboard") };
  }

  return {
    href: registerUrlPreserving("/items/new"),
    label: t("ctaStartGiving"),
  };
}

/**
 * HeroGanpati — Festive Ganeshotsav skin for the main front door hero.
 *
 * Upgraded layout:
 * - Perfectly balanced vertical rhythm: eyebrow, 2-line headline, sub-line, enriched body copy,
 *   3 festive trust/impact badges, and CTA buttons.
 * - Entire left content block vertically centered within the column to balance with Ganesha on the right.
 * - Saffron/maroon pill badges ("100% Verified", "Zero Fees", "Direct Handover") fill vertical rhythm meaningfully.
 * - Increased font size and line-height on body text for readability.
 * - Subtle sacred Rangoli / Mandala watermark in background at 7% opacity.
 */
export function HeroGanpati() {
  const t = useTranslations("hero");
  const primaryAction = usePrimaryAction();

  return (
    <section
      data-tour="guest-hero"
      aria-labelledby="causekind-hero-title"
      className="ck-showcase-hero relative isolate flex flex-col overflow-hidden bg-gradient-to-b from-[#fff8ed] via-[#fff3e4] to-[#ffeed6] px-3 pb-3 pt-0 text-[#100c06] dark:from-[#210c05] dark:via-[#190802] dark:to-[#120501] dark:text-stone-100 sm:px-5 sm:pb-4 lg:px-[clamp(2rem,3.4vw,5.5rem)]"
    >
      {/* 1. Living Botanical Toran: Full-width edge-to-edge */}
      <div className="relative -mx-3 sm:-mx-5 lg:-mx-[clamp(2rem,3.4vw,5.5rem)] w-[calc(100%+1.5rem)] sm:w-[calc(100%+2.5rem)] lg:w-[calc(100%+clamp(4rem,6.8vw,11rem))] z-30 -mb-1 sm:-mb-2 pointer-events-none select-none overflow-visible">
        <GanpatiToran />
      </div>

      {/* 2. Drifting Marigold Petals in the background */}
      <DriftingPetals />

      {/* 3. Ambient warm festive glow halos */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 size-[450px] rounded-full bg-gradient-to-br from-amber-400/25 via-orange-400/15 to-transparent blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/4 right-0 size-[500px] rounded-full bg-gradient-to-bl from-rose-500/15 via-amber-400/20 to-transparent blur-3xl"
        aria-hidden="true"
      />

      {/* Frame: Proven container width matching original HeroSection.tsx */}
      <div className="ck-hero-frame relative z-10 mx-auto min-w-0 w-full max-w-[1920px]">

        {/* Main Stage: Balanced 2-column grid */}
        <div className="ck-lead-hero-stage relative grid min-w-0 rounded-3xl bg-[#fffaf3]/95 border border-amber-200/70 shadow-[0_16px_50px_rgba(217,119,6,0.12)] dark:bg-[#1a0c06]/95 dark:border-amber-900/40 dark:shadow-[0_16px_50px_rgba(0,0,0,0.5)] lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)] overflow-hidden">

          {/* Subtle Sacred Rangoli / Mandala Watermark Backdrop (6-8% opacity) */}
          <div className="pointer-events-none absolute -left-12 top-1/2 -translate-y-1/2 size-[480px] lg:size-[560px] text-amber-600/7 dark:text-amber-400/8 z-0">
            <RangoliBackdrop className="size-full" />
          </div>

          {/* Left Copy Column: Sits close to the toran without dead space */}
          <div className="ck-hero-copy relative z-10 flex min-w-0 flex-col justify-start px-4 pb-8 pt-4 sm:px-8 sm:pb-10 sm:pt-6 lg:px-0 lg:pt-6 lg:pb-10 lg:pl-[clamp(2rem,3.2vw,4.2rem)] lg:pr-[clamp(1.5rem,2.5vw,2.5rem)]">

            {/* 1. Eyebrow */}
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <ModakIcon className="size-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="h-px w-6 bg-amber-600/40 sm:w-10" aria-hidden="true" />
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] sm:text-xs text-orange-800 dark:text-orange-300">
                GANESHOTSAV GIVING · MAKING LIVES BETTER
              </p>
              <span className="h-px w-6 bg-amber-600/40 sm:w-10" aria-hidden="true" />
              <ModakIcon className="size-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
            </div>

            {/* 2. Responsive, Unclipped Headline */}
            <h1
              id="causekind-hero-title"
              className="mt-3 sm:mt-4 font-serif text-[clamp(1.75rem,5.5vw,2.95rem)] font-extrabold tracking-tight leading-[1.15] text-[#1a0f05] dark:text-stone-50 break-words"
            >
              <span className="block sm:whitespace-nowrap">{t("headlineTop")}</span>
              <span className="block sm:whitespace-nowrap bg-gradient-to-r from-[#c2410c] via-[#ea580c] to-[#d97706] bg-clip-text text-transparent dark:from-[#fb923c] dark:via-[#f97316] dark:to-[#facc15]">
                {t("headlineAccent")}
              </span>
            </h1>

            {/* 3. Sub-line divider */}
            <div className="mt-[clamp(0.85rem,2vh,1.5rem)] flex items-center gap-3 text-amber-600 dark:text-amber-400" aria-hidden="true">
              <span className="h-px w-[clamp(2.5rem,6vw,6rem)] bg-amber-500/40" />
              <span className="flex items-center gap-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
                <Sparkles className="size-3.5 fill-current text-amber-500" />
                <span>Blessing through giving</span>
                <Sparkles className="size-3.5 fill-current text-amber-500" />
              </span>
              <span className="h-px w-[clamp(2.5rem,6vw,6rem)] bg-amber-500/40" />
            </div>

            {/* 4. Enriched Body Paragraph */}
            <p className="mt-[clamp(0.9rem,2.2vh,1.6rem)] max-w-[36rem] text-base font-medium leading-[1.65] text-[#3d2c1e] [text-wrap:pretty] dark:text-stone-200 sm:text-lg lg:text-[clamp(1.08rem,1.3vw,1.35rem)] lg:leading-[1.7]">
              This Ganesh Chaturthi, what&apos;s extra for you could be essential to someone else. Give with intention, not just tradition.
            </p>

            {/* 5. Trust & Impact Strip */}
            <div className="mt-[clamp(1rem,2.2vh,1.65rem)] flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-3 py-1.5 text-[0.72rem] font-bold text-amber-900 border border-amber-300/60 shadow-xs dark:bg-amber-950/70 dark:border-amber-700/50 dark:text-amber-200 sm:text-xs">
                <ShieldCheck className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>100% Verified</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100/90 px-3 py-1.5 text-[0.72rem] font-bold text-orange-900 border border-orange-300/60 shadow-xs dark:bg-orange-950/70 dark:border-orange-700/50 dark:text-orange-200 sm:text-xs">
                <Sparkles className="size-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                <span>Zero Fees</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100/90 px-3 py-1.5 text-[0.72rem] font-bold text-yellow-900 border border-yellow-300/60 shadow-xs dark:bg-yellow-950/70 dark:border-yellow-700/50 dark:text-yellow-200 sm:text-xs">
                <HandHeart className="size-3.5 text-yellow-700 dark:text-yellow-400 shrink-0" />
                <span>Direct Handover</span>
              </span>
            </div>

            {/* 6. Interactive CTA Actions: clean column on mobile, row on tablet/desktop */}
            <div className="ck-hero-actions mt-[clamp(1.3rem,2.8vh,2.2rem)] flex flex-col sm:flex-row w-full sm:w-max gap-3 sm:gap-3.5">
              {primaryAction.href ? (
                <NewRequestLink
                  href={primaryAction.href}
                  className="ck-hero-primary-cta group relative isolate inline-flex min-h-12 min-w-0 w-full items-center justify-center gap-2 rounded-[0.85rem] bg-gradient-to-r from-[#c2410c] via-[#d97706] to-[#ea580c] px-5 py-3 text-xs font-black uppercase leading-tight tracking-[0.05em] text-white shadow-[0_10px_25px_rgba(217,119,6,0.35)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(234,88,12,0.6)] active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:min-h-14 sm:w-auto sm:shrink-0 sm:gap-3 sm:whitespace-nowrap sm:rounded-[0.95rem] sm:px-7"
                >
                  <MapPin className="relative z-[1] size-4 shrink-0 sm:size-5" strokeWidth={2.2} aria-hidden="true" />
                  <span className="relative z-[1] min-w-0 text-center">{primaryAction.label}</span>
                  <ArrowRight className="relative z-[1] size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-5" aria-hidden="true" />
                </NewRequestLink>
              ) : (
                <span
                  aria-hidden="true"
                  className="inline-flex min-h-12 min-w-0 w-full items-center justify-center gap-2 rounded-[0.85rem] bg-amber-700/70 px-5 py-3 text-xs font-extrabold uppercase leading-tight text-white/80 sm:min-h-14 sm:w-auto sm:shrink-0 sm:gap-3 sm:whitespace-nowrap sm:rounded-[0.95rem] sm:px-7"
                >
                  <MapPin className="size-4 shrink-0 sm:size-5" />
                  <span className="min-w-0 text-center">{primaryAction.label}</span>
                  <ArrowRight className="size-4 shrink-0 sm:size-5" />
                </span>
              )}

              <Link
                href="/requests"
                className="ck-hero-secondary-cta group relative isolate inline-flex min-h-12 min-w-0 w-full items-center justify-center gap-2 rounded-[0.85rem] bg-white/85 px-5 py-3 text-xs font-black uppercase leading-tight tracking-[0.04em] text-[#9a3412] shadow-[inset_0_0_0_1.5px_rgba(217,119,6,0.5),0_4px_14px_rgba(217,119,6,0.1)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:bg-amber-50 hover:shadow-[inset_0_0_0_1.8px_rgba(217,119,6,0.8),0_0_24px_rgba(217,119,6,0.4)] active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/40 sm:min-h-14 sm:w-auto sm:shrink-0 sm:gap-3 sm:whitespace-nowrap sm:rounded-[0.95rem] sm:px-6"
              >
                <UsersRound className="relative z-[1] size-4 shrink-0 sm:size-5" strokeWidth={2} aria-hidden="true" />
                <span className="relative z-[1] min-w-0 text-center">{t("ctaBrowse")}</span>
                <ArrowRight className="relative z-[1] size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right Column: Kept intact for future illustration placement */}
          <div className="relative hidden lg:flex lg:min-h-[560px] min-w-0 items-center justify-center overflow-hidden lg:rounded-r-3xl bg-gradient-to-br from-[#fff2de]/85 via-[#fde8cf]/75 to-[#fed7aa]/65 dark:from-[#2a1309]/85 dark:via-[#1e0d05]/75 dark:to-[#170802]/65 p-3 sm:p-5 lg:p-8">

            {/* Badges */}
            <div className="absolute top-6 left-8 hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-stone-900/95 shadow-md border border-amber-300/50 text-xs font-black text-amber-800 dark:text-amber-300 z-20">
              <ModakIcon className="size-4" />
              <span>Modak of Kindness</span>
            </div>

            <div className="absolute bottom-14 right-8 hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-stone-900/95 shadow-md border border-amber-300/50 text-xs font-black text-orange-800 dark:text-orange-300 z-20">
              <ModakIcon className="size-4" />
              <span>Auspicious Giving</span>
            </div>

            {/* Ganpati & Mushak illustration removed per user request */}
            {/* <GanpatiHeroIllo /> */}
          </div>

        </div>

        {/* Sibling Category Strip Ganpati with Festive Medallions */}
        <div className="relative z-30 -mt-3 lg:-mt-[clamp(1.75rem,3.7vh,2.75rem)]">
          <CategoryStripGanpati />
        </div>

        {/* Sibling Trust Band Ganpati with Matching Glow Badges & Lotus Icon */}
        <div className="relative z-20 mt-2 lg:mt-[clamp(1.25rem,2.4vh,1.65rem)]">
          <TrustBandGanpati />
        </div>

      </div>
    </section>
  );
}
