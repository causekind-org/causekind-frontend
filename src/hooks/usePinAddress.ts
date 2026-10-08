"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectLocationFromServer, geocodeAddressFromServer, resolveLocationFromGPS } from "@/app/actions/locations";

/** What a map pin turned into. Fields the lookup had nothing for are absent. */
export type PinAddress = {
  countryIso?: string;
  /** ISO code from the country-state-city list, when the state was recognised. */
  stateIso?: string;
  /** The city as named by the lookup. */
  city?: string;
  /** True when `city` is a value from the state's city list (else free text). */
  cityListed?: boolean;
  locality?: string;
  pincode?: string;
};

export type LookupState = { running: boolean; error: string | null };

/**
 * Turns map pins into addresses, and (when there is no map) typed addresses
 * into coordinates. Shared by "List an item", "Request Support" and the
 * profile "Set on map", so they fill the same fields the same way.
 *
 * <p>Reverse lookups go through the existing server action (Nominatim, with the
 * User-Agent its policy requires), debounced to one per second of quiet — the
 * policy's rate — and sequence-guarded so a slow answer for an old pin never
 * overwrites a newer one.
 */
export function usePinAddress() {
  const [state, setState] = useState<LookupState>({ running: false, error: null });
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /** Look up the address at a pin; `onFound` gets whatever was found. */
  const lookup = useCallback((lat: number, lng: number, onFound: (a: PinAddress) => void) => {
    const mine = ++seq.current;
    if (timer.current) clearTimeout(timer.current);
    setState({ running: true, error: null });
    timer.current = setTimeout(async () => {
      try {
        const geo = await detectLocationFromServer(lat, lng);
        if (mine !== seq.current) return;
        if (!geo.ok) {
          setState({
            running: false,
            error: geo.reason === "no-address"
              ? "We couldn't find an address at that spot — please fill in the fields below."
              : "The address lookup is unavailable right now — please fill in the fields below.",
          });
          return;
        }
        const a = geo.address;
        const countryIso = (a.country_code ?? "").toUpperCase();
        const cityName = a.city ?? a.town ?? a.village ?? a.state_district ?? "";
        const { stateIso, cityValue } = await resolveLocationFromGPS(countryIso, a.state ?? "", cityName);
        if (mine !== seq.current) return;
        onFound({
          countryIso: countryIso || undefined,
          stateIso: stateIso || undefined,
          city: cityValue || cityName || undefined,
          cityListed: !!cityValue,
          locality: a.suburb ?? a.neighbourhood ?? a.quarter ?? a.residential ?? a.city_district ?? undefined,
          pincode: a.postcode ? a.postcode.replace(/\s/g, "") : undefined,
        });
        setState({ running: false, error: null });
      } catch {
        if (mine === seq.current) setState({ running: false, error: "We couldn't turn that spot into an address — please fill in the fields below." });
      }
    }, 1000);
  }, []);

  /**
   * No map: coordinates for a typed address, or `fallback` (the profile
   * location) when the address cannot be placed. Null when there is neither.
   */
  const geocodeTyped = useCallback(async (
    q: { postalcode: string; city: string; state: string; countryCode: string },
    fallback: { lat: number; lng: number } | null,
  ): Promise<{ lat: number; lng: number } | null> => {
    if (!q.city && !q.postalcode) return null;
    const mine = ++seq.current;
    setState({ running: true, error: null });
    const geo = await geocodeAddressFromServer(q);
    if (mine !== seq.current) return null;
    const coords = geo.ok ? { lat: geo.lat, lng: geo.lng } : fallback;
    setState({
      running: false,
      error: geo.ok ? null : coords
        ? "We couldn't place that exact address, so we'll use your profile location."
        : "We couldn't place that address — check the city and PIN code.",
    });
    return coords;
  }, []);

  return { ...state, lookup, geocodeTyped };
}
