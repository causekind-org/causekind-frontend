"use client";

import { useEffect, useState } from "react";
import { profileCityCenterFromServer } from "@/app/actions/locations";
import type { LatLng } from "@/components/LocationPinPicker";

/** Street level for saved coordinates; town level for a city centre; wider for a state. */
export const MAP_ZOOM = { exact: 16, city: 12, state: 7 } as const;

export type MapStart = { center: LatLng; zoom: number };

/**
 * Where a map pin picker starts when the listing / request has no pin of its
 * own: the user's saved profile coordinates if any, otherwise the centre of
 * their profile City. Null means "nothing known", and the picker shows India.
 *
 * <p>Only the map's starting view: the city centre is never placed as a pin
 * and never used for matching.
 */
export function useProfileMapStart(profileCoords: LatLng | null, profileCity: string | null): MapStart | null {
  const [cityStart, setCityStart] = useState<MapStart | null>(null);

  useEffect(() => {
    if (profileCoords || !profileCity) return;
    let live = true;
    profileCityCenterFromServer(profileCity)
      .then((c) => { if (live && c) setCityStart({ center: { lat: c.lat, lng: c.lng }, zoom: MAP_ZOOM[c.level] }); })
      .catch(() => {});
    return () => { live = false; };
  }, [profileCoords, profileCity]);

  if (profileCoords) return { center: profileCoords, zoom: MAP_ZOOM.exact };
  return cityStart;
}
