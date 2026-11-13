"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, MapPin, ArrowRight, ShieldCheck, Heart } from "lucide-react";

import Link from "@/components/AppLink";
import { LandingText, useLandingTranslation } from "@/components/LandingTranslation";
import { useAuth } from "@/hooks/useAuth";
import { useDiwaliCampaign } from "@/hooks/useDiwaliCampaign";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { fundraisers, type FundraiserCard, type FundraisingCategory } from "@/lib/api";
import { formatINR } from "@/features/fundraising/ui";
import { DONATE_HREF } from "@/lib/donateScroll";

const CATEGORY: Record<FundraisingCategory, string> = {
  MEDICAL: "Medical",
  EDUCATION: "Education",
  EMERGENCY_HOUSEHOLD: "Emergency household support",
  OTHER: "Other",
};

/** Glide speed in pixels per millisecond for continuous scrolling */
const GLIDE_SPEED = 0.04;
const RESUME_AFTER_TOUCH_MS = 2500;
const RESUME_AFTER_ARROW_MS = 4000;

/** Card for the fundraisers carousel */
function FundraiserCardItem({
  card,
  copy = false,
  diwali,
}: {
  card: FundraiserCard;
  copy?: boolean;
  diwali: boolean;
}) {
  const pct = card.target ? Math.min(100, Math.round((card.raised / card.target) * 100)) : 0;

  return (
    <article
      className="group relative flex flex-col h-full overflow-hidden rounded-2xl border-2 border-[#e6d5c3]/50 dark:border-[#e6d5c3]/40 bg-white dark:bg-zinc-900 shadow-[0_10px_28px_-8px_rgba(28,25,23,0.12)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)] hover:border-[#e6d5c3] hover:shadow-[0_20px_42px_-10px_rgba(176,74,21,0.22)] hover:-translate-y-1 transition-all duration-300 text-[#1F140D] dark:text-stone-100"
      aria-hidden={copy ? true : undefined}
    >
      {/* Photo */}
      <Link
        href={`/fundraisers/${card.id}`}
        tabIndex={copy ? -1 : undefined}
        className="relative aspect-[16/10] w-full overflow-hidden bg-[#efe4d8] dark:bg-zinc-800 block"
      >
        {card.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.coverUrl}
            alt={card.coverAltText ?? card.title ?? ""}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 dark:from-zinc-900 dark:to-zinc-800">
            {diwali ? <span className="ck-dw-diya" /> : <Heart className="size-12 text-brand-500/70" strokeWidth={1.6} aria-hidden="true" />}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center gap-1.5 pointer-events-none">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-xs border border-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
            <LandingText>{card.category ? CATEGORY[card.category] : "Fundraiser"}</LandingText>
          </span>
          {card.location && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-xs border border-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
              <MapPin className="w-3 h-3 text-white/80" aria-hidden="true" />
              <TranslatedText text={card.location} />
            </span>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5 gap-3">
        <h3 className="m-0 text-lg sm:text-xl font-bold font-serif leading-snug line-clamp-2 text-[#1c1917] dark:text-[#fffaf1] group-hover:text-[#b04a15] dark:group-hover:text-[#ff8a4c] transition-colors">
          <Link href={`/fundraisers/${card.id}`} tabIndex={copy ? -1 : undefined} className="text-inherit no-underline hover:underline">
            {card.title && <TranslatedText text={card.title} />}
          </Link>
        </h3>

        {card.organiser && (
          <p className="m-0 text-xs font-medium text-[#7a4e28] dark:text-[#f9dfc0]/75">
            <LandingText>By </LandingText> {card.organiser}
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-auto rounded-xl border border-[#e6d5c3]/35 bg-[#f7ebe4]/35 dark:bg-zinc-800/60 p-3 flex flex-col gap-1.5 shadow-2xs">
          <div className="flex justify-between items-baseline text-xs sm:text-sm font-medium">
            <span className="tabular-nums">
              <b className="font-extrabold text-[#933c10] dark:text-[#ff8a4c]">{formatINR(card.raised)}</b>{" "}
              <span className="text-[#6B5A4E] dark:text-stone-400"><LandingText>raised of</LandingText> {formatINR(card.target)}</span>
            </span>
            <span className="text-xs font-bold text-[#b04a15] dark:text-[#ff8a4c] tabular-nums">
              {pct}%
            </span>
          </div>
          <div className="w-full bg-[#f7ebe4] dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div className="bg-brand-500 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* CTA */}
        <div className="pt-1">
          <Link
            href={`/fundraisers/${card.id}`}
            tabIndex={copy ? -1 : undefined}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand-500 hover:bg-brand-600 border border-[#e6d5c3]/40 px-5 text-sm font-bold text-white shadow-xs hover:shadow-md transition-all active:scale-[0.99] no-underline"
          >
            <LandingText>Donate</LandingText>
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Featured wide card when only 1 fundraiser exists */
function SingleFeaturedFundraiserCard({
  card,
  diwali,
}: {
  card: FundraiserCard;
  diwali: boolean;
}) {
  const pct = card.target ? Math.min(100, Math.round((card.raised / card.target) * 100)) : 0;

  return (
    <article className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-[#e6d5c3]/60 dark:border-[#e6d5c3]/45 bg-white dark:bg-zinc-900 shadow-[0_20px_50px_-15px_rgba(28,25,23,0.14)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] text-[#1F140D] dark:text-stone-100">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[230px] w-full bg-[#efe4d8] dark:bg-zinc-800 overflow-hidden">
          {card.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.coverUrl}
              alt={card.coverAltText ?? card.title ?? ""}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 dark:from-zinc-900 dark:to-zinc-800">
              {diwali ? <span className="ck-dw-diya" /> : <Heart className="size-16 text-brand-500/70" strokeWidth={1.6} aria-hidden="true" />}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />
          <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center gap-2 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow-sm border border-white/20">
              <Heart className="w-3.5 h-3.5 text-white fill-white" aria-hidden="true" />
              <LandingText>{card.category ? CATEGORY[card.category] : "Verified Fundraiser"}</LandingText>
            </span>
            {card.location && (
              <span className="rounded-full bg-black/65 backdrop-blur-xs border border-white/20 px-3 py-1 text-xs font-semibold text-white inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-white/80" aria-hidden="true" />
                <TranslatedText text={card.location} />
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col p-5 sm:p-6 lg:px-8 lg:py-6 gap-3 justify-between">
          <div className="flex flex-col gap-3">
            {card.organiser && (
              <span className="text-xs sm:text-sm font-semibold text-[#7a4e28] dark:text-[#f9dfc0]/75">
                <LandingText>Organised by </LandingText> {card.organiser}
              </span>
            )}
            <h3 className="font-serif m-0 text-xl sm:text-2xl lg:text-[1.65rem] font-bold leading-tight text-[#1c1917] dark:text-[#fffaf1]">
              <Link href={`/fundraisers/${card.id}`} className="text-inherit no-underline hover:text-[#b04a15] dark:hover:text-[#ff8a4c] transition-colors">
                {card.title && <TranslatedText text={card.title} />}
              </Link>
            </h3>
          </div>

          <div className="rounded-xl border border-[#e6d5c3]/40 bg-[#f7ebe4]/40 dark:bg-zinc-800/60 p-3.5 sm:p-4 flex flex-col gap-2 shadow-2xs">
            <div className="flex justify-between items-baseline gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#b04a15] dark:text-[#ff8a4c]">
                  <LandingText>Fundraiser Progress</LandingText>
                </span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#933c10] dark:text-[#f9dfc0] tabular-nums mt-0.5">
                  {formatINR(card.raised)}{" "}
                  <span className="text-sm sm:text-base font-semibold text-[#6B5A4E] dark:text-stone-400">
                    <LandingText>raised of</LandingText> {formatINR(card.target)}
                  </span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-[#b04a15]/10 dark:bg-[#ff8a4c]/20 px-3 py-1 text-xs sm:text-sm font-bold text-[#b04a15] dark:text-[#ff8a4c] border border-[#b04a15]/20 dark:border-[#ff8a4c]/30 tabular-nums">
                {pct}% <LandingText>achieved</LandingText>
              </div>
            </div>
            <div className="w-full bg-[#f7ebe4] dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div className="bg-brand-500 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#7a4e28] dark:text-[#f9dfc0]/75 pt-1">
              <ShieldCheck className="w-4 h-4 text-[#b04a15] dark:text-[#ff8a4c] shrink-0" aria-hidden="true" />
              <span><LandingText>100% verified fundraiser · Reviewed by our team before going public</LandingText></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={`/fundraisers/${card.id}`}
              className="flex min-h-[44px] items-center justify-center rounded-xl bg-brand-500 hover:bg-brand-600 border border-[#e6d5c3]/50 px-6 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(176,74,21,0.28)] hover:shadow-[0_8px_24px_rgba(176,74,21,0.32)] hover:scale-[1.01] transition-all active:scale-[0.99] no-underline"
            >
              <LandingText>Donate to Fundraiser</LandingText>
            </Link>
            <Link
              href="/fundraisers"
              className="flex min-h-[44px] items-center justify-center rounded-xl border-2 border-[#e6d5c3]/80 hover:border-[#b04a15] dark:border-[#e6d5c3]/60 dark:hover:border-[#ff8a4c] px-5 text-sm sm:text-[15px] font-bold text-[#933c10] dark:text-[#f9dfc0] hover:bg-[#b04a15]/10 dark:hover:bg-[#ff8a4c]/15 no-underline transition-all"
            >
              <LandingText>Browse all</LandingText> →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Verified Fundraisers Section on the Home Page (positioned in the body after Who We Are).
 * Displays individual medical, education, and emergency fundraisers reviewed by our team.
 */
export function HomeFundraisers() {
  const { user } = useAuth();
  const diwali = useDiwaliCampaign();
  const isDonee = user?.role?.replace(/^ROLE_/, "") === "DONEE";
  const [cards, setCards] = useState<FundraiserCard[] | null>(null);

  const rowRef = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const touching = useRef(false);
  const pauseUntil = useRef(0);

  useEffect(() => {
    if (isDonee) return;
    let live = true;
    fundraisers
      .live()
      .then((next) => {
        if (live) setCards(next);
      })
      .catch(() => {
        if (live) setCards([]);
      });
    return () => {
      live = false;
    };
  }, [isDonee]);

  const count = cards?.length ?? 0;
  const isMulti = count > 1;

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

      if (!hovered.current && !focused.current && !touching.current && now >= pauseUntil.current) {
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
  }, [isMulti, runWidth]);

  if (isDonee) return null;

  return (
    <section
      aria-labelledby="fundraisers-spotlight-h"
      className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 text-[#1F140D] dark:text-stone-100"
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full bg-[#f7ebe4]/80 dark:bg-brand-500/20 border border-[#e6d5c3]/40 text-xs font-bold uppercase tracking-[0.16em] text-[#b04a15] dark:text-[#ff8a4c] shadow-2xs">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            <span><LandingText>Verified Fundraisers</LandingText></span>
          </div>

          <h2
            id="fundraisers-spotlight-h"
            className="font-serif m-0 text-2xl sm:text-3xl lg:text-[2.1rem] font-bold tracking-tight text-[#933c10] dark:text-[#f9dfc0] leading-[1.15]"
          >
            {diwali ? (
              <><LandingText>Light a diya</LandingText> <em><LandingText>for someone&apos;s need</LandingText></em></>
            ) : (
              <><LandingText>Give someone</LandingText> <em><LandingText>a reason to smile again</LandingText></em></>
            )}
          </h2>

          <p className="m-0 text-[15px] sm:text-base leading-relaxed text-[#5a4030] dark:text-[#f9dfc0]/85 font-normal">
            {diwali ? (
              <LandingText>Money raised for a specific person&apos;s need. Each one was reviewed by our team before it went public.</LandingText>
            ) : (
              <LandingText>Don&apos;t let their hope go quiet. Every fundraiser here was reviewed by our team before it went public.</LandingText>
            )}
          </p>
        </div>

        {/* Navigation controls & View all link */}
        <div className="flex items-center gap-3 ms-auto">
          {isMulti && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Previous fundraiser"
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#e6d5c3]/60 bg-white/90 dark:bg-zinc-800/90 text-[#933c10] dark:text-[#ff8a4c] hover:border-[#933c10] hover:bg-[#933c10] hover:text-white dark:hover:border-[#ff8a4c] dark:hover:bg-[#ff8a4c] dark:hover:text-zinc-950 transition-all shadow-xs cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Next fundraiser"
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#e6d5c3]/60 bg-white/90 dark:bg-zinc-800/90 text-[#933c10] dark:text-[#ff8a4c] hover:border-[#933c10] hover:bg-[#933c10] hover:text-white dark:hover:border-[#ff8a4c] dark:hover:bg-[#ff8a4c] dark:hover:text-zinc-950 transition-all shadow-xs cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}

          <Link
            href="/fundraisers"
            className="group inline-flex items-center gap-1.5 min-h-[44px] text-[15px] font-bold text-[#b04a15] hover:text-brand-700 dark:text-[#ff8a4c] dark:hover:text-[#ffb08a] no-underline transition-all"
          >
            <span><LandingText>View all fundraisers</LandingText></span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Content: 1 card vs Continuous carousel vs Empty */}
      {cards === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-stone-200/40 animate-pulse border border-[#ece4da] dark:bg-zinc-800/40 dark:border-zinc-700" />
          ))}
        </div>
      ) : count === 1 ? (
        <SingleFeaturedFundraiserCard card={cards[0]} diwali={diwali} />
      ) : count > 1 ? (
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
            {cards.map((card) => (
              <div key={card.id} className="w-[300px] sm:w-[330px] md:w-[350px] shrink-0">
                <FundraiserCardItem card={card} diwali={diwali} />
              </div>
            ))}
            {cards.map((card) => (
              <div key={`copy-${card.id}`} className="w-[300px] sm:w-[330px] md:w-[350px] shrink-0" aria-hidden="true">
                <FundraiserCardItem card={card} copy diwali={diwali} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Link
          href={DONATE_HREF}
          className="group relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[#e6d5c3]/40 bg-[#f7ebe4]/20 dark:bg-zinc-900/40 text-center gap-3 no-underline transition-all hover:border-[#e6d5c3]"
        >
          <Heart className="size-10 text-brand-500" strokeWidth={1.6} aria-hidden="true" />
          <h3 className="font-bold text-lg text-[#933c10] dark:text-[#f9dfc0]">
            <LandingText>No fundraisers yet</LandingText>
          </h3>
          <p className="text-sm text-[#5a4030] dark:text-stone-300 max-w-md">
            <LandingText>There are no live fundraisers right now. You can still give money to help people in need.</LandingText>
          </p>
          <span className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-500 text-white font-bold px-6 py-2 shadow-xs group-hover:shadow-md transition-all">
            <LandingText>Donate money</LandingText>
          </span>
        </Link>
      )}
    </section>
  );
}
