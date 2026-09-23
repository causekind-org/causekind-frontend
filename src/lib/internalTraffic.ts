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
