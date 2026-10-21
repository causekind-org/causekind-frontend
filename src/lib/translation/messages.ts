import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { printAST } from "@formatjs/icu-messageformat-parser/printer.js";
import english from "../../../messages/en.json";
import type { Locale } from "@/i18n/config";
import { isGoogleTranslationConfigured, translateWithGoogle, TranslationFailure } from "./server";
import { splitTranslationText } from "./text";

type MessageValue = string | number | boolean | null | MessageValue[] | { [key: string]: MessageValue };
/** `failures`: count of untranslated strings by reason code (diagnostics only). */
type TranslationResult = { value: MessageValue; complete: boolean; translated: boolean; failures?: Record<string, number> };

function mergeFailures(results: TranslationResult[]): Record<string, number> | undefined {
  let merged: Record<string, number> | undefined;
  for (const r of results) for (const [k, n] of Object.entries(r.failures ?? {})) (merged ??= {})[k] = (merged[k] ?? 0) + n;
  return merged;
}

export const englishMessages = english;

function collectMessages(value: MessageValue, prefix = "", result: Record<string, string> = {}) {
  if (typeof value === "string") result[prefix] = value;
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) collectMessages(child, prefix ? `${prefix}.${key}` : key, result);
  }
  return result;
}

export const interfaceMessageSources = collectMessages(englishMessages);

async function translateLiteral(value: string, locale: Locale): Promise<string> {
  return (await Promise.all(splitTranslationText(value).map(async (chunk) => {
    if (!chunk.trim()) return chunk;
    const leading = chunk.match(/^\s*/)?.[0] ?? "";
    const trailing = chunk.match(/\s*$/)?.[0] ?? "";
    return leading + await translateWithGoogle(chunk.trim(), locale, "en") + trailing;
  }))).join("");
}

// Translate literal AST nodes only. Argument names, number/date skeletons,
// select keys, plural offsets, pound signs, and rich-text tags never go to Google.
// The ICU printer quotes any syntax Google happens to produce as literal text.
async function translateAst(nodes: MessageFormatElement[], locale: Locale): Promise<MessageFormatElement[]> {
  return Promise.all(nodes.map(async (node): Promise<MessageFormatElement> => {
    if (node.type === TYPE.literal) return { ...node, value: await translateLiteral(node.value, locale) };
    if (node.type === TYPE.tag) return { ...node, children: await translateAst(node.children, locale) };
    if (node.type === TYPE.plural || node.type === TYPE.select) {
      const options = Object.fromEntries(await Promise.all(Object.entries(node.options).map(async ([key, option]) =>
        [key, { ...option, value: await translateAst(option.value, locale) }],
      )));
      return { ...node, options };
    }
    return node;
  }));
}

const cachedMessage = unstable_cache(
  async (source: string, locale: Locale, revision: string) => {
    void revision;
    const translated = printAST(await translateAst(parse(source), locale));
    // Reject malformed ICU rather than delivering a formatter error to the UI.
    try { parse(translated); } catch { throw new TranslationFailure("icu_invalid"); }
    return translated;
  },
  ["google-icu-message-v1"],
  { revalidate: false, tags: ["google-translations"] },
);

export async function translateInterfaceMessage(source: string, locale: Locale): Promise<string> {
  if (locale === "en" || !source.trim()) return source;
  if (!isGoogleTranslationConfigured()) throw new Error("Translation not configured");
  return cachedMessage(source, locale, process.env.GOOGLE_TRANSLATE_CACHE_VERSION || "1");
}

// The checked-in messages/<locale>.json files come first: they cost nothing
// and may hold hand corrections. Google only fills keys those files lack.
const loadStaticMessages = cache(async (locale: Locale): Promise<MessageValue> => {
  if (locale === "en") return {};
  try { return (await import(`../../../messages/${locale}.json`)).default as MessageValue; }
  catch { return {}; }
});

function childOf(value: MessageValue | undefined, key: string): MessageValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value[key] : undefined;
}

/** The hand/pre-translated value for a dotted key, if the static file has one. */
export async function staticInterfaceMessage(key: string, locale: Locale): Promise<string | null> {
  let node: MessageValue | undefined = await loadStaticMessages(locale);
  for (const part of key.split(".")) node = childOf(node, part);
  return typeof node === "string" && node.trim() ? node : null;
}

