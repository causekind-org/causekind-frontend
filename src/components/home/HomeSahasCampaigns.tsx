"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight } from "lucide-react";

import Link from "@/components/AppLink";
import { LandingText, useLandingTranslation } from "@/components/LandingTranslation";
import { useAuth } from "@/hooks/useAuth";
import { useDiwaliCampaign } from "@/hooks/useDiwaliCampaign";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { sahasCampaigns, type SahasCampaignCard } from "@/lib/api";
import { formatINR } from "@/features/fundraising/ui";
import { SahasDonateDialog } from "@/features/sahas/SahasDonateDialog";

// Still imported here: it was this file's import, and other home sections' rules live in it too.
import "./homeFundraisers.css";

const SHOWN_QUERY = "(max-width: 767.98px), (min-width: 1024px)";
/**
 * One left/right gutter shared by the heading and the card row, so the first card
 * lines up under the title: ~5.5vw on small screens, 80px at 1440, then centred
 * on wider screens. Also used as scroll-padding: snap-start otherwise snaps cards
 * to the scroller's raw edge and ignores its padding (cards stuck to the left).
 */
const GUTTER = "max(clamp(16px, 3.5vw, 48px), calc((100vw - 1440px) / 2 + 48px))";
/** The card row sits a little further left than the heading (owner, 2026-11-16). */
const ROW_GUTTER = "max(clamp(12px, 2vw, 24px), calc((100vw - 1440px) / 2 + 24px))";

/**
 * One tall story card (design "D · Tall story cards", 2026-11-16): the photo
 * fills the card, and a dark panel at the foot carries title, progress and
 * the Donate button so the photo does the talking.
 */
function StoryCard({ card, diwali, onDonate }: {
  card: SahasCampaignCard;
  diwali: boolean;
  onDonate: (slug: string) => void;
}) {
  const raised = card.amountRaised ?? 0;
  const target = card.targetAmount ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const canDonate = card.moneyOpen && (target === 0 || raised < target);
  const place = [card.city, card.state].filter(Boolean).join(", ");

  return (
    <article className="ck-sr-card relative flex shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[22px] bg-[#cbbba5] dark:bg-zinc-800 w-[78vw] max-w-[300px] sm:w-[300px] h-[460px] sm:h-[520px]">
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageUrl} alt={card.coverAltText ?? card.title} loading="lazy"
          className="absolute inset-0 h-full w-full object-cover" />
      ) : diwali ? (
        <span className="ck-dw-diya absolute inset-0 m-auto" />
      ) : null}

      <div className="relative flex items-start justify-between gap-2 p-4">
        {card.featured ? (
          <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-stone-900">
            <LandingText>Featured</LandingText>
          </span>
        ) : <span />}
        {place && (
          <span className="max-w-[60%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-stone-800">
            <TranslatedText text={place} />
          </span>
        )}
      </div>

      <div className="relative m-3 flex flex-col gap-2.5 rounded-2xl bg-[rgba(28,25,23,0.88)] p-4 text-white">
        <Link href={`/sahas/${card.slug}`} className="font-serif text-[19px] font-bold leading-snug text-white no-underline hover:underline">
          {card.title && <TranslatedText text={card.title} />}
        </Link>
        {card.collectsMoney && target > 0 && (
          <>
            <span className="h-1.5 overflow-hidden rounded-full bg-white/25" role="progressbar"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <span className="block h-full rounded-full bg-[#f4a25b]" style={{ width: `${pct}%` }} />
            </span>
            <span className="flex justify-between text-[13px] text-stone-200">
              <span><strong className="text-white">{formatINR(raised)}</strong> <LandingText>raised of</LandingText> {formatINR(target)}</span>
              <span>{pct}%</span>
            </span>
          </>
        )}
        {canDonate ? (
          <button type="button" onClick={() => onDonate(card.slug)}
            className="mt-1 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-0 bg-white text-sm font-extrabold text-stone-900 transition-transform active:scale-[0.98]">
            <LandingText>Donate</LandingText>
          </button>
        ) : (
          <Link href={`/sahas/${card.slug}`}
            className="mt-1 flex min-h-12 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-stone-900 no-underline">
            <LandingText>{card.phase === "CLOSED" ? "See delivered" : "View campaign"}</LandingText>
          </Link>
        )}
      </div>
    </article>
  );
}

/**
 * Sahas Campaigns section straight after the hero on the home page.
 * Not `ck-dw-campaigns` any more: the Diwali stylesheets give that class an
 * unlayered two-column grid that outranks these utilities. Hidden 768–1023px,
 * as before (SHOWN_QUERY skips the fetch there too).
 */
