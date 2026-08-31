"use client";

/**
 * HeroSection — Desktop hero with cycling background images + quote slideshow.
 * Extracted from HomeClient.tsx for maintainability.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { getHeroImages } from "@/app/actions/getHeroImages";
import type { Campaign, PlatformStats, PublicItemRequest } from "@/lib/api";
import { FEATURES } from "@/lib/features";
import { isIndependenceDayCampaignActive } from "@/lib/independence-day";
import { isRakshaBandhanCampaignActive } from "@/lib/raksha-bandhan";
import {
  INDEPENDENCE_QUOTES,
  IndependenceCount,
  TricolourSweep,
  UnfurlReveal,
} from "@/components/home/IndependenceHero";
import {
  RAKSHA_BANDHAN_QUOTES,
  WaitingLongestCard,
} from "@/components/home/ThreadOfProtection";

/* ── Quotes cycle ─────────────────────────────────────────────────────────── */
const HERO_QUOTES = [
  { text: "The smallest act of kindness is worth more than the grandest intention.", author: "Oscar Wilde" },
  { text: "We make a living by what we get, but we make a life by what we give.", author: "Winston Churchill" },
  { text: "No one has ever become poor by giving.", author: "Anne Frank" },
  { text: "Give, but give until it hurts.", author: "Mother Teresa" },
  { text: "The purpose of life is not to be happy — it is to be useful.", author: "Ralph Waldo Emerson" },
  { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
];

export function HeroQuoteSlider({
  quotes = HERO_QUOTES,
}: {
  /** Swapped for the Independence Day set during the campaign window. */
  quotes?: readonly { text: string; author: string }[];
} = {}) {
  const [idx, setIdx] = useState(0);

  // Reset when the set changes, so a shorter list cannot leave the index out of
  // range and render `undefined`.
  useEffect(() => setIdx(0), [quotes]);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % quotes.length), 6000);
    return () => clearInterval(t);
  }, [quotes.length]);

  const q = quotes[idx] ?? quotes[0];

  return (
    <div className="ck-hero-quote shrink-0 relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          className="absolute inset-0 flex flex-col justify-center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: [0.36, 0.66, 0.04, 1] }}
        >
          <p className="text-white/70 text-sm sm:text-base leading-relaxed font-medium italic line-clamp-3">
            &ldquo;{q.text}&rdquo;
          </p>
          <span className="mt-1 flex items-center gap-2 text-[#f0b97a] text-2xs font-black uppercase tracking-wider">
            <span className="block h-px w-5 bg-[#e07b3a]" />
            {q.author}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Background image slider ─────────────────────────────────────────────── */
