"use client";

import type { FilterOption } from "@/lib/dashboardFilters";

/**
 * A row of filter chips with counts, for a dashboard ledger.
 *
 * <p>Toggle buttons in a labelled group rather than a second tablist: these sit
 * inside a section tab already, and nested tablists announce badly. Every chip
 * stays visible even at zero, so the row does not reshuffle under the donor's
 * finger as items move between states.
 */
export function DashboardFilterChips<K extends string>({
  label,
  options,
  value,
  onChange,
  tone,
  idPrefix,
}: {
  /** Accessible name for the group, e.g. "Filter your inventory". */
  label: string;
  options: FilterOption<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Donor chips use the role accent; donee chips the donee navy. */
  tone: "donor" | "donee";
  idPrefix: string;
}) {
  const active = tone === "donor"
    ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-accent)] text-white"
    : "border-[#1e3a60] bg-[#1e3a60] text-white dark:border-blue-400 dark:bg-blue-500/30";

  return (
    <div role="group" aria-label={label} className="mt-3 flex flex-wrap gap-1.5">
      {options.map(o => {
        const selected = o.key === value;
        return (
          <button
            key={o.key}
            id={`${idPrefix}-${o.key}`}
            type="button"
            aria-pressed={selected}
            // Without this the label and count run together as "Drafts2".
            aria-label={`${o.label} (${o.count})`}
            onClick={() => onChange(o.key)}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-2xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] ${
              selected
                ? active
                : o.count === 0
                  ? "border-stone-200 bg-white text-stone-400 hover:text-stone-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-600"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300 dark:hover:text-stone-100"
            }`}
          >
            {o.label}
            <span
              className={`rounded-full px-1.5 text-3xs tabular-nums ${
                selected ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-stone-400"
              }`}
            >
              {o.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
