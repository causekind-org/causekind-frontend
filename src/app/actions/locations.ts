"use server";

import { Country, State, City } from "country-state-city";

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
  await nominatimSlot();
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
 * Coordinates for a typed address (country / state / city / PIN).
 *
 * <p>Nominatim's structured search requires EVERY field it is given to match,
 * and our city list carries names OpenStreetMap does not use as cities (e.g.
 * "Mumbai Suburban" is a district there). So PIN 400068 + "Mumbai Suburban" +
 * Maharashtra found nothing, while PIN 400068 alone finds Kandivali East. The
 * query is therefore tried from most to least reliable, stopping at the first
 * hit: the PIN code alone, then city + state, then the same as free text. Same
 * User-Agent rule and failure reasons as {@link detectLocationFromServer}.
 */
export async function geocodeAddressFromServer(query: {
  postalcode?: string; city?: string; state?: string; countryCode?: string;
}): Promise<{ ok: true; lat: number; lng: number } | { ok: false; reason: GeocodeFailure }> {
  const country = query.countryCode?.toLowerCase();
  const attempts: Record<string, string>[] = [];
  if (query.postalcode) attempts.push({ postalcode: query.postalcode });
  if (query.city) {
    attempts.push({ city: query.city, ...(query.state ? { state: query.state } : {}) });
    attempts.push({ q: [query.city, query.state].filter(Boolean).join(", ") });
  }
  let last: GeocodeFailure = "no-address";
  for (const attempt of attempts) {
    const params = new URLSearchParams({ format: "json", limit: "1", email: "support@causekind.com", ...attempt });
    if (country) params.set("countrycodes", country);
    await nominatimSlot();
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
        // Refused or rate-limited: another attempt now would only make it worse.
        return { ok: false, reason: res.status === 429 ? "rate-limited" : "refused" };
      }
      const rows = (await res.json()) as { lat: string; lon: string }[];
      const first = rows?.[0];
      if (first) return { ok: true, lat: Number(first.lat), lng: Number(first.lon) };
      last = "no-address";
    } catch (err) {
      console.warn("[geocode] search failed:", err instanceof Error ? err.message : err);
      last = "network";
    }
  }
  return { ok: false, reason: last };
}

/**
 * Coordinates for a free-text address, as typed into the handover form ("Flat
 * 4, Sai Krupa, Link Road, Kandivali East, Mumbai"). Nominatim rarely knows the
 * building, so on a miss the first comma part is dropped and the rest retried
 * ("Sai Krupa, Link Road, …", then "Link Road, …"), up to three tries, which
 * lands on the street or area instead of failing. India-biased like the rest.
 */
export async function geocodeFreeTextFromServer(
  text: string,
): Promise<{ ok: true; lat: number; lng: number } | { ok: false; reason: GeocodeFailure }> {
  let parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { ok: false, reason: "no-address" };
  let last: GeocodeFailure = "no-address";
  for (let tries = 0; tries < 3 && parts.length > 0; tries++) {
    const params = new URLSearchParams({
      q: parts.join(", ").slice(0, 200), format: "json", limit: "1", countrycodes: "in", email: "support@causekind.com",
    });
    await nominatimSlot();
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          "User-Agent": "CauseKind/1.0 (+https://causekind.com; support@causekind.com)",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { ok: false, reason: res.status === 429 ? "rate-limited" : "refused" };
      const rows = (await res.json()) as { lat: string; lon: string }[];
      if (rows?.[0]) return { ok: true, lat: Number(rows[0].lat), lng: Number(rows[0].lon) };
      last = "no-address";
    } catch (err) {
      console.warn("[geocode] free-text search failed:", err instanceof Error ? err.message : err);
      last = "network";
    }
    // A single part left that matched nothing: nothing shorter to try.
    if (parts.length === 1) break;
    parts = parts.slice(1);
  }
  return { ok: false, reason: last };
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
 * Nominatim's usage policy: at most one request per second. Every call from
 * this module waits for its slot here (per server instance), on top of the
 * debouncing the pickers already do.
 */
let nextNominatimSlot = 0;
async function nominatimSlot() {
  const now = Date.now();
  const at = Math.max(now, nextNominatimSlot);
  nextNominatimSlot = at + 1000;
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}
