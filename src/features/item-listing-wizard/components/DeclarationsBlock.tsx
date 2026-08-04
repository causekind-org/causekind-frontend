"use client";

import { Check } from "lucide-react";
import { DECLARATION_GROUPS } from "../wizardModel";

/**
 * The eight declarations, verbatim, in three readable groups.
 *
 * <p>Grouping is presentational only. The backend stores **one** boolean, so
 * there are deliberately not eight checkboxes pretending to be eight stored
 * flags — the single confirmation below is the real, required control and it is
 * a genuine `<input type="checkbox">`, not a styled div.
 */
export function DeclarationsBlock({
  groupTitles,
  confirmed,
  onConfirmedChange,
  error,
  invalidatedNotice,
}: {
  groupTitles: Record<string, string>;
  confirmed: boolean;
  onConfirmedChange: (next: boolean) => void;
  error?: string;
  /** Shown when a post-confirmation edit reset the checkbox. */
  invalidatedNotice?: string;
}) {
  return (
    <section aria-labelledby="declarations-heading" className="space-y-3">
      <h3 id="declarations-heading" className="text-[11px] font-black uppercase tracking-wider text-stone-400">
        Declarations
      </h3>

      {DECLARATION_GROUPS.map(group => (
        <fieldset key={group.key} className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
          <legend className="px-1 text-[11px] font-black uppercase tracking-wider text-[var(--ck-role-accent)]">
            {groupTitles[group.key] ?? group.key}
          </legend>
          <ul className="mt-1 space-y-1.5">
            {group.items.map(text => (
              <li key={text} className="flex items-start gap-2 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ck-role-accent)]" strokeWidth={3} aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}

      {invalidatedNotice && (
        <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          {invalidatedNotice}
        </p>
      )}

      <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => onConfirmedChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? "declarations-error" : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--ck-role-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
        />
        <span className="text-[13px] font-bold text-stone-800 dark:text-stone-100">
          I have read and agree to all declarations above.
        </span>
      </label>

      {error && (
        <p id="declarations-error" className="text-[11px] font-semibold text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}
