"use client";

import { useCallback, useEffect, useState } from "react";
import { getNgoDriveOffersForNgo, type NgoDrive, type NgoDriveOfferResponse } from "@/lib/api";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";

/** Drives that can still hold offers worth listing (review, handovers or history). */
const HAS_OFFERS = new Set(["LIVE", "FULLY_PLEDGED", "COLLECTION_COMPLETE", "PROOF_SUBMITTED", "FULFILLED", "CLOSED", "CANCELLED"]);

export type DriveOffer = NgoDriveOfferResponse & { drive: NgoDrive };

/**
 * Every offer on the NGO's drives, each tagged with its drive. An NGO runs one drive at a
 * time plus a few finished ones, so this reuses the per-drive offers endpoint.
 */
export function useNgoOffers(drives: NgoDrive[], enabled: boolean) {
  const [offers, setOffers] = useState<DriveOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = drives.map((d) => `${d.id}:${d.status}`).join(",");

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const withOffers = drives.filter((d) => HAS_OFFERS.has(d.status));
      const lists = await Promise.all(withOffers.map(async (d) => (await getNgoDriveOffersForNgo(d.id)).map((o) => ({ ...o, drive: d }))));
      setOffers(lists.flat());
    } catch {
      setError("LOAD_FAILED"); // code; ActivityTab shows the translated message
    } finally {
      setLoading(false);
    }
  }, [enabled, key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);
  useEntityUpdates(["NGO_DRIVE", "NGO_DRIVE_OFFER"], () => { void load(); });

  return { offers, loading, error, reload: load };
}
