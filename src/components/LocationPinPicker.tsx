"use client";

import { useEffect, useRef, useState } from "react";
import {
  APIProvider, APILoadingStatus, Map, AdvancedMarker, Pin, useMap, useApiLoadingStatus,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { LocateFixed, Loader2, MapPin } from "lucide-react";
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
 * The one map pin picker: donor "List an item" (step 4) and the donee
 * "Request Support" form (step 1), plus the handover pin.
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

const TONES: Record<PinTone, { pin?: { background: string; borderColor: string; glyphColor: string }; ink: string }> = {
  donor: { pin: { background: "#b04a15", borderColor: "#7a320d", glyphColor: "#ffffff" }, ink: "text-[#b04a15] dark:text-[#e07b3a]" },
  donee: { pin: { background: "#1e3a60", borderColor: "#12253f", glyphColor: "#ffffff" }, ink: "text-[#1e3a60] dark:text-[#7fb0e8]" },
  neutral: { ink: "text-[var(--handover-accent,#b04a15)]" },
};

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
  /** The handover form's "Use my location" button. */
  showLocateButton?: boolean;
  /** Show a pin at the start position even before one is placed (handover). */
  pinAtStart?: boolean;
  /** Text under the map; null hides it. */
  hint?: string | null;
  height?: number;
};

export function LocationPinPicker({
  pin, onPick, fallbackCenter = null, fallbackZoom = PIN_ZOOM, tone = "neutral", onUnavailable,
  showLocateButton = false, pinAtStart = false, hint, height = 260,
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
    ? (mapUsable ? "Tap the map to drop the pin, then drag it to the exact spot." : null)
    : hint;

  return (
    <div className="space-y-2">
      {!mapUsable ? <MapUnavailableNote /> : (
        <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-800" style={{ height }}>
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
          </APIProvider>
        </div>
      )}

      {(hintText || showLocateButton) && (
        <div className="flex items-center justify-between gap-3">
          {hintText ? (
            <p className="flex items-center gap-1.5 text-2xs text-stone-500 dark:text-stone-400">
              <MapPin className={`h-3.5 w-3.5 shrink-0 ${t.ink}`} aria-hidden />
              {hintText}
            </p>
          ) : <span />}
          {showLocateButton && (
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--handover-accent)]/30 bg-[var(--handover-accent)]/5 px-3 py-1.5 text-xs font-semibold text-[var(--handover-accent)] transition-colors hover:bg-[var(--handover-accent)]/10 disabled:opacity-70"
            >
              {locating
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Locating…</>
                : <><LocateFixed className="h-3.5 w-3.5" /> Use my location</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default LocationPinPicker;
