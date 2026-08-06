"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Cloud, TriangleAlert } from "lucide-react";
import type { SaveStatus } from "./types";

/**
 * Autosave status.
 *
 * <p>Announced through a polite live region rather than toasts — a toast per
 * debounced save on a form this size would be a stream of interruptions, and
 * screen-reader users would hear every keystroke's consequence.
 *
 * <p>The live region text is separate from the visual label so the announcement
 * is a full sentence while the chip stays a word.
 */
export function DraftSaveStatus({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  const reduced = !!useReducedMotion();
  const fade = reduced ? { duration: 0 } : { duration: 0.18 };

  return (
    <div className="flex items-center gap-2">
      <span className="sr-only" aria-live="polite">
        {status === "saving" ? "Saving your draft"
          : status === "saved" ? "Draft saved"
          : status === "error" ? "Draft not saved. Use the retry button."
          : ""}
      </span>

      <AnimatePresence mode="wait" initial={false}>
        {status === "saving" && (
          <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}
            className="flex items-center gap-1.5 text-2xs font-semibold text-stone-400">
            <Cloud className="h-3 w-3" aria-hidden /> Saving…
          </motion.span>
        )}
        {status === "saved" && (
          <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}
            className="flex items-center gap-1.5 text-2xs font-semibold text-green-600 dark:text-green-400">
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> Saved
          </motion.span>
        )}
        {status === "error" && (
          <motion.span key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}
            className="flex items-center gap-1.5 text-2xs font-semibold text-red-600 dark:text-red-400">
            <TriangleAlert className="h-3 w-3" aria-hidden /> Not saved
            <button
              type="button"
              onClick={onRetry}
              className="rounded px-1 underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
            >
              Retry
            </button>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
