"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { NGO_STEPS, NGO_STEP_LABELS, type NGOStep } from "@/features/ngo-registration/ngoRegistrationModel";
import { completedNodeAnimation } from "@/features/wizard-kit/wizardMotion";

interface NGOProgressProps {
  currentStep: NGOStep;
  completedSteps: Set<NGOStep>;
  onJump: (step: NGOStep) => void;
}

/**
 * Compact step-progress indicator for the NGO registration wizard.
 *
 * <p>Styled for the auth-layout card context (cream background, no dark
 * sidebar). Uses the existing CauseKind terracotta accent (#b04a15) directly
 * rather than the role-theme CSS variable, since the NGO flow sits in the
 * auth shell where no role theme is active.
 */
export function NGOProgress({ currentStep, completedSteps, onJump }: NGOProgressProps) {
  const reduced = !!useReducedMotion();
  const idx = NGO_STEPS.indexOf(currentStep);

  return (
    <nav aria-label="NGO registration progress" className="w-full">
      {/* Step counter + label */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-2xs font-black uppercase tracking-widest text-stone-400">
          Step {idx + 1} of {NGO_STEPS.length}
        </p>
        <p className="text-xs font-bold text-[#b04a15] truncate">
          {NGO_STEP_LABELS[currentStep]}
        </p>
      </div>

      {/* Dot rail */}
      <ol className="flex items-center gap-0">
        {NGO_STEPS.map((step, i) => {
          const isCurrent = step === currentStep;
          const isDone = completedSteps.has(step) && !isCurrent;
          const canJump = isDone;
          const isLast = i === NGO_STEPS.length - 1;

          return (
            <li key={step} className={`flex items-center ${!isLast ? "flex-1" : ""}`}>
              <button
                type="button"
                onClick={() => canJump && onJump(step)}
                disabled={!canJump}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`${NGO_STEP_LABELS[step]}${isDone ? ", completed" : isCurrent ? ", current step" : ", not yet available"}`}
                className={`
                  grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors
                  ${isDone
                    ? "border-green-500 bg-green-500 text-white"
                    : isCurrent
                    ? "border-[#b04a15] bg-[#b04a15]/10 text-[#b04a15]"
                    : "border-stone-300 dark:border-zinc-700 bg-transparent text-transparent"
                  }
                  ${canJump ? "cursor-pointer" : "cursor-default"}
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b04a15]
                `}
              >
                {isDone ? (
                  <motion.span animate={completedNodeAnimation(reduced)}>
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                  </motion.span>
                ) : (
                  <span className="text-4xs font-black">{i + 1}</span>
                )}
              </button>

              {!isLast && (
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
