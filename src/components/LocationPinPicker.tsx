"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { LocateFixed, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

// India-focused platform default — New Delhi — used whenever no lat/lng has
// been picked yet (mirrors the "IN" country default used by other GPS
// location code in this repo).
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const DEFAULT_ZOOM = 15;
const LOCATED_ZOOM = 17;

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

  if (!apiKey) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
        Map picker isn&apos;t configured yet — you can still type an address above.
      </div>
    );
  }

  const position = lat != null && lng != null ? { lat, lng } : DEFAULT_CENTER;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700" style={{ height: 280 }}>
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={position}
            defaultZoom={DEFAULT_ZOOM}
            mapId="DEMO_MAP_ID"
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
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">Drag the pin to your exact meeting spot</p>
        {/* "Use my current location" — drops the pin on the user's actual GPS spot */}
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#b04a15]/30 bg-[#b04a15]/5 px-3 py-1.5 text-xs font-semibold text-[#b04a15] transition-colors hover:bg-[#b04a15]/10 disabled:opacity-70 dark:border-orange-300/30 dark:bg-orange-300/10 dark:text-orange-300 dark:hover:bg-orange-300/20"
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
