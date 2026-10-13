import "server-only";

import { unstable_cache } from "next/cache";
import { locales, type Locale } from "@/i18n/config";
import { TRANSLATION_CHUNK_LENGTH } from "./text";

export const MAX_TRANSLATION_TEXT_LENGTH = TRANSLATION_CHUNK_LENGTH;
export const MAX_TRANSLATION_BATCH_SIZE = 32;
export const MAX_TRANSLATION_REQUEST_LENGTH = 20_000;

export function isTranslationLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function isGoogleTranslationConfigured(): boolean {
  return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY?.trim());
}

type PendingText = {
  text: string;
  expires: number;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
};
type Queue = { target: string; source: string; items: PendingText[] };
const queues = new Map<string, Queue>();
const inFlight = new Map<string, Promise<string>>();
let activeBatches = 0;
let pausedUntil = 0;
let budgetDay = "";
let usedCharacters = 0;

// Per-process backstop only. Configure Google project-wide quotas as well.
function reserveBudget(characters: number) {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== budgetDay) { budgetDay = day; usedCharacters = 0; }
  const configured = Number(process.env.GOOGLE_TRANSLATE_MAX_CHARACTERS_PER_DAY ?? 100_000);
  const limit = Number.isSafeInteger(configured) && configured > 0 ? configured : 100_000;
  if (usedCharacters + characters > limit) throw new Error("Translation budget exhausted");
  usedCharacters += characters;
}

export function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, entity: string) => {
    if (!entity.startsWith("#")) return named[entity.toLowerCase()] ?? whole;
    const point = entity[1].toLowerCase() === "x"
      ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
      ? String.fromCodePoint(point) : whole;
  });
}

async function sendBatch(batch: PendingText[], target: string, source: string) {
  try {
    reserveBudget(batch.reduce((total, item) => total + item.text.length, 0));
    const response = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_TRANSLATE_API_KEY!.trim(),
      },
      body: JSON.stringify({ q: batch.map(({ text }) => text), target, format: "text",
        ...(source === "auto" ? {} : { source }) }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Translation provider unavailable");
    const data = await response.json();
    const translations: unknown = data?.data?.translations;
    if (!Array.isArray(translations) || translations.length !== batch.length ||
        translations.some((item) => typeof item?.translatedText !== "string" || !item.translatedText.trim())) {
      throw new Error("Invalid translation response");
    }
    batch.forEach((item, index) => item.resolve(decodeEntities(translations[index].translatedText)));
  } catch {
    // No provider body, source text or secret is logged. A short circuit breaker
    // prevents thousands of catalogue misses retrying an unavailable provider.
    pausedUntil = Date.now() + 30_000;
    batch.forEach((item) => item.reject(new Error("Google translation unavailable")));
    console.warn("[translation] Google request failed; using original content.");
  }
}

function pump() {
  if (Date.now() < pausedUntil) {
    for (const queue of queues.values()) {
      queue.items.forEach((item) => item.reject(new Error("Translation temporarily unavailable")));
    }
    queues.clear();
    return;
  }
  while (activeBatches < 4 && queues.size) {
    const [key, queue] = queues.entries().next().value!;
    queues.delete(key);
    const batch: PendingText[] = [];
    let size = 0;
    while (queue.items.length && batch.length < MAX_TRANSLATION_BATCH_SIZE) {
      const item = queue.items[0];
      if (item.expires < Date.now()) {
        queue.items.shift()!.reject(new Error("Translation queue deadline exceeded"));
        continue;
      }
      if (batch.length && size + item.text.length > 4_500) break;
      batch.push(queue.items.shift()!);
      size += item.text.length;
    }
    if (queue.items.length) queues.set(key, queue); // rotate languages fairly
    if (!batch.length) continue;
    activeBatches++;
    void sendBatch(batch, queue.target, queue.source).finally(() => { activeBatches--; pump(); });
  }
}

function enqueue(text: string, target: string, source: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const key = `${source}:${target}`;
    const queue = queues.get(key) ?? { target, source, items: [] };
    queue.items.push({ text, resolve, reject, expires: Date.now() + 15_000 });
    queues.set(key, queue);
    setTimeout(pump, 5);
  });
}

// Only successful results enter persistent storage. Fallback stays outside.
const cachedTranslation = unstable_cache(
  async (text: string, target: string, source: string, revision: string) => {
    void revision;
    return enqueue(text, target, source);
  },
  ["google-translation-v1"],
  { revalidate: false, tags: ["google-translations"] },
);

// Free text (anything not shipped with the site) expires so junk cannot pile up.
const FREE_TEXT_CACHE_SECONDS = 7 * 24 * 60 * 60;
const cachedFreeTextTranslation = unstable_cache(
  async (text: string, target: string, source: string, revision: string) => {
    void revision;
    return enqueue(text, target, source);
  },
  ["google-translation-free-v1"],
  { revalidate: FREE_TEXT_CACHE_SECONDS, tags: ["google-translations"] },
);

export async function translateWithGoogle(
  text: string, target: Locale, source: "auto" | "en" = "auto", persistence: "permanent" | "temporary" = "permanent",
): Promise<string> {
  if (!isTranslationLocale(target)) throw new Error("Unsupported translation language");
  if (!text.trim() || source === target) return text;
  if (text.length > MAX_TRANSLATION_TEXT_LENGTH) throw new Error("Translation text too long");
  if (!isGoogleTranslationConfigured()) throw new Error("Google translation is not configured");
  const revision = process.env.GOOGLE_TRANSLATE_CACHE_VERSION || "1";
  const key = JSON.stringify([text, target, source, revision, persistence]);
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = (persistence === "permanent" ? cachedTranslation : cachedFreeTextTranslation)(text, target, source, revision);
  inFlight.set(key, promise);
  try { return await promise; }
  finally { inFlight.delete(key); }
}
