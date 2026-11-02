/** Attributes for a link a person typed: new tab, no referrer, no search-engine credit. */
export const EXTERNAL_LINK_REL = "noopener noreferrer nofollow";

/**
 * A typed link as a safe absolute URL: "www.x.com" and "x.com" become https://, http and https
 * pass, and anything else (javascript:, data:, no real host) gives null, so it is never rendered.
 */
export function safeExternalUrl(raw?: string | null): string | null {
  let value = (raw ?? "").trim();
  if (!value || /[\s\u0000-\u001f]/.test(value)) return null;
  if (value.startsWith("//")) value = `https:${value}`;
  const scheme = /^([a-z][a-z0-9+.-]*):(?!\d)/i.exec(value);
  if (!scheme) value = `https://${value}`;
  else if (!/^https?$/i.test(scheme[1]) || !/^[a-z]+:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || !url.hostname.includes(".")) return null;
    return value;
  } catch {
    return null;
  }
}

/** The bare domain to show for a link: "https://www.x.com/a" reads "x.com". */
export function linkDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./i, ""); } catch { return url; }
}
