"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, MapPin, Sparkles, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { sahasCampaigns, type SahasCampaignCard } from "@/lib/api";
import { UiText, useUiText } from "@/components/UiText";
import { useDiwaliCampaign } from "@/hooks/useDiwaliCampaign";
import { SahasDonateDialog } from "@/features/sahas/SahasDonateDialog";
import { SAHAS_NAME, serif, PhaseChip, ItemsBar, formatDate } from "@/features/sahas/sahasUi";

/** Glide speed in pixels per millisecond for continuous scrolling */
const GLIDE_SPEED = 0.042;
const RESUME_AFTER_TOUCH_MS = 2500;
const RESUME_AFTER_ARROW_MS = 4000;

/**
 * Diwali-themed single campaign card for the spotlight carousel.
 * Donors can only donate money directly from the card.
 */
function SpotlightCard({
  c,
  locale,
  copy = false,
  diwali,
  onDonate,
}: {
  c: SahasCampaignCard;
  locale: string;
  copy?: boolean;
  diwali: boolean;
  onDonate: (slug: string) => void;
}) {
  const ui = useUiText();
  const ends = formatDate(c.endDate, locale);
  const starts = formatDate(c.startDate, locale);
  const raised = c.amountRaised ?? 0;
  const target = c.targetAmount ?? 0;
  const canDonate = c.moneyOpen && raised < target;

  return (
    <article
      className="group relative flex flex-col h-full overflow-hidden rounded-2xl border-2 border-[#d9a441]/50 dark:border-[#d9a441]/40 ring-1 ring-[#f4a340]/25 bg-gradient-to-b from-[#fffdfa] to-[#fff8ed] dark:from-[#2a1018] dark:to-[#1c080f] shadow-[0_10px_28px_-8px_rgba(114,13,45,0.12),0_0_0_1px_rgba(217,164,65,0.15)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7),0_0_0_1px_rgba(217,164,65,0.25)] hover:border-[#d9a441] hover:ring-2 hover:ring-[#f4a340]/45 hover:shadow-[0_20px_42px_-10px_rgba(217,164,65,0.38)] hover:-translate-y-1 transition-all duration-300 text-[#1F140D] dark:text-stone-100"
      aria-hidden={copy ? true : undefined}
    >
      {/* Festive top accent stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#d9a441] via-[#f4a340] to-[#8e123c]" />

      {/* Cover image / photo */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#efe4d8] dark:bg-zinc-800">
        {c.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.imageUrl}
            alt={c.coverAltText ?? c.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#fbe8c2] via-[#f5d9ad] to-[#f4a340]/40 dark:from-zinc-900 dark:to-zinc-800">
            <span className="text-5xl" role="img" aria-label="Diwali Diya">🪔</span>
          </div>
        )}

        {/* Gradient shadow overlay for text legibility on top badges */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent pointer-events-none" />

        {/* Floating status badges */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center gap-1.5 pointer-events-none">
          {c.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs border border-amber-300/40">
              <Sparkles className="w-3 h-3 text-amber-200" aria-hidden="true" />
              <UiText context="sahas card">Featured</UiText>
            </span>
          )}
          {c.collectsMoney && (
            <span className="rounded-full bg-black/65 backdrop-blur-xs border border-amber-400/30 px-2.5 py-0.5 text-xs font-semibold text-[#fef3c7]">
              <UiText context="sahas contribution type">Money</UiText>
            </span>
          )}
          {c.phase !== "OPEN" && (
            <div className="ms-auto">
              <PhaseChip phase={c.phase} />
            </div>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5 gap-3">
        {/* Meta row: Location & deadline */}
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#7a4e28] dark:text-[#f9dfc0]/75">
          {(c.city || c.state) && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#b04a15] dark:text-[#f4a340] shrink-0" aria-hidden="true" />
              {[c.city, c.state].filter(Boolean).join(", ")}
            </span>
          )}
          <span className="ms-auto shrink-0 inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#b04a15] dark:text-[#f4a340]" aria-hidden="true" />
            {c.phase === "UPCOMING" && starts ? `${ui("Opens")} ${starts}` : ends ? `${ui("Ends")} ${ends}` : null}
          </span>
        </div>

        {/* Title */}
        <h3 className={`${serif} m-0 text-lg sm:text-xl font-bold leading-snug line-clamp-2 text-[#2a1016] dark:text-[#fffaf1] group-hover:text-[#8e123c] dark:group-hover:text-[#f4a340] transition-colors`}>
          <Link href={`/sahas/${c.slug}`} tabIndex={copy ? -1 : undefined} className="text-inherit no-underline hover:underline">
            {c.title}
          </Link>
        </h3>

        {/* Summary */}
        {c.summary && (
          <p className="m-0 text-sm font-normal line-clamp-2 leading-relaxed text-[#5a4030] dark:text-stone-300">
            {c.summary}
          </p>
        )}

        {/* Progress box for monetary collection */}
        {c.collectsMoney && target > 0 && (
          <div className="mt-1 rounded-xl border border-[#d9a441]/35 bg-[#fbe8c2]/35 dark:bg-[#1f0910]/70 p-3 flex flex-col gap-1.5 shadow-2xs">
            <div className="flex justify-between items-baseline text-xs sm:text-sm font-medium">
              <span className="tabular-nums">
                <b className="font-extrabold text-[#720d2d] dark:text-[#f4a340]">₹{raised.toLocaleString("en-IN")}</b>{" "}
                <span className="text-[#6B5A4E] dark:text-stone-400">{ui("raised of")} ₹{target.toLocaleString("en-IN")}</span>
              </span>
              <span className="text-xs font-bold text-[#8e123c] dark:text-[#f4a340] tabular-nums">
                {Math.min(100, Math.round((raised / target) * 100))}%
              </span>
            </div>
            <ItemsBar needed={target} pledged={0} received={raised} label={`₹${raised} / ₹${target}`} />
          </div>
        )}

        {/* Actions: Donors only donate money */}
        <div className="mt-auto pt-2 flex flex-col gap-2">
          {canDonate ? (
            <button
              type="button"
              tabIndex={copy ? -1 : undefined}
              onClick={() => onDonate(c.slug)}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#8e123c] via-[#a31a44] to-[#720d2d] hover:from-[#720d2d] hover:to-[#8e123c] border border-[#d9a441]/40 px-5 text-sm font-bold text-white shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
            >
              <UiText>Donate</UiText>
            </button>
          ) : (
            <Link
              href={`/sahas/${c.slug}`}
              tabIndex={copy ? -1 : undefined}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#8e123c] via-[#a31a44] to-[#720d2d] hover:from-[#720d2d] hover:to-[#8e123c] text-white shadow-xs border border-[#d9a441]/40 px-4 text-sm font-bold transition-all no-underline"
            >
              {c.phase === "CLOSED" ? ui("See what was delivered") : ui("View details")}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Featured wide card displayed when only a single campaign is available.
 */
function SingleFeaturedCard({
  c,
  locale,
  diwali,
  onDonate,
}: {
  c: SahasCampaignCard;
  locale: string;
  diwali: boolean;
  onDonate: (slug: string) => void;
}) {
  const ui = useUiText();
  const ends = formatDate(c.endDate, locale);
  const starts = formatDate(c.startDate, locale);
  const raised = c.amountRaised ?? 0;
  const target = c.targetAmount ?? 0;
  const canDonate = c.moneyOpen && raised < target;

  return (
    <article className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-[#d9a441]/60 dark:border-[#d9a441]/45 ring-1 ring-[#f4a340]/30 bg-gradient-to-br from-[#fffdf9] via-[#fff9ef] to-[#fef2dc] dark:from-[#2a1018] dark:via-[#200b12] dark:to-[#17060c] shadow-[0_20px_50px_-15px_rgba(114,13,45,0.15),0_0_0_1px_rgba(217,164,65,0.25)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(217,164,65,0.35)] text-[#1F140D] dark:text-stone-100">
      {/* Festive top accent stripe */}
      <div className="h-2 w-full bg-gradient-to-r from-[#d9a441] via-[#f4a340] to-[#8e123c]" />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)]">
        {/* Visual photo column */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[360px] w-full bg-[#efe4d8] dark:bg-zinc-800 overflow-hidden">
          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.imageUrl}
              alt={c.coverAltText ?? c.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#fbe8c2] via-[#f7dfbc] to-[#f4a340]/40 dark:from-zinc-900 dark:to-zinc-800">
              <span className="text-7xl" role="img" aria-label="Diwali Diya">🪔</span>
            </div>
          )}

          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />

          {/* Top badges on photo */}
          <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center gap-2 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-3 py-1 text-xs font-bold text-white shadow-sm border border-amber-300/40">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" aria-hidden="true" />
              <UiText context="sahas card">{c.featured ? "Featured Campaign" : "Diwali Spotlight"}</UiText>
            </span>
            {c.collectsMoney && (
              <span className="rounded-full bg-black/65 backdrop-blur-xs border border-amber-400/30 px-3 py-1 text-xs font-semibold text-[#fef3c7]">
                <UiText context="sahas contribution type">Monetary Relief</UiText>
              </span>
            )}
            {c.phase !== "OPEN" && (
              <div className="ms-auto">
                <PhaseChip phase={c.phase} />
              </div>
            )}
          </div>
        </div>

        {/* Content details column */}
        <div className="flex flex-col p-6 sm:p-8 lg:p-10 gap-4 justify-between">
          <div className="flex flex-col gap-3">
            {/* Meta row: Location & timeline */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-[#7a4e28] dark:text-[#f9dfc0]/75">
              {(c.city || c.state) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#b04a15] dark:text-[#f4a340]" aria-hidden="true" />
                  {[c.city, c.state].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="ms-auto inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#b04a15] dark:text-[#f4a340]" aria-hidden="true" />
                {c.phase === "UPCOMING" && starts ? `${ui("Opens")} ${starts}` : ends ? `${ui("Ends")} ${ends}` : null}
              </span>
            </div>

            {/* Title */}
            <h3 className={`${serif} m-0 text-2xl sm:text-3xl lg:text-[2.2rem] font-bold leading-tight text-[#2a1016] dark:text-[#fffaf1]`}>
              <Link href={`/sahas/${c.slug}`} className="text-inherit no-underline hover:text-[#8e123c] dark:hover:text-[#f4a340] transition-colors">
                {c.title}
              </Link>
            </h3>

            {/* Description / Summary */}
            {(c.description || c.summary) && (
              <p className="m-0 text-sm sm:text-base leading-relaxed text-[#5a4030] dark:text-stone-300 line-clamp-3 font-normal">
                {c.description || c.summary}
              </p>
            )}
          </div>

          {/* Progress Box */}
          {c.collectsMoney && target > 0 && (
            <div className="rounded-xl border border-[#d9a441]/40 bg-[#fbe8c2]/40 dark:bg-[#1d0910]/80 p-4 sm:p-5 flex flex-col gap-2.5 shadow-2xs">
              <div className="flex justify-between items-baseline gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8e123c] dark:text-[#f4a340]">
                    <UiText>Campaign Progress</UiText>
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#720d2d] dark:text-[#f9dfc0] tabular-nums mt-0.5">
                    ₹{raised.toLocaleString("en-IN")}{" "}
                    <span className="text-sm sm:text-base font-semibold text-[#6B5A4E] dark:text-stone-400">
                      {ui("raised of")} ₹{target.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-[#8e123c]/10 dark:bg-[#f4a340]/20 px-3 py-1 text-xs sm:text-sm font-bold text-[#8e123c] dark:text-[#f4a340] border border-[#8e123c]/20 dark:border-[#f4a340]/30 tabular-nums">
                  {Math.min(100, Math.round((raised / target) * 100))}% <UiText>achieved</UiText>
                </div>
              </div>
              <ItemsBar needed={target} pledged={0} received={raised} label={`₹${raised} / ₹${target}`} />
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#7a4e28] dark:text-[#f9dfc0]/75 pt-1">
                <ShieldCheck className="w-4 h-4 text-[#b04a15] dark:text-[#f4a340] shrink-0" aria-hidden="true" />
                <span><UiText>100% verified cause by Sahas Charitable Trust · All donations direct to relief</UiText></span>
              </div>
            </div>
          )}

          {/* CTA Buttons: Donors only donate money */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {canDonate && (
              <button
                type="button"
                onClick={() => onDonate(c.slug)}
                className="flex min-h-[48px] sm:min-h-[52px] items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#8e123c] via-[#a31a44] to-[#720d2d] hover:from-[#720d2d] hover:to-[#8e123c] border border-[#d9a441]/50 px-7 sm:px-8 text-base font-bold text-white shadow-[0_4px_16px_rgba(142,18,60,0.35)] hover:shadow-[0_8px_24px_rgba(217,164,65,0.45)] hover:scale-[1.01] transition-all active:scale-[0.99] cursor-pointer"
              >
                <UiText>Donate to Campaign</UiText>
              </button>
            )}
            <Link
              href={`/sahas/${c.slug}`}
              className="flex min-h-[48px] sm:min-h-[52px] items-center justify-center rounded-xl sm:rounded-2xl border-2 border-[#d9a441]/80 hover:border-[#8e123c] dark:border-[#d9a441]/60 dark:hover:border-[#f4a340] px-6 sm:px-7 text-sm sm:text-base font-bold text-[#720d2d] dark:text-[#f9dfc0] hover:bg-[#8e123c]/10 dark:hover:bg-[#f4a340]/15 no-underline transition-all"
            >
              {c.phase === "CLOSED" ? ui("See what was delivered") : ui("Learn more")} →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Sahas Spotlight Section:
 * Redesigned according to the Diwali theme with continuous gliding/marquee scroll
 * when 2 or more campaigns are open, or a single rich featured card when 1 is open.
 */
export function SahasSpotlight() {
  const locale = "en";
  const diwali = useDiwaliCampaign();
  const [cards, setCards] = useState<SahasCampaignCard[] | null>(null);
  const [donatingSlug, setDonatingSlug] = useState<string | null>(null);

  const rowRef = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const touching = useRef(false);
  const pauseUntil = useRef(0);

  useEffect(() => {
    if (!FEATURES.sahas) return;
    let live = true;
    sahasCampaigns
      .live()
      .then((all) => {
        if (live) setCards(all.filter((c) => c.phase === "OPEN" || c.phase === "UPCOMING"));
      })
      .catch(() => {
        if (live) setCards([]);
      });
    return () => {
      live = false;
    };
  }, []);

  const count = cards?.length ?? 0;
  const isMulti = count > 1;

  /** Distance between the start of run 1 and run 2 */
  const runWidth = useCallback(() => {
    const row = rowRef.current;
    if (!row || row.children.length <= count) return 0;
    const secondRun = row.children[count] as HTMLElement | undefined;
    const firstRun = row.children[0] as HTMLElement | undefined;
    return secondRun && firstRun ? secondRun.offsetLeft - firstRun.offsetLeft : 0;
  }, [count]);

  const move = useCallback(
    (direction: 1 | -1) => {
      const row = rowRef.current;
      if (!row || !isMulti) return;
      pauseUntil.current = performance.now() + RESUME_AFTER_ARROW_MS;
      const step = ((row.children[1] as HTMLElement)?.offsetLeft ?? 0) - ((row.children[0] as HTMLElement)?.offsetLeft ?? 0) || 360;
      const run = runWidth();
      let left = row.scrollLeft % (run || 1);
      if (direction < 0 && left < step / 2 && run) left += run;
      row.scrollTo({
        left: left + direction * step,
        behavior: "smooth",
      });
    },
    [isMulti, runWidth]
  );

  // RequestAnimationFrame continuous gliding scroll
  useEffect(() => {
    const row = rowRef.current;
    if (!isMulti || !row || typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let frame = 0;
    let last = performance.now();
    let position = row.scrollLeft;

    const tick = (now: number) => {
      const elapsed = Math.min(now - last, 50);
      last = now;

      // Pause continuous scroll when hover, focus, touch, or when the donation modal is open
      if (!donatingSlug && !hovered.current && !focused.current && !touching.current && now >= pauseUntil.current) {
        if (Math.abs(row.scrollLeft - position) > 2) position = row.scrollLeft;
        position += elapsed * GLIDE_SPEED;
        const run = runWidth();
        if (run && position >= run) {
          position -= run;
        }
        row.scrollLeft = position;
      }

      frame = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (entry.isIntersecting) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    });

    io.observe(row);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, [isMulti, runWidth, donatingSlug]);

  if (!FEATURES.sahas || !cards || count === 0) return null;

  return (
    <section
      aria-labelledby="sahas-spotlight-h"
      className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 text-[#1F140D] dark:text-stone-100"
    >
      {/* Subtle festive background glow behind the section */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 max-w-3xl h-44 bg-gradient-to-r from-amber-500/10 via-[#8e123c]/10 to-amber-500/10 blur-3xl pointer-events-none -z-10 rounded-full" />

      {/* Header section with Diwali festive dress */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full bg-[#fbe8c2]/80 dark:bg-[#720d2d]/40 border border-[#d9a441]/40 text-xs font-bold uppercase tracking-[0.16em] text-[#8e123c] dark:text-[#f4a340] shadow-2xs">
            <span role="img" aria-hidden="true" className="text-sm">🪔</span>
            <span><UiText>Organised by</UiText> {SAHAS_NAME}</span>
          </div>

          <h2
            id="sahas-spotlight-h"
            className={`${serif} m-0 text-3xl sm:text-4xl lg:text-[2.6rem] font-bold tracking-tight text-[#720d2d] dark:text-[#f9dfc0] leading-[1.15]`}
          >
            <UiText>Sahas</UiText>{" "}
            <em className="font-serif italic font-normal text-[#b04a15] dark:text-[#f4a340]">
              <UiText>Campaigns</UiText>
            </em>
          </h2>

          <p className="m-0 text-base sm:text-lg leading-relaxed text-[#5a4030] dark:text-[#f9dfc0]/85 font-normal">
            <UiText>Dedicated campaigns by Sahas Charitable Trust spreading relief, education, and festive joy.</UiText>
          </p>
        </div>

        {/* Right side controls: view all link & arrows if multiple */}
        <div className="flex items-center gap-3 ms-auto">
          {isMulti && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Previous campaign"
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#d9a441]/60 bg-white/90 dark:bg-[#2d131c]/90 text-[#720d2d] dark:text-[#f4a340] hover:border-[#720d2d] hover:bg-[#720d2d] hover:text-white dark:hover:border-[#f4a340] dark:hover:bg-[#f4a340] dark:hover:text-[#3a0716] transition-all shadow-xs cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Next campaign"
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#d9a441]/60 bg-white/90 dark:bg-[#2d131c]/90 text-[#720d2d] dark:text-[#f4a340] hover:border-[#720d2d] hover:bg-[#720d2d] hover:text-white dark:hover:border-[#f4a340] dark:hover:bg-[#f4a340] dark:hover:text-[#3a0716] transition-all shadow-xs cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}

          <Link
            href="/sahas"
            className="group inline-flex items-center gap-1.5 min-h-[44px] text-[15px] font-bold text-[#8e123c] hover:text-[#5a0923] dark:text-[#f4a340] dark:hover:text-[#ffd27a] no-underline transition-all"
          >
            <span><UiText>View all campaigns</UiText></span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Content: Single Card vs Continuous Scrolling Row */}
      {count === 1 ? (
        <SingleFeaturedCard c={cards[0]} locale={locale} diwali={diwali} onDonate={setDonatingSlug} />
      ) : (
        <div className="relative -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div
            ref={rowRef}
            onMouseEnter={() => { hovered.current = true; }}
            onMouseLeave={() => { hovered.current = false; }}
            onFocusCapture={() => { focused.current = true; }}
            onBlurCapture={() => { focused.current = false; }}
            onTouchStart={() => {
              touching.current = true;
              pauseUntil.current = performance.now() + RESUME_AFTER_TOUCH_MS;
            }}
            onTouchEnd={() => {
              touching.current = false;
              pauseUntil.current = performance.now() + RESUME_AFTER_TOUCH_MS;
            }}
            className="flex gap-6 overflow-x-auto py-3 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]"
            style={{
              scrollBehavior: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Run 1: original cards */}
            {cards.map((c) => (
              <div key={c.slug} className="w-[320px] sm:w-[350px] md:w-[370px] shrink-0">
                <SpotlightCard c={c} locale={locale} diwali={diwali} onDonate={setDonatingSlug} />
              </div>
            ))}

            {/* Run 2: duplicate run for continuous infinite gliding */}
            {cards.map((c) => (
              <div key={`copy-${c.slug}`} className="w-[320px] sm:w-[350px] md:w-[370px] shrink-0" aria-hidden="true">
                <SpotlightCard c={c} locale={locale} copy diwali={diwali} onDonate={setDonatingSlug} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal checkout dialog if user clicks donate */}
      {donatingSlug && <SahasDonateDialog slug={donatingSlug} onClose={() => setDonatingSlug(null)} />}
    </section>
  );
}
