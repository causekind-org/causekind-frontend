"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { TourStep } from "./tourSteps";

const SPOT_PADDING = 8;
const CARD_W = 320;
const CARD_GAP = 14;

type Rect = { top: number; left: number; width: number; height: number };

function measure(anchor: string): Rect | null {
  const el = document.querySelector(`[data-tour="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// Tooltip position relative to the spotlight, clamped to the viewport.
function cardPosition(rect: Rect, placement: TourStep["placement"]) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top: number;
  let left: number;
  const p = placement ?? (rect.top > vh / 2 ? "top" : "bottom");
  switch (p) {
    case "top":
      top = rect.top - SPOT_PADDING - CARD_GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
      break;
    case "left":
      top = rect.top;
      left = rect.left - SPOT_PADDING - CARD_GAP - CARD_W;
      break;
    case "right":
      top = rect.top;
      left = rect.left + rect.width + SPOT_PADDING + CARD_GAP;
      break;
    default: // bottom
      top = rect.top + rect.height + SPOT_PADDING + CARD_GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
  }
  left = Math.max(12, Math.min(left, vw - CARD_W - 12));
  top = Math.max(12, Math.min(top, vh - 12));
  return { top, left, translateY: p === "top" ? "-100%" : "0%" };
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

  const card = cardPosition(rect, step.placement);
  const isLast = idx === validSteps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[9995]" role="dialog" aria-label="Site tour">
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
        className="absolute rounded-2xl ring-2 ring-[#e07b3a]/90"
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
          className="absolute rounded-2xl border border-[#e8ddcf] bg-[#faf6ef] p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          style={{ top: card.top, left: card.left, width: CARD_W, transform: `translateY(${card.translateY})` }}
        >
          <button
            onClick={finish}
            aria-label="Skip tour"
            className="absolute right-3 top-3 text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#b04a15]">
            Step {idx + 1} of {validSteps.length}
          </p>
          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {step.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {step.body}
          </p>

          <div className="mt-4 flex items-center gap-2">
            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {validSteps.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-4 bg-[#b04a15]" : "w-1.5 bg-stone-300 dark:bg-zinc-600"}`} />
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
                  className="rounded-xl bg-[#b04a15] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#c45520]"
                >
                  {step.ctaLabel ?? "Finish"}
                </button>
              ) : (
                <button
                  onClick={next}
                  className="rounded-xl bg-[#b04a15] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#c45520]"
                >
                  {isLast ? "Done" : "Next"}
                </button>
              )}
            </div>
          </div>

          {!isLast && (
            <button onClick={finish} className="mt-2 text-[11px] text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300">
              Skip tour
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
