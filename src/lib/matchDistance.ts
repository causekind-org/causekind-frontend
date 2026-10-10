import type { ItemMatch } from "@/lib/api";

/**
 * How far a donor's listed item is from the need it was matched to.
 *
 * Mirrors the backend matching engine's resolution order so the dashboard
 * describes the same distance the engine used: the item's / request's own
 * coordinates first, the owner's profile GPS second. When either side has no
 * coordinates at all the engine matched on pincode or city, so we say that
 * instead of inventing a number.
 */

type Pt = { lat: number; lng: number };

const pt = (lat: number | null | undefined, lng: number | null | undefined): Pt | null =>
  lat != null && lng != null ? { lat, lng } : null;

function haversineKm(a: Pt, b: Pt): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

type DistanceFields = Pick<
  ItemMatch,
  | "listingLatitude" | "listingLongitude" | "donorLatitude" | "donorLongitude"
  | "requestLatitude" | "requestLongitude" | "doneeLatitude" | "doneeLongitude"
  | "distanceKm"
>;

/** Straight-line km between item and need, or null when either side has no coordinates. */
export function matchDistanceKm(m: Partial<DistanceFields>): number | null {
  // The server's own measurement — the only one available before acceptance,
  // when exact coordinates are withheld from both sides.
  if (m.distanceKm != null) return m.distanceKm;
  const item = pt(m.listingLatitude, m.listingLongitude) ?? pt(m.donorLatitude, m.donorLongitude);
  const need = pt(m.requestLatitude, m.requestLongitude) ?? pt(m.doneeLatitude, m.doneeLongitude);
  if (!item || !need) return null;
  return haversineKm(item, need);
}

/**
 * A short, privacy-safe proximity label — rounded so it never pinpoints the
 * donee: "Under 1 km away", "~4 km away", "~23 km away". Falls back to the
 * need's city when there are no coordinates to measure.
 */
export function formatMatchProximity(
  m: Partial<DistanceFields> & { requestCity?: string | null; doneeCity?: string | null },
): string | null {
  const km = matchDistanceKm(m);
  if (km != null) {
    if (km < 1) return "Under 1 km away";
    return `~${Math.round(km)} km away`;
  }
  const city = m.requestCity || m.doneeCity;
  return city ? `In ${city}` : null;
}
