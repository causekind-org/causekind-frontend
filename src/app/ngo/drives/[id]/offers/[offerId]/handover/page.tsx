"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getNgoDriveOffer,
  confirmNgoDriveOfferHandoverNgo,
  type NgoDriveOfferResponse,
  type NgoDriveOfferHandoverRecordResponse,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import HandoverCelebration from "@/components/handover/HandoverCelebration";
import { adaptNgoOffer } from "@/features/handover/adapters";
import { HandoverHubShell } from "@/features/handover/HandoverHubShell";
import { HandoverSkeleton } from "@/features/handover/HandoverSkeleton";
import { HandoverLoadError, HandoverNotAParticipant } from "@/features/handover/HandoverErrorStates";
import { useCoalescedReload } from "@/features/handover/useCoalescedReload";

export default function NgoDriveNgoHandoverHubPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const driveId = Number(params.id);
  const offerId = Number(params.offerId);

  const [offer, setOffer] = useState<NgoDriveOfferResponse | null>(null);
  const [handover, setHandover] = useState<NgoDriveOfferHandoverRecordResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!offerId || !driveId) return;
    setLoadError(null);
    try {
      const nextOffer = await getNgoDriveOffer(offerId);
      
      const cached = localStorage.getItem(`ck_handover_NGO_OFFER_${offerId}`);
      const nextHandover = cached ? JSON.parse(cached) : null;
      
      setOffer(nextOffer);
      setHandover(nextHandover);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "We couldn't load this handover.");
    } finally {
      setLoading(false);
    }
  }, [offerId, driveId]);

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
    } catch { }
  }, [offer?.status, offerId]);

  if (loading || authLoading) return <HandoverSkeleton />;
  if (loadError) return <HandoverLoadError message={loadError} onRetry={() => { setLoading(true); void reload(); }} />;

  const vm = offer ? adaptNgoOffer(offer, handover, user?.email, "DONEE") : null;
  if (!vm || !user) return <HandoverNotAParticipant />;

  return (
    <>
      <HandoverHubShell
        vm={vm}
        userEmail={user.email}
        otp={null} // Only donor generates OTP
        onChanged={reload}
        actions={{
          schedule: async () => { throw new Error("Only donor schedules"); },
          reschedule: async () => { throw new Error("Only donor reschedules"); },
          generateOtp: async () => { throw new Error("Only donor generates OTP"); },
          confirmDonor: async () => { throw new Error("Only donor confirms donor side"); },
          confirmDonee: async ({ otp: code, quantity }) => {
            applyHandover(await confirmNgoDriveOfferHandoverNgo(driveId, offerId, { 
              otp: code, 
              quantity: quantity 
            }));
          },
          setCallPermission: undefined,
          deliveryAddress: undefined,
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
