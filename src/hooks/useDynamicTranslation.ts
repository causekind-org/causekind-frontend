"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

// Module-level in-memory cache — survives re-renders, cleared on page reload
const memCache = new Map<string, string>();

async function translateText(text: string, targetLang: string): Promise<string> {
  const key = `${targetLang}:${text}`;

  if (memCache.has(key)) return memCache.get(key)!;

  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      memCache.set(key, stored);
      return stored;
    }
  } catch {}

  try {
    // MyMemory API — free, no key, 10k words/day
    const encoded = encodeURIComponent(text.slice(0, 500));
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|${targetLang}`
    );
    const data = await res.json();
    const result: string = data?.responseData?.translatedText ?? text;
    memCache.set(key, result);
    try { sessionStorage.setItem(key, result); } catch {}
    return result;
  } catch {
    return text;
  }
}

/**
 * Translates a single string dynamically based on the current locale.
 * Returns the original text immediately (no flicker), then swaps to
 * the translation once fetched. Results are cached in sessionStorage.
 *
 * Usage:
 *   const title = useDynamicTranslation(campaign.title);
 */
export function useDynamicTranslation(text: string | null | undefined): string | null | undefined {
  const locale = useLocale();
  const [translated, setTranslated] = useState(text);
  const lastText = useRef(text);

  useEffect(() => {
    if (!text) { setTranslated(text); return; }
    if (locale === "en") { setTranslated(text); return; }

    // Reset to original while fetching if text changed
    if (lastText.current !== text) {
      setTranslated(text);
      lastText.current = text;
    }

    let cancelled = false;
    translateText(text, locale).then((result) => {
      if (!cancelled) setTranslated(result);
    });
    return () => { cancelled = true; };
  }, [text, locale]);

  return translated;
}

/**
 * Translates multiple strings at once (batched, no duplicate requests).
 * Returns an array in the same order as the input.
 *
 * Usage:
 *   const [title, description] = useDynamicTranslations([campaign.title, campaign.description]);
 */
export function useDynamicTranslations(texts: (string | null | undefined)[]): (string | null | undefined)[] {
  const locale = useLocale();
  const [results, setResults] = useState<(string | null | undefined)[]>(texts);

  useEffect(() => {
    if (locale === "en") { setResults(texts); return; }

    let cancelled = false;
    Promise.all(
      texts.map((t) => (t ? translateText(t, locale) : Promise.resolve(t)))
    ).then((translated) => {
      if (!cancelled) setResults(translated);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(texts), locale]);

  return results;
}
