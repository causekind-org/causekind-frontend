import React from "react";

/**
 * The Trust & Safety heading block, extracted: a centered pill eyebrow, a
 * large centered heading and a muted subtitle. Heading/subtitle classes and the
 * wrapper's margins are TrustSafetySection's, verbatim.
 *
 * <p>`tone="default"` is Trust & Safety's own pill; `tone="donee"` is the
 * slightly larger, higher-contrast pill used on every heading of the donee
 * landing page ({@link DONEE_PILL_EYEBROW}). Colours come from `--ck-role-*`,
 * so donee sections put `data-ck-role-theme="donee"` on their own root.
 */
export function DoneeSectionHeading({
  eyebrow,
  title,
  lede,
  id,
  tone = "donee",
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  id?: string;
  tone?: "default" | "donee";
}) {
  return (
    <div className="flex flex-col items-center text-center relative mt-2 sm:mt-4">
      <div className={`${tone === "donee" ? DONEE_PILL_EYEBROW : TRUST_PILL_EYEBROW} mb-3 sm:mb-4`}>
        {eyebrow}
      </div>
      <h2 id={id} className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
        {title}
      </h2>
      {lede && (
        <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-xl mx-auto">
          {lede}
        </p>
      )}
    </div>
  );
}

/** Trust & Safety's pill eyebrow, exactly as that section renders it. */
export const TRUST_PILL_EYEBROW =
  "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase text-[var(--ck-role-accent,#B5480F)] dark:text-[var(--ck-role-accent,#F4A25B)] border border-[var(--ck-role-accent,#B5480F)]/20 bg-[var(--ck-role-accent,#B5480F)]/5";

/**
 * The donee page's pill eyebrow: one text step up (text-xs → text-sm, about
 * +2px at every width), padding scaled with it, and a stronger tint and border.
 * The border is important because an unlayered `* { border-color }` in
 * styles.css otherwise overrides every border utility.
 */
export const DONEE_PILL_EYEBROW =
  "inline-flex items-center gap-1.5 px-[1.1875rem] py-[0.4375rem] rounded-full text-sm font-bold tracking-[0.2em] uppercase text-[var(--ck-role-accent)] border border-[var(--ck-role-accent)]/30! bg-[var(--ck-role-accent)]/10";

/** Space between the heading block and the content: Trust & Safety's gap. */
export const DONEE_HEADING_GAP = "mt-4 sm:mt-6 lg:mt-5";

/** Primary pill button classes for the donee sections (matches "Know more"). */
export const DONEE_PILL_BUTTON =
  "inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 sm:py-3.5 rounded-full bg-[var(--ck-role-accent)] hover:bg-[var(--ck-role-hover)] text-[var(--ck-role-on-accent)] font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-ring)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0E0C0A]";

/** Section shell classes shared by the donee sections. */
export const DONEE_SECTION =
  "ck-m-section relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] border-t border-[var(--ck-role-border)]! py-12 sm:py-16 lg:py-20";

/** Card surface shared by the donee sections. */
export const DONEE_CARD =
  "rounded-2xl bg-white dark:bg-zinc-900 border border-[var(--ck-role-border)]! shadow-sm";
