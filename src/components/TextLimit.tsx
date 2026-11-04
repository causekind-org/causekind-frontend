/** One limit per long NGO text, the same as the backend (it answers a 400 field error above it, never cuts). */
export const TEXT_LIMITS = { title: 120, description: 2000, aboutUs: 2000, proofNote: 1000 } as const;

export const overLimit = (value: string | null | undefined, max: number) => (value ?? "").length > max;

/** Red border classes for an input whose text is over its limit. */
export const overLimitBorder = "border-red-500 focus:border-red-500 dark:border-red-500";

/** "N / max" under a text field; red with a message once over. No maxLength anywhere: text is never cut. */
export function LimitCounter({ id, value, max }: { id?: string; value: string | null | undefined; max: number }) {
  const n = (value ?? "").length;
  const over = n > max;
  return (
    <p id={id} aria-live="polite" data-testid={id ? `${id}` : undefined}
      className={`text-right text-xs ${over ? "font-semibold text-red-600 dark:text-red-400" : "text-stone-500 dark:text-stone-400"}`}>
      {n} / {max}{over ? ` · ${n - max} over the limit. Shorten it to save.` : ""}
    </p>
  );
}
