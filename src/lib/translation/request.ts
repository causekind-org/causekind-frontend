import "server-only";

import { NextRequest } from "next/server";
import { isGoogleTranslationConfigured } from "./server";

export const translationResponseHeaders = { "Cache-Control": "no-store" };

type Window = { count: number; expires: number };
const clients = new Map<string, Window>();
const freeTextClients = new Map<string, Window>();

/** Free text = anything not shipped with the site (need titles, user content). */
// Items match the browser's 32-string batch: a lower cap silently left most of
// the landing page English (only the first strings — the hero — got through).
// The Google Cloud daily quota is the real spending cap; these are backstops.
export const MAX_FREE_TEXT_ITEMS = 32;
export const MAX_FREE_TEXT_LENGTH = 1_000;
// AutoPageTranslator sends every page's leftover English, not just the landing.
const FREE_TEXT_REQUESTS_PER_MINUTE = 60;
const REQUESTS_PER_MINUTE = 120;

function clientKey(request: NextRequest): string {
  // Hosting must overwrite this header. This is only a per-instance backstop.
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

/** True when the caller is still within `limit` requests this minute. */
function take(windows: Map<string, Window>, key: string, limit: number): boolean {
  const now = Date.now();
  for (const [k, value] of windows) if (value.expires <= now) windows.delete(k);
  const entry = windows.get(key);
  if (entry) return ++entry.count <= limit;
  if (windows.size >= 10_000) return false;
  windows.set(key, { count: 1, expires: now + 60_000 });
  return true;
}

/** Called only when a request carries free text, on top of the general limit. */
export function takeFreeTextAllowance(request: NextRequest): boolean {
  return take(freeTextClients, clientKey(request), FREE_TEXT_REQUESTS_PER_MINUTE);
}

/**
 * Compare the Origin with the host the browser actually addressed, not with
 * `nextUrl.origin`: `next dev -H 0.0.0.0` reports 0.0.0.0:3000 there while the
 * browser sends localhost:3000, which made every landing-page translation 403.
 */
function isSameHostOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() || request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host.toLowerCase(); }
  catch { return false; }
}

export function guardTranslationRequest(request: NextRequest): Response | null {
  const headers = translationResponseHeaders;
  // Browsers always send Sec-Fetch-Site on fetch(); scripts can fake both
  // headers, so this stops casual abuse only. Google's project quota is the
  // real spending cap — see docs/google-translation.md.
  if (!isSameHostOrigin(request) || request.headers.get("sec-fetch-site") !== "same-origin") {
    return Response.json({ error: "Origin not allowed" }, { status: 403, headers });
  }
  if (!take(clients, clientKey(request), REQUESTS_PER_MINUTE)) {
    return Response.json({ error: "Too many translation requests" }, {
      status: 429, headers: { ...headers, "Retry-After": "60" },
    });
  }
  if (!isGoogleTranslationConfigured()) {
    return Response.json({ error: "Translation is not configured" }, { status: 503, headers });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "JSON required" }, { status: 415, headers });
  }
  return null;
}

export async function readTranslationBody(request: NextRequest): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  let body = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 128_000) { await reader.cancel(); throw new Error("Request too large"); }
      body += decoder.decode(value, { stream: true });
    }
    return JSON.parse(body + decoder.decode());
  } finally { reader.releaseLock(); }
}
