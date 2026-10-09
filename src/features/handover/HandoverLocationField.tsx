"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, TriangleAlert } from "lucide-react";
import { detectLocationFromServer, geocodeFreeTextFromServer } from "@/app/actions/locations";
import { Textarea } from "@/components/ui/textarea";
import { handoverInput } from "./handoverStyles";

/**
 * "Where?" for the donor's handover schedule: the map (search, "Use my current
 * location", tap/drag) and one handover-address box under it, kept in sync.
 *
 * <ul>
 *   <li>Search → the pin moves there and the box takes the place's name.</li>
 *   <li>Current location or a tap/drag → the pin moves and the box takes the
 *       street address at that spot (reverse geocoding).</li>
 *   <li>Typing in the box → after a pause the pin moves to it (forward
 *       geocoding); the box itself is never rewritten while typing.</li>
 * </ul>
 *
 * <p>The donee is shown both: the address as written and a map link to the pin.
 * While any lookup is in flight `onBusyChange(true)`, so the dialog can hold Save.
 */

// The map is the heaviest thing in the dialog; keep it out of the first paint.
const LocationPinPicker = dynamic(() => import("@/components/LocationPinPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[260px] w-full animate-pulse rounded-xl bg-stone-100 dark:bg-zinc-800" role="status" aria-label="Loading map" />
  ),
});

const TYPED_DELAY_MS = 1000;

/** A readable one-line address from a Nominatim reverse result. */
export function formatPinAddress(a: Record<string, string>): string {
  const street = [a.house_number, a.road ?? a.pedestrian ?? a.footway].filter(Boolean).join(" ");
  const parts = [
    a.building ?? a.amenity ?? a.shop,
    street,
    a.neighbourhood ?? a.suburb ?? a.quarter ?? a.residential,
    a.city_district,
    a.city ?? a.town ?? a.village ?? a.county,
    a.state,
    a.postcode,
  ].map((p) => p?.trim()).filter((p): p is string => !!p);
  // Neighbouring OSM fields often repeat the same name.
  return parts.filter((p, i) => parts.indexOf(p) === i).join(", ");
}

export function HandoverLocationField({
  address, lat, lng, onAddressChange, onPinChange, onBusyChange, disabled, addressId = "ho-address",
}: {
  address: string;
  lat: number | null;
  lng: number | null;
  onAddressChange: (address: string) => void;
  onPinChange: (lat: number, lng: number) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  addressId?: string;
}) {
  const pin = lat != null && lng != null ? { lat, lng } : null;

  const [pickerBusy, setPickerBusy] = useState(false);
  const [reverseBusy, setReverseBusy] = useState(false);
  const [typedBusy, setTypedBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "info" | "warn"; text: string } | null>(null);

  // One sequence for both directions: the newest action wins, an older answer
  // arriving late is dropped.
  const seq = useRef(0);
  const typedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (typedTimer.current) clearTimeout(typedTimer.current); }, []);

  const busy = pickerBusy || reverseBusy || typedBusy;
  const onBusyRef = useRef(onBusyChange);
  onBusyRef.current = onBusyChange;
  useEffect(() => { onBusyRef.current?.(busy); }, [busy]);
  useEffect(() => () => { onBusyRef.current?.(false); }, []);

  /** Map → box. A search brings its own name; anything else is looked up. */
  const handlePick = useCallback(async (pLat: number, pLng: number, meta?: { label?: string }) => {
    const mine = ++seq.current;
    if (typedTimer.current) { clearTimeout(typedTimer.current); typedTimer.current = null; }
    setTypedBusy(false);
    onPinChange(pLat, pLng);
    if (meta?.label) {
      onAddressChange(meta.label);
      setNote({ tone: "info", text: "Address filled from your search. Add a flat number or landmark if it helps." });
      return;
    }
    setReverseBusy(true);
    setNote(null);
    try {
      const geo = await detectLocationFromServer(pLat, pLng);
      if (mine !== seq.current) return;
      const text = geo.ok ? formatPinAddress(geo.address) : "";
      // Nothing found at the new spot: clear the old address rather than keep
      // one that describes somewhere else.
      onAddressChange(text);
      setNote(text
        ? { tone: "info", text: "Address filled from the pin. Add a flat number or landmark if it helps." }
        : { tone: "warn", text: "We couldn't find an address at that spot. Type it in the box below." });
    } catch {
      if (mine === seq.current) {
        onAddressChange("");
        setNote({ tone: "warn", text: "We couldn't look up that spot. Type the address in the box below." });
      }
    } finally {
      if (mine === seq.current) setReverseBusy(false);
    }
  }, [onAddressChange, onPinChange]);

  /** Box → map, after a pause. Never rewrites what is being typed. */
  function handleTyped(text: string) {
    onAddressChange(text);
    const mine = ++seq.current;
    setReverseBusy(false);
    if (typedTimer.current) clearTimeout(typedTimer.current);
    if (text.trim().length < 4) { setTypedBusy(false); return; }
    setTypedBusy(true);
    setNote(null);
    typedTimer.current = setTimeout(async () => {
      typedTimer.current = null;
      try {
        const geo = await geocodeFreeTextFromServer(text);
        if (mine !== seq.current) return;
        if (geo.ok) {
          onPinChange(geo.lat, geo.lng);
          setNote({ tone: "info", text: "Pin moved to this address. Drag it to the exact meeting spot." });
        } else {
          setNote({ tone: "warn", text: "We couldn't find this address on the map. Drop the pin at the meeting spot." });
        }
      } catch {
        if (mine === seq.current) setNote({ tone: "warn", text: "We couldn't find this address on the map. Drop the pin at the meeting spot." });
      } finally {
        if (mine === seq.current) setTypedBusy(false);
      }
    }, TYPED_DELAY_MS);
  }

  return (
    <div className="space-y-3">
      <LocationPinPicker
        pin={pin}
        onPick={(a, b, meta) => void handlePick(a, b, meta)}
        onBusyChange={setPickerBusy}
        showSearch
        showLocateButton
        height={260}
      />

      <div className="space-y-1.5">
        <label htmlFor={addressId} className="block text-sm font-semibold text-foreground">
          Handover address<span className="ml-0.5 text-destructive" aria-hidden>*</span>
          <span className="sr-only"> (required)</span>
        </label>
        <Textarea
          id={addressId}
          rows={2}
          value={address}
          disabled={disabled}
          onChange={(e) => handleTyped(e.target.value)}
          placeholder="e.g. Gate 2, Sai Krupa Society, Link Road, Kandivali East, Mumbai"
          className={`${handoverInput} min-h-[64px] resize-none py-2.5 leading-snug`}
        />
        <div aria-live="polite" className="min-h-[1rem]">
          {busy ? (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {typedBusy ? "Finding this address on the map…" : "Looking up the address…"}
            </p>
          ) : note ? (
            <p className={`flex items-start gap-1.5 text-xs ${note.tone === "warn" ? "font-semibold text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
              {note.tone === "warn"
                ? <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                : <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
              {note.text}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The donee sees this address and a Google Maps link to the pin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
