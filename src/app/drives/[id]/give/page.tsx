"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  getNgoDrive, getMyNgoDriveOffers, getNgoDriveOffer, createNgoDriveOfferDraft,
  type PublicNgoDrive, type NgoDriveOfferResponse,
} from "@/lib/api";
import { NgoDriveOfferWizard } from "@/features/ngo-drives/components/NgoDriveOfferWizard";
import { DriveLoadError, DriveNotFound } from "@/features/ngo-drives/components/DriveLoadState";
import { errorMessage, giveState, isNotFound, stillNeeded } from "@/features/ngo-drives/driveGiveState";
import { PageSkeleton } from "@/components/skeletons";
import { driveAcceptedConditions } from "@/features/ngo-drives/driveConditions";

type View =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | { kind: "blocked"; title: string; body: string; link?: { href: string; label: string } }
  | { kind: "wizard"; drive: PublicNgoDrive; offer: NgoDriveOfferResponse }
  | { kind: "submitted"; drive: PublicNgoDrive; quantity: number };

const NEXT_STEPS = [
  ["We check your photos", "Usually within minutes."],
  ["The NGO accepts or declines", "You'll get a notification either way, with a reason if it declines."],
  ["You plan the handover", "Drop off at the NGO or ask for a pickup, on a day and time that suits the NGO."],
  ["Show your code at the handover", "The NGO enters it to confirm it received your items."],
  ["See the impact", "Once the NGO distributes the items, you'll see the photos and your certificate."],
] as const;

export default function DriveGivePage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [view, setView] = useState<View>({ kind: "loading" });

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
          const draft = await createNgoDriveOfferDraft(drive.id);
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
  if (view.kind === "submitted") {
    return (
      <main className="min-h-[70vh] bg-stone-50 px-4 py-12 dark:bg-zinc-950">
        <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Offer sent</p>
          <h1 className="mt-1 text-2xl font-black text-stone-900 dark:text-stone-100">
            Thank you! {view.quantity} {view.drive.unit?.toLowerCase()} reserved for this drive
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Your offer to {view.drive.ngoOrganizationName || "the NGO"} for &ldquo;{view.drive.title}&rdquo; is on its way. Here&apos;s what happens next:
          </p>
          <ol className="mt-5 space-y-4">
            {NEXT_STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{i + 1}</span>
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">{title}</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800">Track it on your dashboard</Link>
            <Link href={`/drives/${view.drive.id}`} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-stone-300 px-5 text-sm font-bold text-stone-800 hover:bg-stone-50 dark:border-zinc-700 dark:text-stone-100 dark:hover:bg-zinc-800">Back to the drive</Link>
          </div>
        </div>
      </main>
    );
  }

  if (view.kind === "blocked") {
    return (
      <main className="min-h-[60vh] bg-stone-50 px-4 py-16 dark:bg-zinc-950">
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
    <main className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <NgoDriveOfferWizard
        offerId={offer.id}
        offer={offer}
        driveId={drive.id}
        ngoName={drive.ngoOrganizationName || "Verified NGO"}
        driveUnit={drive.unit}
        acceptedConditions={drive.acceptedConditions?.length ? drive.acceptedConditions : driveAcceptedConditions(drive.condition)}
        initialQuantityReceived={drive.quantityReceived}
        initialQuantityPledged={drive.quantityPledged}
        requestTitle={drive.title}
        requestedQuantity={drive.quantityNeeded}
        // An offer sent back for changes already holds its own quantity on the drive.
        stillNeededQuantity={stillNeeded(drive) + (offer.status === "NEEDS_INFORMATION" ? offer.quantity ?? 0 : 0)}
        adminNote={offer.status === "NEEDS_INFORMATION" ? offer.rejectionReason || offer.ngoDeclineReason : null}
        onSubmitted={(result) => setView({ kind: "submitted", drive, quantity: result?.quantity ?? offer.quantity ?? 0 })}
        onExit={() => router.push(`/drives/${drive.id}`)}
        onSaveExit={() => router.push("/dashboard")}
      />
    </main>
  );
}
