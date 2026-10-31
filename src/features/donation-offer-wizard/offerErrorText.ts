import { useCallback } from "react";
import { useTranslations } from "next-intl";

/**
 * Validation messages from offerSchema travel as codes, not sentences, so they
 * can be shown in the reader's language at render time:
 *
 *   offerErrorCode("quantityMax", { max: 3 })  →  "⟦quantityMax⟧{"max":3}"
 *
 * `useOfferErrorText()` turns such a token back into `offerValidation.<code>`
 * text. Anything that is not a token (a server message, or text a step set
 * itself) is shown exactly as given.
 */
const OPEN = "⟦";
const CLOSE = "⟧";

export function offerErrorCode(code: string, values?: Record<string, string | number>): string {
  return `${OPEN}${code}${CLOSE}${values ? JSON.stringify(values) : ""}`;
}

export function useOfferErrorText(): (message: string | undefined) => string | undefined {
  let t: ReturnType<typeof useTranslations> | null;
  try {
    t = useTranslations("offerValidation");
  } catch {
    t = null; // no intl provider (tests)
  }
  return useCallback((message: string | undefined) => {
    if (!message || !message.startsWith(OPEN)) return message;
    const end = message.indexOf(CLOSE);
    if (end < 0) return message;
    const code = message.slice(OPEN.length, end);
    const rest = message.slice(end + CLOSE.length);
    let values: Record<string, string | number> = {};
    try { values = rest ? JSON.parse(rest) : {}; } catch { /* keep empty */ }
    return t && t.has(code) ? t(code, values) : code;
  }, [t]);
}
