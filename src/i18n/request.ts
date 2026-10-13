import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale } from "./config";
import { isTranslationLocale } from "@/lib/translation/server";
import { getInterfaceCatalogue } from "@/lib/translation/messages";

export type { Locale } from "./config";
export { LANGUAGE_OPTIONS, locales, defaultLocale } from "./config";

export default getRequestConfig(async ({ locale: requestedLocale }) => {
  const cookieStore = await cookies();
  const raw = requestedLocale ?? cookieStore.get("ck_locale")?.value ?? defaultLocale;
  const locale = isTranslationLocale(raw) ? raw : defaultLocale;
  const { messages } = await getInterfaceCatalogue(locale);
  return { locale, messages };
});
