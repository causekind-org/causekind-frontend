import { useCallback, type MutableRefObject } from "react";
import { usePinAddress } from "@/hooks/usePinAddress";

/** The address + pin fields the "Where is…?" location step edits. */
export type LocationFields = {
  countryIso: string;
  stateIso: string;
  city: string;
  locality: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
};

type LatLng = { lat: number; lng: number };

/**
 * The location step's map pin → address handlers, shared by every form that
 * shows the step (the item listing wizard, the NGO drive form, the drive give
 * form). The pin is the source of truth for coordinates; the address fields
 * follow it. A lookup value replaces a field; a field the lookup has nothing for
 * is cleared (new spot) or left as typed (`onlyEmpty`: pins we placed ourselves,
 * which never overwrite). Typing an address moves the pin to it.
 *
 * <p>The form keeps its own state: `modelRef` always holds the latest model,
 * `commit` stores a new model (state + autosave), `clearPinError` drops the
 * pin's error once a pin is placed.
 */
export function useLocationPinHandlers<M extends LocationFields>({ modelRef, commit, clearPinError, profileCenter }: {
  modelRef: MutableRefObject<M>;
  commit: (next: M) => void;
  clearPinError: () => void;
  profileCenter: LatLng | null;
}) {
  const pinAddress = usePinAddress();
  const { lookup: lookupPin, geocodeTyped } = pinAddress;
  const lookup = { running: pinAddress.running, error: pinAddress.error, whenIdle: pinAddress.whenIdle };

  const handlePin = useCallback((lat: number, lng: number, opts?: { onlyEmpty?: boolean }) => {
    const placed = { ...modelRef.current, latitude: lat, longitude: lng };
    modelRef.current = placed;
    commit(placed);
    clearPinError();
    lookupPin(lat, lng, found => {
      const prev = modelRef.current;
      const next = { ...prev };
      const fields = {
        countryIso: found.countryIso, stateIso: found.stateIso, city: found.city,
        locality: found.locality, pincode: found.pincode,
      } as const;
      (Object.keys(fields) as (keyof typeof fields)[]).forEach(k => {
        const v = fields[k];
        // Filling the blanks of a resumed draft: never touch what is there.
        if (opts?.onlyEmpty) { if (v && !String(prev[k] ?? "").trim()) next[k] = v as M[typeof k]; return; }
        // A new spot: a field the lookup could not find is cleared, never left
        // describing the previous spot.
        next[k] = (v ?? "") as M[typeof k];
      });
      modelRef.current = next;
      commit(next);
    }, () => {
      // Nothing found at the new spot: the old address no longer applies.
      if (opts?.onlyEmpty) return;
      const next = { ...modelRef.current, countryIso: "", stateIso: "", city: "", locality: "", pincode: "" };
      modelRef.current = next;
      commit(next);
    });
  }, [modelRef, commit, clearPinError, lookupPin]);

  /**
   * The person typed an address: move the pin to it. Only with no map does an
   * address that can't be placed fall back to the profile location; with a map
   * the pin stays where it is and the person places it.
   */
  const handleGeocodeTyped = useCallback(async (q: { postalcode: string; city: string; state: string; countryCode: string }, useProfileFallback: boolean) => {
    const coords = await geocodeTyped(q, useProfileFallback ? profileCenter : null);
    if (!coords) return false;
    const next = { ...modelRef.current, latitude: coords.lat, longitude: coords.lng };
    modelRef.current = next;
    commit(next);
    clearPinError();
    return true;
  }, [geocodeTyped, profileCenter, modelRef, commit, clearPinError]);

  return { lookup, handlePin, handleGeocodeTyped };
}
