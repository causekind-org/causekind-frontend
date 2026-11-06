"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import Link from "@/components/AppLink";
import { LandingText, useLandingTranslation } from "@/components/LandingTranslation";
import { useAuth } from "@/hooks/useAuth";
import { useDiwaliCampaign } from "@/hooks/useDiwaliCampaign";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { sahasCampaigns, type SahasCampaignCard } from "@/lib/api";
import { formatINR } from "@/features/fundraising/ui";
import { SahasDonateDialog } from "@/features/sahas/SahasDonateDialog";

import "./homeFundraisers.css";

const SHOWN_QUERY = "(max-width: 767.98px), (min-width: 1024px)";
/** How fast the row glides, in pixels per millisecond. */
const GLIDE_SPEED = 0.04;
const RESUME_AFTER_TOUCH_MS = 2500;
const RESUME_AFTER_ARROW_MS = 4000;

/** `copy` is the looping row's second run of cards: seen, but not read out or tabbed to. */
function CampaignCard({
  card,
  copy = false,
  diwali,
  onDonate,
}: {
  card: SahasCampaignCard;
  copy?: boolean;
  diwali: boolean;
  onDonate: (slug: string) => void;
}) {
  const raised = card.amountRaised ?? 0;
  const target = card.targetAmount ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const canDonate = card.moneyOpen && (target === 0 || raised < target);

  return (
    <div
      className="ck-dw-card group"
      aria-hidden={copy || undefined}
      tabIndex={copy ? -1 : undefined}
    >
      <Link
        href={`/sahas/${card.slug}`}
        tabIndex={copy ? -1 : undefined}
        className="ck-dw-c-photo block overflow-hidden relative no-underline"
      >
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt={card.coverAltText ?? card.title}
            loading="lazy"
            className="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          diwali ? (
            <span className="ck-dw-diya" />
          ) : (
            <span className="text-4xl" role="img" aria-label="Diwali Diya">🪔</span>
          )
        )}
        {card.featured && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
            <Sparkles className="w-2.5 h-2.5 text-amber-200" aria-hidden="true" />
            <LandingText>Featured</LandingText>
          </span>
        )}
      </Link>
      <div className="ck-dw-c-body">
        <span className="ck-dw-c-chip">
          <LandingText>Sahas Campaign</LandingText>
          {(card.city || card.state) && (
            <> · <TranslatedText text={[card.city, card.state].filter(Boolean).join(", ")} /></>
          )}
        </span>
        <Link
          href={`/sahas/${card.slug}`}
          tabIndex={copy ? -1 : undefined}
          className="ck-dw-c-name no-underline hover:underline"
        >
          {card.title && <TranslatedText text={card.title} />}
        </Link>
        <span className="ck-dw-c-by">
          <LandingText>By Sahas Charitable Trust</LandingText>
        </span>
        {card.collectsMoney && target > 0 && (
          <>
            <span className="ck-dw-c-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <span style={{ width: `${pct}%` }} />
            </span>
            <span className="ck-dw-c-sums">
              <strong>{formatINR(raised)}</strong> <LandingText>raised of</LandingText> {formatINR(target)}
            </span>
          </>
        )}
        {canDonate ? (
          <button
            type="button"
            tabIndex={copy ? -1 : undefined}
            onClick={() => onDonate(card.slug)}
            className="ck-dw-c-cta w-full border-none cursor-pointer font-extrabold text-sm transition-transform active:scale-[0.98]"
          >
            <LandingText>Donate</LandingText>
          </button>
        ) : (
          <Link
            href={`/sahas/${card.slug}`}
            tabIndex={copy ? -1 : undefined}
            className="ck-dw-c-cta no-underline font-extrabold text-sm text-center"
          >
            <LandingText>{card.phase === "CLOSED" ? "See delivered" : "View campaign"}</LandingText>
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Sahas Campaigns Section straight after the hero on the home page.
 * Keeps the beautiful Diwali layout (lantern, diya, scalloped edges, gliding cards,
 * 2-column desktop grid) while featuring verified Sahas community campaigns.
 */
export function HomeSahasCampaigns() {
  const { user } = useAuth();
  const diwali = useDiwaliCampaign();
  const isDonee = user?.role?.replace(/^ROLE_/, "") === "DONEE";
  const [cards, setCards] = useState<SahasCampaignCard[] | null>(null);
  const [donatingSlug, setDonatingSlug] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const previousLabel = useLandingTranslation("Previous campaign");
  const nextLabel = useLandingTranslation("Next campaign");
  const pagerLabel = useLandingTranslation("Campaigns pages");

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
    let left = row.scrollLeft % run;
    if (direction < 0 && left < step / 2) left += run;
    row.scrollTo({ left, behavior: "auto" });
    row.scrollTo({ left: (Math.round(left / step) + direction) * step, behavior: scrollBehavior() });
  };

  useEffect(() => {
    if (isDonee || !window.matchMedia(SHOWN_QUERY).matches) return;
    let live = true;
    sahasCampaigns
      .live()
      .then((all) => {
        if (live) {
          setCards(all.filter((c) => c.phase === "OPEN" || c.phase === "UPCOMING"));
        }
      })
      .catch(() => {
        if (live) setCards([]);
      });
    return () => {
      live = false;
    };
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

  // RequestAnimationFrame continuous gliding scroll
  useEffect(() => {
    const row = rowRef.current;
    if (!looping || !row || typeof IntersectionObserver === "undefined") return;
    let frame = 0;
    let last = 0;
    let position = row.scrollLeft;
    const tick = (now: number) => {
      const elapsed = Math.min(now - last, 50);
      last = now;
      if (!donatingSlug && !hovered.current && !focused.current && !touching.current && now >= pauseUntil.current) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looping, cards, donatingSlug]);

  if (isDonee) return null;

  return (
    <section className="ck-dw-campaigns" aria-labelledby="ck-dw-campaigns-title">
      {diwali && <span className="ck-dw-hang ck-dw-hang-right" aria-hidden />}
      <div className="ck-dw-c-head">
        <p className="ck-dw-c-eyebrow !text-xs !font-black !tracking-[0.2em] !text-[#8e123c] dark:!text-[#f4a340]">
          <LandingText>Sahas Campaigns</LandingText>
        </p>
        <h2 id="ck-dw-campaigns-title" className="ck-dw-c-title">
          {diwali ? (
            <><LandingText>Light a diya</LandingText> <em><LandingText>for community campaigns</LandingText></em></>
          ) : (
            <><LandingText>Support our</LandingText> <em><LandingText>community campaigns</LandingText></em></>
          )}
        </h2>
        <p className="ck-dw-c-sub">
          {diwali ? (
            <LandingText>Dedicated relief, education, and festive initiatives by Sahas Charitable Trust. 100% verified causes bringing real hope and impact.</LandingText>
          ) : (
            <LandingText>Collective relief, education, and community initiatives organized with Sahas Charitable Trust. Every campaign is verified before going live.</LandingText>
          )}
        </p>
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
          <div className="ck-dw-card is-skeleton" aria-hidden>
            <span className="ck-dw-c-photo" />
            <span className="ck-dw-c-body" />
          </div>
        ) : cards.length > 0 ? (
          <>
            {cards.map((card) => (
              <CampaignCard key={card.slug} card={card} diwali={diwali} onDonate={setDonatingSlug} />
            ))}
            {looping && cards.map((card) => (
              <CampaignCard key={`copy-${card.slug}`} card={card} copy diwali={diwali} onDonate={setDonatingSlug} />
            ))}
          </>
        ) : (
          <Link href="/sahas" className="ck-dw-card ck-dw-c-empty">
            <span className="ck-dw-c-photo">{diwali && <span className="ck-dw-diya" />}</span>
            <span className="ck-dw-c-body">
              <span className="ck-dw-c-name"><LandingText>Explore Sahas Campaigns</LandingText></span>
              <span className="ck-dw-c-by"><LandingText>Community relief and support initiatives organized by Sahas Charitable Trust.</LandingText></span>
              <span className="ck-dw-c-cta"><LandingText>View campaigns</LandingText></span>
            </span>
          </Link>
        )}
      </div>

      {/* Navigation Pager */}
      {cards && cards.length > 0 && (
        <nav aria-label={pagerLabel} className="ck-dw-c-pager">
          <button
            type="button"
            className="ck-dw-c-arrow"
            aria-label={previousLabel}
            disabled={!looping && active === 0}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} aria-hidden />
          </button>
          {cards.map((card, index) => (
            <button
              key={card.slug}
              type="button"
              className="ck-dw-c-dot"
              aria-label={`${index + 1} / ${cards.length}`}
              aria-current={index === active ? "page" : undefined}
              onClick={() => goTo(index)}
            >
              <span />
            </button>
          ))}
          <button
            type="button"
            className="ck-dw-c-arrow"
            aria-label={nextLabel}
            disabled={!looping && (fits || active === cards.length - 1)}
            onClick={() => move(1)}
          >
            <ChevronRight size={20} aria-hidden />
          </button>
        </nav>
      )}

      {cards && cards.length > 0 && (
        <Link href="/sahas" className="ck-dw-c-all">
          <LandingText>See all campaigns</LandingText>
        </Link>
      )}

      {/* Modal checkout dialog if donor clicks Donate directly on card */}
      {donatingSlug && <SahasDonateDialog slug={donatingSlug} onClose={() => setDonatingSlug(null)} />}
    </section>
  );
}
