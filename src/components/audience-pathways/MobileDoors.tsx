"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useTranslations } from "next-intl";
import LetterSwap from "@/components/LetterSwap";

type Door = "donor" | "donee";

const STORAGE_KEY = "ck_landing_door";

/**
 * Owns which door is picked, and remembers it.
 *
 * <p>State lives in a hook rather than inside `MobileDoors` because the page
 * *below* the doors is what changes, and those sections are rendered by
 * `HomeClient`, not by this component. Two `useState`s would not agree.
 *
 * <p>Starts on `donor` rather than on nothing. Stacked on a 390px column the
 * second door is below the fold, so there is no neutral first paint available —
 * whatever renders below the switcher is the default whether it is named or
 * not. Naming it keeps that slot from being empty on the first screen, and the
 * switcher is what makes it reversible.
 */
export function useLandingDoor() {
  const [door, setDoor] = useState<Door>("donor");

  // Read after mount, never during render: the server has no localStorage and a
  // first paint that disagreed with it would hydrate-mismatch.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "donor" || saved === "donee") setDoor(saved);
    } catch {}
  }, []);

  const pick = useCallback((next: Door) => {
    setDoor(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }, []);

  return { door, pick };
}

/**
 * The mobile landing spine, below the hero: one question, two doors, and then a
 * page that follows whichever door was picked.
 *
 * <p><b>Guest only.</b> The caller gates this on `showAudiencePathways`, exactly
 * as it gated `AudiencePathwaysSection` before. A signed-in visitor already
 * answered this question by having a role, and gets today's page until the
 * donor and donee variants are designed.
 *
 * <p><b>Why this is not `AudiencePathwayPanel`.</b> That component is
 * deliberately not a card — its own doc comment says so. The donor/donee
 * separation there is carried by the diagonal seam cut in
 * `AudiencePathwaysSection`, and any border or radius inside it reads as a card
 * floating in the split and undoes the effect. Doors *is* two cards, because a
 * 390px column has no room for a diagonal. So this reuses only what travels —
 * the `audiencePathways.*` copy — and owns its own layout. `PathwayScene` was
 * tried here too and cut; see the note at its old call site. The desktop
 * section is untouched.
 *
 * <p><b>Donor is terracotta, donee is teal</b>, following the existing pathways
 * vocabulary rather than inventing a palette. Both doors are the same component
 * shape; only the ground and the accent differ, so neither reads as disabled.
 */
