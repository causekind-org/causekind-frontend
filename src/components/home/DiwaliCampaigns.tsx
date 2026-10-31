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
  const [active, setActive] = useState(0);
  const previousLabel = useLandingTranslation("Previous fundraiser");
  const nextLabel = useLandingTranslation("Next fundraiser");
  const pagerLabel = useLandingTranslation("Fundraisers pages");

  const syncActive = () => {
    const row = rowRef.current;
    const count = row?.children.length ?? 0;
    if (!row || count < 2) return;
    const step = (row.children[1] as HTMLElement).offsetLeft - (row.children[0] as HTMLElement).offsetLeft;
    const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 8;
    setActive(atEnd ? count - 1 : Math.round(row.scrollLeft / step));
  };

  const goTo = (index: number) => {
    const row = rowRef.current;
    const card = row?.children[index] as HTMLElement | undefined;
    if (!row || !card) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = card.offsetLeft - (row.children[0] as HTMLElement).offsetLeft;
    row.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
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

      <div ref={rowRef} className="ck-dw-c-row" onScroll={syncActive}>
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
      {/* The same pager as the Live needs section. */}
      {cards && cards.length > 0 && (
        <nav aria-label={pagerLabel} className="ck-dw-c-pager">
          <button type="button" className="ck-dw-c-arrow" aria-label={previousLabel} disabled={active === 0} onClick={() => goTo(active - 1)}>
            <ChevronLeft size={20} aria-hidden />
          </button>
          {cards.map((card, index) => (
            <button key={card.id} type="button" className="ck-dw-c-dot" aria-label={`${index + 1} / ${cards.length}`} aria-current={index === active ? "page" : undefined} onClick={() => goTo(index)}>
              <span />
            </button>
          ))}
          <button type="button" className="ck-dw-c-arrow" aria-label={nextLabel} disabled={active === cards.length - 1} onClick={() => goTo(active + 1)}>
            <ChevronRight size={20} aria-hidden />
          </button>
        </nav>
      )}

      {cards && cards.length > 0 && (
        <Link href="/fundraisers" className="ck-dw-c-all"><LandingText>See all fundraisers</LandingText></Link>
      )}
    </section>
  );
}
