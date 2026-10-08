"use client";

import { useCallback, useState } from "react";

/**
 * "Use my location" (owner, 2026-10-08): asks the browser for the device's
 * position and hands it to `onFound` — the form's own pin handler, so the pin
 * drops and the address fields fill exactly as a tap on the map would.
 */
export function useLocateMe(onFound: (lat: number, lng: number) => void) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("This browser can't share your location. Tap the map instead.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => { setLocating(false); onFound(pos.coords.latitude, pos.coords.longitude); },
      err => {
        setLocating(false);
        setError(err.code === err.PERMISSION_DENIED
          ? "Location access is blocked. Allow it for this site in your browser, or tap the map."
          : "We couldn't find your location. Tap the map instead.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, [onFound]);

  return { locate, locating, error };
}
