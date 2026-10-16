"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import {
  getNgoDriveOffer, getNgoDriveOfferForNgo, getNgoDriveOfferHandover,
  type NgoDriveOfferResponse, type NgoDriveOfferHandoverRecordResponse,
} from "@/lib/api";
import { PageSkeleton } from "@/components/skeletons";
import { DriveHandover, type DriveHandoverRole } from "./DriveHandover";
import { DriveLoadError, HandoverNotFound } from "./DriveLoadState";
import { errorMessage, isForbidden, isNotFound } from "../driveGiveState";
import HandoverCelebration from "@/components/handover/HandoverCelebration";
import { claimCelebration, NGO_DRIVE_OFFER_DONE } from "@/lib/celebration";

/** Loads one drive offer and its handover for the donor or the drive's NGO. */
export function DriveHandoverPage({ role, offerId, driveId }: { role: DriveHandoverRole; offerId: number; driveId?: number }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [offer, setOffer] = useState<NgoDriveOfferResponse | null>(null);
  const [handover, setHandover] = useState<NgoDriveOfferHandoverRecordResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [message, setMessage] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const load = useCallback(async () => {
    if (!offerId) return;
    try {
      const [o, h] = await Promise.all([
        role === "NGO" && driveId ? getNgoDriveOfferForNgo(driveId, offerId) : getNgoDriveOffer(offerId),
        getNgoDriveOfferHandover(offerId),
      ]);
      setOffer(o); setHandover(h); setState("ready");
    } catch (e) {
      setState(isNotFound(e) || isForbidden(e) ? "not-found" : "error");
      setMessage(errorMessage(e, "Please check your connection and try again."));
    }
  }, [role, driveId, offerId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`); return; }
    void load();
  }, [authLoading, user, router, load]);
  useEntityUpdates(["NGO_DRIVE_OFFER", "NGO_DRIVE"], () => { void load(); });

  useEffect(() => {
    if (!offer || !NGO_DRIVE_OFFER_DONE.has(offer.status) || !offerId) return;
    if (claimCelebration("NGO_DRIVE_OFFER", offerId, user?.email)) {
      setCelebrate(true);
    }
  }, [offer, offerId, user?.email]);

  if (authLoading || !user || state === "loading") return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (state === "not-found") {
    return <HandoverNotFound driveId={driveId} role={role} />;
  }
  if (state === "error" || !offer) return <DriveLoadError message={message} onRetry={() => { setState("loading"); void load(); }} />;
  return (
    <>
      <DriveHandover role={role} offer={offer} handover={handover} onChanged={() => void load()} />
      <HandoverCelebration
        role={role}
        contextType="NGO_DRIVE_OFFER"
        contextId={offerId}
        open={celebrate}
        onClose={() => setCelebrate(false)}
      />
    </>
  );
}
