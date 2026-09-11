"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ModakIcon, DiyaIcon, RangoliBorderStrip } from "@/components/home/GanpatiVisuals";
import { PeekingBappaGanpati } from "@/components/home/PeekingBappaGanpati";

type Door = "donor" | "donee";

/**
 * MobileDoorsGanpati — Ganeshotsav skin for the mobile landing spine.
 *
 * <p><b>Why a sibling and not a prop.</b> Every other festive surface on this
 * page is a sibling file picked by `isGanpatiActive()` in `HomeClient`
 * (`HeroGanpati`, `LiveNeedsSectionGanpati`, `CTASectionGanpati`,
 * `FooterGanpati`). Threading a `festive` boolean through `MobileDoors`
 * instead would put two palettes in one file and leave the eleven festive days
 * sharing a component with the other 354 — the same reason the hero was split.
 *
 * <p><b>It keeps the original's contract exactly.</b> Same `{ door, pick }`
 * props from `useLandingDoor`, same `audiencePathways.*` copy, same
 * `data-tour="guest-join"` anchor, same `aria-pressed` switcher rather than a
 * tablist. Only the skin changes, so the door a visitor picked before the
 * festival still selects the same page below it.
 *
 * <p><b>Both doors are warm; value tells them apart, not hue.</b> The plain
 * build carries donor in terracotta and donee in teal, and teal has no place in
 * this palette. The first pass answered it with `leafGreen` (#15803d) on the
 * theory that a banana leaf is festival-correct — which it is, as a leaf. As a
 * button it was not: all 134 green values in this skin are foliage, so the one
 * green control on the page read as a success state rather than as a thali.
 *
 * <p>So the donee takes temple maroon warming into gold — #6b1717, a step
 * below `GANPATI_CONFIG.colors.maroon`, the same ramp the desktop donee panel
 * uses. Its CTA is the one exception: "Join as a donee" carries sindoor
 * #9f1239, for the reason recorded in `AudiencePathwayPanelGanpati` — the two
 * join buttons have to be told apart, and 21° of hue was not enough to do it.
 * The card stays maroon; only the button moves. The two doors stay as far apart as they
 * ever were because they always were separated by ground, not accent — the
 * donor is a near-black sanctum, the donee warm parchment — and neither reads
 * as the disabled option.
 */
