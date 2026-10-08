"use server";

import { Country, State, City } from "country-state-city";
import { parseCity } from "@/features/item-listing-wizard/wizardLocation";

export async function getCountries() {
  return Country.getAllCountries().map((c) => ({
    value: c.isoCode,
    label: c.name,
  }));
}

export async function getStates(countryIso: string) {
  if (!countryIso) return [];
  return State.getStatesOfCountry(countryIso).map((s) => ({
    value: s.isoCode,
    label: s.name,
  }));
}

export async function getCities(countryIso: string, stateIso: string) {
  if (!countryIso || !stateIso) return [];
  return City.getCitiesOfState(countryIso, stateIso).map((c) => ({
    value: c.name,
    label: c.name,
  }));
}

export async function getDialCodes() {
  return Country.getAllCountries()
    .filter((c) => c.phonecode)
    .map((c) => ({
      value: c.isoCode,
      label: `${c.name} (+${c.phonecode.replace(/^\+/, "")})`,
      prefix: c.flag ?? "",
      phonecode: c.phonecode.replace(/^\+/, ""),
    }));
}

/** Why a reverse-geocode did not produce an address. */
export type GeocodeFailure = "refused" | "rate-limited" | "no-address" | "network";

export type GeocodeResult =
  | { ok: true; address: Record<string, string>; raw: unknown }
  | { ok: false; reason: GeocodeFailure };

/**
 * Reverse-geocodes coordinates via Nominatim.
 *
 * <p><b>The User-Agent is required, not decorative.</b> This runs in a server
 * action, so the request leaves from Node, which sends no meaningful User-Agent
 * and no Referer. Nominatim's usage policy requires a User-Agent identifying the
 * application and blocks requests without one — which is why the same URL works
 * pasted into a browser and fails from here.
 *
 * <p>It also returns a *reason* rather than a bare `null`. The previous version
 * did `catch { return null }`, collapsing "the service refused us", "we were
 * rate limited", "the network died" and "there is genuinely no address at these
 * coordinates" into one indistinguishable value, and logged nothing — so a
 * failure was undiagnosable from either the browser console or the server.
 */
export async function detectLocationFromServer(lat: number, lng: number): Promise<GeocodeResult> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}` +
    `&format=json&accept-language=en&addressdetails=1&email=support%40causekind.com`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "CauseKind/1.0 (+https://causekind.com; support@causekind.com)",
        "Accept": "application/json",
      },
      // Nominatim can be slow; without this a stall leaves the caller's spinner
      // running with no way out.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[geocode] Nominatim returned ${res.status} ${res.statusText}`);
      return { ok: false, reason: res.status === 429 ? "rate-limited" : "refused" };
    }

    const data = await res.json();
    if (!data?.address) {
      // HTTP 200 with {"error":"Unable to geocode"} — a real answer meaning
      // there is nothing mapped at that point, not a service failure.
      console.warn("[geocode] Nominatim returned no address for", lat, lng);
      return { ok: false, reason: "no-address" };
    }

    return { ok: true, address: data.address as Record<string, string>, raw: data };
  } catch (err) {
    console.warn("[geocode] request failed:", err instanceof Error ? err.message : err);
    return { ok: false, reason: "network" };
  }
}

/**
 * Forward-geocodes a typed address via Nominatim — the fallback when the map
 * cannot load, so a listing still gets approximate coordinates. Same
 * User-Agent rule and failure reasons as {@link detectLocationFromServer};
 * callers debounce it (Nominatim allows about one request a second).
 */
export async function geocodeAddressFromServer(query: {
  postalcode?: string; city?: string; state?: string; countryCode?: string;
}): Promise<{ ok: true; lat: number; lng: number } | { ok: false; reason: GeocodeFailure }> {
  const params = new URLSearchParams({ format: "json", limit: "1", email: "support@causekind.com" });
  if (query.postalcode) params.set("postalcode", query.postalcode);
  if (query.city) params.set("city", query.city);
  if (query.state) params.set("state", query.state);
  if (query.countryCode) params.set("countrycodes", query.countryCode.toLowerCase());
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": "CauseKind/1.0 (+https://causekind.com; support@causekind.com)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[geocode] Nominatim search returned ${res.status} ${res.statusText}`);
      return { ok: false, reason: res.status === 429 ? "rate-limited" : "refused" };
    }
    const rows = (await res.json()) as { lat: string; lon: string }[];
    const first = rows?.[0];
    if (!first) return { ok: false, reason: "no-address" };
    return { ok: true, lat: Number(first.lat), lng: Number(first.lon) };
  } catch (err) {
    console.warn("[geocode] search failed:", err instanceof Error ? err.message : err);
    return { ok: false, reason: "network" };
  }
}

