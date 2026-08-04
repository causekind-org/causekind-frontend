"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { pressProps } from "../wizardMotion";

/**
 * Sticky action footer.
 *
 * <p>Sits above the global mobile dock using `--ck-bottom-chrome` (styles.css) —
 * the same variable the dashboard and Handover Hub use. Hard-coding a pixel
 * offset here is what puts a button under the dock on a notched phone.
 *
 * <p>Back is never disabled by validation or by a pending save: a user who wants
 * to go correct an earlier answer must not be held by the current step's errors.
 * Only the control whose duplicate action matters is disabled.
 */
export function WizardNavigation({
  canGoBack,
  onBack,
  onContinue,
  onSaveExit,
  continueLabel,
  isLast,
  submitting,
  submitted,
  savingExit,
}: {
  canGoBack: boolean;
  onBack: () => void;
  onContinue: () => void;
  onSaveExit: () => void;
  continueLabel: string;
  isLast: boolean;
  submitting: boolean;
  submitted: boolean;
  savingExit: boolean;
}) {
  const reduced = !!useReducedMotion();

  return (
    <div
      className="sticky bottom-0 z-30 border-t border-stone-200 bg-[#faf8f5]/95 backdrop-blur
                 pb-[calc(var(--ck-bottom-chrome)+0.75rem)] pt-3 lg:pb-3
                 dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <div className="mx-auto flex max-w-[680px] items-center gap-2 px-4">
        {canGoBack && (
          <motion.button
            type="button"
            onClick={onBack}
            {...pressProps(reduced)}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-300 px-3.5 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:text-stone-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            <span className="hidden sm:inline">Back</span>
          </motion.button>
        )}

        <button
          type="button"
          onClick={onSaveExit}
          disabled={savingExit}
          className="min-h-[44px] shrink-0 rounded-xl px-2.5 text-xs font-bold text-stone-500 underline underline-offset-2 transition-colors hover:text-stone-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:text-stone-400"
        >
          {savingExit ? "Saving…" : "Save & exit"}
        </button>

        <motion.button
          type="button"
          onClick={onContinue}
          disabled={submitting || submitted}
          {...pressProps(reduced)}
          className={`ml-auto flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white transition-colors sm:flex-none sm:min-w-[190px]
            ${submitted ? "bg-green-600" : "bg-[var(--ck-role-accent)] hover:bg-[var(--ck-role-hover)]"}
            disabled:cursor-not-allowed
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]`}
        >
          {submitted ? (
            <motion.span
              className="flex items-center gap-2"
              initial={reduced ? false : { scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> Submitted
            </motion.span>
          ) : submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Submitting…
            </>
          ) : (
            <>
              {continueLabel}
              {!isLast && <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />}
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