export function HeroImageSlider() {
  const [images, setImages]   = useState<string[]>(["/images/hero-1.webp"]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    getHeroImages().then(imgs => {
      if (imgs?.length) setImages(imgs);
    });
  }, []);

  useEffect(() => {
    if (!images.length) return;
    const t = setInterval(() => setCurrent(p => (p + 1) % images.length), 6000);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {images.map((src, i) => (
        <div key={src} className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out" style={{ opacity: i === current ? 0.95 : 0 }}>
          <div className={i === current ? (i % 2 === 0 ? "hero-slide-active" : "hero-slide-active-alt") : ""} style={{ position: "absolute", inset: 0 }}>
            <Image src={src} alt="" fill className="object-cover brightness-[0.85] contrast-[1.05]" style={{ objectPosition: "center 30%" }} priority={i === 0} sizes="100vw" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Desktop hero section ────────────────────────────────────────────────── */
export function HeroSection({
  currentCampaign,
  translatedTitle,
  translatedDesc,
  stats = null,
  rakshaBandhanRequest = null,
}: {
  currentCampaign: Campaign | null;
  translatedTitle: string | null;
  translatedDesc: string | null;
  /** Feeds the Independence Day count card. Null until the fetch resolves. */
  stats?: PlatformStats | null;
  /**
   * The need that has gone unclaimed longest — the thing at the end of the
   * Raksha Bandhan thread. Null when the campaign is off, when the board is
   * empty, or when the fetch failed; the hero then renders exactly as it does
   * on any other day.
   */
  rakshaBandhanRequest?: PublicItemRequest | null;
}) {
  const tHero = useTranslations("hero");

  // One switch for the whole campaign — the same call the strip above the hero
  // makes, so the two can never disagree about whether it is on.
  const independenceDay = isIndependenceDayCampaignActive();

  // The campaign hero turns on only when there is a real need to show in it.
  // With no request the hero renders exactly as it does on any other day, rather
  // than marking the occasion with an empty column.
  const rakshaBandhan = isRakshaBandhanCampaignActive() && rakshaBandhanRequest !== null;

  const urgency = currentCampaign?.urgency ?? "NORMAL";
  const urgencyConfig = {
    CRITICAL: { label: "Critical — Urgent Action Needed", dot: "urgency-dot-critical", badge: "bg-red-500/15 border-red-400/40 text-red-300" },
    HIGH:     { label: "High Priority", dot: "urgency-dot-high", badge: "bg-amber-500/15 border-amber-400/40 text-amber-300" },
    NORMAL:   { label: "Active Campaign", dot: "", badge: "bg-white/10 border-white/20 text-white/70" },
  }[urgency] ?? { label: "Active Campaign", dot: "", badge: "bg-white/10 border-white/20 text-white/70" };

  return (
    <section className="relative w-full max-w-[1440px] mx-auto px-0 sm:px-10 pt-0 sm:pt-8 pb-0">
      <div className="ck-hero-viewport relative w-full rounded-t-[3rem] rounded-b-none overflow-hidden bg-stone-900 shadow-xl border-x border-t border-[#e5e2d5]/60">
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <HeroImageSlider />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />
          {/* Between the two gradients, deliberately. Below both, the sweep sat
              under 60% black twice over and the colour vanished. Above both, it
              would wash across the headline. Here it clears the horizontal
              darkening — the one that was killing it — while the bottom-up
              gradient still goes over the top of it, which is what protects the
              text sitting in that corner. */}
          {independenceDay && <TricolourSweep />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        </div>

        {/* No min-height here: it used to duplicate the card's three fixed
            values and fought the parent once the card became viewport-sized. */}
        <div className="ck-hero-pad relative z-10 w-full h-full px-6 sm:px-12 flex flex-col justify-between overflow-hidden">
          <div className="w-full flex items-start justify-between gap-4 lg:gap-6">
            <motion.div
              className="self-start inline-flex items-center gap-2 bg-white/65 backdrop-blur-md rounded-full px-5 py-2 border border-white/40 shadow-sm"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            >
              <span className="w-2 h-2 rounded-full bg-[#f0b97a] animate-pulse shrink-0" />
              <span className="text-[#b04a15] text-xs font-extrabold uppercase tracking-wider">{tHero("badge")}</span>
            </motion.div>
            <div className="hidden lg:flex flex-col items-end gap-2">
              {[tHero("transparent"), tHero("fastDistribution")].map((label, i) => (
                <motion.div
                  key={label}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/25 rounded-full px-4 py-2 shadow-xs"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.1 + i * 0.1 }}
                >
                  <span className="w-2 h-2 rounded-full bg-[#f0b97a]" />
                  <span className="text-white text-sm font-semibold">{label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mt-auto">
            <div className="lg:col-span-7 flex flex-col items-start gap-5 relative">
              {/* During the campaign the unfurl owns the headline's entrance
                  outright. Layering it inside framer's spring was tried and
                  looked wrong: two opacity animations multiply, so the headline
                  sat at roughly a fifth of full strength while the tricolour
                  band was supposed to be sweeping over it, and neither read.
                  One animation, or the other — not both on the same element. */}
              <motion.h1
                className="ck-hero-title text-white font-extrabold leading-[1.08] tracking-tight max-w-2xl font-jakarta"
                initial={independenceDay ? false : { opacity: 0, x: -28 }}
                animate={independenceDay ? undefined : { opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 75, damping: 20, delay: 0.15 }}
              >
                {independenceDay
                  ? <UnfurlReveal>{tHero("headline")}</UnfurlReveal>
                  : tHero("headline")}
              </motion.h1>
              <motion.div
                className="max-w-lg w-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 75, damping: 20, delay: 0.28 }}
              >
                <HeroQuoteSlider
                  quotes={
                    rakshaBandhan
                      ? RAKSHA_BANDHAN_QUOTES
                      : independenceDay
                        ? INDEPENDENCE_QUOTES
                        : HERO_QUOTES
                  }
                />
              </motion.div>
            </div>

            {/* The right column holds the monetary campaign card, which never
                renders while FEATURES.money is false — roughly 40% of the hero
                is empty every other day of the year. The campaign fills it with
                the platform's own handover count rather than more decoration. */}
            {/* The end of the thread. Framer's entrance is deliberately not
                layered on top of this one: the card has its own delayed rise in
                styles.css, timed to land as the thread reaches it, and two
                opacity animations on one element multiply into a card that is
                barely visible while the thread is supposed to be arriving —
                the same mistake the Independence Day headline made. */}
            {rakshaBandhan && !FEATURES.money && (
              <div className="lg:col-span-5 flex justify-end">
                <WaitingLongestCard request={rakshaBandhanRequest} />
              </div>
            )}

            {independenceDay && !rakshaBandhan && !FEATURES.money && (
              <motion.div
                className="lg:col-span-5 flex justify-end"
                initial={{ opacity: 0, x: 36, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 65, damping: 18, delay: 0.22 }}
              >
                <IndependenceCount stats={stats} />
              </motion.div>
            )}

            {FEATURES.money && (
              <motion.div
                className="lg:col-span-5 flex justify-end"
                initial={{ opacity: 0, x: 36, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 65, damping: 18, delay: 0.22 }}
              >
                <div className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl w-full max-w-[320px] border border-white/50 dark:border-white/10 sm:min-h-[350px] flex flex-col justify-between transition-all duration-500">
                  <div>
                    <div className="mb-0 lg:mb-4">
                      <div className={`lg:hidden inline-flex items-center gap-1.5 rounded-full border px-3 py-1 mb-3 ${urgencyConfig.badge}`}>
                        {urgencyConfig.dot && <span className={`w-1.5 h-1.5 rounded-full bg-current ${urgencyConfig.dot}`} />}
                        <span className="text-3xs font-black uppercase tracking-wider">{urgencyConfig.label}</span>
                      </div>
                      <div className="hidden lg:flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] flex items-center justify-center shadow-sm shrink-0">
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 21.5C7.5 18 4.5 14.5 4.5 10.5C4.5 7.5 6.5 5.5 9.5 5.5C10.8 5.5 11.6 6 12 6.5C12.4 6 13.2 5.5 14.5 5.5C17.5 5.5 19.5 7.5 19.5 10.5C19.5 14.5 16.5 18 12 21.5Z" stroke="white" strokeWidth="1.8" /></svg>
                          </div>
                          <span className="text-sm font-extrabold text-stone-900 dark:text-stone-100">CauseKind</span>
                        </div>
                        <span className="text-xs text-stone-400 font-bold">· {currentCampaign ? <TranslatedText text={currentCampaign.city} /> : "2026"}</span>
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white leading-snug mb-2 font-jakarta line-clamp-2 transition-all duration-300">
                      {translatedTitle ?? "Make an Immediate Impact"}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed font-medium line-clamp-2 transition-all duration-300">
                      {translatedDesc ?? "Every donation directly supports frontline community programs."}
                    </p>
                  </div>
                  <Link href={currentCampaign ? `/campaigns/${currentCampaign.id}` : "/campaigns"} className="block w-full">
                    <button className="w-full bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold py-3.5 rounded-xl text-xs tracking-wide uppercase transition-all duration-300 shadow-md shadow-orange-900/20 active:scale-95">
                      {tHero("donateNow")}
                    </button>
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
