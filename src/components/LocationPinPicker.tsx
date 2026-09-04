"use client";

import { useEffect, useRef, useState } from "react";
import {
  APIProvider, APILoadingStatus, Map, AdvancedMarker, useMap, useApiLoadingStatus,
} from "@vis.gl/react-google-maps";
import { LocateFixed, Loader2 } from "lucide-react";
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

// India-focused platform default — New Delhi — used whenever no lat/lng has
// been picked yet (mirrors the "IN" country default used by other GPS
// location code in this repo).
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const DEFAULT_ZOOM = 15;
const LOCATED_ZOOM = 17;

/**
 * AdvancedMarker needs a vector Map ID, and "DEMO_MAP_ID" is Google's *demo*
 * identifier — fine for local work, explicitly not for production. Set
 * NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID to a Map ID created in the Cloud console
 * (Maps → Map Management, rendering type: Vector).
 */
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/**
 * Shown when the map cannot be used at all — no key, or a key Google rejects.
 *
 * <p>One component for both, because they are the same situation for the user:
 * they cannot drop a pin either way. Two near-identical strings in two branches
 * is how they drift.
 */
function MapUnavailable() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
      Map picker isn&apos;t available right now — you can still type an address above
      or use the button below.
    </div>
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
 * case is caught by the `gm_authFailure` effect in the component below — if you
 * are tempted to delete one as redundant, they cover different failures.
 */
function ApiStatusWatch({ onFailure }: { onFailure: () => void }) {
  const status = useApiLoadingStatus();
  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE || status === APILoadingStatus.FAILED) {
      onFailure();
    }
  }, [status, onFailure]);
  return null;
}

type LocationPinPickerProps = {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
};

// Small child that lives INSIDE <Map> so it can grab the real map instance via
// useMap() and pan/zoom to a spot on demand. It only reacts to `flyTo` (a
// deliberate "recenter" request from the locate button) — NOT to every pin
// drag, otherwise the map would jerk under the user's finger while dragging.
function MapFlyTo({ flyTo }: { flyTo: { lat: number; lng: number; key: number } | null }) {
  const map = useMap();
  const lastKey = useRef<number>(-1);

  useEffect(() => {
    if (!map || !flyTo || flyTo.key === lastKey.current) return;
    lastKey.current = flyTo.key;
    map.panTo({ lat: flyTo.lat, lng: flyTo.lng });
    map.setZoom(LOCATED_ZOOM);
  }, [map, flyTo]);

  return null;
}

// Draggable Google Maps pin for picking an exact handover meeting spot.
// Renders nothing (just a neutral note) if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
// isn't configured yet — the rest of the Schedule Handover form still works
// with just the free-text address field in that case.
export default function LocationPinPicker({ lat, lng, onChange }: LocationPinPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [locating, setLocating] = useState(false);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; key: number } | null>(null);
  /** Set when Google refuses the key (InvalidKeyMapError, billing, referrer). */
  const [apiFailed, setApiFailed] = useState(false);

  // The only thing that actually catches a rejected key — see ApiStatusWatch
  // above for why the library's own status cannot. Chained rather than
  // replaced, and restored on unmount, so a second picker mounted on the same
  // page doesn't silently disable the first one's handler.
  useEffect(() => {
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => {
      previous?.();
      setApiFailed(true);
    };
    return () => {
      window.gm_authFailure = previous;
    };
  }, []);

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        onChange(newLat, newLng);
        setFlyTo({ lat: newLat, lng: newLng, key: Date.now() });
        setLocating(false);
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

  const position = lat != null && lng != null ? { lat, lng } : DEFAULT_CENTER;

  // No key, or a key Google refused. Either way the map is out — but the locate
  // button below is pure navigator.geolocation and still produces the lat/lng
  // this form actually submits, so it stays.
  const mapUsable = !!apiKey && !apiFailed;

  return (
    <div>
      {!mapUsable ? (
        <MapUnavailable />
      ) : (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700" style={{ height: 280 }}>
        <APIProvider
          apiKey={apiKey as string}
          onError={(e) => {
            setApiFailed(true);
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
          <ApiStatusWatch onFailure={() => setApiFailed(true)} />
          <Map
            defaultCenter={position}
            defaultZoom={DEFAULT_ZOOM}
            mapId={MAP_ID}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <AdvancedMarker
              position={position}
              draggable
              onDragEnd={(e) => {
                const newLat = e.latLng?.lat();
                const newLng = e.latLng?.lng();
                if (newLat != null && newLng != null) onChange(newLat, newLng);
              }}
            />
            <MapFlyTo flyTo={flyTo} />
          </Map>
        </APIProvider>
      </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {mapUsable
            ? "Drag the pin to your exact meeting spot"
            : "We'll save your exact coordinates"}
        </p>
        {/* "Use my current location" — drops the pin on the user's actual GPS spot */}
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--handover-accent)]/30 bg-[var(--handover-accent)]/5 px-3 py-1.5 text-xs font-semibold text-[var(--handover-accent)] transition-colors hover:bg-[var(--handover-accent)]/10 disabled:opacity-70"
        >
          {locating ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Locating…</>
          ) : (
            <><LocateFixed className="h-3.5 w-3.5" /> Use my location</>
          )}
        </button>
      </div>
    </div>
  );
}