export function MobileDoorsGanpati({ door, pick }: { door: Door; pick: (next: Door) => void }) {
  const t = useTranslations("audiencePathways");

  return (
    <section aria-labelledby="ck-doors-heading" className="relative">
      {/* Festive eyebrow. The mobile column has no room for the hero's full
          toran, so the rangoli cord does that job further down in a 14px band. */}
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <ModakIcon className="size-4 shrink-0" />
        <span className="h-px w-5 shrink-0 bg-amber-600/40" aria-hidden="true" />
        <p className="text-[0.5625rem] font-extrabold uppercase tracking-[0.16em] text-orange-800 dark:text-orange-300">
          Two doors, one festival
        </p>
        <span
          className="h-px min-w-0 flex-1 bg-gradient-to-r from-amber-600/40 to-transparent"
          aria-hidden="true"
        />
      </div>

      <h2
        id="ck-doors-heading"
        className="mt-3 font-serif text-[1.6rem] font-extrabold leading-[1.16] tracking-tight text-[#1a0f05] dark:text-stone-50"
      >
        {t("mobileQuestion")}
      </h2>
      <p className="mt-2.5 text-sm leading-relaxed text-[#4a3726] dark:text-stone-300 [text-wrap:pretty]">
        {t("mobileQuestionSub")}
      </p>

      <div className="mt-5 grid gap-3.5">
        {/* ── Door one: I have something ──
            The sanctum: deep maroon ground, gold hairline, saffron glow off the
            top-right corner exactly as the hero's halos fall. */}
        {/* The card is wrapped so Bappa can lean on it: the niche is in flow
            directly above the card with no gap between them, which is what puts
            his hands on the card's own gold top edge. The wrapper must stay a
            plain `<div>` — a `relative`, a `z-*` or a `transform` here would
            paint the fingers behind the card instead of over it. */}
        <div>
          <PeekingBappaGanpati />
          <div className="relative overflow-hidden rounded-[1.375rem] bg-gradient-to-br from-[#fde68a] via-[#d97706]/60 to-[#7c2d12] p-[1.5px] shadow-[0_14px_40px_rgba(217,119,6,0.22)]">
            {/* The gold ring is the parent's own gradient showing through 1.5px of
                padding, not a border: a border mitres at the corners and breaks
                the gradient, a padding ring does not. */}
            <div className="relative overflow-hidden rounded-[1.3rem] bg-gradient-to-br from-[#240c04] via-[#1a0802] to-[#120501] p-5 text-white">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_80%_at_85%_0%,rgba(234,88,12,0.45),transparent_62%)]"
              />
              {/* A single diya at the glow's origin. One lit lamp reads as
                  festive; a scatter of them reads as decoration. */}
              <DiyaIcon className="pointer-events-none absolute right-4 top-4 size-7 opacity-70" />

              <div className="relative">
                <p className="text-[0.5625rem] font-extrabold uppercase tracking-[0.16em] text-[#fcd34d]">
                  {t("donor.eyebrow")}
                </p>
                <h3 className="mt-3 max-w-[16rem] font-serif text-xl font-extrabold leading-[1.24] tracking-tight text-amber-50">
                  {t("mobileDonorHeading")}
                </h3>

                <ol className="mt-5 grid gap-3">
                  {["mobileDonorStep1", "mobileDonorStep2", "mobileDonorStep3"].map((key, i) => (
                    <li key={key} className="flex items-baseline gap-3">
                      {/* Gold numerals. The plain build greys these out; here they
                          are the only repeating accent inside the card, so they
                          carry the marigold. */}
                      <span className="w-4 shrink-0 text-[0.6875rem] font-extrabold tabular-nums text-[#d9a441]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-[0.8125rem] leading-relaxed text-amber-100/80">{t(key)}</p>
                    </li>
                  ))}
                </ol>

                <Link
                  href="/register?role=DONOR"
                  data-tour="guest-join"
                  onClick={() => pick("donor")}
                  className="mt-5 flex min-h-[3.125rem] items-center justify-center rounded-[0.8125rem] bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#ea580c] text-[0.9375rem] font-black tracking-wide text-[#2b1200] shadow-[0_8px_22px_rgba(217,119,6,0.4)] transition-transform active:scale-[0.97]"
                >
                  {t("donor.cta")}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Door two: I need something ──
            The banana leaf: warm parchment ground, amber border, leaf-green
            accent. Same shape as door one so neither reads as secondary. */}
        <div className="relative overflow-hidden rounded-[1.375rem] border border-amber-300/60 bg-gradient-to-br from-[#fffaf3] via-[#fff6e9] to-[#fff1de] p-5 shadow-[0_10px_30px_rgba(217,119,6,0.1)] dark:border-amber-900/40 dark:from-[#221008] dark:via-[#1b0b05] dark:to-[#160803]">
          {/* Maroon wash from the low corner, opposite the donor card's
              saffron, so the pair reads as two grounds and not two tints. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_10%_100%,rgba(107,23,23,0.10),transparent_60%)]"
          />
          <div className="relative">
            <p className="text-[0.5625rem] font-extrabold uppercase tracking-[0.16em] text-[#6b1717] dark:text-[#f87171]">
              {t("donee.eyebrow")}
            </p>
            <h3 className="mt-3 font-serif text-xl font-extrabold leading-[1.24] tracking-tight text-[#1a0f05] dark:text-stone-50">
              {t("mobileDoneeHeading")}
            </h3>
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-[#4a3726] dark:text-stone-300 [text-wrap:pretty]">
              {t("mobileDoneeBody")}
            </p>

            <Link
              href="/register?role=DONEE"
              onClick={() => pick("donee")}
              className="mt-4 flex min-h-[3.125rem] items-center justify-center rounded-[0.8125rem] border-[1.5px] border-[#9f1239] bg-white/70 text-[0.9375rem] font-extrabold text-[#9f1239] transition-transform active:scale-[0.97] dark:border-[#fda4af] dark:bg-transparent dark:text-[#fda4af]"
            >
              {t("donee.cta")}
            </Link>
          </div>
        </div>
      </div>

      {/*
        The switcher, festively dressed.

        Full-bleed for the same reason as the plain build: it is a rail the page
        hangs off, not a card, so it cancels the mobile column's px-5 with -mx-5
        and re-pads. What changes is the edging — a rangoli cord above and below
        instead of a hairline, which is the one place on this column where the
        festival's own border motif fits without taking room from a card.
      */}
      <div className="-mx-5 mt-11">
        <RangoliBorderStrip />
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#fff6e6] via-[#fffaf2] to-[#fff6e6] px-5 py-3 dark:from-[#1f0e06] dark:via-[#170a04] dark:to-[#1f0e06]">
          <ModakIcon className="size-3.5 shrink-0" />
          <span className="shrink-0 text-[0.5625rem] font-extrabold uppercase tracking-[0.12em] text-amber-800/80 dark:text-amber-500/80">
            {t("mobileShowingFor")}
          </span>
          {/* No `truncate`, for the reason the plain build records: clipping the
              one word that says what the page is showing is the worst thing
              this rail can do, and it has to hold in fourteen locales. */}
          <span className="min-w-0 flex-1 text-xs font-extrabold leading-snug text-[#1a0f05] dark:text-stone-100">
            {door === "donor" ? t("mobileShowingDonor") : t("mobileShowingDonee")}
          </span>
          <button
            type="button"
            aria-pressed={door === "donee"}
            onClick={() => pick(door === "donor" ? "donee" : "donor")}
            className="shrink-0 rounded-lg border border-amber-400/50 bg-white/70 px-2.5 py-1 text-xs font-extrabold text-[#9a3412] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300"
          >
            {t("mobileSwitch")}
          </button>
        </div>
        <RangoliBorderStrip flip />
      </div>
    </section>
  );
}

export default MobileDoorsGanpati;
