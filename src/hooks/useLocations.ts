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
    let cancelled = false;
    setStates([]);
    if (countryIso) {
      getStates(countryIso).then(options => { if (!cancelled) setStates(options); });
    }
    return () => { cancelled = true; };
  }, [countryIso]);

  useEffect(() => {
    let cancelled = false;
    setCities([]);
    if (countryIso && stateIso) {
      getCities(countryIso, stateIso).then(options => { if (!cancelled) setCities(options); });
    }
    return () => { cancelled = true; };
  }, [countryIso, stateIso]);

  return { countries, states, cities, dialCodes };
}
