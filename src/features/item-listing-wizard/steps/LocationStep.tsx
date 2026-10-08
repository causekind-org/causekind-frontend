"use client";

import { LocationPicker, type LocationPickerHandle, type PickedLocation } from "@/components/location/LocationPicker";
import type { MapStart } from "@/hooks/useProfileMapStart";
import type { WizardModel } from "../wizardModel";

type LatLng = { lat: number; lng: number };

/**
 * Step 4 — "Where is the item?". The shared LocationPicker (donor orange):
 * GPS, search, map pin and address fields, kept in sync. The pin is what
 * matching measures the 10 km radius from; with no pin yet it starts on the
 * donor's saved profile coordinates.
 */
export function LocationStep({
  model, errors, profileCenter, mapStart, onChange, controlRef,
}: {
  model: WizardModel;
  errors: Record<string, string>;
  /** Exact saved profile coordinates (placed as the pin when there is none). */
  profileCenter: LatLng | null;
  /** Where the map starts when there is no pin (profile coordinates or City centre). */
  mapStart: MapStart | null;
  onChange: (loc: PickedLocation) => void;
  controlRef?: React.Ref<LocationPickerHandle>;
}) {
  const value: PickedLocation = {
    countryIso: model.countryIso, stateIso: model.stateIso, city: model.city,
    locality: model.locality, pincode: model.pincode,
    lat: model.latitude ?? null, lng: model.longitude ?? null,
  };
  return (
    <LocationPicker
      tone="donor" value={value} onChange={onChange} mapStart={mapStart} seedPin={profileCenter} pinField="latitude" controlRef={controlRef}
      errors={{
        countryIso: errors.countryIso, stateIso: errors.stateIso, city: errors.city,
        locality: errors.locality, pincode: errors.pincode, pin: errors.latitude || errors.longitude,
      }}
    />
  );
}
