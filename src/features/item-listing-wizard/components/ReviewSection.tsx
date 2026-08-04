"use client";

import { Pencil } from "lucide-react";

/**
 * One reviewable group with an Edit affordance that returns to its step.
 *
 * <p>Edit is a real button, not a clickable div, and it carries the section name
 * in its accessible label — five buttons all reading "Edit" is unusable with a
 * screen reader.
 */
export function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    // Tinted, not white: these sit inside the step card, and white-on-white made
    // the group boundaries disappear.
    <section className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-stone-400">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${title}`}
          className="flex min-h-[32px] items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-[var(--ck-role-accent)] transition-colors hover:bg-[var(--ck-role-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
        >
          <Pencil className="h-3 w-3" aria-hidden /> Edit
        </button>
      </div>
      <dl className="mt-2 space-y-1.5">{children}</dl>
    </section>
  );
}

/** A single label/value row. Empty optional values render as a muted dash. */
export function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value == null || value === "" || (typeof value === "string" && !value.trim());
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[11px] text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className={`min-w-0 text-right text-[11px] font-semibold ${empty ? "text-stone-300 dark:text-zinc-600" : "text-stone-800 dark:text-stone-100"}`}>
        {empty ? "—" : value}
      </dd>
    </div>
  );
}
