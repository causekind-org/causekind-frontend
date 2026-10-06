import React from "react";

/**
 * Eyebrow + heading shared by the donee-only landing sections (How receiving
 * works, My requests, Handover tips). Same shape as the About and founder
 * sections: a short rule, a small uppercase label, then an extrabold heading.
 *
 * <p>Colours come from `--ck-role-*`, so the sections using it put
 * `data-ck-role-theme="donee"` on their own root — navy in light mode, sky blue
 * in dark mode.
 */
export function DoneeSectionHeading({
  eyebrow,
  title,
  lede,
  id,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  id?: string;
}) {
  return (
    <div className="flex flex-col items-start text-left">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="h-0.5 w-6 sm:w-8 rounded-full bg-[var(--ck-role-accent)]" aria-hidden="true" />
        <p className="text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[var(--ck-role-accent)]">
          {eyebrow}
        </p>
      </div>
      <h2 id={id} className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-stone-900 dark:text-stone-100">
        {title}
      </h2>
      {lede && (
        <p className="mt-2 text-sm sm:text-base text-stone-600 dark:text-stone-400 font-medium leading-relaxed max-w-2xl">
          {lede}
        </p>
      )}
    </div>
  );
}

/** Primary pill button classes for the donee sections (matches "Know more"). */
export const DONEE_PILL_BUTTON =
  "inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-full bg-[var(--ck-role-accent)] hover:bg-[var(--ck-role-hover)] text-[var(--ck-role-on-accent)] font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-ring)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0E0C0A]";

/** Section shell classes shared by the donee sections. */
export const DONEE_SECTION =
  "ck-m-section relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] border-t border-[var(--ck-role-border)]! py-12 sm:py-16 lg:py-20";

/** Card surface shared by the donee sections. */
export const DONEE_CARD =
  "rounded-2xl bg-white dark:bg-zinc-900 border border-[var(--ck-role-border)]! shadow-sm";
