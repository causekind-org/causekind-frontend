"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, MapPin, ArrowRight, ShieldCheck, Heart, Smile } from "lucide-react";

// Empty-state tile icon. Swap to Sparkles to match the NGO drives page.
const EmptyStateIcon = Smile;

import Link from "@/components/AppLink";
import { LandingText, useLandingTranslation } from "@/components/LandingTranslation";
import { useAuth } from "@/hooks/useAuth";
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

/** Days left until `endDate`, or null when there is none or it has passed. */
function daysLeft(endDate: string | null): number | null {
  if (!endDate) return null;
  const d = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  return d >= 0 ? d : null;
}

/**
 * The spotlight: the first live fundraiser, shown large. Layout A of the
 * "Verified Fundraisers Section Layouts" canvas (owner's pick, 2026-11-16).
 */
function SpotlightCard({ card, diwali }: { card: FundraiserCard; diwali: boolean }) {
  const pct = card.target ? Math.min(100, Math.round((card.raised / card.target) * 100)) : 0;
  const days = daysLeft(card.endDate);
  return (
    <article className="group grid grid-cols-1 overflow-hidden rounded-3xl border border-[#ece4da] bg-white text-[#1c1917] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-100">
      <Link href={`/fundraisers/${card.id}`} className="relative block aspect-[16/10] overflow-hidden bg-[#d8cdbf] lg:aspect-auto lg:min-h-[400px] dark:bg-zinc-800">
        {card.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.coverUrl} alt={card.coverAltText ?? card.title ?? ""} loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            {diwali ? <span className="ck-dw-diya" /> : <Heart className="size-16 text-[#b04a15]/60" strokeWidth={1.6} aria-hidden="true" />}
          </span>
        )}
        <span className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#b04a15] px-3 py-1 text-xs font-bold text-white">
            <LandingText>{card.category ? CATEGORY[card.category] : "Fundraiser"}</LandingText>
          </span>
          {card.location && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white">
              <MapPin className="size-3.5" aria-hidden="true" /><TranslatedText text={card.location} />
            </span>
          )}
        </span>
      </Link>

      <div className="flex flex-col gap-4 p-6 sm:p-8 lg:p-10">
        {card.organiser && (
          <span className="text-sm text-stone-600 dark:text-stone-400">
            <LandingText>Organised by</LandingText> <b className="text-stone-900 dark:text-stone-100">{card.organiser}</b>
          </span>
        )}
        <h3 className="m-0 font-serif text-2xl font-bold leading-tight sm:text-[34px]">
          <Link href={`/fundraisers/${card.id}`} className="text-inherit no-underline hover:text-[#b04a15]">
            {card.title && <TranslatedText text={card.title} />}
          </Link>
        </h3>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[15px] tabular-nums">
              <b className="text-[28px] font-extrabold">{formatINR(card.raised)}</b>{" "}
              <LandingText>raised of</LandingText> {formatINR(card.target)}
            </span>
            <span className="text-sm text-stone-600 tabular-nums dark:text-stone-400">
              {card.donationCount} <LandingText>{card.donationCount === 1 ? "donor" : "donors"}</LandingText>
              {days !== null && <> · {days} <LandingText>{days === 1 ? "day left" : "days left"}</LandingText></>}
            </span>
          </div>
          <span className="h-2.5 overflow-hidden rounded-full bg-[#f1e7dc] dark:bg-zinc-800" role="progressbar"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${pct}% of target raised`}>
            <span className="block h-full rounded-full bg-[#b04a15]" style={{ width: `${Math.max(pct, 1)}%` }} />
          </span>
          <span className="flex items-center gap-1.5 text-[13px] text-stone-600 dark:text-stone-400">
            <ShieldCheck className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <LandingText>Reviewed by the CauseKind team before going public</LandingText>
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={`/fundraisers/${card.id}`}
            className="flex min-h-[52px] items-center justify-center rounded-xl bg-[#b04a15] px-8 font-bold text-white no-underline hover:bg-[#933c10]">
            <LandingText>Donate</LandingText>
          </Link>
          <Link href="/fundraisers"
            className="flex min-h-[52px] items-center justify-center rounded-xl border-[1.5px] border-[#e2d6c8] px-6 font-bold text-stone-900 no-underline hover:border-[#b04a15] dark:border-zinc-700 dark:text-stone-100">
            <LandingText>Browse all</LandingText>
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Verified Fundraisers section on the home page. One spotlight fundraiser,
 * then a scrollable "More fundraisers" rail when there are more; with just
 * one, a "start a fundraiser" banner fills the space instead.
 */
export function HomeFundraisers() {
  const { user } = useAuth();
  const diwali = false; // Diwali theme removed on staging 2026-11-17 (c1b82263)
  const isDonee = user?.role?.replace(/^ROLE_/, "") === "DONEE";
  const [cards, setCards] = useState<FundraiserCard[] | null>(null);
  const previousLabel = useLandingTranslation("Previous fundraisers");
  const nextLabel = useLandingTranslation("More fundraisers");
  /** Which fundraiser the big card shows; the arrows and dots below it move it. */
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (isDonee) return;
    let live = true;
    fundraisers.live()
      .then((next) => { if (live) setCards(next); })
      .catch(() => { if (live) setCards([]); });
    return () => { live = false; };
  }, [isDonee]);

  if (isDonee) return null;
  const count = cards?.length ?? 0;
  const current = Math.min(active, Math.max(count - 1, 0));

  return (
    <section
      aria-labelledby="fundraisers-spotlight-h"
      className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 text-[#1F140D] dark:text-stone-100"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full bg-[#f7ebe4]/80 dark:bg-brand-500/20 border border-[#e6d5c3]/40 text-xs font-bold uppercase tracking-[0.16em] text-[#b04a15] dark:text-[#ff8a4c] shadow-2xs">
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            <span><LandingText>Verified Fundraisers</LandingText></span>
          </div>

          <h2
            id="fundraisers-spotlight-h"
            className="font-serif m-0 text-2xl sm:text-3xl lg:text-[2.1rem] font-bold tracking-tight text-[#933c10] dark:text-[#f9dfc0] leading-[1.15]"
          >
            {diwali ? (
              <><LandingText>Light a diya</LandingText> <em><LandingText>for someone&apos;s need</LandingText></em></>
            ) : (
              <><LandingText>Help fund</LandingText> <em><LandingText>a specific need</LandingText></em></>
            )}
          </h2>

          <p className="m-0 text-[15px] sm:text-base leading-relaxed text-[#5a4030] dark:text-[#f9dfc0]/85 font-normal">
            {diwali ? (
              <LandingText>Money raised for a specific person&apos;s need. Each one was reviewed by our team before it went public.</LandingText>
            ) : (
              <LandingText>Each fundraiser raises money for one person&apos;s need. Every one was reviewed by our team before it went public.</LandingText>
            )}
          </p>
        </div>

        <Link
          href="/fundraisers"
          className="group ms-auto inline-flex items-center gap-1.5 min-h-[44px] text-[15px] font-bold text-[#b04a15] hover:text-brand-700 dark:text-[#ff8a4c] dark:hover:text-[#ffb08a] no-underline transition-all"
        >
          <span><LandingText>View all fundraisers</LandingText></span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>

      {cards === null ? (
        <div className="h-[420px] animate-pulse rounded-3xl border border-[#ece4da] bg-stone-200/40 dark:border-zinc-700 dark:bg-zinc-800/40" />
      ) : count > 0 ? (
        <div className="flex flex-col gap-6">
          {/* The big card plus arrows and dots, the same pager as Real people.
              Real needs. (owner, 27 Nov 2026). Card content and style unchanged. */}
          <div>
            <SpotlightCard key={cards[current].id} card={cards[current]} diwali={diwali} />
            {count > 1 && (
              <nav aria-label="Fundraisers" className="mt-3 flex items-center justify-center gap-2">
                <button type="button" aria-label={previousLabel} disabled={current === 0}
                  onClick={() => setActive(current - 1)}
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-current text-[var(--ck-home-ink,#b04a15)] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2">
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <div className="flex min-w-0 items-center overflow-x-auto">
                  {cards.map((card, index) => (
                    <button key={card.id} type="button" aria-label={`Fundraiser ${index + 1} of ${count}`}
                      aria-current={index === current ? "true" : undefined}
                      onClick={() => setActive(index)}
                      className="flex h-11 w-8 shrink-0 cursor-pointer items-center justify-center text-[var(--ck-home-ink,#b04a15)] focus-visible:outline-2">
                      <span className={`h-2 w-2 rounded-full bg-current ${index === current ? "opacity-100" : "opacity-30"}`} />
                    </button>
                  ))}
                </div>
                <button type="button" aria-label={nextLabel} disabled={current === count - 1}
                  onClick={() => setActive(current + 1)}
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-current text-[var(--ck-home-ink,#b04a15)] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2">
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
                <span className="sr-only" aria-live="polite">{`${current + 1} of ${count}`}</span>
              </nav>
            )}
          </div>
          {/* The "More fundraisers" rail is gone (owner, 27 Nov 2026): the arrows
              and dots above page through every fundraiser on all screens. */}
          {count === 1 && (
            <Link href="/fundraising/start"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[1.5px] border-dashed border-[#d6c6b4] px-5 py-4 text-stone-900 no-underline hover:border-[#b04a15] dark:border-zinc-700 dark:text-stone-100">
              <span>
                <b><LandingText>Need help with a medical bill, fees or rent?</LandingText></b>{" "}
                <span className="text-stone-600 dark:text-stone-400"><LandingText>Start a verified fundraiser. It&apos;s free.</LandingText></span>
              </span>
              <span className="font-bold text-[#b04a15] dark:text-[#ff8a4c]"><LandingText>Start a fundraiser</LandingText> →</span>
            </Link>
          )}
        </div>
      ) : (
        <Link
          href={DONATE_HREF}
          className="group relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[#e6d5c3]/40 bg-[#f7ebe4]/20 dark:bg-zinc-900/40 text-center gap-3 no-underline transition-all hover:border-[#e6d5c3]"
        >
          <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-stone-400 dark:text-stone-500">
            <EmptyStateIcon className="w-6 h-6" aria-hidden="true" />
          </div>
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
