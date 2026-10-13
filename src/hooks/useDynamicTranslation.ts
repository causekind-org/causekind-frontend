"use client";

import { createElement, useEffect, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { translateText, translateTextStrict } from "@/lib/translation/client";

export { translateText } from "@/lib/translation/client";

type TextValue = string | null | undefined;

/** Show the original immediately when either source text or language changes. */
function useTranslation(value: TextValue, translate: (text: string, locale: string) => Promise<string>): TextValue {
  const locale = useLocale();
  const [result, setResult] = useState<{ source: TextValue; locale: string; text: string }>();
  useEffect(() => {
    if (!value || locale === "en") return;
    let cancelled = false;
    translate(value, locale).then((text) => {
      if (!cancelled) setResult({ source: value, locale, text });
    }).catch(() => { /* Keep original content; failures are not cached. */ });
    return () => { cancelled = true; };
  }, [value, locale, translate]);
  return locale !== "en" && result && result.source === value && result.locale === locale ? result.text : value;
}

export function useDynamicTranslation(text: TextValue): TextValue {
  return useTranslation(text, translateText);
}

/** Concurrent strings share the client queue and server Google batches. */
export function useDynamicTranslations(texts: TextValue[]): TextValue[] {
  const locale = useLocale();
  const source = JSON.stringify(texts);
  const [result, setResult] = useState<{ source: string; locale: string; texts: TextValue[] }>();
  useEffect(() => {
    if (locale === "en") return;
    let cancelled = false;
    const values = JSON.parse(source) as TextValue[];
    Promise.all(values.map((text) => text ? translateText(text, locale) : Promise.resolve(text)))
      .then((translated) => {
        if (!cancelled) setResult({ source, locale, texts: translated });
      }).catch(() => { /* Keep original content. */ });
    return () => { cancelled = true; };
  }, [source, locale]);
  return locale !== "en" && result && result.source === source && result.locale === locale ? result.texts : texts;
}

export function TranslatedText({ text }: { text: TextValue }): ReactNode {
  const locale = useLocale();
  const translated = useDynamicTranslation(text);
  if (!translated || translated === text) return translated ?? "";
  return createElement("span", { lang: `${locale}-x-mtfrom-und` }, translated);
}

/** Replace text nodes only; never inject Google's output as HTML. */
export async function translateHtmlStrict(html: string, targetLang: string): Promise<string> {
  if (typeof window === "undefined" || !html || targetLang === "en") return html;
  const container = document.createElement("div");
  container.innerHTML = html;
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.textContent?.trim() &&
        !node.parentElement?.closest('script, style, noscript, code, pre, [translate="no"]')) {
      textNodes.push(node as Text);
    }
  }
  const translations = await Promise.all(textNodes.map((node) => translateTextStrict(node.textContent || "", targetLang)));
  textNodes.forEach((node, index) => {
    if (node.textContent === translations[index]) return;
    const span = document.createElement("span");
    span.lang = `${targetLang}-x-mtfrom-und`;
    span.textContent = translations[index];
    node.replaceWith(span);
  });
  return container.innerHTML;
}

export async function translateHtml(html: string, targetLang: string): Promise<string> {
  try { return await translateHtmlStrict(html, targetLang); }
  catch { return html; }
}

export function useTranslatedHtml(html: TextValue): TextValue {
  return useTranslation(html, translateHtml);
}
