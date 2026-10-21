import { useTranslations } from "next-intl";
import { normalizeUiText, uiKey } from "@/lib/uiText/key";

/**
 * Static interface copy translated through the catalogue, keyed by its English
 * text (handoffs/Translation Coverage Plan.md, Wave 0 checkpoint).
 *
 *   <UiText>Get in touch</UiText>
 *   <UiText context="status">Open</UiText>     // same English, own translation
 *
 *   const ui = useUiText();
 *   <input placeholder={ui("Search requests")} aria-label={ui("Search")} />
 *
 * Rules (enforced by `npm run i18n:check`):
 * - Children / the first argument must be a **string literal** written in code.
 *   Never pass user-provided values, names, descriptions or anything from the API.
 * - Text needing variables, plurals or rich markup uses a named key with t() instead.
 *
 * Entries live in messages/en.json under "ui"; `npm run i18n:extract` adds them.
 * Other languages are filled by the existing catalogue pipeline. A missing entry
 * renders the English as written.
 */
export function useUiText() {
  // Shared primitives (dialog, etc.) now use this, and many tests render them
  // with no NextIntlClientProvider, where useTranslations throws. Without a
  // provider there is nothing to translate into, so fall back to the English.
  // The call is unconditional and the outcome is fixed for a given tree, so hook
  // order never changes. The app always has the provider (root layout).
  let t: ReturnType<typeof useTranslations> | null;
  try {
    t = useTranslations("ui");
  } catch {
    t = null;
  }
  return (text: string, context?: string): string => {
    const key = uiKey(text, context);
    // Real next-intl translators always have has(); minimal test mocks often
    // don't — treat that as "no entry" and show the English.
    const has = !!t && typeof t.has === "function" && t.has(key);
    return has && t ? t(key) : normalizeUiText(text);
  };
}

export function UiText({ children, context }: { children: string; context?: string }) {
  const ui = useUiText();
  return <>{ui(children, context)}</>;
}
