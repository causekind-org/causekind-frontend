"use client";

import { useId } from "react";
import { Check } from "lucide-react";

export type DeclarationGroup = {
  key: string;
  items: readonly string[];
};

/**
 * A wizard's declarations, verbatim, in readable groups.
 *
 * <p>Grouping is presentational only. The backend stores **one** boolean, so
 * there are deliberately not N checkboxes pretending to be N stored flags — the
 * single confirmation below is the real, required control and it is a genuine
 * `<input type="checkbox">`, not a styled div.
 *
 * <p>The declaration texts arrive as a prop rather than being imported. They are
 * legal statements about a specific action, so a listing's and an offer's cannot
 * be the same list, and importing one wizard's copy into another would put the
 * wrong promise in front of the user.
 */
export function DeclarationsBlock({
  groups,
  groupTitles,
  confirmed,
  onConfirmedChange,
  error,
  invalidatedNotice,
  confirmLabel = "I have read and agree to all declarations above.",
}: {
  groups: readonly DeclarationGroup[];
  /** Optional friendly heading per group key; falls back to the key itself. */
  groupTitles?: Record<string, string>;
  confirmed: boolean;
  onConfirmedChange: (next: boolean) => void;
  error?: string;
  /** Shown when a post-confirmation edit reset the checkbox. */
  invalidatedNotice?: string;
  confirmLabel?: string;
}) {
  // Generated, not hardcoded. These were the literals "declarations-heading" and
  // "declarations-error"; two of these blocks on one page produced duplicate ids,
  // which silently breaks the aria-labelledby/aria-describedby association for
  // whichever one loses.
  const base = useId();
  const headingId = `${base}-declarations-heading`;
  const errorId = `${base}-declarations-error`;

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h3 id={headingId} className="text-2xs font-black uppercase tracking-wider text-stone-400">
        Declarations
      </h3>

      {groups.map(group => (
        <fieldset key={group.key} className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
          <legend className="px-1 text-2xs font-black uppercase tracking-wider text-[var(--ck-role-accent)]">
            {groupTitles?.[group.key] ?? group.key}
          </legend>
          <ul className="mt-1 space-y-1.5">
            {group.items.map(text => (
              <li key={text} className="flex items-start gap-2 text-2xs leading-relaxed text-stone-600 dark:text-stone-300">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--ck-role-accent)]" strokeWidth={3} aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}

      {invalidatedNotice && (
        <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-2xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          {invalidatedNotice}
        </p>
      )}

      <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <input
          type="checkbox"
          name="declarationsConfirmed"
          checked={confirmed}
          onChange={e => onConfirmedChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--ck-role-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
        />
        <span className="text-sm font-bold text-stone-800 dark:text-stone-100">{confirmLabel}</span>
      </label>

      {error && (
        <p id={errorId} className="text-2xs font-semibold text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}
