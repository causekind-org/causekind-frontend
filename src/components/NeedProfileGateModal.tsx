"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AlertTriangle, ArrowRight, Loader2, ShieldCheck, X } from "lucide-react";
import { needProfileItemLabel, progressOf } from "@/lib/needProfileDocs";
import type { NeedProfileGateState } from "@/hooks/useNeedProfileGate";

const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Deliberately not built on components/ui/dialog.tsx: that file documents that
 * framer-motion must not be layered onto its data-[state] transitions, and this
 * overlay's entrance is the whole point. Focus, Escape and scroll lock are
 * therefore handled here rather than by Radix.
 */
export function NeedProfileGateModal({
  state, checking, onClose, onRetry,
}: {
  state: NeedProfileGateState;
  checking: boolean;
  onClose: () => void;
  onRetry: (destination: string) => void | Promise<unknown>;
}) {
  const t = useTranslations("needProfileGate");
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const open = state.mode !== "closed";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const spring = reduceMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, stiffness: 260, damping: 22 };

  const progress = state.mode === "incomplete" ? progressOf(state.missing) : null;
  const profileHref = state.mode === "closed"
    ? "#"
    : `/profile/need-details?next=${encodeURIComponent(state.destination)}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm dark:bg-black/65"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            // The card never grows past the viewport: it caps at 90dvh and lets
            // the missing-items list scroll inside it. A donee with ten
            // outstanding items was overflowing the screen, clipping the ring at
            // the top and the buttons at the bottom.
            className="relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-3xl"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 24 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            transition={spring}
          >
            <button
              onClick={onClose}
              aria-label={t("close")}
              className="absolute right-4 top-4 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-zinc-800 dark:hover:text-stone-200"
            >
              <X className="h-4 w-4" />
            </button>

            {state.mode === "incomplete" && progress && (
              // Landscape from `sm` up: the pitch and the buttons sit in a fixed
              // left column, the list scrolls on the right. Stacked below that,
              // where the list still scrolls but the footer stays pinned.
              <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                <div className="flex shrink-0 flex-col p-6 sm:w-[44%] sm:p-8">
                <div className="flex justify-center">
                  <div className="relative h-20 w-20">
                    <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                      <circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="7"
                        className="stroke-stone-200 dark:stroke-zinc-800" />
                      <motion.circle
                        cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="7" strokeLinecap="round"
                        stroke="var(--ck-role-accent)"
                        strokeDasharray={RING_CIRCUMFERENCE}
                        initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                        animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.pct / 100) }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.9, ease: "easeOut", delay: 0.12 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black text-[var(--ck-role-accent)]">{progress.pct}%</span>
                    </div>
                  </div>
                </div>

                <h2 id={titleId} className="mt-4 text-center text-xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                  {t("incompleteTitle")}
                </h2>
                <p className="mt-2 text-center text-sm text-stone-500 dark:text-stone-400">
                  {t("incompleteBody")}
                </p>

                {/* mt-auto pins the buttons to the bottom of the left column so
                    the two columns end level however long the list is. */}
                <div className="mt-5 flex flex-col gap-2 sm:mt-auto sm:pt-6">
                  <Link
                    href={profileHref}
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--ck-role-hover)]"
                  >
                    {t("completeCta")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button onClick={onClose} className="py-2 text-sm font-semibold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">
                    {t("notNow")}
                  </button>
                  <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> {t("reassurance")}
                  </p>
                </div>
                </div>

                {/* The only scrolling region. min-h-0 is required — without it a
                    flex child refuses to shrink and the card overflows again. */}
                <div className="flex min-h-0 flex-1 flex-col border-t border-stone-200 bg-stone-50/60 dark:border-zinc-800 dark:bg-zinc-950/40 sm:border-l sm:border-t-0">
                  <p className="shrink-0 px-6 pt-5 pb-2 text-2xs font-bold uppercase tracking-wider text-stone-400 sm:px-6">
                    {t("stillNeeded", { count: state.missing.length })}
                  </p>
                  <motion.ul
                    className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 pb-6"
                    initial="hidden" animate="shown"
                    variants={{ shown: { transition: { staggerChildren: reduceMotion ? 0 : 0.05, delayChildren: 0.15 } } }}
                  >
                    {state.missing.map(code => (
                      <motion.li
                        key={code}
                        variants={{ hidden: { opacity: 0, x: -8 }, shown: { opacity: 1, x: 0 } }}
                        className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-stone-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-zinc-800/60 dark:text-stone-200 dark:shadow-none"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ck-role-accent)]" />
                        {needProfileItemLabel(code)}
                      </motion.li>
                    ))}
                  </motion.ul>
                </div>
              </div>
            )}

            {state.mode === "error" && (
              // No list here, so this one stays a single narrow column.
              <div className="overflow-y-auto p-6 sm:mx-auto sm:max-w-md sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h2 id={titleId} className="mt-5 text-center text-xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                  {t("errorTitle")}
                </h2>
                <p className="mt-2 text-center text-sm text-stone-500 dark:text-stone-400">{state.message}</p>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    onClick={() => void onRetry(state.destination)}
                    disabled={checking}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--ck-role-hover)] disabled:opacity-60"
                  >
                    {checking && <Loader2 className="h-4 w-4 animate-spin" />} {t("retry")}
                  </button>
                  {/* Never hard-block on an inconclusive check: the wizard has its own gate. */}
                  <Link href={state.destination} onClick={onClose} className="py-2 text-center text-sm font-semibold text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">
                    {t("goAnyway")}
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
