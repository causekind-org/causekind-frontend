"use client";

import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { errorVariants, revealVariants } from "../wizardMotion";

/**
 * Label + control + hint/error, wired for accessibility.
 *
 * <p>The point of centralising this: `aria-invalid` and `aria-describedby` have
 * to reference real ids, and hand-rolling that per field is where it silently
 * stops being done. Children receive the ids through a render prop so the
 * control itself — a real `<input>`, `<select>` or `<textarea>` — carries them.
 */
export function WizardField({
  label,
  required,
  hint,
  error,
  aiFilled,
  uncertain,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Shows the AI badge; the highlight itself is applied by the control. */
  aiFilled?: boolean;
  uncertain?: boolean;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
}) {
  const reduced = !!useReducedMotion();
  const base = useId();
  const id = `${base}-control`;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;

  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-[13px] font-bold text-stone-700 dark:text-stone-200">
          {label}
          {required && <span className="ml-0.5 text-[var(--ck-role-accent)]" aria-hidden>*</span>}
          {required && <span className="sr-only"> (required)</span>}
        </label>
        {aiFilled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ck-role-soft)] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--ck-role-accent)]">
            <Sparkles className="h-2.5 w-2.5" aria-hidden />
            {uncertain ? "AI · check this" : "AI"}
          </span>
        )}
      </div>

      {children({ id, describedBy, invalid: !!error })}

      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            id={errorId}
            variants={errorVariants(reduced)}
            initial="hidden" animate="shown" exit="hidden"
            className="text-[11px] font-semibold text-red-600 dark:text-red-400"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" id={hintId} className="text-[11px] text-stone-400">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Progressive disclosure wrapper for conditional fields. */
export function ConditionalField({ show, children }: { show: boolean; children: React.ReactNode }) {
  const reduced = !!useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          variants={revealVariants(reduced)}
          initial="hidden" animate="shown" exit="hidden"
          className="overflow-hidden"
        >
          {/* Inner padding wrapper: animating height on the padded element itself
              makes the content jump as the box collapses. */}
          <div className="pt-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Shared control classes so every input in the wizard matches the site. */
export const controlClass =
  "w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-base sm:text-sm text-stone-900 " +
  "placeholder:text-stone-400 transition-colors " +
  "focus-visible:border-[var(--ck-role-accent)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ck-role-accent)] " +
  "aria-[invalid=true]:border-red-400 " +
  "dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-100";
