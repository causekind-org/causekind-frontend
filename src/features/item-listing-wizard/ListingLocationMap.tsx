"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, Map, useMap, type MapMouseEvent } from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import { ApiStatusWatch, useGoogleMapsAuthFailure } from "@/components/LocationPinPicker";

/** India-focused default, as in LocationPinPicker, when nothing else is known. */
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const PIN_ZOOM = 16;
const AREA_ZOOM = 12;
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

type LatLng = { lat: number; lng: number };

/**
 * The "Where is the item?" map: tap to drop the pin, drag it to adjust, zoom
 * with the controls or a pinch.
 *
 * <p>Same Google Maps setup as the handover pin (LocationPinPicker), and the
 * same two failure checks. `gestureHandling="cooperative"` keeps a one-finger
 * swipe scrolling the page on phones instead of trapping it inside the map.
 *
 * <p>`recenter` changes when the pin is moved from outside the map (an address
 * typed into the fields), so the map follows it — but never while the donor is
 * dragging, which would jerk the map under their finger.
 */
export function ListingLocationMap({
  pin, fallbackCenter, recenter, onPick, onUnavailable,
}: {
  pin: LatLng | null;
  /** Where to look when there is no pin yet (the donor's profile). */
  fallbackCenter: LatLng | null;
  recenter: number;
  onPick: (lat: number, lng: number) => void;
  onUnavailable: () => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [failed, setFailed] = useState(!apiKey);
  useGoogleMapsAuthFailure(() => setFailed(true));
  useEffect(() => { if (failed) onUnavailable(); }, [failed, onUnavailable]);

  if (failed || !apiKey) return null;

  const start = pin ?? fallbackCenter ?? DEFAULT_CENTER;
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-800" style={{ height: 260 }}>
      <APIProvider apiKey={apiKey} onError={() => setFailed(true)}>
        <ApiStatusWatch onFailure={() => setFailed(true)} />
        <Map
          defaultCenter={start}
          defaultZoom={pin || fallbackCenter ? PIN_ZOOM : AREA_ZOOM}
          mapId={MAP_ID}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          clickableIcons={false}
          onClick={(e: MapMouseEvent) => {
            const ll = e.detail.latLng;
            if (ll) onPick(ll.lat, ll.lng);
          }}
        >
          {pin && (
            <AdvancedMarker
              position={pin}
              draggable
              title="Item location"
              onDragEnd={(e) => {
                const lat = e.latLng?.lat();
                const lng = e.latLng?.lng();
                if (lat != null && lng != null) onPick(lat, lng);
              }}
            />
          )}
          <FollowPin pin={pin} recenter={recenter} />
        </Map>
      </APIProvider>
    </div>
  );
}

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

/** Shown in place of the map when it cannot load. */
export function MapUnavailableNote() {
  return (
    <p role="status" className="flex items-start gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-2xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      The map couldn&apos;t load. Fill in the address below — we&apos;ll place your item from it.
    </p>
  );
}
