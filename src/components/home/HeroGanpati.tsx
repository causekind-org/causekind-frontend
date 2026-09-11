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
      /* `ck-ganpati-hero` earns its keep in styles.css, not here. This hero
         needs `ck-showcase-hero` for its layout — the negative top margin that
         tucks it under the nav, the stage's min-heights — but that class also
         carries a block of mobile CTA styling written for the plain hero, whose
         phone copy sits on a dark photo scrim. This one's sits on cream, so
         that styling painted both buttons in near-white on near-white. The
         marker is what lets those rules opt out. */
      className="ck-showcase-hero ck-ganpati-hero relative isolate flex flex-col overflow-hidden bg-[#fffdf9] text-[#100c06] dark:bg-[#190b05] dark:text-stone-100 w-full"
    >
      {/* Main Hero Stage spanning edge-to-edge for seamless continuity with Navbar */}
      <div className="ck-lead-hero-stage relative min-w-0 w-full min-h-[560px] sm:min-h-[620px] lg:min-h-[680px] xl:min-h-[730px] overflow-hidden bg-[#fffdf9] dark:bg-[#190b05]">

        {/* Photorealistic Ganpati Hero Background Image (Desktop & Large screens) */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none hidden lg:block overflow-hidden">
          {/* Subtle Divine Halo Aura behind Lord Ganesha */}
          <div
            className="absolute rounded-full pointer-events-none blur-3xl bg-radial from-[#fef08a]/60 via-[#f59e0b]/30 to-transparent"
            style={{
              top: "16%",
              right: "22%",
              width: "320px",
              height: "320px",
              animation: "divineHaloAura 5.2s ease-in-out infinite",
            }}
            aria-hidden="true"
          />

          <Image
            src="/images/ganpati-hero-bg-v5.webp"
            alt="Festive Ganpati Idol in Temple Setting"
            fill
            priority
            sizes="(min-width: 1024px) 100vw, 1px"
            className="object-cover object-[right_bottom]"
            style={{
              animation: "reverentPresence 7.2s ease-in-out infinite",
              transformOrigin: "72% 55%",
            }}
          />
          {/* Soft Warm Gradient Overlay on left side to guarantee text contrast and smooth blending */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#fffdf9] via-[#fffdf9]/88 to-transparent dark:from-[#190b05] dark:via-[#190b05]/88 dark:to-transparent w-[55%] xl:w-[50%]"
            aria-hidden="true"
          />
        </div>

        {/* Sacred Faint Rangoli / Mandala Watermark Backdrop (5-8% opacity) behind text area */}
        <div
          className="absolute -left-12 sm:-left-8 lg:left-2 top-1/2 -translate-y-1/2 w-[520px] sm:w-[620px] lg:w-[680px] aspect-square pointer-events-none select-none z-0"
          aria-hidden="true"
        >
          <RangoliBackdrop className="w-full h-full text-[#b45309] dark:text-amber-400 opacity-[0.07] dark:opacity-[0.08]" />
        </div>

        {/* Drifting Marigold Petals in the background layer (z-10: below text & buttons) */}
        <DriftingPetals className="pointer-events-none absolute inset-0 overflow-hidden select-none z-10" />

        {/* Foreground Content Container with generous breathing room and expanded scale (z-20: strictly above petals) */}
        <div className="relative z-20 mx-auto w-full max-w-[1440px] flex flex-col justify-center min-h-[560px] sm:min-h-[620px] lg:min-h-[680px] xl:min-h-[730px] px-6 py-10 sm:px-10 sm:py-14 lg:py-16 lg:pl-16 xl:pl-20">

          {/* ── The deity, on phones and tablets ──────────────────────────────
              Below lg this leads the hero instead of trailing it. It used to be
              a rounded card rendered after the CTAs, which put the whole reason
              the page looks like this below three paragraphs of copy, and read
              as an illustration attached to the hero rather than as the hero.

              Full-bleed, so it cancels this container's px-6/px-10 gutter and
              its py top padding and sits flush against the festival strip.

              The crop is the other half of the fix. The source is 1376x768 with
              Ganesha at roughly 69% across and the left half left deliberately
              empty as desktop's text bed. A short, wide band shows that empty
              half and shrinks him to nothing at the right edge, which is why he
              read as missing. A tall band crops width instead: at ~320px high
              on a 390px screen the visible window is the pillar rightward, so
              he lands near centre at full size, with the Spread Joy carton just
              catching the right edge. object-position is 97% and not 100% to
              keep a sliver of the arch on his left. */}
          <div className="relative -mx-6 -mt-10 mb-8 block h-[20rem] w-[calc(100%+3rem)] overflow-hidden sm:-mx-10 sm:-mt-14 sm:mb-9 sm:h-[24rem] sm:w-[calc(100%+5rem)] lg:hidden">
            <Image
              src="/images/ganpati-hero-bg-v5.webp"
              alt="Lord Ganesha seated on a flower-strewn altar with lit diyas"
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 1px"
              className="object-cover object-[97%_center]"
            />
            {/* The seam. Without it the photograph stops on a hard horizontal
                line against the cream and the hero reads as two stacked blocks
                rather than one surface. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#fffdf9] via-[#fffdf9]/70 to-transparent dark:from-[#190b05] dark:via-[#190b05]/70"
            />
          </div>

          <div className="max-w-[36rem] sm:max-w-[42rem] lg:max-w-[46rem] xl:max-w-[50rem]">

            {/* 1. Eyebrow Tag with Petal Accents */}
            <div className="inline-flex items-center gap-2.5 text-[#b45309] dark:text-amber-400">
              <PetalAccent className="size-4 text-[#ea580c] shrink-0" />
              <span className="text-[0.78rem] sm:text-[0.84rem] font-black uppercase tracking-[0.22em] text-[#9a3412] dark:text-amber-300">
                GANPATI FESTIVAL SPECIAL
              </span>
              <PetalAccent className="size-4 text-[#ea580c] shrink-0" flip />
            </div>

            {/* 2. Bold 2-Line Headline — Large, commanding scale matching reference */}
            <h1
              id="causekind-hero-title"
              className="mt-4 sm:mt-5 font-serif text-[clamp(2.15rem,3.5vw,3.65rem)] font-black tracking-tight leading-[1.12] text-[#1c1007] dark:text-stone-50"
            >
              <span className="block">{t("headlineTop")}</span>
              <span className="block bg-gradient-to-r from-[#b45309] via-[#c2410c] to-[#ea580c] bg-clip-text text-transparent dark:from-[#fb923c] dark:via-[#f97316] dark:to-[#facc15]">
                {t("headlineAccent")}
              </span>
            </h1>

            {/* 3. Body Paragraph with generous line height and spacing */}
            <p className="mt-4 sm:mt-5 max-w-[34rem] text-[1.05rem] font-medium leading-[1.7] text-[#3d2c1e] [text-wrap:pretty] dark:text-stone-200 sm:text-[1.12rem] lg:text-[1.18rem]">
              This Ganesh Chaturthi, what&apos;s extra for you could be essential to someone else. Give with intention, not just tradition.
            </p>

            {/* 4. Three Rounded Pill Badges */}
            <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* 100% Verified — Pale Yellow */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef9c3]/95 px-3.5 py-1.5 text-xs font-bold text-[#854d0e] border border-[#fef08a] shadow-2xs dark:bg-yellow-950/70 dark:border-yellow-700/50 dark:text-yellow-200 sm:text-[0.82rem]">
                <ShieldCheck className="size-4 text-[#ca8a04] dark:text-yellow-400 shrink-0" strokeWidth={2.2} />
                <span>100% Verified</span>
              </span>

              {/* Zero Fees — Pale Pink / Rose */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffe4e6]/95 px-3.5 py-1.5 text-xs font-bold text-[#9f1239] border border-[#fecdd3] shadow-2xs dark:bg-rose-950/70 dark:border-rose-700/50 dark:text-rose-200 sm:text-[0.82rem]">
                <Sparkles className="size-4 text-[#e11d48] dark:text-rose-400 shrink-0" strokeWidth={2.2} />
                <span>Zero Fees</span>
              </span>

              {/* Direct Handover — Pale Green */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7]/95 px-3.5 py-1.5 text-xs font-bold text-[#166534] border border-[#bbf7d0] shadow-2xs dark:bg-emerald-950/70 dark:border-emerald-700/50 dark:text-emerald-200 sm:text-[0.82rem]">
                <HandHeart className="size-4 text-[#16a34a] dark:text-emerald-400 shrink-0" strokeWidth={2.2} />
                <span>Direct Handover</span>
              </span>
            </div>

            {/* 5. Two Rounded Pill CTA Buttons with confident sizing (relative z-30 guarantees text is strictly above any background/overlay) */}
            <div className="ck-hero-actions relative z-30 mt-7 sm:mt-8 flex flex-col sm:flex-row w-full sm:w-max gap-3.5 sm:gap-4">
              {primaryAction.href ? (
                <NewRequestLink
                  href={primaryAction.href}
                  /* The ramp runs terracotta to amber-700, not to amber-600.
                     A white 12px bold label wants 4.5:1 and the old pale end
                     gave 3.19:1, its middle 3.56:1 — the label thinned out
                     across the right half of its own fill. Every stop now
                     clears it (7.31 / 5.18 / 5.02), so it holds wherever the
                     gradient happens to sit behind a given glyph.

                     Deliberately deeper than the marigold ramp the donor door
                     uses a section below. Two primaries that shout in the same
                     register read as two of the same thing; this one anchors,
                     that one invites. */
                  className="ck-hero-primary-cta group relative isolate inline-flex min-h-13 min-w-0 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#9a3412] via-[#c2410c] to-[#b45309] px-8 py-3.5 text-xs font-black uppercase leading-tight tracking-[0.06em] text-white shadow-[0_8px_24px_rgba(234,88,12,0.38)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_12px_28px_rgba(234,88,12,0.52)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:min-h-14 sm:w-auto sm:shrink-0 sm:whitespace-nowrap sm:px-9"
                >
                  <DiyaIcon className="relative z-[1] size-5 shrink-0 text-amber-200 group-hover:scale-110 transition-transform" />
                  <span className="relative z-[1] min-w-0 text-center">{primaryAction.label}</span>
                  <ArrowRight className="relative z-[1] size-4.5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-5" aria-hidden="true" />
                </NewRequestLink>
              ) : (
                <span
                  aria-hidden="true"
                  className="inline-flex min-h-13 min-w-0 w-full items-center justify-center gap-2.5 rounded-full bg-amber-700/70 px-8 py-3.5 text-xs font-extrabold uppercase leading-tight text-white/80 sm:min-h-14 sm:w-auto sm:shrink-0 sm:whitespace-nowrap sm:px-9"
                >
                  <DiyaIcon className="size-5 shrink-0 text-amber-200" />
                  <span className="min-w-0 text-center">{primaryAction.label}</span>
                  <ArrowRight className="size-4.5 shrink-0 sm:size-5" />
                </span>
              )}

              <Link
                href="/requests"
                /* `border-orange-600`, not `orange-500/80`. This button is a
                   white fill on a cream hero, so the border is the only thing
                   that says "button" — it is a component boundary, and 1.4.11
                   wants 3:1 for one of those. The 80% orange-500 it shipped
                   with measured 2.31:1 against its own fill; orange-600 at full
                   opacity measures 3.56:1. Dark mode keeps its own value, which
                   already clears the floor at 3.13:1. */
                className="ck-hero-secondary-cta group relative isolate inline-flex min-h-13 min-w-0 w-full items-center justify-center gap-2.5 rounded-full border-2 border-orange-600 bg-white/95 px-8 py-3.5 text-xs font-black uppercase leading-tight tracking-[0.05em] text-[#9a3412] shadow-[0_4px_14px_rgba(217,119,6,0.1)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-orange-50 hover:border-orange-600 hover:shadow-[0_6px_20px_rgba(217,119,6,0.22)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:bg-[#251007]/90 dark:border-orange-500/60 dark:text-amber-200 dark:hover:bg-[#34170b] sm:min-h-14 sm:w-auto sm:shrink-0 sm:whitespace-nowrap sm:px-8"
              >
                <UsersRound className="relative z-[1] size-5 shrink-0 text-[#c2410c] dark:text-amber-300" strokeWidth={2.2} aria-hidden="true" />
                <span className="relative z-[1] min-w-0 text-center">{t("ctaBrowse")}</span>
                <ArrowRight className="relative z-[1] size-4.5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-5" aria-hidden="true" />
              </Link>
            </div>

          </div>

          {/* The mobile showcase banner used to sit here, after the CTAs. It has
              moved to the top of this container — see the note there. */}
        </div>

      </div>

      {/* Floating Category Strip Ganpati with outlined circular icons */}
      <div className="relative z-30 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 lg:-mt-6">
        <CategoryStripGanpati />
      </div>

      {/* Sibling Trust Band Ganpati with Matching Glow Badges & Lotus Icon */}
      <div className="relative z-20 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 mt-3 lg:mt-5 pb-6">
        <TrustBandGanpati />
      </div>

    </section>
  );
}
