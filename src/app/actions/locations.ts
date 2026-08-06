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
