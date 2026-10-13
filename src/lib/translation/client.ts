"use client";

import { locales, type Locale } from "@/i18n/config";
import { splitTranslationText } from "./text";

type PendingText = { text: string; resolve: (value: string) => void; reject: (error: Error) => void };
const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();
const queues = new Map<string, PendingText[]>();
const PREFIX = "ck-google-translation:v2:";
let pausedUntil = 0;

function remember(key: string, text: string) {
  if (cache.size >= 2_000) cache.delete(cache.keys().next().value!);
  cache.set(key, text);
}

async function flush(target: string) {
  const pending = queues.get(target)!;
  try {
    while (pending.length) {
      const batch: PendingText[] = [];
      let size = 0;
      while (pending.length && batch.length < 32 && size + pending[0].text.length <= 20_000) {
        const item = pending.shift()!;
        batch.push(item);
        size += item.text.length;
      }
      try {
        if (Date.now() < pausedUntil) throw new Error("Translation unavailable");
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: batch.map(({ text }) => text), target }),
          signal: AbortSignal.timeout(45_000),
        });
        if (!response.ok) throw new Error("Translation unavailable");
        const data = await response.json();
        if (!Array.isArray(data.results) || data.results.length !== batch.length) throw new Error("Invalid response");
        // A single refused item (e.g. free text over the server's limits) stays
        // original on its own; only a failed request pauses the whole queue.
        batch.forEach((item, index) => {
          const result = data.results[index];
          if (result?.translated === true && typeof result.text === "string") {
            const key = `${PREFIX}${target}:${item.text}`;
            remember(key, result.text);
            try { sessionStorage.setItem(key, result.text); } catch { /* optional browser cache */ }
            item.resolve(result.text);
          } else {
            item.reject(new Error("Translation unavailable"));
          }
        });
      } catch {
        pausedUntil = Date.now() + 30_000;
        batch.forEach((item) => item.reject(new Error("Translation unavailable")));
        pending.splice(0).forEach((item) => item.reject(new Error("Translation unavailable")));
      }
    }
  } finally { queues.delete(target); }
}

async function translateChunk(text: string, target: string): Promise<string> {
  if (!text.trim()) return text;
  const key = `${PREFIX}${target}:${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  try {
    const stored = sessionStorage.getItem(key);
    if (stored !== null) { remember(key, stored); return stored; }
  } catch { /* optional browser cache */ }
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = new Promise<string>((resolve, reject) => {
    const queue = queues.get(target);
    if (queue) queue.push({ text, resolve, reject });
    else {
      queues.set(target, [{ text, resolve, reject }]);
      setTimeout(() => { void flush(target); }, 5);
    }
  });
  inFlight.set(key, promise);
  try { return await promise; }
  finally { inFlight.delete(key); }
}

/** Strict callers can avoid saving original text as a successful translation. */
export async function translateTextStrict(text: string, target: string): Promise<string> {
  if (!text || target === "en") return text;
  if (!locales.includes(target as Locale)) throw new Error("Unsupported language");
  return (await Promise.all(splitTranslationText(text).map(async (chunk) => {
    if (!chunk.trim()) return chunk;
    const leading = chunk.match(/^\s*/)?.[0] ?? "";
    const trailing = chunk.match(/\s*$/)?.[0] ?? "";
    return leading + await translateChunk(chunk.trim(), target) + trailing;
  }))).join("");
}

export async function translateText(text: string, target: string): Promise<string> {
  try { return await translateTextStrict(text, target); }
  catch { return text; }
}
