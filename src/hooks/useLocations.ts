import { useState, useEffect } from "react";
import { getCountries, getStates, getCities, getDialCodes } from "@/app/actions/locations";
import type { SelectOption } from "@/components/profile/SearchableSelect";

export function useLocations(countryIso: string, stateIso: string) {
  const [countries, setCountries] = useState<SelectOption[]>([]);
  const [states, setStates] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);
  const [dialCodes, setDialCodes] = useState<(SelectOption & { phonecode?: string })[]>([]);

  useEffect(() => {
    getCountries().then(setCountries);
    getDialCodes().then(setDialCodes);
  }, []);

  useEffect(() => {
    if (countryIso) {
      getStates(countryIso).then(setStates);
    } else {
      setStates([]);
    }
  }, [countryIso]);

  useEffect(() => {
    if (countryIso && stateIso) {
      getCities(countryIso, stateIso).then(setCities);
    } else {
      setCities([]);
    }
  }, [countryIso, stateIso]);

  return { countries, states, cities, dialCodes };
}
