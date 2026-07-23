"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";

// Module-level in-memory cache — survives re-renders, cleared on page reload
const memCache = new Map<string, string>();

export async function translateText(text: string, targetLang: string): Promise<string> {
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
    // MyMemory reports rate-limit/quota failures via responseStatus in the
    // JSON body (the HTTP status itself is 200), stuffing its warning text
    // into translatedText — without this check that notice gets cached and
    // shown to readers as if it were the translation.
    if ((data?.responseStatus && data.responseStatus !== 200) || /mymemory warning/i.test(result)) {
      return text;
    }
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

/**
 * A helper component to dynamically translate and render database-driven text.
 * Safe to use inside loops or conditional rendering blocks where hooks are not allowed.
 */
export function TranslatedText({ text }: { text: string | null | undefined }): ReactNode {
  const translated = useDynamicTranslation(text);
  return translated ?? "";
}

/**
 * Translates an HTML string node-by-node (walking text nodes only, tags
 * untouched) so long-form content — e.g. a blog article body — keeps its
 * markup while its text is translated. Each text node is cached/translated
 * the same way useDynamicTranslation caches plain strings.
 */
export async function translateHtml(html: string, targetLang: string): Promise<string> {
  if (typeof window === "undefined" || !html || targetLang === "en") return html;

  const container = document.createElement("div");
  container.innerHTML = html;

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.textContent && node.textContent.trim()) textNodes.push(node as Text);
  }

  const translations = await Promise.all(
    textNodes.map((n) => translateText(n.textContent || "", targetLang))
  );
  textNodes.forEach((n, i) => {
    n.textContent = translations[i];
  });

  return container.innerHTML;
}

/**
 * Translates an HTML string dynamically based on the current locale, the
 * same way useDynamicTranslation does for plain strings.
 *
 * Usage:
 *   const content = useTranslatedHtml(sanitizedContent);
 */
export function useTranslatedHtml(html: string | null | undefined): string | null | undefined {
  const locale = useLocale();
  const [translated, setTranslated] = useState(html);
  const lastHtml = useRef(html);

  useEffect(() => {
    if (!html) { setTranslated(html); return; }
    if (locale === "en") { setTranslated(html); return; }

    if (lastHtml.current !== html) {
      setTranslated(html);
      lastHtml.current = html;
    }

    let cancelled = false;
    translateHtml(html, locale).then((result) => {
      if (!cancelled) setTranslated(result);
    });
    return () => { cancelled = true; };
  }, [html, locale]);

  return translated;
}
