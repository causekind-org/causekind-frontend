import type { PublicNgoDrive } from "@/lib/api";

export type LatLng = { lat: number; lng: number };

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Straight-line distance in km (haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** The drive's pin, from whichever field the server sends; null when it has none. */
export function drivePin(drive: Partial<Pick<PublicNgoDrive, "latitude" | "longitude" | "locationLatitude" | "locationLongitude">> | null | undefined): LatLng | null {
  if (!drive) return null;
  const lat = finite(drive.latitude) ? drive.latitude : drive.locationLatitude;
  const lng = finite(drive.longitude) ? drive.longitude : drive.locationLongitude;
  return finite(lat) && finite(lng) ? { lat, lng } : null;
}

export type RadiusCheck = { inside: boolean; distanceKm: number; radiusKm: number };

/**
 * Whether the donor's pin is inside the drive's pickup radius. Null when the donor has no
 * location yet, the drive has no pin, or the drive has no radius: then nothing is shown.
 */
export function pickupRadiusCheck(donor: { latitude?: number | null; longitude?: number | null } | null | undefined,
  pin: LatLng | null, radiusKm: number | null | undefined): RadiusCheck | null {
  if (!donor || !finite(donor.latitude) || !finite(donor.longitude) || !pin || !finite(radiusKm) || radiusKm <= 0) return null;
  const distanceKm = haversineKm({ lat: donor.latitude, lng: donor.longitude }, pin);
  return { inside: distanceKm <= radiusKm, distanceKm, radiusKm };
}

/** "3.2" under 10 km, whole km above. */
export function formatKm(km: number): string {
  return km < 10 ? (Math.round(km * 10) / 10).toString() : Math.round(km).toString();
}

export function insideRadiusText(c: RadiusCheck): string {
  return `You are within the NGO's pickup radius (${formatKm(c.distanceKm)} km away). The NGO can pick up your items.`;
}

export function outsideRadiusText(c: RadiusCheck): string {
  return `You are ${formatKm(c.distanceKm)} km away, outside this NGO's pickup radius of ${formatKm(c.radiusKm)} km. You will need to drop the items off at the NGO's address yourself. The NGO will not pick them up.`;
}
