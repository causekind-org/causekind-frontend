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

export async function resolveLocationFromGPS(countryCode: string, stateName: string, cityName: string) {
  let stateIso = "";
  let cityValue = "";
  if (countryCode) {
    const states = State.getStatesOfCountry(countryCode);
    const matchedState = states.find(
      (s) => s.name.toLowerCase() === stateName?.toLowerCase() ||
             s.name.toLowerCase().includes(stateName?.toLowerCase() || "")
    );
    if (matchedState) {
      stateIso = matchedState.isoCode;
      const cities = City.getCitiesOfState(countryCode, matchedState.isoCode);
      const matchedCity = cities.find(
        (c) => c.name.toLowerCase() === cityName?.toLowerCase()
      );
      if (matchedCity) cityValue = matchedCity.name;
    }
  }
  return { stateIso, cityValue };
}
