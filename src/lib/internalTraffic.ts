/**
 * Shared by every non-essential tracker (Meta Pixel, GTM, ...): set by
 * proxy.ts for requests from an allowlisted internal/office IP
 * (INTERNAL_TRAFFIC_IPS). Team traffic must never register as real
 * visitor/donor activity in ad or analytics data.
 */
const INTERNAL_TRAFFIC_COOKIE = "ck_internal_traffic";

export function isInternalTraffic(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c === `${INTERNAL_TRAFFIC_COOKIE}=1`);
}

/** Staff paths: anyone opening these is team, not a visitor. */
export const STAFF_PATH = /^(\/[a-z]{2})?\/(admin|super-admin)(\/|$)/;

/**
 * Marks this browser as internal for a year (same cookie proxy.ts sets) and
 * switches off trackers already loaded in this tab, so a staff member who
 * came in through a public page stops being counted from here on.
 */
export function markInternalTraffic(gaId?: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${INTERNAL_TRAFFIC_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.dispatchEvent(new Event("ck:internal-traffic"));
  const w = window as unknown as Record<string, unknown>;
  if (gaId) w[`ga-disable-${gaId}`] = true;
  try { (w.clarity as ((...a: unknown[]) => void) | undefined)?.("stop"); } catch {}
  try { (w.fbq as ((...a: unknown[]) => void) | undefined)?.("consent", "revoke"); } catch {}
}