export function HomeSahasCampaigns() {
  const { user } = useAuth();
  const diwali = useDiwaliCampaign();
  const isDonee = user?.role?.replace(/^ROLE_/, "") === "DONEE";
  const [cards, setCards] = useState<SahasCampaignCard[] | null>(null);
  const [donatingSlug, setDonatingSlug] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const previousLabel = useLandingTranslation("Previous campaign");
  const nextLabel = useLandingTranslation("Next campaign");

  useEffect(() => {
    if (isDonee || !window.matchMedia(SHOWN_QUERY).matches) return;
    let live = true;
    sahasCampaigns.live()
      .then((all) => { if (live) setCards(all.filter((c) => c.phase === "OPEN" || c.phase === "UPCOMING")); })
      .catch(() => { if (live) setCards([]); });
    return () => { live = false; };
  }, [isDonee]);

  useEffect(() => { if (cards) ScrollTrigger.refresh(); }, [cards]);

  const syncEdges = () => {
    const row = rowRef.current;
    if (!row) return;
    setEdge({ start: row.scrollLeft <= 4, end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 4 });
  };
  useEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, [cards]);

  /** One card (plus its gap) per press. */
  const move = (direction: 1 | -1) => {
    const row = rowRef.current;
    const first = row?.children[0] as HTMLElement | undefined;
    if (!row || !first) return;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollBy({ left: direction * (first.offsetWidth + gap), behavior: reduced ? "auto" : "smooth" });
  };

  if (isDonee) return null;
  const many = !!cards && cards.length > 0;

  return (
    <section className="ck-sahas-reels relative overflow-hidden md:max-lg:hidden bg-[#F5F0E8] py-12 sm:py-16 dark:bg-[#0f0f11]"
      aria-labelledby="ck-dw-campaigns-title">
      {diwali && <span className="ck-dw-hang ck-dw-hang-right" aria-hidden />}

      <div className="flex flex-wrap items-end justify-between gap-6" style={{ paddingInline: GUTTER }}>
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-[#8e123c] dark:text-[#f4a340]">
            <LandingText>Sahas Campaigns</LandingText>
          </p>
          <h2 id="ck-dw-campaigns-title" className="m-0 font-serif text-[32px] font-bold leading-[1.05] text-[#1c1410] sm:text-[44px] dark:text-stone-50 [&_em]:not-italic">
            {diwali ? (
              <><LandingText>Light a diya</LandingText> <em><LandingText>for community campaigns</LandingText></em></>
            ) : (
              <><LandingText>Support our</LandingText> <em><LandingText>community campaigns</LandingText></em></>
            )}
          </h2>
          <p className="m-0 text-[15px] leading-relaxed text-stone-600 sm:text-base dark:text-stone-300">
            {diwali ? (
              <LandingText>Dedicated relief, education, and festive initiatives by Sahas Charitable Trust. 100% verified causes bringing real hope and impact.</LandingText>
            ) : (
              <LandingText>Collective relief, education, and community initiatives organized with Sahas Charitable Trust. Every campaign is verified before going live.</LandingText>
            )}
          </p>
        </div>
        {many && (
          <div className="flex items-center gap-2.5">
            <button type="button" aria-label={previousLabel} disabled={edge.start} onClick={() => move(-1)}
              className="flex size-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-stone-900 bg-transparent text-stone-900 disabled:cursor-default disabled:opacity-30 dark:border-stone-200 dark:text-stone-100">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button type="button" aria-label={nextLabel} disabled={edge.end} onClick={() => move(1)}
              className="flex size-12 cursor-pointer items-center justify-center rounded-full border-0 bg-stone-900 text-white disabled:cursor-default disabled:opacity-30 dark:bg-stone-100 dark:text-stone-900">
              <ChevronRight size={20} aria-hidden />
            </button>
            <Link href="/sahas" className="ml-2 font-bold text-[#b04a15] underline underline-offset-4 dark:text-[#f4a25b]">
              <LandingText>See all campaigns</LandingText>
            </Link>
          </div>
        )}
      </div>

      {/* Left-aligned with the heading, bleeding off the right edge so the row reads as "more this way". */}
      <div ref={rowRef} onScroll={syncEdges}
        style={{ paddingInline: ROW_GUTTER, scrollPaddingInline: ROW_GUTTER }}
        className="mt-7 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards === null ? (
          <div className="h-[460px] w-[78vw] max-w-[300px] shrink-0 animate-pulse rounded-[22px] bg-[#e6dccd] sm:h-[520px] sm:w-[300px] dark:bg-zinc-800" aria-hidden />
        ) : many ? (
          cards.map((card) => <StoryCard key={card.slug} card={card} diwali={diwali} onDonate={setDonatingSlug} />)
        ) : (
          <Link href="/sahas" className="flex h-[460px] w-[78vw] max-w-[300px] shrink-0 flex-col justify-end gap-2 rounded-[22px] bg-[#cbbba5] p-5 no-underline sm:h-[520px] sm:w-[300px] dark:bg-zinc-800">
            {diwali && <span className="ck-dw-diya" />}
            <span className="font-serif text-xl font-bold text-stone-900 dark:text-stone-50"><LandingText>Explore Sahas Campaigns</LandingText></span>
            <span className="text-sm text-stone-800 dark:text-stone-300"><LandingText>Community relief and support initiatives organized by Sahas Charitable Trust.</LandingText></span>
          </Link>
        )}
      </div>

      {donatingSlug && <SahasDonateDialog slug={donatingSlug} onClose={() => setDonatingSlug(null)} />}
    </section>
  );
}
