"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

// India-focused platform default — New Delhi — used whenever no lat/lng has
// been picked yet (mirrors the "IN" country default used by other GPS
// location code in this repo).
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const DEFAULT_ZOOM = 15;

type LocationPinPickerProps = {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
};

// Draggable Google Maps pin for picking an exact handover meeting spot.
// Renders nothing (just a neutral note) if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
// isn't configured yet — the rest of the Schedule Handover form still works
// with just the free-text address field in that case.
export default function LocationPinPicker({ lat, lng, onChange }: LocationPinPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
          </Map>
        </APIProvider>
      </div>
      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">Drag the pin to your exact meeting spot</p>
    </div>
  );
}
