"use client";

/**
 * Mobile landing primitives (< 768px).
 *
 * <p>The mobile landing page used to be a column of vertically stacked cards,
 * most of them inside a 100svh min-height, and ran to roughly eight and a half
 * screens below the hero. These are the handful of patterns that replace that
 * stacking with horizontal ones — a scroll-snap carousel, segmented tabs over
 * stacked panels, and a flip card — plus the one reveal every section uses.
 *
 * <p><b>Motion contract.</b> Only transform and opacity ever animate, and the
 * styles live in `styles.css` under "MOBILE LANDING". Nothing here listens to
 * scroll: reveals and carousel dots are IntersectionObserver-driven and the
 * carousels are native `scroll-snap`, so swiping is the browser's own
 * compositor-thread scrolling rather than JS-driven dragging.
 * `prefers-reduced-motion` gets every piece in its final state with no
 * transition.
 */

import React, { Children, useCallback, useEffect, useId, useRef, useState } from "react";

const REVEAL_MS = 500;
const STAGGER_MS = 70;
const MAX_STAGGER_STEPS = 6;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Reveals every `[data-reveal-item]` inside the returned ref, once, when 20% of
 * it is on screen. Stagger an item with `style={{ "--i": n }}`.
 *
 * <p>The hide is applied by JS (`data-reveal="armed"`), never by the markup, so
 * server-rendered and no-JS content is visible from the first paint. A block
 * already on screen at mount is not armed at all — hiding it only to fade it
 * straight back would read as a flash.
 */
export function useRevealOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      root.dataset.reveal = "done";
      return;
    }
    const rect = root.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      root.dataset.reveal = "done";
      return;
    }

    root.dataset.reveal = "armed";
    let timer: number | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        root.dataset.reveal = "in";
        // Drop will-change once the longest staggered transition has finished.
        timer = window.setTimeout(() => {
          root.dataset.reveal = "done";
        }, REVEAL_MS + STAGGER_MS * MAX_STAGGER_STEPS + 80);
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return ref;
}

/** `style` for a staggered reveal item. */
export function stagger(i: number): React.CSSProperties {
  return { ["--i" as string]: i } as React.CSSProperties;
}

/**
 * Which slide of a scroll-snap row is showing, from IntersectionObserver on
 * the slides themselves (root = the scroller). No scroll listener.
 */
function useActiveSlide(scrollerRef: React.RefObject<HTMLElement | null>, count: number, resetKey?: unknown) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    const scroller = scrollerRef.current;
    if (!scroller || count < 2 || typeof IntersectionObserver === "undefined") return;
    const slides = Array.from(scroller.children) as HTMLElement[];
    const ratios = new Map<Element, number>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        let best = -1;
        let bestRatio = 0;
        slides.forEach((s, i) => {
          const r = ratios.get(s) ?? 0;
          if (r > bestRatio + 0.01) {
            best = i;
            bestRatio = r;
          }
        });
        if (best >= 0) setActive(best);
      },
      { root: scroller, threshold: [0.25, 0.5, 0.75, 1] },
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [scrollerRef, count, resetKey]);

  return active;
}

/**
 * Dots under a carousel. A tap jumps to that slide (one programmatic scroll,
 * not a drag handler); the active dot follows the swipe via useActiveSlide.
 */
export function CarouselDots({
  scrollerRef,
  count,
  label,
  className = "",
  colorClass = "text-[#B5470F] dark:text-[#F4A25B]",
  resetKey,
}: {
  scrollerRef: React.RefObject<HTMLElement | null>;
  count: number;
  label: string;
  className?: string;
  colorClass?: string;
  /** Change when the slides are swapped out, so the observer re-binds. */
  resetKey?: unknown;
}) {
  const active = useActiveSlide(scrollerRef, count, resetKey);

  const goTo = useCallback(
    (i: number) => {
      const scroller = scrollerRef.current;
      const slide = scroller?.children[i] as HTMLElement | undefined;
      if (!scroller || !slide) return;
      const padLeft = parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
      scroller.scrollTo({
        left: slide.offsetLeft - padLeft,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    },
    [scrollerRef],
  );

  if (count < 2) return null;
  return (
    <div className={`ck-dots ${colorClass} ${className}`} role="group" aria-label={`${label} slides`}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          className="ck-dot"
          aria-label={`Show ${i + 1} of ${count}`}
          aria-current={i === active ? "true" : "false"}
          onClick={() => goTo(i)}
        />
      ))}
    </div>
  );
}

