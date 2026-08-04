"use client";

/**
 * OFFER Handover Hub — a thin adapter over the shared workspace.
 *
 * <p>All layout, copy and interaction live in `@/features/handover`. This file's
 * only jobs are: load the two entities, map them through `adaptOffer`, and hand
 * the offer-specific API calls to the shell. The match hub is its mirror image.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getDonationOffer, getHandover, scheduleHandover, rescheduleHandover,
  generateHandoverOtp, confirmHandoverDonor, confirmHandoverDonee,
  setDoneeCallPermission,
  type DonationOffer, type HandoverRecord, type OfferHandoverMethod,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import HandoverCelebration from "@/components/handover/HandoverCelebration";
import { adaptOffer } from "@/features/handover/adapters";
import { HandoverHubShell } from "@/features/handover/HandoverHubShell";
import { HandoverSkeleton } from "@/features/handover/HandoverSkeleton";
import { HandoverLoadError, HandoverNotAParticipant } from "@/features/handover/HandoverErrorStates";
import { useCoalescedReload } from "@/features/handover/useCoalescedReload";

export default function OfferHandoverHubPage() {
  const params = useParams();
  const { user } = useAuth();
  const offerId = Number(params.id);

  const [offer, setOffer] = useState<DonationOffer | null>(null);
  const [handover, setHandover] = useState<HandoverRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!offerId) return;
    setLoadError(null);
    try {
      const [nextOffer, nextHandover] = await Promise.all([
        getDonationOffer(offerId),
        // A 404 genuinely means "not scheduled yet" and is a normal state.
        // Anything else — 500, network, auth — must NOT be swallowed into the
        // same "no record" branch, which is what the old page did.
        getHandover(offerId).catch((e: unknown) => {
          const message = e instanceof Error ? e.message : "";
          if (/not found|no handover/i.test(message)) return null;
          throw e;
        }),
      ]);
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

  // One global SSE stream, rebroadcast as window events — no second EventSource.
  // A mutation's own response and the SSE event describing it arrive together;
  // useCoalescedReload collapses them into at most one extra request.
  useEntityUpdates(["OFFER", "HANDOVER"], (_latest, batch) => {
    if (!offerId || !batch.some((d) => d.entityId === offerId)) return;
    void reload();
  });

  /**
   * A scheduling mutation returns the new HandoverRecord, which is the whole
   * point of the response — so it is applied directly and the dialog closes on it.
   * The offer's *status* also changes (ADMIN_APPROVED → HANDOVER_IN_PROGRESS) and
   * is not in that response, so a reconcile is kicked off but deliberately NOT
   * awaited: awaiting it kept the Save button spinning through a second round
   * trip for data the user cannot see yet.
   */
  const applyHandover = useCallback((record: HandoverRecord) => {
    setHandover(record);
    void reload();
  }, [reload]);

  useEffect(() => {
    if (offer?.status !== "COMPLETED" || !offerId) return;
    const key = `ck_celebrated_OFFER_${offerId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      setCelebrate(true);
    } catch { /* private mode — never block the page */ }
  }, [offer?.status, offerId]);

  if (loading) return <HandoverSkeleton />;
  if (loadError) return <HandoverLoadError message={loadError} onRetry={() => { setLoading(true); void reload(); }} />;

  const vm = offer ? adaptOffer(offer, handover, user?.email) : null;
  // Null means the server did not place this viewer on either side of the
  // transaction. Never fall through to the donor's controls.
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
            applyHandover(await scheduleHandover(offerId, {
              method: p.method as OfferHandoverMethod,
              scheduledDateTime: p.scheduledDateTime,
              locationAddress: p.address,
              ...(p.latitude != null && p.longitude != null
                ? { locationLatitude: p.latitude, locationLongitude: p.longitude } : {}),
            }));
          },
          reschedule: async (p) => {
            applyHandover(await rescheduleHandover(offerId, {
              scheduledDateTime: p.scheduledDateTime,
              locationAddress: p.address,
              rescheduleReason: p.reason,
              ...(p.latitude != null && p.longitude != null
                ? { locationLatitude: p.latitude, locationLongitude: p.longitude } : {}),
            }));
          },
          generateOtp: async () => {
            const { otp: code } = await generateHandoverOtp(offerId);
            // Session state only — never persisted, so a reload clears it.
            setOtp(code);
          },
          // Confirmation flips the offer status too (dual confirm →
          // ISSUE_WINDOW_OPEN), so the same apply-then-reconcile applies.
          confirmDonor: async ({ quantity }) => {
            applyHandover(await confirmHandoverDonor(offerId, quantity));
          },
          confirmDonee: async ({ otp: code, quantity, conditionRating }) => {
            applyHandover(await confirmHandoverDonee(offerId, {
              otp: code, quantityReceived: quantity, conditionRating,
            }));
          },
          setCallPermission: vm.role === "DONOR"
            ? async (next) => { setOffer(await setDoneeCallPermission(offerId, next)); }
            : undefined,
        }}
      />
      <HandoverCelebration
        // Participation role, not account role — see HandoverCelebration.Props
        role={vm.role}
        contextType="OFFER"
        contextId={offerId}
        open={celebrate}
        onClose={() => setCelebrate(false)}
      />
    </>
  );
}
