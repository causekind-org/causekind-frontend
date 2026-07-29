"use client";

/**
 * MATCH Handover Hub — mirror of the offer hub, over the match backend.
 *
 * <p>The backends stay separate on purpose (see `features/handover/adapters.ts`).
 * The user-visible difference this page must not paper over: dual confirmation
 * completes a match *immediately* and mints its certificate code, where an offer
 * goes through an issue window first.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getMatch, saveMatchLogistics, generateDeliveryOtp,
  confirmMatchHandoverDonor, confirmMatchHandoverDonee, setMatchDoneeCallPermission,
  type ItemMatch,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import HandoverCelebration from "@/components/handover/HandoverCelebration";
import { adaptMatch } from "@/features/handover/adapters";
import { HandoverHubShell } from "@/features/handover/HandoverHubShell";
import { HandoverSkeleton } from "@/features/handover/HandoverSkeleton";
import { HandoverLoadError, HandoverNotAParticipant } from "@/features/handover/HandoverErrorStates";
import { useCoalescedReload } from "@/features/handover/useCoalescedReload";

export default function MatchHandoverHubPage() {
  const params = useParams();
  const { user } = useAuth();
  const matchId = Number(params.id);

  const [match, setMatch] = useState<ItemMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const fetchMatch = useCallback(async () => {
    if (!matchId) return;
    setLoadError(null);
    try {
      setMatch(await getMatch(matchId));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "We couldn't load this handover.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const { reload } = useCoalescedReload(fetchMatch);

  useEffect(() => { void reload(); }, [reload]);

  // The mutation response and the SSE event describing it land together;
  // useCoalescedReload collapses them rather than firing two GETs.
  useEntityUpdates(["MATCH"], (_latest, batch) => {
    if (!matchId || !batch.some((d) => d.entityId === matchId)) return;
    void reload();
  });

  useEffect(() => {
    if (match?.status !== "COMPLETED" && match?.status !== "FULFILLED") return;
    const key = `ck_celebrated_MATCH_${matchId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      setCelebrate(true);
    } catch { /* private mode — never block the page */ }
  }, [match?.status, matchId]);

  if (loading) return <HandoverSkeleton />;
  if (loadError) return <HandoverLoadError message={loadError} onRetry={() => { setLoading(true); void reload(); }} />;

  const vm = match ? adaptMatch(match, user?.email) : null;
  if (!vm || !user) return <HandoverNotAParticipant />;

  // Scheduling and rescheduling are the same endpoint here — the match backend
  // has no separate reschedule call, it increments the counter on save.
  // saveMatchLogistics returns the complete updated ItemMatch — status, logistics
  // and confirmation state all live on the one entity here — so unlike the offer
  // flow there is genuinely nothing left to reconcile. No follow-up GET at all.
  const saveLogistics = async (p: {
    method: string; scheduledDateTime: string; address?: string;
    latitude?: number; longitude?: number; notes?: string;
  }) => {
    setMatch(await saveMatchLogistics(matchId, {
      handoverMethod: p.method,
      pickupDateTime: p.scheduledDateTime,
      handoverAddress: p.address,
      notes: p.notes,
      ...(p.latitude != null && p.longitude != null
        ? { handoverLatitude: p.latitude, handoverLongitude: p.longitude } : {}),
    }));
  };

  return (
    <>
      <HandoverHubShell
        vm={vm}
        userEmail={user.email}
        otp={otp}
        onChanged={reload}
        actions={{
          schedule: saveLogistics,
          reschedule: saveLogistics,
          generateOtp: async () => {
            const { otp: code } = await generateDeliveryOtp(matchId);
            setOtp(code);   // session only, never persisted
          },
          confirmDonor: async ({ quantity }) => {
            setMatch(await confirmMatchHandoverDonor(matchId, { quantityHandedOver: quantity }));
          },
          confirmDonee: async ({ otp: code, quantity, conditionRating }) => {
            setMatch(await confirmMatchHandoverDonee(matchId, {
              otp: code, quantityReceived: quantity, conditionRating,
            }));
          },
          setCallPermission: vm.role === "DONOR"
            ? async (next) => { setMatch(await setMatchDoneeCallPermission(matchId, next)); }
            : undefined,
        }}
      />
      <HandoverCelebration
        contextType="MATCH"
        contextId={matchId}
        open={celebrate}
        onClose={() => setCelebrate(false)}
      />
    </>
  );
}
