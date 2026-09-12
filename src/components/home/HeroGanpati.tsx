"use client";

import Image from "next/image";
import Link from "next/link";
import { NewRequestLink } from "@/components/NewRequestLink";
import { ArrowRight, UsersRound, ShieldCheck, Sparkles, HandHeart } from "lucide-react";
import { useTranslations } from "next-intl";

import { CategoryStripGanpati } from "@/components/home/CategoryStripGanpati";
import { TrustBandGanpati } from "@/components/home/TrustBandGanpati";
import {
  DriftingPetals,
  DiyaIcon,
  PetalAccent,
  RangoliBackdrop,
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
 * Recreated to match the reference mockup:
 * - Photorealistic Ganpati background image with altar, temple archway, sunset river, diyas,
 *   garlands, and "Share Care Spread Joy" gift box.
 * - Precise left text hierarchy: Eyebrow with petal accents, 2-line headline, body paragraph,
 *   3 tinted pill badges ("100% Verified", "Zero Fees", "Direct Handover"), and 2 rounded pill CTAs.
 * - Drifting flower petals in foreground across both left and right sides.
 * - Faint circular rangoli mandala pattern in background (5-8% opacity).
 * - Floating Category Strip Ganpati with outlined circular icons.
 */
export function HeroGanpati() {
  const t = useTranslations("hero");
  const primaryAction = usePrimaryAction();

  return (
    <section
      data-tour="guest-hero"
      aria-labelledby="causekind-hero-title"
      className="ck-showcase-hero relative isolate flex flex-col overflow-hidden bg-[#fffdf9] text-[#100c06] dark:bg-[#190b05] dark:text-stone-100 w-full"
    >
      {/* Main Hero Stage with full uncropped 16:9 aspect ratio */}
      <div className="ck-lead-hero-stage relative min-w-0 w-full min-h-[560px] sm:min-h-[620px] lg:min-h-0 lg:aspect-[16/9] lg:max-h-[900px] xl:max-h-[960px] overflow-hidden bg-[#fffdf9] dark:bg-[#190b05] flex flex-col justify-center">
        
        {/* Photorealistic Ganpati Hero Full Background Image (Desktop & Large screens) */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none hidden lg:block overflow-hidden">
          <Image
            src="/images/ganpati-hero-hd.webp"
            alt="Festive Ganpati Idol in Temple Setting"
            fill
            priority
            quality={100}
            sizes="100vw"
            className="object-contain lg:object-cover object-center"
          />
          {/* Subtle Warm Gradient Overlay on left side to guarantee text contrast without washing out the idol */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#fffdf9] via-[#fffdf9]/75 22% via-[#fffdf9]/10 44% to-transparent dark:from-[#190b05] dark:via-[#190b05]/80 22% dark:via-[#190b05]/10 44% dark:to-transparent w-[50%] xl:w-[44%] 2xl:w-[38%]"
            aria-hidden="true"
          />
          {/* Kraft Cardboard Emblem Mask (covers printed logo on donation box) */}
          <div
            className="absolute rounded-full pointer-events-none z-[1]"
            style={{
              left: "79.8%",
              top: "78.5%",
              width: "7.0%",
              height: "11.0%",
              background: "radial-gradient(ellipse at 50% 50%, #c46830 0%, #bc612a 65%, rgba(184,94,40,0.85) 85%, rgba(184,94,40,0) 100%)",
              filter: "blur(2.5px)",
            }}
            aria-hidden="true"
          />
        </div>

        {/* Sacred Faint Rangoli / Mandala Watermark Backdrop (5-8% opacity) behind text area */}
        <div
          className="absolute -left-12 sm:-left-8 lg:-left-4 top-1/2 -translate-y-1/2 w-[440px] sm:w-[500px] lg:w-[540px] aspect-square pointer-events-none select-none z-0"
          aria-hidden="true"
        >
          <RangoliBackdrop className="w-full h-full text-[#b45309] dark:text-amber-400 opacity-[0.06] dark:opacity-[0.07]" />
        </div>

        {/* Drifting Festive Flower Petals (Subtle foreground depth, 6-8 petals, z-10 behind content) */}
        <DriftingPetals className="pointer-events-none absolute inset-0 overflow-hidden select-none z-10" />

        {/* Foreground Content Container positioned on left with vertical centering */}
        <div className="relative z-20 mx-auto w-full max-w-[1440px] flex flex-col justify-center px-5 pt-16 pb-8 sm:px-8 sm:pt-20 sm:pb-10 lg:py-12 lg:pl-10 xl:pl-12 2xl:pl-16">
          <div className="w-full max-w-[23rem] sm:max-w-[27rem] lg:max-w-[29rem] xl:max-w-[31rem]">
            
            {/* 1. Eyebrow Tag with Petal Accents */}
            <div className="inline-flex items-center gap-2 text-[#b45309] dark:text-amber-400">
              <PetalAccent className="size-3.5 text-[#ea580c] shrink-0" />
              <span className="text-[0.74rem] sm:text-[0.78rem] font-black uppercase tracking-[0.18em] text-[#9a3412] dark:text-amber-300">
                GANPATI FESTIVAL SPECIAL
              </span>
              <PetalAccent className="size-3.5 text-[#ea580c] shrink-0" flip />
            </div>

            {/* 2. Bold 4-Line Headline with explicit hard line breaks */}
            <h1
              id="causekind-hero-title"
              className="mt-3.5 sm:mt-4 font-serif text-[clamp(1.75rem,2.15vw,2.55rem)] xl:text-[2.7rem] font-black tracking-tight leading-[1.15] text-[#1c1007] dark:text-stone-50"
            >
              <span className="block">
                Find Someone<br />Near You
              </span>
              <span className="block bg-gradient-to-r from-[#b45309] via-[#c2410c] to-[#ea580c] bg-clip-text text-transparent dark:from-[#fb923c] dark:via-[#f97316] dark:to-[#facc15]">
                Who Needs What<br />You Have
              </span>
            </h1>

            {/* 3. Body Paragraph with enhanced breathing room and font size */}
            <p className="mt-3.5 sm:mt-4 max-w-[24rem] sm:max-w-[27rem] text-[0.92rem] font-medium leading-[1.62] text-[#3d2c1e] [text-wrap:pretty] dark:text-stone-200 sm:text-[0.98rem] lg:text-[1rem]">
              This Ganesh Chaturthi, what&apos;s extra for you could be essential to someone else. Give with intention, not just tradition.
            </p>

            {/* 4. Three Rounded Pill Badges with proportional spacing */}
            <div className="mt-5 sm:mt-5.5 flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* 100% Verified — Pale Yellow */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef9c3]/95 px-3 py-1.2 text-xs font-bold text-[#854d0e] border border-[#fef08a] shadow-2xs dark:bg-yellow-950/70 dark:border-yellow-700/50 dark:text-yellow-200 sm:text-[0.78rem]">
                <ShieldCheck className="size-3.5 text-[#ca8a04] dark:text-yellow-400 shrink-0" strokeWidth={2.2} />
                <span>100% Verified</span>
              </span>

              {/* Zero Fees — Pale Pink / Rose */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe4e6]/95 px-3 py-1.2 text-xs font-bold text-[#9f1239] border border-[#fecdd3] shadow-2xs dark:bg-rose-950/70 dark:border-rose-700/50 dark:text-rose-200 sm:text-[0.78rem]">
                <Sparkles className="size-3.5 text-[#e11d48] dark:text-rose-400 shrink-0" strokeWidth={2.2} />
                <span>Zero Fees</span>
              </span>

              {/* Direct Handover — Pale Green */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7]/95 px-3 py-1.2 text-xs font-bold text-[#166534] border border-[#bbf7d0] shadow-2xs dark:bg-emerald-950/70 dark:border-emerald-700/50 dark:text-emerald-200 sm:text-[0.78rem]">
                <HandHeart className="size-3.5 text-[#16a34a] dark:text-emerald-400 shrink-0" strokeWidth={2.2} />
                <span>Direct Handover</span>
              </span>
            </div>

            {/* 5. Two Vertically Stacked Rounded Pill CTA Buttons (16px gap, natural width) */}
            <div className="ck-hero-actions relative z-30 mt-7 sm:mt-8 flex flex-col items-start w-max max-w-full gap-4">
              {primaryAction.href ? (
                <NewRequestLink
                  href={primaryAction.href}
                  className="ck-hero-primary-cta group relative isolate inline-flex min-h-11 sm:min-h-11.5 min-w-0 w-auto shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#c2410c] via-[#ea580c] to-[#d97706] px-5.5 py-2.5 text-xs font-black uppercase leading-tight tracking-[0.05em] text-white shadow-[0_6px_20px_rgba(234,88,12,0.35)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_10px_24px_rgba(234,88,12,0.48)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:px-6.5"
                >
                  <DiyaIcon className="relative z-[1] size-4 shrink-0 text-amber-200 group-hover:scale-110 transition-transform" />
                  <span className="relative z-[1] min-w-0 text-center">{primaryAction.label}</span>
                  <ArrowRight className="relative z-[1] size-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-4" aria-hidden="true" />
                </NewRequestLink>
              ) : (
                <span
                  aria-hidden="true"
                  className="inline-flex min-h-11 sm:min-h-11.5 min-w-0 w-auto shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-full bg-amber-700/70 px-5.5 py-2.5 text-xs font-extrabold uppercase leading-tight text-white/80 sm:px-6.5"
                >
                  <DiyaIcon className="size-4 shrink-0 text-amber-200" />
                  <span className="min-w-0 text-center">{primaryAction.label}</span>
                  <ArrowRight className="size-3.5 shrink-0 sm:size-4" />
                </span>
              )}

              <Link
                href="/requests"
                className="ck-hero-secondary-cta group relative isolate inline-flex min-h-11 sm:min-h-11.5 min-w-0 w-auto shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-full border-2 border-orange-500/80 bg-white/95 px-5 py-2.5 text-xs font-black uppercase leading-tight tracking-[0.04em] text-[#9a3412] shadow-[0_4px_12px_rgba(217,119,6,0.08)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-orange-50 hover:border-orange-600 hover:shadow-[0_6px_18px_rgba(217,119,6,0.18)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:bg-[#251007]/90 dark:border-orange-500/60 dark:text-amber-200 dark:hover:bg-[#34170b] sm:px-5.5"
              >
                <UsersRound className="relative z-[1] size-4 shrink-0 text-[#c2410c] dark:text-amber-300" strokeWidth={2.2} aria-hidden="true" />
                <span className="relative z-[1] min-w-0 text-center">{t("ctaBrowse")}</span>
                <ArrowRight className="relative z-[1] size-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-4" aria-hidden="true" />
              </Link>
            </div>

          </div>

          {/* Mobile Ganpati Showcase banner — Full 16:9 uncropped image */}
          <div className="mt-6 sm:mt-8 relative block lg:hidden w-full aspect-[16/9] rounded-2xl overflow-hidden border border-amber-200/70 shadow-[0_8px_30px_rgba(217,119,6,0.16)]">
            <Image
              src="/images/ganpati-hero-hd.webp"
              alt="Festive Ganpati Idol in Temple Setting"
              fill
              priority
              quality={100}
              sizes="(max-width: 1024px) 100vw, 100vw"
              className="object-contain sm:object-cover object-center"
            />
            {/* Kraft Cardboard Emblem Mask (covers printed logo on donation box) */}
            <div
              className="absolute rounded-full pointer-events-none z-[1]"
              style={{
                left: "79.8%",
                top: "78.5%",
                width: "7.0%",
                height: "11.0%",
                background: "radial-gradient(ellipse at 50% 50%, #c46830 0%, #bc612a 65%, rgba(184,94,40,0.85) 85%, rgba(184,94,40,0) 100%)",
                filter: "blur(2px)",
              }}
              aria-hidden="true"
            />
          </div>
        </div>

      </div>

      {/* Floating Category Strip Ganpati overlapping bottom edge of hero image (~40-50% overlap) */}
      <div className="relative z-30 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 -mt-5 sm:-mt-8 lg:-mt-12 xl:-mt-14">
        <CategoryStripGanpati />
      </div>

      {/* Sibling Trust Band Ganpati with Matching Glow Badges & Lotus Icon */}
      <div className="relative z-20 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 mt-4 lg:mt-6 pb-6">
        <TrustBandGanpati />
      </div>

    </section>
  );
}
