"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  MapPin,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HeartHandshake,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ALL_REQUEST_CATEGORIES, CATEGORY_VISUALS } from "@/lib/categoryVisuals";
import { loginUrlFor } from "@/lib/safeRedirect";
import type { PlatformStats, PublicItemRequest } from "@/lib/api";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import AnimatedCategoryIcon from "@/components/AnimatedCategoryIcon";

/**
 * Animated number counter that counts smoothly from 0 to target when scrolled into view.
 */
function AnimatedCounter({
  target,
  duration = 1.6,
  prefix = "",
  suffix = "",
}: {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion || target === 0) {
      setCount(target);
      return;
    }

    let startTime: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeProgress * target));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [inView, target, duration, reduceMotion]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/**
 * Shortest-path circular distance from `active` to `idx` within a list of
 * length `len`. Returns a signed offset in {-1, 0, 1, ...}; used to decide
 * whether a card renders as the center card, an immediate left/right
 * neighbour (blurred, peeking), or stays hidden off-stage.
 */
function circularOffset(idx: number, active: number, len: number): number {
  const raw = idx - active;
  const half = len / 2;
  if (raw > half) return raw - len;
  if (raw < -half) return raw + len;
  return raw;
}

export function LiveNeedsSection({
  initialRequests = [],
  stats,
}: {
  initialRequests?: PublicItemRequest[];
  stats?: PlatformStats | null;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });
  const reduceMotion = useReducedMotion();

  // Purely backend-driven now — whatever the API returns (including an empty
  // array) is what renders. No local fallback/dummy data masking a real empty state.
  const allNeeds = initialRequests ?? [];

  // Filter based on selected category pill
  const displayedNeeds = useMemo(() => {
    if (selectedCategory === "All") {
      return allNeeds.slice(0, 6);
    }
    return allNeeds.filter((n) => n.category === selectedCategory).slice(0, 6);
  }, [allNeeds, selectedCategory]);

  const totalOpenCount = allNeeds.length;
  const cardCount = displayedNeeds.length;

  // ── Coverflow carousel state ──────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Reset carousel position whenever the filtered list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [selectedCategory]);

  // Auto-advance every 2s, paused on hover
  useEffect(() => {
    if (isPaused || cardCount <= 1) return;
    const timer = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % cardCount);
    }, 2000);
    return () => clearTimeout(timer);
  }, [activeIndex, isPaused, cardCount]);

  const goPrev = () => {
    if (cardCount <= 1) return;
    setActiveIndex((i) => (i - 1 + cardCount) % cardCount);
  };

  const goNext = () => {
    if (cardCount <= 1) return;
    setActiveIndex((i) => (i + 1) % cardCount);
  };

  /**
   * Computes the position/scale/blur/opacity for a card at circular `offset`
   * from the active card. offset 0 = center, clear. ±1 = immediate neighbour,
   * blurred and peeking to the side. Anything further is pushed off-stage and
   * hidden — sliding into that position happens by passing through ±1 first,
   * which is exactly what changing activeIndex + a CSS transition gives us.
   */
  function getCardStyle(offset: number): React.CSSProperties {
    const clamped = offset < -1 ? -1 - 0.001 : offset > 1 ? 1 + 0.001 : offset;
    const shiftPercent = 60; // how far neighbours peek out, in % of card width
    const translateX = clamped * shiftPercent;
    const isCenter = offset === 0;
    const isNeighbor = offset === -1 || offset === 1;

    return {
      transform: `translateX(calc(-50% + ${translateX}%)) scale(${isCenter ? 1 : 0.82})`,
      filter: isCenter ? "blur(0px)" : "blur(4px)",
      opacity: isCenter ? 1 : isNeighbor ? 0.55 : 0,
      zIndex: isCenter ? 30 : isNeighbor ? 20 : 0,
      pointerEvents: isCenter ? "auto" : "none",
    };
  }

  return (
    <section
      ref={sectionRef}
      id="live-needs-section"
      aria-labelledby="live-needs-heading"
      className="relative w-full bg-[#fbf9f4] dark:bg-zinc-950 ck-live-needs-section border-b border-stone-200/70 dark:border-zinc-800/80 overflow-hidden transition-colors"
    >
      {/* Soft warm ambient lighting glow matching brand palette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-20 w-[420px] h-[420px] rounded-full bg-[#b04a15]/6 dark:bg-[#b04a15]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-24 w-[380px] h-[380px] rounded-full bg-[#e07b3a]/7 dark:bg-[#e07b3a]/12 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Section Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 ck-live-needs-header-gap">
          <div className="max-w-2xl">
            {/* Live Indicator Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-50/80 dark:bg-emerald-950/40 px-3.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs mb-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="tracking-wide uppercase text-3xs font-black text-emerald-700 dark:text-emerald-400">
                Live Open Needs
              </span>
              <span className="text-stone-300 dark:text-stone-600">·</span>
              <span className="tabular-nums font-bold">
                {totalOpenCount} verified {totalOpenCount === 1 ? "need" : "needs"} awaiting items
              </span>
            </div>

            <h2
              id="live-needs-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-900 dark:text-stone-50 leading-[1.12]"
            >
              Real people. Real needs.{" "}
              <span className="text-[#b04a15] dark:text-[#e07b3a]">Right now.</span>
            </h2>

            <p className="mt-3 text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
              Every request here is posted by a verified individual or community school in India. No cash,
              no guesswork — offer the exact item they are waiting for today.
            </p>
          </div>

          {/* Impact Highlights with Animated Counters */}
          <div className="flex items-center gap-4 sm:gap-6 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-sm border border-stone-200/80 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-4 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#b04a15]/10 dark:bg-[#b04a15]/20 flex items-center justify-center text-[#b04a15] dark:text-[#e07b3a] shrink-0">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 leading-none">
                  <AnimatedCounter target={100} suffix="%" />
                </div>
                <div className="text-3xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500 mt-1">
                  Verified Donees
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-stone-200 dark:bg-zinc-800" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                <HeartHandshake className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <div className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 leading-none">
                  <AnimatedCounter
                    target={stats?.totalDonations ?? 0}
                    suffix="+"
                  />
                </div>
                <div className="text-3xs font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500 mt-1">
                  Needs Fulfilled
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Category Filter Pills Row ── */}
        <div className="relative ck-live-needs-filters">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === "All"
                  ? "bg-[#b04a15] text-white shadow-sm shadow-orange-950/20 ring-2 ring-[#b04a15]/30"
                  : "bg-white/80 dark:bg-zinc-900/80 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              All Categories
            </button>

            {ALL_REQUEST_CATEGORIES.map((cat) => {
              const visual = CATEGORY_VISUALS[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[#b04a15] text-white shadow-sm shadow-orange-950/20 ring-2 ring-[#b04a15]/30"
                      : "bg-white/80 dark:bg-zinc-900/80 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center ${
                      isSelected ? "text-white" : visual?.text ?? "text-stone-500"
                    }`}
                  >
                    <AnimatedCategoryIcon category={cat} iconClassName="w-3.5 h-3.5" />
                  </span>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Coverflow Carousel ──────────────────────────────────────────────
            Center card: clear, full size. Left/right neighbours: blurred,
            scaled down, peeking at the edges. Clicking an arrow (or a dot)
            changes activeIndex; every card's inline transform/filter/opacity
            is recomputed and the browser transitions smoothly between the
            old and new values — the clicked neighbour slides into the
            center and sharpens as it arrives. ── */}
        {cardCount === 0 ? (
          <div
            className="mx-auto flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/50 px-6 text-center ck-live-needs-carousel"
            style={{ width: "min(92vw, 980px)" }}
          >
            <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center text-stone-400 dark:text-stone-500">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-200">
              No open requests in {selectedCategory} right now
            </p>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm">
              Be the first to post one, or check back soon — new needs are added regularly.
            </p>
            <Link
              href="/requests/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold px-5 py-2.5 text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-950/20 active:scale-95"
            >
              <span>Add new listing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="relative ck-live-needs-carousel">
            {displayedNeeds.map((need, idx) => {
              const offset = circularOffset(idx, activeIndex, cardCount);
              // Only render the center card and its two immediate neighbours —
              // anything farther away contributes nothing visible and would
              // just be dead DOM.
              if (offset < -1 || offset > 1) return null;

              const isCenter = offset === 0;
              const visual = CATEGORY_VISUALS[need.category];
              const isUrgent = need.urgency === "CRITICAL" || need.emergency;
              const offerUrl = loginUrlFor(`/requests/${need.id}/offer`);
              const style = reduceMotion
                ? ({ transform: "translateX(-50%)", opacity: isCenter ? 1 : 0, zIndex: isCenter ? 30 : 0 } as React.CSSProperties)
                : getCardStyle(offset);

              return (
                <article
                  key={need.id}
                  style={{
                    ...style,
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    width: "min(92vw, 980px)",
                    transitionProperty: "transform, filter, opacity",
                    transitionDuration: "0.6s",
                    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  className={`flex flex-col justify-between rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-stone-200/90 dark:border-zinc-800 p-6 shadow-xl shadow-orange-950/10 dark:shadow-black/40 overflow-hidden ${
                    isCenter ? "" : "cursor-pointer"
                  }`}
                  onClick={
                    !isCenter
                      ? () => {
                          setActiveIndex(idx);
                        }
                      : undefined
                  }
                >
                  <div>
                    {/* Top Bar: Category Pill & Urgent Tag */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-3xs font-extrabold uppercase tracking-wider ${
                          visual?.iconBg ?? "bg-stone-100"
                        } ${visual?.text ?? "text-stone-700"}`}
                      >
                        <AnimatedCategoryIcon category={need.category} iconClassName="w-3.5 h-3.5" />
                        {need.category}
                      </span>

                      {isUrgent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-3xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                          Urgent
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-50 leading-snug">
                      <TranslatedText text={need.title} />
                    </h3>

                    {/* Description snippet if available */}
                    {need.description && (
                      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                        <TranslatedText text={need.description} />
                      </p>
                    )}
                  </div>

                  {/* Card Meta & CTA */}
                  <div className="mt-4 pt-4 border-t border-stone-100 dark:border-zinc-800/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                      <div className="flex items-center gap-1.5 truncate font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
                        <span className="truncate">
                          <TranslatedText text={need.city} />
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-medium">
                        <span>
                          Qty:{" "}
                          <strong className="text-stone-800 dark:text-stone-200 font-bold">
                            {need.quantity}
                          </strong>
                        </span>
                        {need.doneeFirstName && (
                          <>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <span className="truncate text-stone-400 dark:text-stone-500 text-3xs">
                              By {need.doneeFirstName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <Link
                      href={offerUrl}
                      onClick={(e) => {
                        if (!isCenter) e.preventDefault();
                      }}
                      tabIndex={isCenter ? 0 : -1}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-50/70 hover:bg-[#b04a15] dark:bg-zinc-800/80 dark:hover:bg-[#b04a15] border border-orange-200/50 hover:border-transparent dark:border-zinc-700/60 py-2.5 px-3.5 text-xs font-bold text-[#b04a15] hover:text-white dark:text-orange-300 dark:hover:text-white transition-all duration-200 shadow-2xs group/btn active:scale-[0.98]"
                    >
                      <Lock className="w-3.5 h-3.5 shrink-0 opacity-80 group-hover/btn:opacity-100" />
                      <span>Log in to offer this item</span>
                      <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover/btn:translate-x-1 shrink-0" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Prev / Next controls */}
        {cardCount > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous need"
              className="absolute left-0 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-stone-200 dark:border-zinc-800 shadow-md flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-zinc-800 hover:scale-105 transition-all z-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next need"
              className="absolute right-0 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-stone-200 dark:border-zinc-800 shadow-md flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-zinc-800 hover:scale-105 transition-all z-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {cardCount > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {displayedNeeds.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setActiveIndex(i);
                }}
                aria-label={`Go to need ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeIndex
                    ? "w-6 bg-[#b04a15] dark:bg-[#e07b3a]"
                    : "w-1.5 bg-stone-300 dark:bg-zinc-700 hover:bg-stone-400 dark:hover:bg-zinc-600"
                }`}
              />
            ))}
          </div>
        )}

        {/* ── Footer Link: Explore All Needs ── */}
        <div className="ck-live-needs-footer-gap flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-stone-100/70 dark:bg-zinc-900/60 border border-stone-200/70 dark:border-zinc-800 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#b04a15]/10 flex items-center justify-center text-[#b04a15] shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
                Have gently-used goods at home?
              </p>
              <p className="text-3xs sm:text-xs text-stone-500 dark:text-stone-400">
                Browse our complete live request directory or post an offer directly.
              </p>
            </div>
          </div>

          <Link
            href="/requests"
            className="inline-flex items-center gap-2 rounded-xl bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold px-5 py-2.5 text-xs uppercase tracking-wider transition-all shadow-md shadow-orange-950/20 active:scale-95 shrink-0"
          >
            <span>See all open requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}