"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight } from "lucide-react";

import Link from "@/components/AppLink";
import { LandingText, useLandingTranslation } from "@/components/LandingTranslation";
import { useAuth } from "@/hooks/useAuth";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { fundraisers, type FundraiserCard, type FundraisingCategory } from "@/lib/api";
import { formatINR } from "@/features/fundraising/ui";

const SHOWN_QUERY = "(max-width: 767.98px), (min-width: 1024px)";
/** How fast the row glides, in pixels per millisecond. */
const GLIDE_SPEED = 0.04;
const RESUME_AFTER_TOUCH_MS = 2500;
const RESUME_AFTER_ARROW_MS = 4000;

const CATEGORY: Record<FundraisingCategory, string> = {
  MEDICAL: "Medical",
  EDUCATION: "Education",
  EMERGENCY_HOUSEHOLD: "Emergency household support",
  OTHER: "Other",
};

/** `copy` is the looping row's second run of cards: seen, but not read out or tabbed to. */
function Card({ card, copy = false }: { card: FundraiserCard; copy?: boolean }) {
  const pct = card.target ? Math.min(100, Math.round((card.raised / card.target) * 100)) : 0;
  return (
    <Link href={`/fundraisers/${card.id}`} className="ck-dw-card" aria-hidden={copy || undefined} tabIndex={copy ? -1 : undefined}>
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
 * Live fundraisers straight after the hero, on phones and desktop. Real cards from the public
 * endpoint; while there are none (or the service is off) an empty card says so and
 * points to item giving, the same wording as /fundraisers. Nothing is fetched on
 * tablets. Its height feeds the film's lead-in, so triggers re-measure on load.
 */
export function DiwaliCampaigns() {
  const { user } = useAuth();
  // The fundraisers are for givers; a donee is shown no one else's needs.
  const isDonee = user?.role?.replace(/^ROLE_/, "") === "DONEE";
  const [cards, setCards] = useState<FundraiserCard[] | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const previousLabel = useLandingTranslation("Previous fundraiser");
  const nextLabel = useLandingTranslation("Next fundraiser");
  const pagerLabel = useLandingTranslation("Fundraisers pages");

  const [looping, setLooping] = useState(false);
  const [fits, setFits] = useState(false);
  const hovered = useRef(false);
  const focused = useRef(false);
  const touching = useRef(false);
  const pauseUntil = useRef(0);

  /** The width of one run of cards, once the second run is on the page. */
  const runWidth = () => {
    const row = rowRef.current;
    const next = row?.children[cards?.length ?? 0] as HTMLElement | undefined;
    return row && next ? next.offsetLeft - (row.children[0] as HTMLElement).offsetLeft : 0;
  };

  const syncActive = () => {
    const row = rowRef.current;
    const count = cards?.length ?? 0;
    if (!row || count < 2) return;
    const step = (row.children[1] as HTMLElement).offsetLeft - (row.children[0] as HTMLElement).offsetLeft;
    if (looping) return setActive(Math.round(row.scrollLeft / step) % count);
    const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 8;
    setActive(atEnd ? count - 1 : Math.round(row.scrollLeft / step));
  };

  const scrollBehavior = (): ScrollBehavior => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");

  const goTo = (index: number) => {
    const row = rowRef.current;
    const card = row?.children[index] as HTMLElement | undefined;
    if (!row || !card) return;
    pauseUntil.current = performance.now() + RESUME_AFTER_ARROW_MS;
    const left = card.offsetLeft - (row.children[0] as HTMLElement).offsetLeft;
    row.scrollTo({ left, behavior: scrollBehavior() });
  };

  const move = (direction: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    if (!looping) return goTo(active + direction);
    pauseUntil.current = performance.now() + RESUME_AFTER_ARROW_MS;
    const run = runWidth();
    const step = (row.children[1] as HTMLElement).offsetLeft - (row.children[0] as HTMLElement).offsetLeft;
    // Step back into the run that has room in this direction; it looks identical.
    let left = row.scrollLeft % run;
    if (direction < 0 && left < step / 2) left += run;
    row.scrollTo({ left, behavior: "auto" });
    row.scrollTo({ left: (Math.round(left / step) + direction) * step, behavior: scrollBehavior() });
  };

  useEffect(() => {
    if (isDonee || !window.matchMedia(SHOWN_QUERY).matches) return;
    let live = true;
    fundraisers.live().catch(() => [] as FundraiserCard[]).then((next) => {
      if (live) setCards(next);
    });
    return () => { live = false; };
  }, [isDonee]);

  useEffect(() => {
    if (cards) ScrollTrigger.refresh();
  }, [cards]);

  // Glide only when the cards do not all fit, so nothing repeats on screen.
  useEffect(() => {
    const count = cards?.length ?? 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const measure = () => {
      const row = rowRef.current;
      const first = row?.children[0] as HTMLElement | undefined;
      if (!row || !first) return setLooping(false);
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const overflows = count * first.offsetWidth + (count - 1) * gap > row.clientWidth;
      setFits(!overflows);
      setLooping(overflows && count >= 2 && !reduced.matches);
    };
    measure();
    window.addEventListener("resize", measure);
    reduced.addEventListener("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      reduced.removeEventListener("change", measure);
    };
  }, [cards]);

  // Scrolls the row itself, so swiping and the arrows keep working. Runs only
  // while the row is on screen.
  useEffect(() => {
    const row = rowRef.current;
    if (!looping || !row || typeof IntersectionObserver === "undefined") return;
    let frame = 0;
    let last = 0;
    let position = row.scrollLeft;
    const tick = (now: number) => {
      const elapsed = Math.min(now - last, 50);
      last = now;
      if (!hovered.current && !focused.current && !touching.current && now >= pauseUntil.current) {
        if (Math.abs(row.scrollLeft - position) > 2) position = row.scrollLeft;
        position += elapsed * GLIDE_SPEED;
        const run = runWidth();
        if (run && position >= run) position -= run;
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
      io.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runWidth only reads refs and the card count
  }, [looping, cards]);

  if (isDonee) return null;

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

      <div
        ref={rowRef}
        className="ck-dw-c-row"
        data-loop={looping || undefined}
        onScroll={syncActive}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") hovered.current = true; }}
        onPointerLeave={(event) => { if (event.pointerType === "mouse") hovered.current = false; }}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; }}
        onTouchStart={() => { touching.current = true; }}
        onTouchEnd={() => {
          touching.current = false;
          pauseUntil.current = performance.now() + RESUME_AFTER_TOUCH_MS;
        }}
      >
        {cards === null ? (
          <div className="ck-dw-card is-skeleton" aria-hidden><span className="ck-dw-c-photo" /><span className="ck-dw-c-body" /></div>
        ) : cards.length > 0 ? (
          <>
            {cards.map((card) => <Card key={card.id} card={card} />)}
            {looping && cards.map((card) => <Card key={`copy-${card.id}`} card={card} copy />)}
          </>
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
          <button type="button" className="ck-dw-c-arrow" aria-label={previousLabel} disabled={!looping && active === 0} onClick={() => move(-1)}>
            <ChevronLeft size={20} aria-hidden />
          </button>
          {cards.map((card, index) => (
            <button key={card.id} type="button" className="ck-dw-c-dot" aria-label={`${index + 1} / ${cards.length}`} aria-current={index === active ? "page" : undefined} onClick={() => goTo(index)}>
              <span />
            </button>
          ))}
          <button type="button" className="ck-dw-c-arrow" aria-label={nextLabel} disabled={!looping && (fits || active === cards.length - 1)} onClick={() => move(1)}>
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
