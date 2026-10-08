"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin, Search, TriangleAlert } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { usePinAddress, type PinAddress } from "@/hooks/usePinAddress";
import { geocodeAddressFromServer, searchPlaceFromServer } from "@/app/actions/locations";
import { LocationPinPicker, type LatLng } from "@/components/LocationPinPicker";
import { WizardField, controlClass } from "@/features/wizard-kit/WizardField";
import type { MapStart } from "@/hooks/useProfileMapStart";

/** What the picker edits. `lat`/`lng` are the pin — the coordinates that get saved and matched. */
export type PickedLocation = {
  countryIso: string;
  stateIso: string;
  city: string;
  locality: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
};

export type LocationErrors = Partial<Record<"countryIso" | "stateIso" | "city" | "locality" | "pincode" | "pin", string>>;

type Field = "countryIso" | "stateIso" | "city" | "locality" | "pincode";

const TONE = {
  donor: { btn: "bg-[#b04a15] hover:bg-[#943e11] text-white", ink: "text-[#b04a15] dark:text-[#e07b3a]", ring: "focus-visible:ring-[#b04a15]" },
  donee: { btn: "bg-[#1e3a60] hover:bg-[#2d5a96] text-white", ink: "text-[#1e3a60] dark:text-[#7fb0e8]", ring: "focus-visible:ring-[#2d5a96]" },
} as const;

const GPS_FAILED = "We couldn't get your location. Search or drop the pin instead.";
const NOT_FOUND = "We couldn't find that place. Try a nearby area or PIN code.";
const PIN_MOVED = "Pin moved to this area. Drag it to the exact spot.";

/**
 * The location step shared by donor "List an item" (step 4) and donee
 * "Request Support" (step 2): "Use my current location", a search box, the
 * map pin and the address fields, kept in sync four ways.
 *
 * <p>Every change knows where it came from. GPS, search and the pin set the
 * coordinates and then FILL the fields (reverse geocoding). Typing in a field
 * only MOVES the pin (forward geocoding, debounced) and is never followed by a
 * reverse fill — so the two directions cannot overwrite each other. A fill
 * also skips whichever field the user is typing in at that moment.
 */
