"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FieldStatus } from "./authValidation";

/**
 * Inline field feedback — one message slot, one icon, both driven by status.
 *
 * <p>Never colour alone: an invalid field gets a red border *and* an icon *and*
 * a sentence, and a valid one gets green *and* a check *and* short copy. Colour
 * is the least reliable of the three.
 *
 * <p>The slot has a reserved minimum height so a message appearing does not
 * shove the rest of the form down. Success copy is deliberately terse for the
 * same reason — a form where every valid field grows a sentence is taller and
 * noisier than one that just went quiet.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

export function ValidatedFieldFeedback({
  id,
  status,
  errorKey,
  successKey,
  params,
  serverText,
}: {
  id: string;
  status: FieldStatus;
  errorKey: string | null;
  successKey: string | null;
  params?: Record<string, string | number>;
  /** Authoritative server sentence, shown verbatim in place of a key. */
  serverText?: string | null;
}) {
  const t = useTranslations("auth.validation");
  const reduced = !!useReducedMotion();

  const showError = status === "invalid" && (errorKey || serverText);
  const showSuccess = status === "valid" && successKey;
  const visible = showError || showSuccess;

  const message = showError
    ? (serverText ?? t(errorKey as string, params))
    : showSuccess
      ? t(successKey as string, params)
      : "";

  return (
    // aria-live polite, not assertive: this updates as the user corrects a
    // field, and assertive would interrupt them mid-keystroke.
    <div className="min-h-[1.15rem] pt-0.5" aria-live="polite">
      <AnimatePresence initial={false} mode="wait">
        {visible && (
          <motion.p
            key={`${status}-${errorKey ?? successKey}`}
            id={id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -3 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -2 }}
            transition={{ duration: reduced ? 0.12 : 0.18, ease: EASE }}
            className={`flex items-start gap-1 text-xs font-medium ${
              showError ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            <motion.span
              initial={reduced ? false : { scale: 0.85 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="mt-px shrink-0"
              aria-hidden
            >
              {showError ? <CircleAlert className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            </motion.span>
            <span>{message}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Border/ring classes for the input itself.
 *
 * <p>Kept here so Login and Register cannot drift apart, and so the terracotta
 * focus treatment is preserved in every state that is not an error.
 */
export function fieldStateClass(status: FieldStatus): string {
  if (status === "invalid") {
    return "border-red-500 focus:border-red-500 focus:ring-red-500/20";
  }
  if (status === "valid") {
    return "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20";
  }
  return "border-stone-200 dark:border-zinc-800 focus:border-[#b04a15] focus:ring-[#b04a15]/20";
}

/**
 * A soft one-shot halo when a field goes invalid → valid, so a correction is
 * confirmed without a permanent glow. `key` changes on status so it replays
 * only on the transition, and it is skipped entirely under reduced motion.
 */
export function ValidHalo({ show }: { show: boolean }) {
  const reduced = useReducedMotion();
  if (reduced || !show) return null;
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-emerald-400"
    />
  );
}
