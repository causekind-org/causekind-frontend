"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { TourStep } from "./tourSteps";

const SPOT_PADDING = 8;
const CARD_MAX_W = 300;
const CARD_GAP = 12;
const VIEWPORT_MARGIN = 12;
/** Used for the first frame only, until the card has been measured. */
const CARD_H_ESTIMATE = 210;

/** Never wider than the screen allows — a fixed 320 overflowed small phones. */
const cardWidth = () => Math.min(CARD_MAX_W, window.innerWidth - VIEWPORT_MARGIN * 2);

type Rect = { top: number; left: number; width: number; height: number };

function measure(anchor: string): Rect | null {
  const el = document.querySelector(`[data-tour="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Where the tooltip goes, given the spotlight AND the card's real height.
 *
 * <p>The previous version never knew how tall the card was. It positioned an
 * anchor point, clamped THAT to the viewport, then shifted the card by
 * `translateY: -100%` afterwards — so the clamp applied to a point the card no
 * longer occupied, and nothing checked whether the result landed on top of the
 * very element being spotlighted. On a phone, tall anchors (the journey rail,
 * the signal matrix) left no room on either side and the card covered them.
 *
 * <p>Now it measures the free space above and below the spotlight, uses the
 * requested side only if the card actually fits there, flips to the other side
 * if it does not, and when neither side fits pins the card to whichever edge has
 * more room — so it covers as little of the anchor as possible.
 */
function cardPosition(rect: Rect, placement: TourStep["placement"], cardH: number, cardW: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const M = VIEWPORT_MARGIN;

  const spotTop = rect.top - SPOT_PADDING;
  const spotBottom = rect.top + rect.height + SPOT_PADDING;
  const roomAbove = spotTop - CARD_GAP - M;
  const roomBelow = vh - spotBottom - CARD_GAP - M;

  const centredLeft = () =>
    Math.max(M, Math.min(rect.left + rect.width / 2 - cardW / 2, vw - cardW - M));

  // Side placements are honoured only when they genuinely fit; on a phone they
  // almost never do, so they fall through to the vertical chooser below.
  if (placement === "left" || placement === "right") {
    const spotLeft = rect.left - SPOT_PADDING;
    const spotRight = rect.left + rect.width + SPOT_PADDING;
    const fits = placement === "left"
      ? spotLeft - CARD_GAP - cardW >= M
      : spotRight + CARD_GAP + cardW <= vw - M;
    if (fits) {
      return {
        top: Math.max(M, Math.min(rect.top, vh - cardH - M)),
        left: placement === "left" ? spotLeft - CARD_GAP - cardW : spotRight + CARD_GAP,
      };
    }
  }

  const prefersTop = placement === "top" || (!placement && rect.top > vh / 2);
  const above = spotTop - CARD_GAP - cardH;
  const below = spotBottom + CARD_GAP;

  let top: number;
  if (prefersTop && roomAbove >= cardH) top = above;
  else if (!prefersTop && roomBelow >= cardH) top = below;
  else if (roomAbove >= cardH) top = above;
  else if (roomBelow >= cardH) top = below;
  // Neither side fits: the anchor is taller than the space left over. Sit
  // against the roomier edge rather than centring on top of it.
  else top = roomAbove >= roomBelow ? M : vh - cardH - M;

  return { top: Math.max(M, Math.min(top, vh - cardH - M)), left: centredLeft() };
}

export default function GuidedTour({ steps, onFinish }: {
  steps: TourStep[];
  /** Called on both completion and skip — caller marks the tour as seen. */
  onFinish: () => void;
}) {
  const router = useRouter();
  // Only steps whose anchors actually exist right now (mobile / feature flags)
  const validSteps = useMemo(
    () => steps.filter(s => document.querySelector(`[data-tour="${s.anchor}"]`)),
    [steps]
  );
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const finishedRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(CARD_H_ESTIMATE);

  const step = validSteps[idx];

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  const next = useCallback(() => {
    if (idx >= validSteps.length - 1) finish();
    else setIdx(i => i + 1);
  }, [idx, validSteps.length, finish]);

  const back = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);

  // Measure + follow the current anchor (scroll it into view first)
  useEffect(() => {
    if (!step) { finish(); return; }
    const el = document.querySelector(`[data-tour="${step.anchor}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setRect(measure(step.anchor)));
    };
    update();
    // Track the smooth scroll settling + any user scroll/resize
    const settle = setInterval(update, 120);
    const stopSettle = setTimeout(() => clearInterval(settle), 1200);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(settle);
      clearTimeout(stopSettle);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step, finish]);

  // Measured BEFORE paint, so the card never renders once at the estimated
  // height and then visibly jumps to its real position.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const sync = () => setCardH(el.getBoundingClientRect().height);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [idx, rect]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, next, back]);

  if (!step || !rect) return null;

  const cardW = cardWidth();
  const card = cardPosition(rect, step.placement, cardH, cardW);
  const isLast = idx === validSteps.length - 1;

  return createPortal(
    // ck-tour-root is a stable marker other load-time UI polls for, matching the
    // .ck-location-backdrop-el / .ck-cat-backdrop-el convention. See
    // src/lib/overlayGates.ts — it carries no styling, do not remove it.
    <div className="ck-tour-root fixed inset-0 z-[9995]" role="dialog" aria-label="Site tour">
      {/* Spotlight: transparent rounded window + giant shadow dims everything else.
          pointer-events stay on the overlay so clicks can't wander mid-tour. */}
      <motion.div
        initial={false}
        animate={{
          top: rect.top - SPOT_PADDING,
          left: rect.left - SPOT_PADDING,
          width: rect.width + SPOT_PADDING * 2,
          height: rect.height + SPOT_PADDING * 2,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute rounded-2xl ring-2 ring-[var(--ck-role-secondary)]/90"
        style={{ boxShadow: "0 0 0 9999px rgba(15, 12, 8, 0.62), 0 0 24px 4px rgba(224, 123, 58, 0.35)" }}
      />

      {/* Click-catcher behind the card (skips nothing, just blocks stray clicks) */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          ref={cardRef}
          className="absolute rounded-2xl border border-[#e8ddcf] bg-[#faf6ef] p-3.5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          // `top` is now the card's real top edge — the old translateY shifted it
          // AFTER clamping, which is what let it drift over the spotlight.
          style={{ top: card.top, left: card.left, width: cardW }}
        >
          <button
            onClick={finish}
            aria-label="Skip tour"
            className="absolute right-2.5 top-2.5 text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <p className="mb-0.5 text-4xs font-bold uppercase tracking-[0.18em] text-[var(--ck-role-accent)]">
            Step {idx + 1} of {validSteps.length}
          </p>
          <h3 className="font-serif text-base font-bold leading-snug text-stone-900 dark:text-stone-100" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {step.title}
          </h3>
          <p className="mt-1 text-sm leading-[1.45] text-stone-600 dark:text-stone-400">
            {step.body}
          </p>

          <div className="mt-3 flex items-center gap-2">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {validSteps.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-4 bg-[var(--ck-role-accent)]" : "w-1.5 bg-stone-300 dark:bg-zinc-600"}`} />
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {idx > 0 && (
                <button onClick={back} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-500 transition-colors hover:text-stone-700 dark:hover:text-stone-300">
                  Back
                </button>
              )}
              {isLast && step.ctaHref ? (
                <button
                  onClick={() => { finish(); router.push(step.ctaHref!); }}
                  className="rounded-xl bg-[var(--ck-role-accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--ck-role-hover)]"
                >
                  {step.ctaLabel ?? "Finish"}
                </button>
              ) : (
                <button
                  onClick={next}
                  className="rounded-xl bg-[var(--ck-role-accent)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--ck-role-hover)]"
                >
                  {isLast ? "Done" : "Next"}
                </button>
              )}
            </div>
          </div>

          {!isLast && (
            <button onClick={finish} className="mt-1.5 text-3xs text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300">
              Skip tour
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
