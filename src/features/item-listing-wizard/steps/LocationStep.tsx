"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
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
 * 10 km radius from it). Searching for a place, "Use my current location", or
 * tapping/dragging the map moves the pin and fills the address fields. Typing
 * the address by hand moves the pin to it. The fields stay editable for
 * corrections.
 *
 * <p>With no pin yet the map opens on the donor's profile location, but no pin
 * is dropped there: the profile location is no longer shown or edited
 * anywhere, so a silent pin could be stale.
 *
 * <p>If the map cannot load, the fields are the input: the typed address is
 * geocoded for approximate coordinates (profile location as the last resort).
 */
/**
 * Lets the wizard wait for this step before validating or saving: `flush()`
 * runs a typed address that is still waiting for its debounce, then waits for
 * any pin → address lookup in flight. False only when the latest typed address
 * could not be placed (the pin no longer matches the fields).
 */
export type LocationStepHandle = { flush: () => Promise<boolean> };

const TYPED_NOT_PLACED = "We couldn't place this address. Drop the pin on the map to continue.";

export function LocationStep({
  model, errors, lookup, profileCenter, onChange, onPin, onGeocodeTyped, controlRef,
}: {
  model: WizardModel;
  errors: Record<string, string>;
  lookup: { running: boolean; error: string | null; whenIdle?: () => Promise<void> };
  profileCenter: LatLng | null;
  onChange: <K extends keyof WizardModel>(key: K, value: WizardModel[K]) => void;
  onPin: (lat: number, lng: number, opts?: { onlyEmpty?: boolean }) => void;
  /** Resolves true when the typed address was placed. */
  onGeocodeTyped: (q: { postalcode: string; city: string; state: string; countryCode: string }, useProfileFallback: boolean) => Promise<boolean> | void;
  controlRef?: React.Ref<LocationStepHandle>;
}) {
  const { countries, states, cities } = useLocations(model.countryIso, model.stateIso);
  const [mapDown, setMapDown] = useState(false);
  const onUnavailable = useCallback(() => setMapDown(true), []);

  const pin = model.latitude != null && model.longitude != null ? { lat: model.latitude, lng: model.longitude } : null;

  const pick = useCallback((lat: number, lng: number) => onPin(lat, lng), [onPin]);

  // On arrival with a pin (a resumed draft) but an incomplete address: fill the
  // blanks from the pin. Never overwrites anything.
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current || mapDown || !pin) return;
    arrived.current = true;
    if (!model.pincode.trim() || !model.city.trim()) onPin(pin.lat, pin.lng, { onlyEmpty: true });
  }, [pin, mapDown, model.pincode, model.city, onPin]);

  // Typed address → pin. Counts only the donor's own edits: the fields a pin
  // lookup fills arrive through onPin, never through here, so a pin can't
  // re-trigger itself.
  const [typed, setTyped] = useState(0);
  const edit = useCallback(<K extends keyof WizardModel>(key: K, value: WizardModel[K]) => {
    onChange(key, value);
    setTyped(n => n + 1);
  }, [onChange]);
  const stateName = states.find(s => s.value === model.stateIso)?.label ?? "";
  // Read at run time, so a flush uses what was typed last, not what was there
  // when the debounce started.
  const latest = useRef({ model, stateName, mapDown });
  latest.current = { model, stateName, mapDown };
  const typedPending = useRef(false);
  const typedInFlight = useRef<Promise<boolean> | null>(null);
  const [typedFailed, setTypedFailed] = useState(false);
  const runTyped = useCallback(() => {
    typedPending.current = false;
    const { model: m, stateName: st, mapDown: down } = latest.current;
    // Nothing to place yet (e.g. the state changed and cleared the city): not a failure.
    if (!m.city.trim() && !m.pincode.trim()) { setTypedFailed(false); return Promise.resolve(true); }
    const run = Promise.resolve(onGeocodeTyped({
      postalcode: m.pincode.trim(), city: m.city.trim(), state: st, countryCode: m.countryIso,
    }, down)).then(placed => placed !== false);
    typedInFlight.current = run;
    void run.then(ok => {
      if (typedInFlight.current !== run) return;
      typedInFlight.current = null;
      setTypedFailed(!ok);
    });
    return run;
  }, [onGeocodeTyped]);
  useEffect(() => {
    if (typed === 0) return;
    typedPending.current = true;
    const t = setTimeout(() => { if (typedPending.current) void runTyped(); }, 1200);
    return () => clearTimeout(t);
  }, [typed, runTyped]);

  useImperativeHandle(controlRef, () => ({
    flush: async () => {
      let ok = true;
      if (typedPending.current) ok = await runTyped();
      else if (typedInFlight.current) ok = await typedInFlight.current;
      await lookup.whenIdle?.();
      return ok;
    },
  }), [runTyped, lookup.whenIdle]);

  // A pin placed on the map, by search or by location clears a failed typed lookup.
  const pickClearing = useCallback((lat: number, lng: number) => { setTypedFailed(false); pick(lat, lng); }, [pick]);

  const pinError = errors.latitude || errors.longitude || (typedFailed && !mapDown ? TYPED_NOT_PLACED : "");

  return (
    <div className="space-y-2">
      <LocationPinPicker
        tone="donor" pin={pin} fallbackCenter={profileCenter}
        onPick={pickClearing} onUnavailable={onUnavailable}
        showSearch showLocateButton
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
            onChange={e => edit("countryIso", e.target.value)}
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
            onChange={e => edit("stateIso", e.target.value)}
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
              onChange={e => edit("city", e.target.value)}
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
            onChange={e => edit("pincode", e.target.value)}
          />
        )}
      </WizardField>
    </div>
  );
}
