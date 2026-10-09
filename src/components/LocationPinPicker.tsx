"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  APIProvider, APILoadingStatus, Map, AdvancedMarker, Pin, useMap, useApiLoadingStatus, useMapsLibrary,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { LocateFixed, Loader2, MapPin, Search, X } from "lucide-react";
import { toast } from "@/lib/toast";

declare global {
  interface Window {
    /**
     * Google Maps calls this global — and nothing else — when it rejects the
     * API key. There is no React-level equivalent.
     */
    gm_authFailure?: () => void;
  }
}

/**
 * The one map pin picker: donor "List an item" (step 4), the donee "Request
 * Support" location step (step 2), plus the handover pin.
 *
 * <p>Three ways to move the pin, all reported through `onPick` so the caller
 * fills its address fields the same way for each: tap or drag on the map, pick
 * a place from the search box (`showSearch`), or "Use my current location"
 * (`showLocateButton`). The last two also pan the map to the new pin.
 *
 * <p>Tap the map to place the pin, drag it to adjust, zoom with the controls or
 * a pinch. `gestureHandling="cooperative"` keeps a one-finger swipe scrolling
 * the page on phones instead of trapping it inside the map. The pin follows
 * `pin` when it changes from outside (a profile location, a typed address), but
 * never pans under the donor's finger after their own tap or drag.
 *
 * <p>No key, a key Google rejects, or a script that fails to load all render a
 * plain note instead of the map (and call `onUnavailable`), so the caller can
 * fall back to the address fields.
 */

export type LatLng = { lat: number; lng: number };
/** Role colours for the pin: donor orange, donee navy. */
export type PinTone = "donor" | "donee" | "neutral";

// The handover pin's starting spot (it always shows a pin): New Delhi.
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
// Nothing known about the user's location: the whole of India.
const INDIA_CENTER = { lat: 22.5, lng: 79.5 };
const INDIA_ZOOM = 4;
// Below this the world no longer fills the box and Google paints grey bands.
const MIN_ZOOM = 4;
const PIN_ZOOM = 16;

/**
 * AdvancedMarker needs a vector Map ID, and "DEMO_MAP_ID" is Google's *demo*
 * identifier — fine for local work, explicitly not for production. Set
 * NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID to a Map ID created in the Cloud console
 * (Maps → Map Management, rendering type: Vector).
 */
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

const TONES: Record<PinTone, { pin?: { background: string; borderColor: string; glyphColor: string }; ink: string; button: string }> = {
  donor: {
    pin: { background: "#b04a15", borderColor: "#7a320d", glyphColor: "#ffffff" },
    ink: "text-[#b04a15] dark:text-[#e07b3a]",
    button: "border-[#b04a15]/30 bg-[#b04a15]/5 text-[#b04a15] hover:bg-[#b04a15]/10 dark:text-[#e07b3a]",
  },
  donee: {
    pin: { background: "#1e3a60", borderColor: "#12253f", glyphColor: "#ffffff" },
    ink: "text-[#1e3a60] dark:text-[#7fb0e8]",
    button: "border-[#1e3a60]/30 bg-[#1e3a60]/5 text-[#1e3a60] hover:bg-[#1e3a60]/10 dark:text-[#7fb0e8]",
  },
  neutral: {
    ink: "text-[var(--handover-accent,#b04a15)]",
    button: "border-[var(--handover-accent)]/30 bg-[var(--handover-accent)]/5 text-[var(--handover-accent)] hover:bg-[var(--handover-accent)]/10",
  },
};

type Suggestion = { id: string; main: string; secondary: string; prediction: google.maps.places.PlacePrediction };

/**
 * Place search over Google's Places API (New), rendered inside the map's
 * APIProvider. One session token covers the typing and the final fetchFields,
 * which is how Google bills a search as a single session. Suggestions are
 * biased to the current pin (else India); nothing is restricted, because
 * listings and requests can be outside India.
 */
