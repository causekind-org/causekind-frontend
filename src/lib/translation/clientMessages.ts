/**
 * Messages sent to NextIntlClientProvider in the root layout.
 *
 * For English the `ui` namespace (about 190 KiB, two thirds of the catalogue)
 * is left out. It is only a lookup table for other languages: each en value is
 * the English source text itself (key = hash of that text, see
 * lib/uiText/key.ts), and useUiText falls back to that same text when has(key)
 * is false. next-intl calls onError only from t()/rich()/raw(), never from
 * has(), so a missing `ui` logs nothing. clientMessages.test.tsx proves the
 * output is identical for every entry. Every other locale keeps everything.
 *
 * Server components are unaffected: they read src/i18n/request.ts, which still
 * has the full catalogue.
 */
export function clientMessagesFor<M extends Record<string, unknown>>(locale: string, messages: M): M | Omit<M, "ui"> {
  if (locale !== "en") return messages;
  const { ui, ...rest } = messages;
  return rest;
}
