"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { pressProps } from "@/features/wizard-kit/wizardMotion";

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
  avoidBottomChrome = false,
  variant = "bar",
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
  /** Lift the sticky bar above CauseKind's floating mobile navigation dock. */
  avoidBottomChrome?: boolean;
  /**
   * `"bar"` (default) is the full-width slab. `"floating"` drops the bar and
   * pins the controls to the two bottom corners instead, hugging the dock.
   *
   * <p>Opt-in on purpose: the listing wizard hides the dock entirely on its own
   * route, so it has a whole strip to itself and the slab is right there. The
   * offer wizard shares its route with the dock, where a slab plus a dock plus a
   * chat button stacks three bars of chrome over the form.
   */
  variant?: "bar" | "floating";
}) {
  const reduced = !!useReducedMotion();

  const compact = variant === "floating";

  const continueButton = (
    <motion.button
      type="button"
      onClick={onContinue}
      disabled={submitting || submitted}
      {...pressProps(reduced)}
      // whitespace-nowrap: "Submit donation offer" wrapped to two lines in the
      // corner cluster, which doubled the button's height and pushed it into
      // the dock. Compact sizing is what lets the full label stay on one line
      // next to the left cluster at 320px — shortening the copy instead would
      // change what the donor is agreeing to press.
      className={`flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-black text-white transition-colors
        ${compact ? "min-h-[40px] px-3 text-2xs" : "min-h-[44px] rounded-xl px-4 text-sm"}
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
  );

  if (variant === "floating") {
    // In normal flow, not sticky: the controls sit at the end of the form and
    // scroll away with it. Nothing overlays the content, so there is no panel,
    // no blur and no shadow — the buttons sit directly on the page background.
    //
    // The bottom padding is still --ck-bottom-chrome, because scrolling to the
    // end of the form puts these exactly where the floating dock sits.
    return (
      <div
        className={`mx-auto flex w-full max-w-[680px] items-center justify-between gap-2 px-4 pt-2
                    ${avoidBottomChrome
                      ? "pb-[calc(var(--ck-bottom-chrome)+1rem)] lg:pb-6"
                      : "pb-6"}`}
      >
        <div className="flex items-center gap-1">
          {canGoBack && (
            <motion.button
              type="button"
              onClick={onBack}
              aria-label="Back"
              {...pressProps(reduced)}
              // h-10 w-10 visually, but the touch target stays at 44 via the
              // negative-margin padding trick — a 40px tap target is below the
              // accessibility floor even when the icon should look small.
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-stone-300 text-stone-500 transition-colors after:absolute after:-inset-1 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:text-stone-400 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
            </motion.button>
          )}
          <button
            type="button"
            onClick={onSaveExit}
            disabled={savingExit}
            className="min-h-[40px] shrink-0 rounded-lg px-2 text-2xs font-bold text-stone-500 underline underline-offset-2 transition-colors hover:text-stone-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:text-stone-400"
          >
            {savingExit ? "Saving…" : "Save & exit"}
          </button>
        </div>

        {continueButton}
      </div>
    );
  }

  return (
    <div
      className={`sticky z-30 border-t border-stone-200 bg-[#faf8f5]/95 backdrop-blur
                 py-3 dark:border-zinc-800 dark:bg-zinc-950/95
                 ${avoidBottomChrome ? "bottom-[var(--ck-bottom-chrome)] lg:bottom-0" : "bottom-0"}`}
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

        {/* ml-auto/sm:min-w here rather than on the button itself, so the
            floating variant can reuse the same control without inheriting the
            slab layout's alignment. Sized to its content, not flex-1 —
            stretched across the row it read as a slab. */}
        <div className="ml-auto sm:min-w-[150px] [&>button]:w-full">
          {continueButton}
        </div>
      </div>
    </div>
  );
}
