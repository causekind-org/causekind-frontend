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

export async function detectLocationFromServer(lat: number, lng: number) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data;
  } catch (err) {
    return null;
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