export function LocationPicker({
  value, onChange, tone, errors = {}, mapStart, seedPin = null, ready = true, pinField = "pin",
}: {
  value: PickedLocation;
  onChange: (next: PickedLocation) => void;
  tone: "donor" | "donee";
  errors?: LocationErrors;
  /** Where the map opens without a pin (profile coordinates or City centre). */
  mapStart: MapStart | null;
  /** Exact saved profile coordinates: placed as the pin when there is none yet. */
  seedPin?: LatLng | null;
  /** False while the caller is still loading a saved draft. */
  ready?: boolean;
  /** The `data-field` the caller's error summary jumps to for a missing pin. */
  pinField?: string;
}) {
  const t = TONE[tone];
  const { countries, states, cities } = useLocations(value.countryIso, value.stateIso);
  const pinAddress = usePinAddress();
  const [mapDown, setMapDown] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "note"; text: string } | null>(null);

  // Async callbacks always merge into the latest value.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const focused = useRef<Field | null>(null);

  /** Reverse-geocoded address → fields. Never the field being typed in. */
  const fill = useCallback((found: PinAddress, onlyEmpty = false) => {
    const cur = valueRef.current;
    const next = { ...cur };
    const incoming: Record<Field, string | undefined> = {
      countryIso: found.countryIso, stateIso: found.stateIso, city: found.city,
      locality: found.locality, pincode: found.pincode,
    };
    (Object.keys(incoming) as Field[]).forEach((k) => {
      const v = incoming[k];
      if (!v || focused.current === k) return;
      if (onlyEmpty && cur[k].trim()) return;
      next[k] = v;
    });
    onChangeRef.current(next);
  }, []);

  /** GPS, search, a tap/drag on the map, or the profile seed: set the pin, then fill the fields. */
  const placePin = useCallback((lat: number, lng: number, source: "gps" | "search" | "pin" | "seed") => {
    onChangeRef.current({ ...valueRef.current, lat, lng });
    setMessage(null);
    pinAddress.lookup(lat, lng, (found) => fill(found, source === "seed"));
  }, [pinAddress.lookup, fill]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrival: no pin → the saved profile coordinates; a pin with blank fields
  // (older drafts) → fill the blanks from it. Once, after any draft has loaded.
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current || !ready) return;
    if (value.lat != null && value.lng != null) {
      arrived.current = true;
      if (!value.countryIso || !value.city.trim() || !value.pincode.trim()) {
        pinAddress.lookup(value.lat, value.lng, (found) => fill(found, true));
      }
    } else if (seedPin) {
      arrived.current = true;
      placePin(seedPin.lat, seedPin.lng, "seed");
    }
  }, [ready, value.lat, value.lng, value.countryIso, value.city, value.pincode, seedPin, placePin, fill]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── typing: move the pin to the typed place (debounced; no reverse fill) ──
  const typedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typedSeq = useRef(0);
  const lastEdited = useRef<Field | null>(null);
  const stateName = (iso: string) => states.find((s) => s.value === iso)?.label ?? "";
  const geocodeTyped = useCallback(async () => {
    if (typedTimer.current) { clearTimeout(typedTimer.current); typedTimer.current = null; }
    const cur = valueRef.current;
    const pin = cur.pincode.trim();
    const enough = cur.city.trim().length >= 2 || (cur.countryIso === "IN" ? /^\d{6}$/.test(pin) : pin.length >= 3);
    if (!enough) return;
    const mine = ++typedSeq.current;
    // The locality only narrows the search when it is what was just typed — a
    // locality left over from the previous place would send it to the wrong town.
    const withLocality = lastEdited.current === "locality" && cur.locality.trim();
    const base = { postalcode: pin, state: stateName(cur.stateIso), countryCode: cur.countryIso };
    const geo = await geocodeAddressFromServer({ ...base, city: withLocality ? `${cur.locality.trim()}, ${cur.city.trim()}` : cur.city.trim() });
    // A locality the geocoder doesn't know shouldn't sink the whole lookup.
    const res = geo.ok || !withLocality ? geo : await geocodeAddressFromServer({ ...base, city: cur.city.trim() });
    if (mine !== typedSeq.current) return;
    if (res.ok) {
      onChangeRef.current({ ...valueRef.current, lat: res.lat, lng: res.lng });
      setMessage({ kind: "note", text: PIN_MOVED });
    } else if (valueRef.current.lat == null) {
      setMessage({ kind: "error", text: "We couldn't place this address — check the city and PIN code, or drop the pin." });
    }
  }, [states]); // eslint-disable-line react-hooks/exhaustive-deps

  function setField(k: Field, v: string) {
    const cur = valueRef.current;
    const next = { ...cur, [k]: v };
    if (k === "countryIso") { next.stateIso = ""; next.city = ""; }
    if (k === "stateIso") next.city = "";
    onChange(next);
    valueRef.current = next;
    lastEdited.current = k;
    if (typedTimer.current) clearTimeout(typedTimer.current);
    typedTimer.current = setTimeout(() => void geocodeTyped(), 800);
  }
  useEffect(() => () => { if (typedTimer.current) clearTimeout(typedTimer.current); }, []);
  const fieldProps = (k: Field) => ({
    onFocus: () => { focused.current = k; },
    onBlur: () => { focused.current = null; if (typedTimer.current) void geocodeTyped(); },
  });

  // ── GPS ──
  function useMyLocation() {
    if (!("geolocation" in navigator)) { setMessage({ kind: "error", text: GPS_FAILED }); return; }
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); placePin(pos.coords.latitude, pos.coords.longitude, "gps"); },
      () => { setLocating(false); setMessage({ kind: "error", text: GPS_FAILED }); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  // ── search (submit only: Nominatim's policy rules out as-you-type) ──
  const searchInput = useRef<HTMLInputElement>(null);
  const mapBox = useRef<HTMLDivElement>(null);
  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    searchInput.current?.blur(); // closes the phone keyboard so the map is visible
    setSearching(true);
    setMessage(null);
    const res = await searchPlaceFromServer(q);
    setSearching(false);
    if (!res.ok) { setMessage({ kind: "error", text: NOT_FOUND }); return; }
    placePin(res.lat, res.lng, "search");
    mapBox.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  const pin = value.lat != null && value.lng != null ? { lat: value.lat, lng: value.lng } : null;
  const busy = pinAddress.running;
  const isIndia = value.countryIso === "IN";

  return (
    <div className="space-y-3">
      <button
        type="button" onClick={useMyLocation} disabled={locating}
        className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${t.btn} ${t.ring}`}
      >
        {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LocateFixed className="h-4 w-4" aria-hidden />}
        {locating ? "Finding your location…" : "Use my current location"}
      </button>

      {/* `action` + a real form: the phone keyboard shows "Search", and Enter submits. */}
      <form role="search" action="#" onSubmit={search} className="relative">
        <label htmlFor={`${tone}-place-search`} className="sr-only">Search your area or address</label>
        <input
          ref={searchInput} id={`${tone}-place-search`} type="search" enterKeyHint="search" autoComplete="off"
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your area or address"
          className={`${controlClass} min-h-11 pr-12`}
        />
        <button
          type="submit" aria-label="Search" disabled={searching}
          className={`absolute right-0 top-0 flex h-full min-h-11 w-11 items-center justify-center rounded-r-xl ${t.ink}`}
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
        </button>
      </form>

      <div ref={mapBox} data-field={pinField} tabIndex={-1} className="space-y-1.5 outline-none">
        <LocationPinPicker
          tone={tone} pin={pin} fallbackCenter={mapStart?.center ?? null} fallbackZoom={mapStart?.zoom}
          onPick={(lat, lng) => placePin(lat, lng, "pin")} onUnavailable={() => setMapDown(true)}
          hint={busy ? null : undefined} height={300}
        />
        {busy && (
          <p role="status" className="flex items-center gap-1.5 text-2xs font-semibold text-stone-600 dark:text-stone-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Looking up the address…
          </p>
        )}
        {pinAddress.error && !busy && (
          <p role="alert" className="flex items-start gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-2xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{pinAddress.error}
          </p>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"}
            className={`flex items-start gap-1.5 text-2xs font-semibold ${message.kind === "error" ? "text-red-600 dark:text-red-400" : t.ink}`}>
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{message.text}
          </p>
        )}
        {errors.pin && (
          <p id={`${tone}-pin-error`} role="alert" className="text-2xs font-semibold text-red-600 dark:text-red-400">
            {mapDown ? "We couldn't place this address — check the city and PIN code." : errors.pin}
          </p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <WizardField label="Country" required error={errors.countryIso}>
          {({ id, describedBy, invalid }) => (
            <select id={id} name="countryIso" data-field="countryIso" aria-describedby={describedBy} aria-invalid={invalid}
              className={`${controlClass} min-h-11`} value={value.countryIso} {...fieldProps("countryIso")}
              onChange={(e) => setField("countryIso", e.target.value)}>
              <option value="">Select a country</option>
              {countries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          )}
        </WizardField>
        <WizardField label="State / province" required error={errors.stateIso}>
          {({ id, describedBy, invalid }) => (
            <select id={id} name="stateIso" data-field="stateIso" aria-describedby={describedBy} aria-invalid={invalid}
              className={`${controlClass} min-h-11`} value={value.stateIso} disabled={!value.countryIso} {...fieldProps("stateIso")}
              onChange={(e) => setField("stateIso", e.target.value)}>
              <option value="">{value.countryIso ? "Select a state" : "—"}</option>
              {states.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}
        </WizardField>
        {/* Free text with suggestions: unlisted towns must stay enterable. */}
        <WizardField label="City" required error={errors.city}>
          {({ id, describedBy, invalid }) => (
            <>
              <input id={id} name="city" data-field="city" type="text" list={`${id}-cities`} autoComplete="address-level2"
                aria-describedby={describedBy} aria-invalid={invalid} className={`${controlClass} min-h-11`}
                value={value.city} {...fieldProps("city")} onChange={(e) => setField("city", e.target.value)} />
              <datalist id={`${id}-cities`}>{cities.map((c) => <option key={c.value} value={c.value} />)}</datalist>
            </>
          )}
        </WizardField>
        <WizardField label="Locality" hint="Optional — area or neighbourhood" error={errors.locality}>
          {({ id, describedBy, invalid }) => (
            <input id={id} name="locality" data-field="locality" type="text" autoComplete="address-level3"
              aria-describedby={describedBy} aria-invalid={invalid} className={`${controlClass} min-h-11`}
              value={value.locality} {...fieldProps("locality")} onChange={(e) => setField("locality", e.target.value)} />
          )}
        </WizardField>
        <WizardField label={isIndia ? "PIN code" : "Postal code"} required error={errors.pincode}
          hint={isIndia ? "6 digits" : "3–10 letters, numbers, spaces or hyphens"}>
          {({ id, describedBy, invalid }) => (
            <input id={id} name="pincode" data-field="pincode" type="text" inputMode={isIndia ? "numeric" : "text"}
              autoComplete="postal-code" maxLength={10} aria-describedby={describedBy} aria-invalid={invalid}
              className={`${controlClass} min-h-11`} value={value.pincode} {...fieldProps("pincode")}
              onChange={(e) => setField("pincode", e.target.value)} />
          )}
        </WizardField>
      </div>
    </div>
  );
}
