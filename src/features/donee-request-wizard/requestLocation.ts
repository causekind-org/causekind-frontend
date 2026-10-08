import type { PickedLocation } from "@/components/location/LocationPicker";

export const EMPTY_LOCATION: PickedLocation = {
  countryIso: "", stateIso: "", city: "", locality: "", pincode: "", lat: null, lng: null,
};

/**
 * Requests store their place as one text field (there is no locality column):
 * `"Locality, City, StateIso, CountryIso"`, locality omitted when empty — so
 * without a locality it is the same `"City, StateIso, CountryIso"` older
 * requests already use.
 */
export function encodeRequestCity(loc: Pick<PickedLocation, "locality" | "city" | "stateIso" | "countryIso">): string {
  return [loc.locality.trim(), loc.city.trim(), loc.stateIso, loc.countryIso].filter(Boolean).join(", ");
}

/**
 * Inverse of {@link encodeRequestCity}. Anything that doesn't end in two ISO
 * codes (older free text like "Pune") comes back as the city, unchanged.
 */
export function parseRequestCity(raw: string | null | undefined): Pick<PickedLocation, "locality" | "city" | "stateIso" | "countryIso"> {
  const empty = { locality: "", city: "", stateIso: "", countryIso: "" };
  if (!raw?.trim()) return empty;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const isIso = (p: string) => /^[A-Za-z0-9]{2,3}$/.test(p);
  if (parts.length >= 3 && isIso(parts[parts.length - 1]) && isIso(parts[parts.length - 2])) {
    const head = parts.slice(0, -2);
    return {
      locality: head.length > 1 ? head[0] : "",
      city: head.length > 1 ? head.slice(1).join(", ") : head[0] ?? "",
      stateIso: parts[parts.length - 2].toUpperCase(),
      countryIso: parts[parts.length - 1].toUpperCase(),
    };
  }
  return { ...empty, city: parts.join(", ") };
}
