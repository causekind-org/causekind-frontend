"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { WizardField, controlClass } from "@/features/wizard-kit/WizardField";
import { LocationPinPicker } from "@/components/LocationPinPicker";
import type { WizardModel } from "../wizardModel";

type LatLng = { lat: number; lng: number };

/**
 * Step 4 — "Where is the item?".
 *
 * <p>The map pin is the source of truth for coordinates (matching measures the
 * 10 km radius from it). Dropping or dragging it fills the address fields,
 * which stay editable for corrections. With no pin yet, the pin starts on the
 * donor's profile location, so a donor listing from home can just continue.
 *
 * <p>If the map cannot load, the fields are the input: the typed address is
 * geocoded for approximate coordinates (profile location as the last resort).
 */
export function LocationStep({
  model, errors, lookup, profileCenter, onChange, onPin, onGeocodeTyped,
}: {
  model: WizardModel;
  errors: Record<string, string>;
  lookup: { running: boolean; error: string | null };
  profileCenter: LatLng | null;
  onChange: <K extends keyof WizardModel>(key: K, value: WizardModel[K]) => void;
  onPin: (lat: number, lng: number, opts?: { onlyEmpty?: boolean }) => void;
  onGeocodeTyped: (q: { postalcode: string; city: string; state: string; countryCode: string }) => void;
}) {
  const { countries, states, cities } = useLocations(model.countryIso, model.stateIso);
  const [mapDown, setMapDown] = useState(false);
  const onUnavailable = useCallback(() => setMapDown(true), []);

  const pin = model.latitude != null && model.longitude != null ? { lat: model.latitude, lng: model.longitude } : null;

  const pick = useCallback((lat: number, lng: number) => onPin(lat, lng), [onPin]);

  // On arrival: no pin yet → start on the profile location; a pin but an
  // incomplete address → fill the blanks from it. Never overwrites anything.
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current || mapDown) return;
    if (!pin && profileCenter) {
      arrived.current = true;
      onPin(profileCenter.lat, profileCenter.lng, { onlyEmpty: true });
    } else if (pin) {
      arrived.current = true;
      if (!model.pincode.trim() || !model.city.trim()) onPin(pin.lat, pin.lng, { onlyEmpty: true });
    }
  }, [pin, profileCenter, mapDown, model.pincode, model.city, onPin]);

  // No map: geocode the typed address once the donor pauses typing.
  const stateName = states.find(s => s.value === model.stateIso)?.label ?? "";
  useEffect(() => {
    if (!mapDown) return;
    const t = setTimeout(() => onGeocodeTyped({
      postalcode: model.pincode.trim(), city: model.city.trim(), state: stateName, countryCode: model.countryIso,
    }), 1200);
    return () => clearTimeout(t);
  }, [mapDown, model.pincode, model.city, stateName, model.countryIso, onGeocodeTyped]);

  const pinError = errors.latitude || errors.longitude;

  return (
    <div className="space-y-2">
      <LocationPinPicker
        tone="donor" pin={pin} fallbackCenter={profileCenter}
        onPick={pick} onUnavailable={onUnavailable}
        hint={lookup.running ? null : undefined}
      />

      <div data-field="latitude" tabIndex={-1} className="space-y-1.5 outline-none">
        {lookup.running && (
          <p role="status" className="flex items-center gap-1.5 text-2xs font-semibold text-stone-600 dark:text-stone-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Looking up the address…
          </p>
        )}
        {lookup.error && !lookup.running && (
          <p role="alert" className="flex items-start gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-2xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {lookup.error}
          </p>
        )}
        {pinError && (
          <p role="alert" className="text-2xs font-semibold text-red-600 dark:text-red-400">
            {mapDown ? "We couldn't place this address — check the city and PIN code." : pinError}
          </p>
        )}
      </div>

      <WizardField label="Country" required error={errors.countryIso}>
        {({ id, describedBy, invalid }) => (
          <select
            id={id} name="countryIso" aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass} value={model.countryIso}
            onChange={e => onChange("countryIso", e.target.value)}
          >
            <option value="">Select a country</option>
            {countries.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        )}
      </WizardField>

      <WizardField label="State / province" required error={errors.stateIso}>
        {({ id, describedBy, invalid }) => (
          <select
            id={id} name="stateIso" aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass} value={model.stateIso} disabled={!model.countryIso}
            onChange={e => onChange("stateIso", e.target.value)}
          >
            <option value="">{model.countryIso ? "Select a state" : "—"}</option>
            {states.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
      </WizardField>

      {/* A city list exists for most states, but old drafts and unlisted
          places must remain enterable, so this stays a free-text input with
          a datalist rather than a closed select. */}
      <WizardField label="City" required error={errors.city}>
        {({ id, describedBy, invalid }) => (
          <>
            <input
              id={id} name="city" type="text" list={`${id}-cities`}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass} value={model.city}
              onChange={e => onChange("city", e.target.value)}
            />
            <datalist id={`${id}-cities`}>
              {cities.map(c => <option key={c.value} value={c.value} />)}
            </datalist>
          </>
        )}
      </WizardField>

      <WizardField label="Locality" hint="Optional — area or neighbourhood" error={errors.locality}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id} name="locality" type="text"
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass} value={model.locality}
            onChange={e => onChange("locality", e.target.value)}
          />
        )}
      </WizardField>

      <WizardField
        label={model.countryIso === "IN" ? "PIN code" : "Postal code"} required
        error={errors.pincode}
        hint={model.countryIso === "IN" ? "6 digits" : "3–10 letters, numbers, spaces or hyphens"}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id} name="pincode" type="text"
            inputMode={model.countryIso === "IN" ? "numeric" : "text"}
            maxLength={10}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass} value={model.pincode}
            onChange={e => onChange("pincode", e.target.value)}
          />
        )}
      </WizardField>
    </div>
  );
}
