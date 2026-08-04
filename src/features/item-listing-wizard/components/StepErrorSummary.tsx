"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { errorVariants } from "../wizardMotion";

/**
 * Compact step-level error summary.
 *
 * <p>`role="alert"` so a keyboard or screen-reader user learns that Continue was
 * refused without having to hunt the form for red text. Each entry focuses its
 * field, which is the only reliable way to reach an error that is below the fold
 * on a phone.
 */
export function StepErrorSummary({
  errors,
  onFocusField,
}: {
  errors: Record<string, string>;
  onFocusField: (field: string) => void;
}) {
  const reduced = !!useReducedMotion();
  const entries = Object.entries(errors);

  return (
    <AnimatePresence initial={false}>
      {entries.length > 0 && (
        <motion.div
          variants={errorVariants(reduced)}
          initial="hidden"
          animate="shown"
          exit="hidden"
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 dark:text-red-400">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {entries.length === 1 ? "One thing needs fixing" : `${entries.length} things need fixing`}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {entries.map(([field, message]) => (
              <li key={field}>
                <button
                  type="button"
                  onClick={() => onFocusField(field)}
                  className="text-left text-[11px] font-semibold text-red-600 underline underline-offset-2 hover:opacity-80 dark:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                >
                  {message}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