/** English overlaid with the static file only — no Google calls. */
function overlayStatic(source: MessageValue, translated: MessageValue | undefined): TranslationResult {
  if (typeof source === "string") {
    return typeof translated === "string" && translated.trim()
      ? { value: translated, complete: true, translated: translated !== source }
      : { value: source, complete: false, translated: false };
  }
  if (Array.isArray(source)) {
    return Array.isArray(translated)
      ? { value: translated, complete: true, translated: true }
      : { value: source, complete: false, translated: false };
  }
  if (!source || typeof source !== "object") return { value: source, complete: true, translated: false };
  const entries = Object.entries(source).map(([key, child]) => [key, overlayStatic(child, childOf(translated, key))] as const);
  return {
    value: Object.fromEntries(entries.map(([key, child]) => [key, child.value])),
    complete: entries.every(([, child]) => child.complete),
    translated: entries.some(([, child]) => child.translated),
  };
}

async function translateTree(value: MessageValue, locale: Locale, existing?: MessageValue): Promise<TranslationResult> {
  if (typeof value === "string" && typeof existing === "string" && existing.trim()) {
    return { value: existing, complete: true, translated: existing !== value };
  }
  // A translated list is taken whole, as the old loader did: a half-translated
  // list reads worse than either version.
  if (Array.isArray(value) && Array.isArray(existing)) return { value: existing, complete: true, translated: true };
  if (typeof value === "string") {
    try {
      const translated = await translateInterfaceMessage(value, locale);
      return { value: translated, complete: true, translated: translated !== value };
    } catch (error) {
      const reason = error instanceof TranslationFailure ? error.reason : "unknown";
      return { value, complete: false, translated: false, failures: { [reason]: 1 } };
    }
  }
  if (!value || typeof value !== "object") return { value, complete: true, translated: false };
  const entries = await Promise.all(Object.entries(value).map(async ([key, child]) =>
    [key, await translateTree(child, locale, Array.isArray(value) ? undefined : childOf(existing, key))] as const,
  ));
  return {
    value: Array.isArray(value) ? entries.map(([, child]) => child.value)
      : Object.fromEntries(entries.map(([key, child]) => [key, child.value])),
    complete: entries.every(([, child]) => child.complete),
    translated: entries.some(([, child]) => child.translated),
    failures: mergeFailures(entries.map(([, child]) => child)),
  };
}

class IncompleteNamespace extends Error {
  constructor(readonly result: TranslationResult) { super("Translation namespace incomplete"); }
}

// Complete namespace caching avoids thousands of per-string cache reads on
// every request. Partial output can be displayed but never permanently cached.
const cachedNamespace = unstable_cache(
  // The static namespace is an argument, so editing messages/<locale>.json
  // changes the cache key and the edit shows without a manual cache bump.
  async (source: MessageValue, existing: MessageValue | undefined, locale: Locale, revision: string) => {
    void revision;
    const result = await translateTree(source, locale, existing);
    if (!result.complete) throw new IncompleteNamespace(result);
    return result;
  },
  ["google-message-namespace-v2"],
  { revalidate: false, tags: ["google-translations"] },
);

export const getInterfaceCatalogue = cache(async (locale: Locale) => {
  if (locale === "en") return { messages: englishMessages, translated: false, complete: true };
  const existing = await loadStaticMessages(locale);
  if (!isGoogleTranslationConfigured()) {
    // No key: exactly the pre-Google behaviour — static file over English.
    const result = overlayStatic(englishMessages as MessageValue, existing);
    return { messages: result.value as typeof english, translated: result.translated, complete: result.complete };
  }
  const entries = await Promise.all(Object.entries(englishMessages).map(async ([key, source]) => {
    const staticNamespace = childOf(existing, key);
    // Fully covered by the static file: no Google, no cache lookup.
    const covered = overlayStatic(source as MessageValue, staticNamespace);
    if (covered.complete) return [key, covered] as const;
    try {
      return [key, await cachedNamespace(source, staticNamespace, locale, process.env.GOOGLE_TRANSLATE_CACHE_VERSION || "1")] as const;
    } catch (error) {
      const result = error instanceof IncompleteNamespace ? error.result : covered;
      return [key, result] as const;
    }
  }));
  const complete = entries.every(([, result]) => result.complete);
  if (!complete) {
    // Section names and counts only — no message text.
    const sections = entries.filter(([, r]) => !r.complete)
      .map(([key, r]) => `${key}(${Object.entries(r.failures ?? { no_reason_recorded: 1 }).map(([k, n]) => `${k}:${n}`).join(",")})`);
    console.warn(`[translation] Interface catalogue incomplete; some messages remain English. Warm the cache before release. locale=${locale} sections=${sections.join(" ")}`);
  }
  return {
    messages: Object.fromEntries(entries.map(([key, result]) => [key, result.value])) as typeof english,
    translated: entries.some(([, result]) => result.translated), complete,
  };
});
