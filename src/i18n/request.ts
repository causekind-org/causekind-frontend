import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { locales, defaultLocale } from "./config";

export type { Locale } from "./config";
export { LANGUAGE_OPTIONS, locales, defaultLocale } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("ck_locale")?.value ?? defaultLocale;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locale = locales.includes(raw as any) ? raw : defaultLocale;

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../messages/en.json`)).default;
  }

  return { locale, messages };
});
