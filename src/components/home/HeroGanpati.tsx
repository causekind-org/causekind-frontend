"use client";

import Image from "next/image";
import Link from "next/link";
import { NewRequestLink } from "@/components/NewRequestLink";
import { ArrowRight, UsersRound, ShieldCheck, HandHeart } from "lucide-react";
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
 *   2 tinted pill badges ("100% Verified", "Direct Handover"), and 2 rounded pill CTAs.
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
      {/* Main Hero Stage. Below lg this is the tall cream stage the phone
          column wants; at lg it becomes upstream's uncropped 16:9 frame.

          `lg:flex` and not `flex`: upstream centres the stage's children
          vertically, which is right for a fixed-aspect desktop frame and wrong
          for the phone, where the deity band leads and the copy follows it. */}
      <div className="ck-lead-hero-stage relative min-w-0 w-full min-h-[560px] sm:min-h-[620px] lg:min-h-0 lg:aspect-[16/9] lg:max-h-[900px] xl:max-h-[960px] overflow-hidden bg-[#fffdf9] dark:bg-[#190b05] lg:flex lg:flex-col lg:justify-center">

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

        {/* Drifting Marigold Petals (z-10: below text & buttons).

            `lg:hidden`: upstream dropped these when the desktop stage became a
            full uncropped photograph, where drifting divs over the image read
            as dust on the lens. On the phone the photo is a band rather than
            the ground, so they still land. */}
        <DriftingPetals className="pointer-events-none absolute inset-0 overflow-hidden select-none z-10 lg:hidden" />

        {/* Foreground Content Container. Phone gutter and rhythm are this
            branch's; the lg padding and column width are upstream's. */}
        <div className="relative z-20 mx-auto w-full max-w-[1440px] flex flex-col justify-center min-h-[560px] sm:min-h-[620px] lg:min-h-0 px-6 py-10 sm:px-10 sm:py-14 lg:py-12 lg:pl-10 xl:pl-12 2xl:pl-16">

          {/* The deity, on phones and tablets.

              Below lg this leads the hero instead of trailing it. Upstream
              moved it back below the CTAs as a 16:9 card; this branch keeps it
              leading, which is the view being iterated on.

              Full-bleed, so it cancels this container's px-6/px-10 gutter and
              its py top padding and sits flush against the festival strip.

              Same photograph the desktop stage above uses, so the two views
              show one artwork rather than two of it. That swap is what the
              framing below is for: the old phone asset (bg-v5) was 1376x768
              with Ganesha at roughly 69% across and its left half left
              deliberately empty as desktop's text bed, so it had to be cropped
              hard to the right to find him at all. This one is composed around
              him — he sits at ~48%, arch and garlands frame him on both sides,
              diyas across the foot — so the band simply takes its middle.

              The height is `max(20rem, …)` and not a pair of fixed steps
              because the photo is 16:9 and this band is full-bleed: a band
              shorter than its own width ÷ 1.777 cannot be covered by the photo
              on height, and the framing below flips to cropping top and bottom
              instead. On a phone 20rem always wins and nothing moves — 57vw
              only overtakes it past ~480px, which is where a fixed 24rem
              started leaving the artwork short. `+3rem` pays for the gutter
              this band bleeds into, the wider sm one included. */}
          <div className="relative -mx-6 -mt-10 mb-8 block h-[max(20rem,calc(57vw+3rem))] w-[calc(100%+3rem)] overflow-hidden sm:-mx-10 sm:-mt-14 sm:mb-9 sm:w-[calc(100%+5rem)] lg:hidden">
            {/* The photograph's own box, sized and centred by hand instead of
                left to object-cover on the band. It comes out at exactly the
                box object-cover would pick — height binds, by the rule above,
                so the 16:9 width overflows the band evenly on both sides — but
                as a real element, which is what the emblem mask below needs: a
                frame it can be positioned inside in image percentages, the
                same ones the desktop stage uses, at every screen width. */}
            <div className="absolute left-1/2 top-0 h-full aspect-[1672/941] -translate-x-1/2">
              <Image
                src="/images/ganpati-hero-hd.webp"
                alt="Lord Ganesha seated on a flower-strewn altar with lit diyas"
                fill
                priority
                quality={100}
                /* Not the band's width — the box's, which is 1.777× the band
                   height and so overruns the viewport. Under ~480px that is a
                   flat 570px (20rem × 1.777); above it the height tracks 57vw
                   and the box lands near 101vw + 86px, which 105vw covers. */
                sizes="(max-width: 480px) 570px, (max-width: 1023px) 105vw, 1px"
                className="object-cover object-center"
              />
              {/* Kraft Cardboard Emblem Mask (covers printed logo on donation
                  box), carrying the desktop stage's percentages unchanged —
                  the carton catches the right edge of this band too, printed
                  mark and all. */}
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
            {/* The seam. Without it the photograph stops on a hard horizontal
                line against the cream and the hero reads as two stacked blocks
                rather than one surface.

                Shorter than it was (h-24). The old asset ended in empty floor,
                so a tall fade cost nothing; this one ends in the altar's
                marigold row and the lit diyas, and 96px of cream swallowed
                them. 64px still lands on cream at the bottom edge. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#fffdf9] via-[#fffdf9]/70 to-transparent dark:from-[#190b05] dark:via-[#190b05]/70"
            />
          </div>

          {/* Phone measure is this branch's; the lg column is upstream's
              narrower one, which is what its 16:9 stage needs. */}
          <div className="w-full max-w-[36rem] sm:max-w-[42rem] lg:max-w-[29rem] xl:max-w-[31rem]">

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

            {/* 4. Two Rounded Pill Badges with proportional spacing */}
            <div className="mt-5 sm:mt-5.5 flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* 100% Verified — Pale Yellow */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef9c3]/95 px-3 py-1.2 text-xs font-bold text-[#854d0e] border border-[#fef08a] shadow-2xs dark:bg-yellow-950/70 dark:border-yellow-700/50 dark:text-yellow-200 sm:text-[0.78rem]">
                <ShieldCheck className="size-3.5 text-[#ca8a04] dark:text-yellow-400 shrink-0" strokeWidth={2.2} />
                <span>100% Verified</span>
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
                  /* The ramp runs terracotta to amber-700, not to amber-600.
                     A white 12px bold label wants 4.5:1 and the pale end gave
                     3.19:1, its middle 3.56:1 — the label thinned out across
                     the right half of its own fill. Every stop now clears it
                     (7.31 / 5.18 / 5.02). Kept through the merge rather than
                     taken from upstream, which still carries the pre-fix ramp:
                     upstream changed this button's size, not its colour, so
                     there is nothing on that side to prefer here.

                     Deliberately deeper than the marigold ramp the donor door
                     uses a section below. Two primaries that shout in the same
                     register read as two of the same thing; this one anchors,
                     that one invites.

                     The lg: run is upstream's tighter desktop button; the phone
                     keeps the full-width 52px target. */
                  className="ck-hero-primary-cta group relative isolate inline-flex min-h-13 min-w-0 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#9a3412] via-[#c2410c] to-[#b45309] px-8 py-3.5 text-xs font-black uppercase leading-tight tracking-[0.06em] text-white shadow-[0_8px_24px_rgba(234,88,12,0.38)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_12px_28px_rgba(234,88,12,0.52)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:min-h-14 sm:w-auto sm:shrink-0 sm:whitespace-nowrap sm:px-9 lg:min-h-11.5 lg:gap-2 lg:px-6.5 lg:py-2.5 lg:tracking-[0.05em]"
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
                /* `border-orange-600`, not `orange-500/80`. This button is a
                   white fill on a cream hero, so the border is the only thing
                   that says "button" — it is a component boundary, and 1.4.11
                   wants 3:1 for one of those. The 80% orange-500 upstream still
                   carries measured 2.31:1 against its own fill; orange-600 at
                   full opacity measures 3.56:1. Dark mode keeps its own value,
                   which already clears the floor at 3.13:1.

                   The lg: run is upstream's tighter desktop button. */
                className="ck-hero-secondary-cta group relative isolate inline-flex min-h-13 min-w-0 w-full items-center justify-center gap-2.5 rounded-full border-2 border-orange-600 bg-white/95 px-8 py-3.5 text-xs font-black uppercase leading-tight tracking-[0.05em] text-[#9a3412] shadow-[0_4px_14px_rgba(217,119,6,0.1)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-orange-50 hover:border-orange-600 hover:shadow-[0_6px_20px_rgba(217,119,6,0.22)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:bg-[#251007]/90 dark:border-orange-500/60 dark:text-amber-200 dark:hover:bg-[#34170b] sm:min-h-14 sm:w-auto sm:shrink-0 sm:whitespace-nowrap sm:px-8 lg:min-h-11.5 lg:gap-2 lg:px-5.5 lg:py-2.5 lg:tracking-[0.04em]"
              >
                <UsersRound className="relative z-[1] size-4 shrink-0 text-[#c2410c] dark:text-amber-300" strokeWidth={2.2} aria-hidden="true" />
                <span className="relative z-[1] min-w-0 text-center">{t("ctaBrowse")}</span>
                <ArrowRight className="relative z-[1] size-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 sm:size-4" aria-hidden="true" />
              </Link>
            </div>

          </div>

          {/* Upstream re-adds its 16:9 showcase banner here, after the CTAs.
              Dropped in this branch: the deity already leads this column, and
              keeping both puts the same photograph on the phone twice. The
              desktop stage above is upstream's, which is where that uncropped
              framing now lives. */}
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
