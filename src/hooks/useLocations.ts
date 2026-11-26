import { useState, useEffect } from "react";
import { getCountries, getStates, getCities, getDialCodes } from "@/app/[locale]/actions/locations";
import type { SelectOption } from "@/components/profile/SearchableSelect";

export function useLocations(countryIso: string, stateIso: string) {
  const [countries, setCountries] = useState<SelectOption[]>([]);
  const [states, setStates] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);
  const [dialCodes, setDialCodes] = useState<(SelectOption & { phonecode?: string })[]>([]);
  const [dialCodesLoading, setDialCodesLoading] = useState(true);

  useEffect(() => {
    // A failed server action (e.g. an empty response under load) must not crash the page.
    getCountries().then(setCountries).catch(() => setCountries([]));
    let active = true;
    getDialCodes()
      .then((codes) => { if (active) setDialCodes(codes); })
      .catch(() => { if (active) setDialCodes([]); })
      .finally(() => { if (active) setDialCodesLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (countryIso) {
      getStates(countryIso).then(setStates).catch(() => setStates([]));
    } else {
      setStates([]);
    }
  }, [countryIso]);

  useEffect(() => {
    if (countryIso && stateIso) {
      getCities(countryIso, stateIso).then(setCities).catch(() => setCities([]));
    } else {
      setCities([]);
    }
  }, [countryIso, stateIso]);

  return { countries, states, cities, dialCodes, dialCodesLoading };
}
