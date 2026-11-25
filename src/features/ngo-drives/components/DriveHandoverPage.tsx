"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import {
  getNgoDriveOffer, getNgoDriveOfferForNgo, getNgoDriveOfferHandover, getNgoOverview, invalidateRequestCache,
  type NgoDriveOfferResponse, type NgoDriveOfferHandoverRecordResponse,
} from "@/lib/api";
import { PageSkeleton } from "@/components/skeletons";
import { type DriveHandoverRole } from "./DriveHandover";
import { DriveHandoverHub } from "./DriveHandoverHub";
import { DriveLoadError, HandoverNotFound } from "./DriveLoadState";
import { errorMessage, isForbidden, isNotFound } from "../driveGiveState";
import { toast } from "sonner";
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
      // Handover first: reading it can complete a handover that was already ready (code
      // confirmed + photo), so the offer read after it shows the up-to-date status.
      const h = await getNgoDriveOfferHandover(offerId);
      const o = await (role === "NGO" && driveId ? getNgoDriveOfferForNgo(driveId, offerId) : getNgoDriveOffer(offerId));
      setOffer(o); setHandover(h); setState("ready");
    } catch (e) {
      setState(isNotFound(e) ? "not-found" : "error");
      setMessage(errorMessage(e, "Please check your connection and try again."));
    }
  }, [role, driveId, offerId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`); return; }
    // An NGO opening the donor's link (/ngo-drive-offers/{id}/handover, e.g. from a shared message)
    // got "You don't have access to this". Send it to its own page for the same handover instead.
    if (role === "DONOR" && (user.role === "NGO" || user.role === "NGO_PARTNER")) {
      void getNgoOverview()
        .then((o) => {
          const own = (o?.handovers ?? []).find((h) => h.kind === "DRIVE_OFFER" && h.id === offerId);
          if (own?.href) router.replace(own.href); else void load();
        })
        .catch(() => void load());
      return;
    }
    void load();
  }, [authLoading, user, router, load, role, offerId]);
  useEntityUpdates(["NGO_DRIVE_OFFER", "NGO_DRIVE"], () => { invalidateRequestCache(); void load(); });

  // The thank-you celebration is for the donor who gave; the NGO only received.
  // The NGO gets a quiet "received" note instead, once per handover.
  useEffect(() => {
    if (!offer || !NGO_DRIVE_OFFER_DONE.has(offer.status) || !offerId) return;
    if (!claimCelebration("NGO_DRIVE_OFFER", offerId, user?.email)) return;
    if (role !== "NGO") { setCelebrate(true); return; }
    const qty = handover?.confirmation?.ngoConfirmedQty ?? offer.quantity ?? 0;
    // "1 set" / "20 sets": lower-case unit, singular for one.
    const base = offer.driveUnit ? offer.driveUnit.replaceAll("_", " ").toLowerCase() : "items";
    const unit = qty === 1 ? base.replace(/(?<![se])s$/, "") : base;
    toast.success("Items received", {
      description: `${qty} ${unit} added to ${offer.driveTitle || "your drive"}.`,
      action: offer.driveId ? { label: "View drive", onClick: () => router.push(`/ngo/drives/${offer.driveId}`) } : undefined,
      classNames: {
        toast: "!rounded-2xl !border-emerald-200 !bg-white !text-stone-900 !shadow-lg dark:!border-emerald-900 dark:!bg-zinc-900 dark:!text-stone-100",
        title: "!font-semibold !text-emerald-800 dark:!text-emerald-300",
        description: "!text-stone-600 dark:!text-stone-300",
        icon: "!text-emerald-600",
        actionButton: "!rounded-full !bg-emerald-700 !px-4 !font-semibold !text-white hover:!bg-emerald-800",
      },
    });
  }, [role, offer, handover, offerId, user?.email, router]);

  if (authLoading || !user || state === "loading") return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (state === "not-found") {
    return <HandoverNotFound driveId={driveId} role={role} />;
  }
  if (state === "error" || !offer) return <DriveLoadError title="We couldn't load this handover" message={message} onRetry={() => { setState("loading"); void load(); }} />;
  return (
    <>
      <DriveHandoverHub role={role} offer={offer} handover={handover} userEmail={user.email ?? ""} onChanged={() => void load()} />
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
