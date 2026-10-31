/**
 * Makes a stored media link loadable from the browser.
 *
 * The server sends absolute links (signed S3 links, or `http://localhost:8080/local-uploads/…`
 * in local storage mode). Two cases broke images on the page:
 *  - a relative `/local-uploads/…` path resolved against the frontend origin (port 3000) and 404'd;
 *  - a `localhost:8080` link opened from another host (a phone on the LAN, or staging) points at
 *    the viewer's own machine.
 * Both are rewritten onto NEXT_PUBLIC_API_URL. Anything else (signed S3, data:, blob:) is untouched.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  if (/^(data:|blob:)/i.test(u)) return u;
  if (u.startsWith("/local-uploads/")) return `${API_BASE}${u}`;
  const local = u.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/local-uploads\/.*)$/i);
  if (local && !/^https?:\/\/(?:localhost|127\.0\.0\.1)/i.test(API_BASE)) return `${API_BASE}${local[1]}`;
  return u;
}

/** Image links only (video items are not shown as <img>), resolved and de-duplicated. */
export function imageUrlsOf(media?: { mediaUrl?: string | null; mediaType?: string | null }[] | null): string[] {
  const out: string[] = [];
  for (const m of media ?? []) {
    if ((m.mediaType ?? "IMAGE").toUpperCase() === "VIDEO") continue;
    const r = resolveMediaUrl(m.mediaUrl);
    if (r && !out.includes(r)) out.push(r);
  }
  return out;
}
