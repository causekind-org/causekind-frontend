"use client";

/**
 * Purchase hub route — loads the offer and the role-filtered purchase view and
 * hands both to `PurchaseHub`. Mirrors the handover page: one global SSE stream
 * via useEntityUpdates, coalesced reloads, and no fallback to donor controls
 * for a viewer the server did not place on either side.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getDonationOffer, getPurchase, type DonationOffer, type PurchaseView } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { useCoalescedReload } from "@/features/handover/useCoalescedReload";
import { HandoverSkeleton } from "@/features/handover/HandoverSkeleton";
import { HandoverLoadError, HandoverNotAParticipant } from "@/features/handover/HandoverErrorStates";
import { PurchaseHub } from "@/features/purchase/PurchaseHub";

export default function OfferPurchasePage() {
  const params = useParams();
  const offerId = Number(params.id);
  const { user, isLoading: authLoading } = useAuth();

  const [offer, setOffer] = useState<DonationOffer | null>(null);
  const [view, setView] = useState<PurchaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!offerId) return;
    setLoadError(null);
    try {
      const [o, v] = await Promise.all([getDonationOffer(offerId), getPurchase(offerId)]);
      setOffer(o);
      setView(v);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "We couldn't load this purchase.");
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  const { reload } = useCoalescedReload(fetchAll);
  useEffect(() => { void reload(); }, [reload]);

  useEntityUpdates(["OFFER"], (_latest, batch) => {
    if (batch.some(d => d.entityId === offerId)) void reload();
  });

  if (loading || authLoading) return <HandoverSkeleton />;
  if (loadError) return <HandoverLoadError message={loadError} onRetry={() => { setLoading(true); void reload(); }} />;

  const role = offer?.viewerRole;
  if (!offer || !view || !user || !role) return <HandoverNotAParticipant />;

  return <PurchaseHub offer={offer} view={view} role={role} onChanged={reload} />;
}