function PlaceSearchBox({ near, onPlace }: { near: LatLng; onPlace: (lat: number, lng: number) => void }) {
  const places = useMapsLibrary("places");
  const listId = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const seq = useRef(0);
  const nearRef = useRef(near);
  nearRef.current = near;

  useEffect(() => {
    const q = query.trim();
    if (!places || q.length < 3) { setItems((prev) => (prev.length ? [] : prev)); return; }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        token.current ??= new places.AutocompleteSessionToken();
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: token.current,
          locationBias: { center: nearRef.current, radius: 50_000 },
          language: "en",
        });
        if (mine !== seq.current) return;
        setItems(suggestions.flatMap((s) => {
          const p = s.placePrediction;
          return p ? [{ id: p.placeId, main: p.mainText?.text ?? p.text.text, secondary: p.secondaryText?.text ?? "", prediction: p }] : [];
        }));
        setActive(-1);
        setError(null);
      } catch {
        if (mine === seq.current) { setItems([]); setError("Search isn't available right now — tap the map or fill in the address instead."); }
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, places]);

  async function choose(s: Suggestion) {
    setOpen(false);
    setQuery([s.main, s.secondary].filter(Boolean).join(", "));
    setBusy(true);
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["location"] });
      token.current = null; // the session ends with the fetch
      const loc = place.location;
      if (loc) onPlace(loc.lat(), loc.lng());
      else setError("We couldn't place that result — try another, or tap the map.");
    } catch {
      setError("We couldn't place that result — try another, or tap the map.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); void choose(items[active >= 0 ? active : 0]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  const showList = open && items.length > 0;
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
      <input
        type="text"
        role="combobox"
        aria-label="Search for a place"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Search area, landmark or address"
        autoComplete="off"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setError(null); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-full border border-stone-200 bg-white pl-9 pr-9 text-xs text-stone-800 outline-none transition-colors placeholder:text-stone-400 focus:border-stone-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-100"
      />
      {busy ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" aria-hidden />
      ) : query && (
        <button
          type="button" aria-label="Clear search"
          onClick={() => { setQuery(""); setItems([]); setError(null); }}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
      {showList && (
        <ul
          id={listId} role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {items.map((s, i) => (
            <li
              key={s.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); void choose(s); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-xs ${i === active ? "bg-stone-100 dark:bg-zinc-800" : ""}`}
            >
              <span className="block truncate font-semibold text-stone-800 dark:text-stone-100">{s.main}</span>
              {s.secondary && <span className="block truncate text-2xs text-stone-500 dark:text-stone-400">{s.secondary}</span>}
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-1 text-2xs font-semibold text-amber-700 dark:text-amber-300">{error}</p>}
    </div>
  );
}

/** Shown in place of the map when it cannot be used at all. */
export function MapUnavailableNote({ children }: { children?: React.ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-2xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {children ?? <>The map couldn&apos;t load. Fill in the address below — we&apos;ll place the location from it.</>}
    </p>
  );
}

/**
 * Watches the Maps API's load status from *inside* the provider, which is where
 * the hook's context lives. This catches the script failing to load.
 *
 * <p>It does NOT catch a key Google rejects, despite the status enum implying
 * otherwise. `APILoadingStatus.AUTH_FAILURE` is declared in
 * @vis.gl/react-google-maps@1.9 but nothing in the package ever assigns it, and
 * the package never installs Google's `gm_authFailure` hook. A rejected key
 * loads the script perfectly well, so this sits on LOADED while Google paints
 * its own grey "Oops! Something went wrong" panel inside our container. That
 * case is caught by {@link useGoogleMapsAuthFailure} — they cover different
 * failures.
 */
export function ApiStatusWatch({ onFailure }: { onFailure: () => void }) {
  const status = useApiLoadingStatus();
  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
      onFailure();
    }
  }, [status, onFailure]);
  return null;
}

/**
 * Calls `onFailure` when Google rejects the Maps key. Chained rather than
 * replaced, and restored on unmount, so a second map on the same page does not
 * disable the first one's handler.
 */
export function useGoogleMapsAuthFailure(onFailure: () => void) {
  const onFailureRef = useRef(onFailure);
  onFailureRef.current = onFailure;
  useEffect(() => {
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => {
      previous?.();
      onFailureRef.current();
    };
    return () => {
      window.gm_authFailure = previous;
    };
  }, []);
}

/**
 * The start position can arrive after the map mounted (the profile city is
 * looked up asynchronously). Move there once it does, unless a pin exists —
 * a pin always wins over the start position.
 */
function FollowStart({ pin, center, zoom, mountedAt }: {
  pin: LatLng | null; center: LatLng | null; zoom: number;
  /** The start the map was created with (only the first value counts). */
  mountedAt: string | null;
}) {
  const map = useMap();
  const shown = useRef(mountedAt);
  useEffect(() => {
    if (!map || !center || pin) return;
    const key = `${center.lat},${center.lng},${zoom}`;
    if (key === shown.current) return;
    shown.current = key;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, pin, center, zoom]);
  return null;
}

/** Pans to the pin when it moved from outside the map (not after a tap or drag). */
function FollowPin({ pin, recenter }: { pin: LatLng | null; recenter: number }) {
  const map = useMap();
  const last = useRef(recenter);
  useEffect(() => {
    if (!map || !pin || recenter === last.current) return;
    last.current = recenter;
    map.panTo(pin);
    if ((map.getZoom() ?? 0) < PIN_ZOOM) map.setZoom(PIN_ZOOM);
  }, [map, pin, recenter]);
  return null;
}

type LocationPinPickerProps = {
  /** The current pin; null until one is placed. */
  pin: LatLng | null;
  /** Called with the new position after a tap or a drag. */
  onPick: (lat: number, lng: number) => void;
  /** Where to look while there is no pin (e.g. the profile location). */
  fallbackCenter?: LatLng | null;
  /** Zoom for `fallbackCenter` (default: street level). */
  fallbackZoom?: number;
  tone?: PinTone;
  /** Called once if the map cannot load, so the caller can fall back. */
  onUnavailable?: () => void;
  /** A "Use my current location" button; the map pans to the result. */
  showLocateButton?: boolean;
  /** A place search box above the map; the map pans to the chosen place. */
  showSearch?: boolean;
  /** Show a pin at the start position even before one is placed (handover). */
  pinAtStart?: boolean;
  /** Text under the map; null hides it. */
  hint?: string | null;
  height?: number;
  /** Replaces the default "map couldn't load" note (which points at the address fields). */
  unavailableNote?: React.ReactNode;
};

export function LocationPinPicker({
  pin, onPick, fallbackCenter = null, fallbackZoom = PIN_ZOOM, tone = "neutral", onUnavailable,
  showLocateButton = false, showSearch = false, pinAtStart = false, hint, height = 260, unavailableNote,
}: LocationPinPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [failed, setFailed] = useState(!apiKey);
  const [locating, setLocating] = useState(false);
  useGoogleMapsAuthFailure(() => setFailed(true));
  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;
  useEffect(() => { if (failed) onUnavailableRef.current?.(); }, [failed]);

  // A pin that moved from outside the map: follow it. One we just placed: don't.
  const picked = useRef<string | null>(null);
  const [recenter, setRecenter] = useState(0);
  useEffect(() => {
    if (!pin) return;
    const key = `${pin.lat},${pin.lng}`;
    if (key !== picked.current) { picked.current = key; setRecenter(n => n + 1); }
  }, [pin?.lat, pin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (lat: number, lng: number) => {
    picked.current = `${lat},${lng}`;
    onPick(lat, lng);
  };

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onPick(pos.coords.latitude, pos.coords.longitude); // not `pick`: the map should follow
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — allow it or drag the pin instead."
            : "Couldn't get your location — drag the pin instead."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  const t = TONES[tone];
  const start = pin ?? fallbackCenter ?? (pinAtStart ? DEFAULT_CENTER : INDIA_CENTER);
  const startZoom = pin || pinAtStart ? PIN_ZOOM : fallbackCenter ? fallbackZoom : INDIA_ZOOM;
  const shownPin = pin ?? (pinAtStart ? start : null);
  const mapUsable = !!apiKey && !failed;
  const hintText = hint === undefined
    ? (mapUsable ? "Search, use your current location, or tap the map — then drag the pin to the exact spot." : null)
    : hint;
  // With a search box the locate button sits beside it, above the map; the
  // handover form keeps it on the hint line below.
  const locateOnTop = showLocateButton && showSearch;

  const locateButton = (
    <button
      type="button"
      onClick={useMyLocation}
      disabled={locating}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-70 ${t.button}`}
    >
      {locating
        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Locating…</>
        : <><LocateFixed className="h-3.5 w-3.5" /> Use my current location</>}
    </button>
  );

  return (
    <div className="space-y-2">
      {!mapUsable ? (
        <>
          <MapUnavailableNote>{unavailableNote}</MapUnavailableNote>
          {locateOnTop && <div className="flex justify-end">{locateButton}</div>}
        </>
      ) : (
          <APIProvider
            apiKey={apiKey as string}
            onError={(e) => {
              setFailed(true);
              // Named causes rather than a bare object: every time this fires it is
              // one of these three, and a future reader should not have to
              // rediscover that from an opaque error.
              console.warn(
                "Google Maps failed to load. Check, in order: billing enabled on the "
                + "project, Maps JavaScript API enabled, and HTTP referrer restrictions "
                + "allowing this origin.",
                e,
              );
            }}
          >
            <ApiStatusWatch onFailure={() => setFailed(true)} />
            {(showSearch || locateOnTop) && (
              <div className="mb-2 flex flex-wrap items-start gap-2">
                {showSearch && <PlaceSearchBox near={start} onPlace={(lat, lng) => onPick(lat, lng)} />}
                {locateOnTop && locateButton}
              </div>
            )}
            <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-800" style={{ height }}>
            <Map
              defaultCenter={start}
              defaultZoom={startZoom}
              mapId={MAP_ID}
              minZoom={MIN_ZOOM}
              maxZoom={20}
              gestureHandling="cooperative"
              disableDefaultUI
              zoomControl
              clickableIcons={false}
              onClick={(e: MapMouseEvent) => {
                const ll = e.detail.latLng;
                if (ll) pick(ll.lat, ll.lng);
              }}
            >
              {shownPin && (
                <AdvancedMarker
                  position={shownPin}
                  draggable
                  title="Location pin"
                  onDragEnd={(e) => {
                    const lat = e.latLng?.lat();
                    const lng = e.latLng?.lng();
                    if (lat != null && lng != null) pick(lat, lng);
                  }}
                >
                  {t.pin && <Pin {...t.pin} />}
                </AdvancedMarker>
              )}
              <FollowPin pin={pin} recenter={recenter} />
              <FollowStart
                pin={pin} center={fallbackCenter} zoom={fallbackZoom}
                mountedAt={!pin && fallbackCenter ? `${fallbackCenter.lat},${fallbackCenter.lng},${fallbackZoom}` : null}
              />
            </Map>
            </div>
          </APIProvider>
      )}

      {(hintText || (showLocateButton && !locateOnTop)) && (
        <div className="flex items-center justify-between gap-3">
          {hintText ? (
            <p className="flex items-center gap-1.5 text-2xs text-stone-500 dark:text-stone-400">
              <MapPin className={`h-3.5 w-3.5 shrink-0 ${t.ink}`} aria-hidden />
              {hintText}
            </p>
          ) : <span />}
          {showLocateButton && !locateOnTop && locateButton}
        </div>
      )}
    </div>
  );
}

export default LocationPinPicker;
