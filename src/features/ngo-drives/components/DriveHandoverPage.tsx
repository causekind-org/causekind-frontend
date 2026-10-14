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
import { DriveLoadError } from "./DriveLoadState";
import { errorMessage, isNotFound } from "../driveGiveState";
import Link from "next/link";

/** Loads one drive offer and its handover for the donor or the drive's NGO. */
export function DriveHandoverPage({ role, offerId, driveId }: { role: DriveHandoverRole; offerId: number; driveId?: number }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [offer, setOffer] = useState<NgoDriveOfferResponse | null>(null);
  const [handover, setHandover] = useState<NgoDriveOfferHandoverRecordResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!offerId) return;
    try {
      const [o, h] = await Promise.all([
        role === "NGO" && driveId ? getNgoDriveOfferForNgo(driveId, offerId) : getNgoDriveOffer(offerId),
        getNgoDriveOfferHandover(offerId),
      ]);
      setOffer(o); setHandover(h); setState("ready");
    } catch (e) {
      setState(isNotFound(e) ? "not-found" : "error");
      setMessage(errorMessage(e, "Please check your connection and try again."));
    }
  }, [role, driveId, offerId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`); return; }
    void load();
  }, [authLoading, user, router, load]);
  useEntityUpdates(["NGO_DRIVE_OFFER", "NGO_DRIVE"], () => { void load(); });

  if (authLoading || !user || state === "loading") return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (state === "not-found") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">Handover not found</h2>
        <Link href={role === "NGO" ? "/ngo/handovers" : "/dashboard"} className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-stone-900 px-6 text-sm font-bold text-white dark:bg-stone-100 dark:text-stone-900">
          {role === "NGO" ? "Back to handovers" : "Back to your dashboard"}
        </Link>
      </div>
    );
  }
  if (state === "error" || !offer) return <DriveLoadError message={message} onRetry={() => { setState("loading"); void load(); }} />;
  return <DriveHandover role={role} offer={offer} handover={handover} onChanged={() => void load()} />;
}