export function MobileDoors({ door, pick }: { door: Door; pick: (next: Door) => void }) {
  const t = useTranslations("audiencePathways");

  return (
    <section aria-labelledby="ck-doors-heading">
      <h2
        id="ck-doors-heading"
        className="text-2xl font-extrabold leading-[1.16] tracking-tight text-stone-900 dark:text-stone-50"
      >
        {t("mobileQuestion")}
      </h2>
      <p className="mt-2.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300 [text-wrap:pretty]">
        {t("mobileQuestionSub")}
      </p>

      <div className="mt-5 grid gap-3">
        {/* ── Door one: I have something ── */}
        <div className="relative overflow-hidden rounded-[1.375rem] bg-stone-900 p-5 text-white dark:bg-black">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_80%_at_85%_0%,rgba(176,74,21,0.42),transparent_62%)]"
          />
          <div className="relative">
            <p className="text-3xs font-extrabold uppercase tracking-[0.16em] text-[var(--ck-home-highlight,#f0a06a)]">
              {t("donor.eyebrow")}
            </p>
            <h3 className="mt-3 text-xl font-extrabold leading-[1.22] tracking-tight">
              {t("mobileDonorHeading")}
            </h3>

            {/* No PathwayScene here, deliberately.

                It was tried and cut. Two things go wrong at this size: its root
                is `absolute inset-0`, so it needs a parent with an explicit
                height, and in a ~300×132 box the result is a dark rectangle
                with one small corner emblem — it reads as a broken image rather
                than as artwork. `motif` does not fix that; it sets the scale
                origin, not the position.

                The card does not need it. Eyebrow, heading, three steps and the
                CTA already fill it, and dropping the box lifts the steps up
                where they are read. */}

            <ol className="mt-5 grid gap-3">
              {["mobileDonorStep1", "mobileDonorStep2", "mobileDonorStep3"].map((key, i) => (
                <li key={key} className="flex items-baseline gap-3">
                  <span className="w-4 shrink-0 text-[0.6875rem] font-extrabold tabular-nums text-stone-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[0.8125rem] leading-relaxed text-stone-300">{t(key)}</p>
                </li>
              ))}
            </ol>

            <Link
              href="/register?role=DONOR"
              data-tour="guest-join"
              onClick={() => pick("donor")}
              data-cta-live="dark"
              className="ck-cta-live mt-5 flex min-h-[3.125rem] items-center justify-center rounded-[0.8125rem] bg-white text-[0.9375rem] font-extrabold text-stone-900 transition-transform active:scale-[0.97]"
            >
              {t("donor.cta")}
            </Link>
          </div>
        </div>

        {/* ── Door two: I need something ── */}
        <div className="rounded-[1.375rem] border border-[var(--ck-home-soft,#e8e2d5)] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-3xs font-extrabold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-400">
            {t("donee.eyebrow")}
          </p>
          <h3 className="mt-3 text-xl font-extrabold leading-[1.22] tracking-tight text-stone-900 dark:text-stone-50">
            {t("mobileDoneeHeading")}
          </h3>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-stone-600 dark:text-stone-300 [text-wrap:pretty]">
            {t("mobileDoneeBody")}
          </p>

          <Link
            href="/register?role=DONEE"
            onClick={() => pick("donee")}
            className="mt-4 flex min-h-[3.125rem] items-center justify-center rounded-[0.8125rem] border-[1.5px] border-teal-700 text-[0.9375rem] font-extrabold text-teal-700 transition-transform active:scale-[0.97] dark:border-teal-400 dark:text-teal-400"
          >
            {t("donee.cta")}
          </Link>
        </div>
      </div>

      {/*
        The switcher.

        Full-bleed on purpose — it is a rail the page hangs off, not a card. It
        cancels the mobile column's px-5 with -mx-5 and re-pads, the one place
        below the hero that still does that.

        `aria-pressed` rather than a tablist: the two buttons do not reveal
        panels that exist in the DOM together, they swap what the rest of the
        page is about.
      */}
      <div className="-mx-5 mt-11 flex items-center gap-2 border-y border-[var(--ck-home-soft,#e8e2d5)] bg-[#fbf9f4]/95 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950/95">
        {/* The eyebrow is the widest thing here that carries the least meaning —
            "SHOWING FOR" was 86px of a 265px rail at 320px, which is what
            pushed the label into an ellipsis. Smaller and tighter. */}
        <span className="shrink-0 text-[0.5625rem] font-extrabold uppercase tracking-[0.12em] text-stone-500">
          {t("mobileShowingFor")}
        </span>
        {/* No `truncate`. Clipping the one word that says what the page is
            showing is the worst thing this rail can do, and it has to hold in
            fourteen locales. If a longer label ever runs out of room it wraps
            and the rail grows a line, which is survivable; an ellipsis is not. */}
        <span className="min-w-0 flex-1 overflow-hidden text-xs font-extrabold leading-snug text-stone-900 dark:text-stone-100">
          {/* The one string on the page that literally swaps, so it is the one
              place a per-character flip means something. */}
          <LetterSwap text={door === "donor" ? t("mobileShowingDonor") : t("mobileShowingDonee")} />
        </span>
        <button
          type="button"
          aria-pressed={door === "donee"}
          onClick={() => pick(door === "donor" ? "donee" : "donor")}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-extrabold text-[var(--ck-home-ink,#b04a15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#b04a15)]"
        >
          {t("mobileSwitch")}
        </button>
      </div>
    </section>
  );
}

export default MobileDoors;
