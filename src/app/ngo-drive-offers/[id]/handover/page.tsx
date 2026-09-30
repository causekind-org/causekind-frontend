"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getNgoDriveOffer, scheduleNgoDriveOfferHandover, rescheduleNgoDriveOfferHandover,
  generateNgoDriveOfferHandoverOtp, confirmNgoDriveOfferHandoverDonor,
  type NgoDriveOfferResponse, type NgoDriveOfferHandoverRecordResponse,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import HandoverCelebration from "@/components/handover/HandoverCelebration";
import { adaptNgoOffer } from "@/features/handover/adapters";
import { HandoverHubShell } from "@/features/handover/HandoverHubShell";
import { HandoverSkeleton } from "@/features/handover/HandoverSkeleton";
import { HandoverLoadError, HandoverNotAParticipant } from "@/features/handover/HandoverErrorStates";
import { useCoalescedReload } from "@/features/handover/useCoalescedReload";

export default function NgoDriveOfferHandoverHubPage() {
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const offerId = Number(params.id);

  const [offer, setOffer] = useState<NgoDriveOfferResponse | null>(null);
  const [handover, setHandover] = useState<NgoDriveOfferHandoverRecordResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!offerId) return;
    setLoadError(null);
    try {
      const nextOffer = await getNgoDriveOffer(offerId);
      // FAKE handover fetch since backend has no GET endpoint for it.
      // We rely on mutations to get the actual handover record, or we just reconstruct it from local cache.
      // For now, try to load from local storage if available, else null.
      const cached = localStorage.getItem(`ck_handover_NGO_OFFER_${offerId}`);
      const nextHandover = cached ? JSON.parse(cached) : null;
      
      setOffer(nextOffer);
      setHandover(nextHandover);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "We couldn't load this handover.");
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  const { reload } = useCoalescedReload(fetchAll);

  useEffect(() => { void reload(); }, [reload]);

  useEntityUpdates(["NGO_DRIVE_OFFER"], (_latest, batch) => {
    if (!offerId || !batch.some((d) => d.entityId === offerId)) return;
    void reload();
  });

  const applyHandover = useCallback((record: NgoDriveOfferHandoverRecordResponse) => {
    setHandover(record);
    localStorage.setItem(`ck_handover_NGO_OFFER_${offerId}`, JSON.stringify(record));
    void reload();
  }, [reload, offerId]);

  useEffect(() => {
    if (offer?.status !== "COMPLETED" || !offerId) return;
    const key = `ck_celebrated_NGO_OFFER_${offerId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      setCelebrate(true);
    } catch { /* private mode — never block the page */ }
  }, [offer?.status, offerId]);

  if (loading || authLoading) return <HandoverSkeleton />;
  if (loadError) return <HandoverLoadError message={loadError} onRetry={() => { setLoading(true); void reload(); }} />;

  const vm = offer ? adaptNgoOffer(offer, handover, user?.email, "DONOR") : null;
  if (!vm || !user) return <HandoverNotAParticipant />;

  return (
    <>
      <HandoverHubShell
        vm={vm}
        userEmail={user.email}
        otp={otp}
        onChanged={reload}
        actions={{
          schedule: async (p) => {
            applyHandover(await scheduleNgoDriveOfferHandover(offerId, {
              method: p.method,
              scheduledDateTime: p.scheduledDateTime,
              locationAddress: p.address,
              ...(p.latitude != null && p.longitude != null
                ? { locationLatitude: p.latitude, locationLongitude: p.longitude } : {}),
            }));
          },
          reschedule: async (p) => {
            applyHandover(await rescheduleNgoDriveOfferHandover(offerId, {
              scheduledDateTime: p.scheduledDateTime,
              locationAddress: p.address,
              rescheduleReason: p.reason,
              ...(p.latitude != null && p.longitude != null
                ? { locationLatitude: p.latitude, locationLongitude: p.longitude } : {}),
            }));
          },
          generateOtp: async () => {
            const { otp: code } = await generateNgoDriveOfferHandoverOtp(offerId);
            setOtp(code);
          },
          confirmDonor: async ({ quantity }) => {
            applyHandover(await confirmNgoDriveOfferHandoverDonor(offerId, { quantityHandedOver: quantity, verificationMethod: "OTP", notes: "" }));
          },
          confirmDonee: async () => { throw new Error("Only for NGO side"); },
          setCallPermission: undefined, // Not applicable
          deliveryAddress: undefined, // Not applicable
        }}
      />
      <HandoverCelebration
        role={vm.role}
        contextType="OFFER"
        contextId={offerId}
        open={celebrate}
        onClose={() => setCelebrate(false)}
      />
    </>
  );
}
