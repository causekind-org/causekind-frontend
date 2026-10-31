"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight } from "lucide-react";

import Link from "@/components/AppLink";
import { LandingText, useLandingTranslation } from "@/components/LandingTranslation";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { fundraisers, type FundraiserCard, type FundraisingCategory } from "@/lib/api";
import { formatINR } from "@/features/fundraising/ui";

const PHONE_QUERY = "(max-width: 767.98px)";

const CATEGORY: Record<FundraisingCategory, string> = {
  MEDICAL: "Medical",
  EDUCATION: "Education",
  EMERGENCY_HOUSEHOLD: "Emergency household support",
  OTHER: "Other",
};

function Card({ card }: { card: FundraiserCard }) {
  const pct = card.target ? Math.min(100, Math.round((card.raised / card.target) * 100)) : 0;
  return (
    <Link href={`/fundraisers/${card.id}`} className="ck-dw-card">
      <span className="ck-dw-c-photo">
        {card.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.coverUrl} alt={card.coverAltText ?? ""} loading="lazy" />
        ) : (
          <span className="ck-dw-diya" />
        )}
      </span>
      <span className="ck-dw-c-body">
        <span className="ck-dw-c-chip">
          <LandingText>{card.category ? CATEGORY[card.category] : "Fundraiser"}</LandingText>
          {card.location && <> · <TranslatedText text={card.location} /></>}
        </span>
        <span className="ck-dw-c-name">{card.title && <TranslatedText text={card.title} />}</span>
        {card.organiser && <span className="ck-dw-c-by"><LandingText>By </LandingText>{card.organiser}</span>}
        <span className="ck-dw-c-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <span style={{ width: `${pct}%` }} />
        </span>
        <span className="ck-dw-c-sums">
          <strong>{formatINR(card.raised)}</strong> <LandingText>raised of</LandingText> {formatINR(card.target)}
        </span>
        <span className="ck-dw-c-cta"><LandingText>Donate</LandingText></span>
      </span>
    </Link>
  );
}

/**
 * Live fundraisers straight after the hero, phones only. Real cards from the public
 * endpoint; while there are none (or the service is off) an empty card says so and
 * points to item giving, the same wording as /fundraisers. Nothing is fetched on
 * wider screens. Its height feeds the film's lead-in, so triggers re-measure on load.
 */
export function DiwaliCampaigns() {
  const [cards, setCards] = useState<FundraiserCard[] | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ atStart: true, atEnd: false });
  const previousLabel = useLandingTranslation("Previous fundraiser");
  const nextLabel = useLandingTranslation("Next fundraiser");
  const allLabel = useLandingTranslation("See all fundraisers");

  const syncEdge = () => {
    const row = rowRef.current;
    if (!row) return;
    const atStart = row.scrollLeft < 8;
    const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 8;
    setEdge((current) => (current.atStart === atStart && current.atEnd === atEnd ? current : { atStart, atEnd }));
  };

  const move = (direction: 1 | -1) => {
    const row = rowRef.current;
    const card = row?.querySelector<HTMLElement>(".ck-dw-card");
    if (!row || !card) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollBy({ left: direction * (card.offsetWidth + 14), behavior: reduced ? "auto" : "smooth" });
  };

  useEffect(() => {
    if (!window.matchMedia(PHONE_QUERY).matches) return;
    let live = true;
    fundraisers.live().catch(() => [] as FundraiserCard[]).then((next) => {
      if (live) setCards(next);
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (cards) ScrollTrigger.refresh();
    syncEdge();
  }, [cards]);

  return (
    <section className="ck-dw-campaigns" aria-labelledby="ck-dw-campaigns-title">
      <span className="ck-dw-hang ck-dw-hang-right" aria-hidden />
      <div className="ck-dw-c-head">
        <p className="ck-dw-c-eyebrow"><LandingText>Fundraisers</LandingText></p>
        <h2 id="ck-dw-campaigns-title" className="ck-dw-c-title">
          <LandingText>Light a diya</LandingText> <em><LandingText>for someone&apos;s need</LandingText></em>
        </h2>
        <p className="ck-dw-c-sub"><LandingText>Money raised for a specific person&apos;s need. Each one was reviewed by our team before it went public.</LandingText></p>
      </div>

      <div className="ck-dw-c-stage" data-single={cards?.length === 1 || undefined}>
      <div ref={rowRef} className="ck-dw-c-row" onScroll={syncEdge}>
        {cards === null ? (
          <div className="ck-dw-card is-skeleton" aria-hidden><span className="ck-dw-c-photo" /><span className="ck-dw-c-body" /></div>
        ) : cards.length > 0 ? (
          cards.map((card) => <Card key={card.id} card={card} />)
        ) : (
          <Link href="/requests" className="ck-dw-card ck-dw-c-empty">
            <span className="ck-dw-c-photo"><span className="ck-dw-diya" /></span>
            <span className="ck-dw-c-body">
              <span className="ck-dw-c-name"><LandingText>No fundraisers yet</LandingText></span>
              <span className="ck-dw-c-by"><LandingText>There are no live fundraisers right now. You can still donate items.</LandingText></span>
              <span className="ck-dw-c-cta"><LandingText>Donate items</LandingText></span>
            </span>
          </Link>
        )}
      </div>
      {cards && cards.length > 0 && !edge.atStart && (
        <button type="button" className="ck-dw-c-arrow ck-dw-c-arrow-prev" aria-label={previousLabel} onClick={() => move(-1)}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      {/* Past the last card, next is the full list. */}
      {cards && cards.length > 0 && (edge.atEnd ? (
        <Link href="/fundraisers" className="ck-dw-c-arrow ck-dw-c-arrow-next" aria-label={allLabel}>
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      ) : (
        <button type="button" className="ck-dw-c-arrow ck-dw-c-arrow-next" aria-label={nextLabel} onClick={() => move(1)}>
          <ChevronRight className="size-5" aria-hidden />
        </button>
      ))}
      </div>

      {cards && cards.length > 0 && (
        <Link href="/fundraisers" className="ck-dw-c-all"><LandingText>See all fundraisers</LandingText></Link>
      )}
    </section>
  );
}
