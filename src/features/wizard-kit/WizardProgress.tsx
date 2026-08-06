"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { completedNodeAnimation } from "@/features/wizard-kit/wizardMotion";

/**
 * Progress, in exactly one representation per viewport.
 *
 * <p>Mobile gets the compact sticky bar (`lg:hidden`), desktop gets the vertical
 * rail inside the existing dark sidebar (`hidden lg:block`). Showing both was
 * explicitly ruled out — two progress indicators on one screen is noise.
 *
 * <p>State is never colour-only: a completed node carries a check glyph, the
 * current node carries `aria-current="step"`, and an unavailable node is a
 * disabled button whose `aria-disabled` explains itself.
 */

export type StepAvailability = {
  /** Completed AND server-confirmed — only then is jumping back safe. */
  canNavigate: boolean;
  complete: boolean;
};

/**
 * Generic over the step union so more than one wizard can use it.
 *
 * <p>This previously imported `WIZARD_STEPS` and `stepIndex` from the listing
 * wizard's model, which is what tied it to a single flow. The step list is now a
 * prop; passing `steps={WIZARD_STEPS}` reproduces the old behaviour exactly,
 * because the component derives its count, order and index from nothing else.
 */
type Props<S extends string> = {
  current: S;
  /** Order and length both come from here — there is no other source. */
  steps: readonly S[];
  labels: Record<S, string>;
  availability: Record<S, StepAvailability>;
  onJump: (step: S) => void;
  /** Landmark name, e.g. "Listing progress" or "Donation offer progress". */
  navLabel?: string;
};

export function WizardProgressBar<S extends string>({
  current, steps, labels, availability, onJump, navLabel = "Progress",
}: Props<S>) {
  const reduced = !!useReducedMotion();
  const idx = steps.indexOf(current);

  return (
    <nav aria-label={navLabel} className="lg:hidden">
      <div className="flex items-center justify-between gap-2 px-4 pt-2">
        <p className="text-2xs font-bold uppercase tracking-wider text-stone-400">
          Step {idx + 1} of {steps.length}
        </p>
        <p className="truncate text-xs font-bold text-[var(--ck-role-accent)]">{labels[current]}</p>
      </div>

      <ol className="flex items-center px-4 pb-2 pt-1.5">
        {steps.map((step, i) => {
          const state = availability[step];
          const isCurrent = step === current;
          const done = state.complete && !isCurrent;

          return (
            <li key={step} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
              <button
                type="button"
                onClick={() => state.canNavigate && onJump(step)}
                disabled={!state.canNavigate}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${labels[step]}${done ? ", completed" : isCurrent ? ", current step" : ", not yet available"}`}
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors
                  ${done ? "border-green-500 bg-green-500 text-white"
                    : isCurrent ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-soft)] text-[var(--ck-role-accent)]"
                    : "border-stone-300 bg-transparent text-transparent dark:border-zinc-700"}
                  ${state.canNavigate ? "cursor-pointer" : "cursor-default"}
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]`}
              >
                {done
                  ? <motion.span animate={completedNodeAnimation(reduced)}><Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden /></motion.span>
                  : <span className="text-4xs font-black">{i + 1}</span>}
              </button>

              {i < steps.length - 1 && (
                <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-700">
                  <motion.div
                    className="h-full w-full origin-left rounded-full bg-green-500"
                    initial={false}
                    animate={{ scaleX: i < idx ? 1 : 0 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Desktop rail. Lives inside the existing dark sidebar, so it styles for dark. */
export function WizardProgressRail<S extends string>({
  current, steps, labels, availability, onJump, navLabel = "Progress",
}: Props<S>) {
  const reduced = !!useReducedMotion();
  const idx = steps.indexOf(current);

  return (
    <nav aria-label={navLabel} className="hidden lg:block">
      <ol className="space-y-1">
        {steps.map((step, i) => {
          const state = availability[step];
          const isCurrent = step === current;
          const done = state.complete && !isCurrent;
          const last = i === steps.length - 1;

          return (
            <li key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => state.canNavigate && onJump(step)}
                  disabled={!state.canNavigate}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${labels[step]}${done ? ", completed" : isCurrent ? ", current step" : ", not yet available"}`}
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-2xs font-black transition-colors
                    ${done ? "border-green-400 bg-green-400 text-stone-900"
                      : isCurrent ? "border-[var(--ck-role-highlight)] bg-[var(--ck-role-highlight)]/15 text-[var(--ck-role-highlight)]"
                      : "border-white/25 text-white/40"}
                    ${state.canNavigate ? "cursor-pointer hover:border-white/60" : "cursor-default"}
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-highlight)]`}
                >
                  {done
                    ? <motion.span animate={completedNodeAnimation(reduced)}><Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /></motion.span>
                    : i + 1}
                </button>
                {!last && (
                  <div className="my-1 w-0.5 flex-1 overflow-hidden rounded-full bg-white/15">
                    <motion.div
                      className="h-full w-full origin-top rounded-full bg-green-400"
                      initial={false}
                      animate={{ scaleY: i < idx ? 1 : 0 }}
                      transition={reduced ? { duration: 0 } : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                )}
              </div>

              <p className={`pb-5 text-sm font-bold leading-7 ${
                isCurrent ? "text-[var(--ck-role-highlight)]"
                  : done ? "text-white/80"
                  : "text-white/35"
              }`}>
                {labels[step]}
              </p>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
