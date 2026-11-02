import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config";
import { isTranslationLocale } from "@/lib/translation/server";
import { getInterfaceCatalogue } from "@/lib/translation/messages";

export type { Locale } from "./config";
export { LANGUAGE_OPTIONS, locales, defaultLocale } from "./config";

// The locale comes from the [locale] route segment, which src/proxy.ts fills
// from the ck_locale cookie. Reading the cookie here instead made every page
// render per request and never cache (Vercel CPU, Oct 2026).
export default getRequestConfig(async ({ requestLocale }) => {
  const raw = (await requestLocale) ?? defaultLocale;
  const locale = isTranslationLocale(raw) ? raw : defaultLocale;
  const { messages } = await getInterfaceCatalogue(locale);
  return { locale, messages };
});
