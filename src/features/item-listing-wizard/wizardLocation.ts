/**
 * The listing API stores location as one flattened string, `"City, StateIso, CountryIso"`
 * (see the payload built in the old items/new page). Encoding and parsing live
 * here so create, edit and draft-hydration cannot disagree about the format —
 * previously each page rebuilt the join inline.
 */

export type LocationParts = {
  countryIso: string;
  stateIso: string;
  city: string;
};

/** `"Pune, MH, IN"`. Empty parts are dropped rather than leaving stray commas. */
export function encodeCity(parts: LocationParts): string {
  return [parts.city, parts.stateIso, parts.countryIso].filter(Boolean).join(", ");
}

/**
 * Best-effort inverse of {@link encodeCity}.
 *
 * <p>Old drafts predate the convention and may hold free text like
 * `"Pune"` or `"Pune, Maharashtra"`. Rather than guess, anything that does not
 * look like `City, XX, XX` is returned as `city` alone with empty ISO codes, so
 * the form shows it verbatim and the donor can correct it. Never throws.
 */
export function parseCity(raw: string | null | undefined): LocationParts {
  const empty: LocationParts = { countryIso: "", stateIso: "", city: "" };
  if (!raw) return empty;

  const segments = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) return empty;

  // ISO codes are 2-3 chars; a state/country *name* will be longer, which is how
  // we tell the modern format from the legacy free text.
  const isIso = (s: string) => /^[A-Za-z0-9]{2,3}$/.test(s);

  if (segments.length >= 3 && isIso(segments[1]) && isIso(segments[2])) {
    return {
      city: segments.slice(0, segments.length - 2).join(", "),
      stateIso: segments[segments.length - 2].toUpperCase(),
      countryIso: segments[segments.length - 1].toUpperCase(),
    };
  }

  return { ...empty, city: segments.join(", ") };
}

/** India is the only country with a fixed-width postal code in this product. */
export function isValidPostalCode(code: string, countryIso: string): boolean {
  const value = code.trim();
  if (!value) return false;
  if (countryIso.toUpperCase() === "IN") return /^\d{6}$/.test(value);
  return /^[A-Za-z0-9 -]{3,10}$/.test(value);
}
