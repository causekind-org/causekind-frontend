"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TriangleAlert } from "lucide-react";

/**
 * Form-level error banner.
 *
 * <p>Exists because some failures genuinely belong to no field. A 401 is the
 * clearest case: attaching it to the email would imply the address was the
 * problem, and attaching it to the password would imply the address was fine —
 * both leak whether an account exists. It states the failure and pins it to
 * neither.
 *
 * <p>`role="alert"` and a real banner rather than a toast, so it stays on screen
 * while the user fixes the input instead of disappearing after four seconds.
 * The caller clears it when a relevant field is edited.
 */
export function AuthFormAlert({ message }: { message: string | null }) {
  const reduced = !!useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          role="alert"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduced ? 0.12 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/60 dark:bg-red-950/30"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
          <p className="text-xs font-semibold leading-relaxed text-red-700 dark:text-red-300">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