// Strip common administrative suffixes before comparing
function normCity(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+(city|district|taluka|tehsil|nagar|municipality|municipal corporation|corp\.?|cantt\.?|cantonment|ward|area|mc)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function resolveLocationFromGPS(countryCode: string, stateName: string, cityName: string) {
  let stateIso = "";
  let cityValue = "";

  if (!countryCode) return { stateIso, cityValue };

  const states = State.getStatesOfCountry(countryCode);
  const sNorm = (stateName ?? "").toLowerCase();

  // State: exact → library-includes-gps → gps-includes-library
  const matchedState =
    states.find((s) => s.name.toLowerCase() === sNorm) ||
    states.find((s) => s.name.toLowerCase().includes(sNorm) && sNorm.length > 2) ||
    states.find((s) => sNorm.includes(s.name.toLowerCase()) && s.name.length > 2);

  if (matchedState) {
    stateIso = matchedState.isoCode;

    if (cityName) {
      const cities = City.getCitiesOfState(countryCode, matchedState.isoCode);
      const gNorm = normCity(cityName);

      const matchedCity =
        // 1. exact match
        cities.find((c) => c.name.toLowerCase() === cityName.toLowerCase()) ||
        // 2. normalized exact
        cities.find((c) => normCity(c.name) === gNorm) ||
        // 3. library name contained in GPS name  (e.g. GPS="Pune City" lib="Pune")
        cities.find((c) => normCity(c.name).length > 3 && gNorm.includes(normCity(c.name))) ||
        // 4. GPS name contained in library name  (e.g. GPS="Navi" lib="Navi Mumbai")
        cities.find((c) => gNorm.length > 3 && normCity(c.name).includes(gNorm));

      if (matchedCity) cityValue = matchedCity.name;
    }
  }

  return { stateIso, cityValue };
}

/**
 * Approximate centre of a profile's city, for where a map should *start* when
 * the user has no saved coordinates. Never used as a pin or for matching.
 *
 * <p>The profile stores `"City, StateIso, CountryIso"` (older profiles: free
 * text such as `"Pune"`, read as an Indian city). The city list this app
 * already uses carries coordinates, so most lookups need no network; a city
 * missing from the list is geocoded through Nominatim, and when the city
 * cannot be placed at all the state's centre is used instead.
 */
export async function profileCityCenterFromServer(
  raw: string | null,
): Promise<{ lat: number; lng: number; level: "city" | "state" } | null> {
  const parsed = parseCity(raw);
  if (!parsed.city && !parsed.stateIso) return null;
  const countryIso = parsed.countryIso || "IN";
  const point = (o: { latitude?: string | null; longitude?: string | null } | undefined) => {
    const lat = Number(o?.latitude), lng = Number(o?.longitude);
    return o?.latitude && o?.longitude && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  };

  if (parsed.city) {
    const wanted = normCity(parsed.city);
    const listed = (parsed.stateIso ? City.getCitiesOfState(countryIso, parsed.stateIso) : City.getCitiesOfCountry(countryIso)) ?? [];
    const hit = point(listed.find((c) => c.name.toLowerCase() === parsed.city.toLowerCase()) ?? listed.find((c) => normCity(c.name) === wanted));
    if (hit) return { ...hit, level: "city" };

    const stateName = parsed.stateIso ? State.getStateByCodeAndCountry(parsed.stateIso, countryIso)?.name ?? "" : "";
    const geo = await geocodeAddressFromServer({ city: parsed.city, state: stateName, countryCode: countryIso });
    if (geo.ok) return { lat: geo.lat, lng: geo.lng, level: "city" };
  }

  const state = parsed.stateIso ? point(State.getStateByCodeAndCountry(parsed.stateIso, countryIso) ?? undefined) : null;
  return state ? { ...state, level: "state" } : null;
}