/**
 * Native scroll-snap carousel with an 85% slide width (≈15% peek) and dots.
 * Pass `scrollerRef` to reuse the dots elsewhere; otherwise one is made here.
 */
export function SnapCarousel({
  label,
  children,
  className = "",
  dotsClassName = "mt-2",
  dotsColorClass,
  resetKey,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  dotsClassName?: string;
  dotsColorClass?: string;
  /** Changing this scrolls back to the first slide (e.g. on tab change). */
  resetKey?: string | number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);

  useEffect(() => {
    if (resetKey === undefined) return;
    if (scrollerRef.current) scrollerRef.current.scrollLeft = 0;
  }, [resetKey]);

  return (
    <div className={className}>
      <div
        ref={scrollerRef}
        className="ck-snap"
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
      >
        {items.map((child, i) => (
          <div
            key={i}
            className="ck-snap-item"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${items.length}`}
          >
            {child}
          </div>
        ))}
      </div>
      <CarouselDots
        scrollerRef={scrollerRef}
        count={items.length}
        label={label}
        className={dotsClassName}
        colorClass={dotsColorClass}
      />
    </div>
  );
}

/**
 * Segmented control whose thumb slides on transform. Arrow keys move between
 * tabs, per the WAI-ARIA tabs pattern.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idBase,
  className = "",
  thumbColor = "#B5470F",
}: {
  tabs: { id: T; label: React.ReactNode; icon?: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  idBase: string;
  className?: string;
  thumbColor?: string;
}) {
  const index = Math.max(0, tabs.findIndex((t) => t.id === value));
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    onChange(tabs[next].id);
    (listRef.current?.children[next + 1] as HTMLElement | undefined)?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`ck-seg bg-stone-200/70 dark:bg-stone-900/90 border border-stone-300/60 dark:border-stone-800 ${className}`}
      style={{ ["--n" as string]: tabs.length, ["--idx" as string]: index } as React.CSSProperties}
    >
      <span aria-hidden className="ck-seg-thumb shadow-xs" style={{ backgroundColor: thumbColor }} />
      {tabs.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${idBase}-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold tracking-tight transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#B5470F] ${
              selected ? "text-white" : "text-stone-600 dark:text-stone-400"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Panels for SegmentedTabs, stacked in one grid cell so switching never
 * changes the page height — it only cross-fades.
 */
export function StackedPanels<T extends string>({
  value,
  idBase,
  panels,
  className = "",
}: {
  value: T;
  idBase: string;
  panels: { id: T; content: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={`ck-stack ${className}`}>
      {panels.map((p) => {
        const active = p.id === value;
        return (
          <div
            key={p.id}
            role="tabpanel"
            id={`${idBase}-panel-${p.id}`}
            aria-labelledby={`${idBase}-tab-${p.id}`}
            data-active={active ? "true" : "false"}
            aria-hidden={!active}
          >
            {p.content}
          </div>
        );
      })}
    </div>
  );
}

/**
 * A card with two faces that turns on rotateY. The hidden face leaves the
 * accessibility tree once it has turned away; the toggle button names what
 * the other side holds.
 */
export function FlipCard({
  front,
  back,
  toFrontLabel,
  toBackLabel,
  className = "",
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  toFrontLabel: string;
  toBackLabel: string;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const faceId = useId();

  useEffect(() => {
    if (!animating) return;
    const t = window.setTimeout(() => setAnimating(false), 650);
    return () => window.clearTimeout(t);
  }, [animating]);

  return (
    <div className={className}>
      <div className="ck-flip" data-flipped={flipped} data-animating={animating}>
        <div className="ck-flip-inner" id={faceId}>
          <div aria-hidden={flipped}>{front}</div>
          <div className="ck-flip-back" aria-hidden={!flipped}>
            {back}
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          aria-controls={faceId}
          aria-pressed={flipped}
          onClick={() => {
            setAnimating(true);
            setFlipped((f) => !f);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#B5470F]/30 bg-white/80 dark:bg-stone-900/80 px-4 py-2 text-xs font-bold text-[#B5470F] dark:text-[#F4A25B] active:scale-[0.97] transition-transform"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          {flipped ? toFrontLabel : toBackLabel}
        </button>
      </div>
    </div>
  );
}
