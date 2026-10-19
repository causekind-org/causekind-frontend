"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  getNgoDrive, getMyNgoDriveOffers, getNgoDriveOffer, createNgoDriveOfferDraft,
  type PublicNgoDrive, type NgoDriveOfferResponse,
} from "@/lib/api";
import { NgoDriveOfferWizard } from "@/features/ngo-drives/components/NgoDriveOfferWizard";
import { offerSentKey, type DriveOfferSent } from "@/features/ngo-drives/components/DriveOfferSentModal";
import { DriveLoadError, DriveNotFound } from "@/features/ngo-drives/components/DriveLoadState";
import { errorMessage, giveState, isNotFound, stillNeeded } from "@/features/ngo-drives/driveGiveState";
import { PageSkeleton } from "@/components/skeletons";
import { driveAcceptedConditions } from "@/features/ngo-drives/driveConditions";

type View =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | { kind: "blocked"; title: string; body: string; link?: { href: string; label: string } }
  | { kind: "wizard"; drive: PublicNgoDrive; offer: NgoDriveOfferResponse };


export default function DriveGivePage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [view, setView] = useState<View>({ kind: "loading" });

  const draftRequest = useRef<{ driveId: number; promise: ReturnType<typeof createNgoDriveOfferDraft> } | null>(null);
  const load = useCallback(async () => {
    if (!user || Number.isNaN(id)) return;
    setView({ kind: "loading" });
    let drive: PublicNgoDrive;
    try {
      drive = await getNgoDrive(id);
    } catch (e) {
      setView(isNotFound(e) ? { kind: "not-found" } : { kind: "error", message: errorMessage(e, "Please check your connection and try again.") });
      return;
    }
    try {
      const role = (user.role ?? "").toUpperCase();
      const offers = role === "DONOR" ? await getMyNgoDriveOffers() : [];
      const state = giveState(drive, user, offers);
      switch (state.kind) {
        case "wrong-role":
          setView({ kind: "blocked", title: "You can't give to this drive", body: state.reason, link: { href: `/drives/${drive.id}`, label: "Back to the drive" } });
          return;
        case "offered":
          setView({ kind: "blocked", title: "You already offered to this drive",
            body: `Your offer of ${state.offer.quantity ?? ""} ${drive.unit ?? ""} is in progress.`,
            link: { href: state.href, label: state.href.includes("/handover") ? "Open your handover" : "See your offer" } });
          return;
        case "closed":
          setView({ kind: "blocked", title: "This drive isn't taking offers", body: state.reason, link: { href: `/drives/${drive.id}`, label: "Back to the drive" } });
          return;
        case "continue":
          setView({ kind: "wizard", drive, offer: state.offer });
          return;
        default: {
          // load() can run twice (the user object settles after login); share one draft
          // request, or the wizard autosaved to one draft and submitted the other, empty one.
          const pending = draftRequest.current?.driveId === drive.id ? draftRequest.current.promise : createNgoDriveOfferDraft(drive.id);
          draftRequest.current = { driveId: drive.id, promise: pending };
          const draft = await pending;
          setView({ kind: "wizard", drive, offer: await getNgoDriveOffer(draft.id) });
        }
      }
    } catch (e) {
      setView({ kind: "error", message: errorMessage(e, "We couldn't start your offer. Please try again.") });
    }
  }, [id, user]);

  useEffect(() => {
    if (authLoading || Number.isNaN(id)) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(`/drives/${id}/give`)}`);
      return;
    }
    void load();
  }, [authLoading, user, id, router, load]);

  if (authLoading || !user || view.kind === "loading") return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (view.kind === "not-found") return <DriveNotFound backHref="/requests" backLabel="Back to browse" />;
  if (view.kind === "error") return <DriveLoadError message={view.message} onRetry={() => void load()} />;
  if (view.kind === "blocked") {
    return (
      <main data-ck-role-theme="ngo" className="min-h-[60vh] bg-stone-50 px-4 py-16 dark:bg-zinc-950">
        <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-lg font-bold text-stone-900 dark:text-stone-100">{view.title}</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{view.body}</p>
          {view.link && (
            <Link href={view.link.href} className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-emerald-700 px-6 text-sm font-bold text-white hover:bg-emerald-800">
              {view.link.label}
            </Link>
          )}
        </div>
      </main>
    );
  }

  const { drive, offer } = view;
  return (
    <main data-ck-role-theme="ngo" className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <NgoDriveOfferWizard
        key={offer.id}
        offerId={offer.id}
        offer={offer}
        driveId={drive.id}
        ngoName={drive.ngoOrganizationName || "Verified NGO"}
        driveUnit={drive.unit}
        driveCategory={drive.category}
        mustBeWorking={Boolean(drive.mustBeWorking)}
        requireClean={Boolean(drive.requireClean)}
        acceptedConditions={drive.acceptedConditions?.length ? drive.acceptedConditions : driveAcceptedConditions(drive.condition)}
        initialQuantityReceived={drive.quantityReceived}
        initialQuantityPledged={drive.quantityPledged}
        requestTitle={drive.title}
        requestedQuantity={drive.quantityNeeded}
        // An offer sent back for changes already holds its own quantity on the drive.
        stillNeededQuantity={stillNeeded(drive) + (offer.status === "NEEDS_INFORMATION" ? offer.quantity ?? 0 : 0)}
        adminNote={offer.status === "NEEDS_INFORMATION" ? offer.rejectionReason || offer.ngoDeclineReason : null}
        onSubmitted={(result) => {
          // The success content shows as a popup over the drive page.
          const sent: DriveOfferSent = { quantity: result?.quantity ?? offer.quantity ?? 0, unit: drive.unit,
            ngoName: drive.ngoOrganizationName, driveTitle: drive.title };
          try { sessionStorage.setItem(offerSentKey(drive.id), JSON.stringify(sent)); } catch { /* the popup is a courtesy */ }
          router.replace(`/drives/${drive.id}?offerSent=1`);
        }}
        onExit={() => router.push(`/drives/${drive.id}`)}
        onSaveExit={() => router.push("/dashboard")}
      />
    </main>
  );
}
