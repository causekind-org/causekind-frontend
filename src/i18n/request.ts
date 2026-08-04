import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { locales, defaultLocale } from "./config";

export type { Locale } from "./config";
export { LANGUAGE_OPTIONS, locales, defaultLocale } from "./config";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Recursively overlays `override` on `base`, so a partially translated namespace
 * keeps English for the keys it is missing instead of the whole namespace being
 * replaced. Arrays are taken wholesale from the override — a half-translated
 * list is worse than either version of it.
 */
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];
    out[key] = isPlainObject(existing) && isPlainObject(value)
      ? deepMerge(existing, value)
      : value;
  }
  return out;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("ck_locale")?.value ?? defaultLocale;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locale = locales.includes(raw as any) ? raw : defaultLocale;

  const fallback = (await import(`../../messages/en.json`)).default as Record<string, unknown>;

  let messages: Record<string, unknown>;
  try {
    const active = (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;
    // Merge over English rather than replacing it. Previously each locale file
    // was loaded standalone, so a key missing from (say) hi.json surfaced its
    // raw dotted path to the user. With the merge, an untranslated key degrades
    // to readable English — which also means adding a feature no longer has to
    // land 14 translations simultaneously to stay safe.
    messages = deepMerge(fallback, active);
  } catch {
    messages = fallback;
  }

  return { locale, messages };
});
