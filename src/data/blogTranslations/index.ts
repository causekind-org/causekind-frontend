// Pre-translated blog content (see scripts/generate-blog-translations.mjs)
// is fetched on demand from public/blog-translations/<locale>.json rather
// than statically imported — 13 locales x ~9 translated articles is ~3.5MB
// of JSON, and importing all of it directly into blog/page.tsx and
// blog/[slug]/page.tsx (both client components) shipped that whole payload
// to every visitor's bundle regardless of their selected language, and was
// large enough to crash the dev compiler outright. Fetching only the active
// locale, cached in memory + sessionStorage, avoids both problems.

export type BlogTranslation = {
  title: string;
  description: string;
  category: string;
  content: string;
};

export type InsiderTipTranslation = {
  title: string;
  description: string;
};

// Reserved key scripts/generate-blog-translations.mjs stores the Insider
// Tips carousel data under, alongside the per-slug post entries — can't
// collide with a real post slug since blog slugs are plain kebab-case.
const TIPS_KEY = "__insider_tips__";

type LocaleData = Record<string, BlogTranslation | Record<string, InsiderTipTranslation>>;

const memCache = new Map<string, LocaleData>();
const inFlight = new Map<string, Promise<LocaleData | null>>();

async function loadLocale(locale: string): Promise<LocaleData | null> {
  if (locale === "en") return null;
  if (memCache.has(locale)) return memCache.get(locale)!;

  const existing = inFlight.get(locale);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const stored = sessionStorage.getItem(`blog-translations:${locale}`);
      if (stored) {
        const data = JSON.parse(stored) as LocaleData;
        memCache.set(locale, data);
        return data;
      }
    } catch {}

    try {
      const res = await fetch(`/blog-translations/${locale}.json`);
      if (!res.ok) return null;
      const data = (await res.json()) as LocaleData;
      memCache.set(locale, data);
      try { sessionStorage.setItem(`blog-translations:${locale}`, JSON.stringify(data)); } catch {}
      return data;
    } catch {
      return null;
    } finally {
      inFlight.delete(locale);
    }
  })();

  inFlight.set(locale, promise);
  return promise;
}

/** Kicks off (and caches) the fetch for a locale, resolving once it's ready
 *  so callers rendering many posts at once (e.g. the blog listing page) can
 *  await one fetch and then use the synchronous getBlogTranslation /
 *  getInsiderTipTranslation reads below for every post, instead of a
 *  separate fetch per card. Safe to call redundantly — cached/in-flight. */
export function preloadBlogTranslations(locale: string): Promise<LocaleData | null> {
  return loadLocale(locale);
}

export async function fetchBlogTranslation(locale: string, slug: string): Promise<BlogTranslation | null> {
  const data = await loadLocale(locale);
  return (data?.[slug] as BlogTranslation) ?? null;
}

export async function fetchInsiderTipTranslation(locale: string, slug: string): Promise<InsiderTipTranslation | null> {
  const data = await loadLocale(locale);
  const tips = data?.[TIPS_KEY] as Record<string, InsiderTipTranslation> | undefined;
  return tips?.[slug] ?? null;
}

/** Synchronous read of whatever's already cached in memory for a locale —
 *  returns null before the fetch resolves. Pair with preloadBlogTranslations
 *  + a re-render (e.g. a state bump) once the fetch completes. */
export function getBlogTranslation(locale: string, slug: string): BlogTranslation | null {
  return (memCache.get(locale)?.[slug] as BlogTranslation) ?? null;
}

export function getInsiderTipTranslation(locale: string, slug: string): InsiderTipTranslation | null {
  const tips = memCache.get(locale)?.[TIPS_KEY] as Record<string, InsiderTipTranslation> | undefined;
  return tips?.[slug] ?? null;
}
