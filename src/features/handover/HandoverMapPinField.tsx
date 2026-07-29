"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, MapPinOff } from "lucide-react";

/**
 * Optional map pin, loaded only if asked for.
 *
 * <p>`LocationPinPicker` imports `@vis.gl/react-google-maps` at module scope, so a
 * static import pulled the whole maps client — and `APIProvider`'s script fetch —
 * into the scheduling dialog's first paint. The map is optional; the modal is not.
 *
 * <p>So: `next/dynamic` with `ssr: false` (the picker touches `navigator` and the
 * Google global, neither of which exists on the server), behind an explicit
 * control. Nothing is fetched until the donor opts in.
 *
 * <p>The one exception is a pin that already exists — on reschedule it is shown
 * straight away, because hiding a location the donor already chose behind a button
 * would read as having lost it.
 */
const LocationPinPicker = dynamic(() => import("@/components/LocationPinPicker"), {
  ssr: false,
  // Same height as the loaded picker, so opening it doesn't shift the fields
  // below — a layout jump inside a dialog is especially disorienting.
  loading: () => <MapSkeleton />,
});

/** Matches LocationPinPicker's rendered height to keep CLS at zero. */
function MapSkeleton() {
  return (
    <div
      className="h-[220px] w-full animate-pulse rounded-lg bg-stone-100 dark:bg-zinc-800"
      role="status"
      aria-label="Loading map"
    />
  );
}

export function HandoverMapPinField({ lat, lng, onChange, disabled }: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  disabled?: boolean;
}) {
  const hasPin = lat != null && lng != null;
  // Already-pinned locations open expanded; new ones stay collapsed until asked for.
  const [expanded, setExpanded] = useState(hasPin);

  // The dialog re-seeds lat/lng in an effect *after* opening, so on a reschedule
  // the existing pin can arrive one render late — after this component has
  // already initialised to collapsed. Sync forward only: an arriving pin expands
  // the map, but clearing one never collapses it under the donor mid-edit.
  useEffect(() => {
    if (hasPin) setExpanded(true);
  }, [hasPin]);

  if (!expanded) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setExpanded(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-stone-300 px-3.5 text-sm font-semibold text-stone-600 transition-colors hover:border-[var(--handover-accent)] hover:text-[var(--handover-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)] disabled:opacity-50 dark:border-zinc-700 dark:text-stone-300"
      >
        <MapPin className="h-4 w-4" aria-hidden />
        {hasPin ? "Edit map pin" : "Add exact map pin"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <LocationPinPicker lat={lat} lng={lng} onChange={onChange} />
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)] dark:hover:text-stone-300"
      >
        <MapPinOff className="h-3.5 w-3.5" aria-hidden />
        Hide map
        {/* Collapsing only hides the UI — the coordinates stay in form state, so a
            pin dropped and then hidden is still submitted. */}
      </button>
    </div>
  );
}
