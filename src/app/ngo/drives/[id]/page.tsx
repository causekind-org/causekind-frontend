"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import {
  getNgoDriveDetail, getNgoDriveOffersForNgo, closeNgoDrive,
  type NgoDrive, type NgoDriveOfferResponse,
} from "@/lib/api";
import { isNgoRole } from "@/lib/isNgoRole";
import { PageSkeleton } from "@/components/skeletons";
import { toast } from "@/lib/toast";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DriveLoadError, DriveNotFound } from "@/features/ngo-drives/components/DriveLoadState";
import { DriveQuantityBar } from "@/features/ngo-drives/components/DriveQuantityBar";
import { errorMessage, isNotFound } from "@/features/ngo-drives/driveGiveState";
import { driveAcceptedConditions, driveConditionLabel, driveConditionRule } from "@/features/ngo-drives/driveConditions";
import { driveSummaryParts } from "@/features/ngo-drives/components/manage/driveActivity";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useDriveCopy } from "@/features/ngo-drives/driveCopy";
const humanize = (v?: string | null) => (v ? v.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "");

/** Status banner for every drive state the NGO can be in. */
function StatusBanner({ drive }: { drive: NgoDrive }) {
  const ui = useUiText();
  const banners: Record<string, { tone: string; title: string; body: React.ReactNode }> = {
    PENDING_REVIEW: { tone: "amber", title: ui("Under review"), body: ui("Our team is checking this drive. We'll notify you when it goes live.") },
    CHANGES_REQUESTED: { tone: "amber", title: ui("Changes requested"), body: <><strong><UiText>Reason:</UiText></strong> {drive.adminReason || ui("No reason was given.")}</> },
    REJECTED: { tone: "red", title: ui("This drive was rejected"), body: <><strong><UiText>Reason:</UiText></strong> {drive.adminReason || ui("No reason was given.")}</> },
    LIVE: { tone: "green", title: ui("Live"), body: ui("Donors near you can see this drive and offer items. Review their offers in your dashboard's Activity.") },
    FULLY_PLEDGED: { tone: "green", title: ui("Fully pledged"), body: ui("Every item has been offered. Complete the handovers to collect them.") },
    COLLECTION_COMPLETE: { tone: "amber", title: ui("Collection complete"), body: ui("Distribute what you received, then upload your distribution proof.") },
    PROOF_SUBMITTED: { tone: "blue", title: ui("Proof submitted"), body: ui("Our team is reviewing your distribution proof.") },
    FULFILLED: { tone: "green", title: ui("Fulfilled"), body: ui("Your proof was approved and donors can see it. You can start a new drive.") },
    CLOSED: { tone: "stone", title: ui("Closed"), body: drive.quantityReceived > 0 ? ui("This drive closed. Upload your distribution proof for what you received.") : ui("This drive closed with nothing received. You can start a new drive.") },
    CANCELLED: { tone: "stone", title: ui("Cancelled"), body: ui("This drive was cancelled.") },
  };
  const b = banners[drive.status];
  if (!b) return null;
  const tones: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
    red: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200",
    green: "border-ngo-200 bg-ngo-50 text-ngo-900 dark:border-ngo-800 dark:bg-ngo-950/30 dark:text-ngo-100",
    blue: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200",
    stone: "border-stone-200 bg-stone-100 text-stone-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200",
  };
  return (
    <div role="status" className={`rounded-2xl border p-5 ${tones[b.tone]}`}>
      <p className="font-bold">{b.title}</p>
      <p className="mt-1 text-sm">{b.body}</p>
      {drive.status === "CHANGES_REQUESTED" && (
        <Link href={`/ngo/drives/new?edit=${drive.id}`} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-ngo-700 px-5 text-sm font-bold text-white hover:bg-ngo-600">
          <UiText>Edit &amp; resubmit</UiText>
        </Link>
      )}
    </div>
  );
}

export default function NgoDriveManagePage() {
  const ui = useUiText();
  const df = useTranslations("driveFlow");
  const dc = useDriveCopy();
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [drive, setDrive] = useState<NgoDrive | null>(null);
  const [loadError, setLoadError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [offers, setOffers] = useState<NgoDriveOfferResponse[]>([]);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [saving, setSaving] = useState(false);

  // The drive and its offers load separately: a failing offers call must not hide the drive.
  const load = useCallback(async () => {
    if (Number.isNaN(id)) return;
    setLoadError(null);
    setOffersError(null);
    try {
      setDrive(await getNgoDriveDetail(id));
    } catch (e) {
      setLoadError({ notFound: isNotFound(e), message: errorMessage(e, ui("Please check your connection and try again.")) });
      setLoading(false);
      return;
    }
    try { setOffers(await getNgoDriveOffersForNgo(id)); }
    catch (e) { setOffersError(errorMessage(e, ui("We couldn't load the offers."))); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!isNgoRole(user.role?.toUpperCase())) { router.replace("/dashboard"); return; }
    void load();
  }, [authLoading, user, router, load]);
  useEntityUpdates(["NGO_DRIVE", "NGO_DRIVE_OFFER"], () => { void load(); });

  if (authLoading || loading) return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (loadError?.notFound) return <DriveNotFound backHref="/dashboard/ngo" backLabel={ui("Back to dashboard")} />;
  if (loadError || !drive) return <DriveLoadError message={loadError?.message ?? ui("Something went wrong.")} onRetry={() => { setLoading(true); void load(); }} />;

  const pending = offers.filter((o) => o.status === "PENDING_NGO_REVIEW");
  const canClose = drive.status === "LIVE" || drive.status === "FULLY_PLEDGED";
  const summary = driveSummaryParts(drive, offers);
  // Stored as "MON,TUE,..." on the NGO's own drive record.
  const days = String(drive.availableDays ?? "").split(",").filter(Boolean).join(", ");

  const fields: [string, React.ReactNode][] = [
    [ui("Category"), drive.category],
    [ui("Item"), drive.itemName],
    [ui("Quantity"), `${drive.quantityNeeded} ${humanize(drive.unit)}`],
    [ui("Condition accepted"), [dc(driveConditionLabel(drive.itemCondition)), driveConditionRule(drive.itemCondition) && df("accepts", { list: (driveAcceptedConditions(drive.itemCondition) ?? []).map(dc).join(", ") })].filter(Boolean).join(" · ")],
    [ui("Urgency"), humanize(drive.urgency)],
    [ui("People who will benefit"), `${drive.beneficiaryCount} ${drive.beneficiaryGroup ?? ""}`],
    [ui("Location"), [drive.locationArea, drive.locationCity, drive.locationState, drive.locationPincode].filter(Boolean).join(", ")],
    [ui("Pickup radius"), drive.pickupRadiusKm ? df("ngoPicksUpWithin", { km: drive.pickupRadiusKm }) : ui("Donors drop off at the drive address")],
    [ui("Needed by"), drive.neededBy ? new Date(drive.neededBy).toLocaleDateString() : ""],
    [ui("Handover days & hours"), `${days}${drive.availableFrom ? `, ${drive.availableFrom}–${drive.availableTo}` : ""}`],
    [ui("Contact"), `${drive.contactName ?? ""}${drive.contactPhone ? ` · ${drive.contactPhone}` : ""}`],
  ];
  return (
    <main className="min-h-screen bg-stone-50 pb-20 dark:bg-zinc-950">
      <div className="bg-ngo-900 px-4 py-6 text-ngo-50 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/dashboard/ngo" className="mb-5 inline-flex items-center gap-2 text-sm text-ngo-200 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> <UiText>Back to dashboard</UiText>
          </Link>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-ngo-700 bg-ngo-800/50 px-3 py-1">
            <ShieldCheck className="h-4 w-4 text-ngo-300" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider text-ngo-200"><UiText>Manage drive</UiText></span>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-black text-white sm:text-4xl">{drive.title}</h1>
            {canClose && (
              <Button variant="outline" data-testid="close-drive" onClick={() => setCloseOpen(true)}
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"><UiText>Close drive</UiText></Button>
            )}
          </div>
          {summary.length > 0 && (
            <p data-testid="drive-activity-summary" className="mt-3 flex flex-wrap gap-x-2 text-sm text-ngo-100">
              {summary.map((part, i) => (
                <span key={part.filter}>
                  {i > 0 && <span aria-hidden="true" className="mr-2">-</span>}
                  <Link href={part.href} className="font-semibold underline underline-offset-2 hover:text-white">{part.filter === "offers" ? df("offersToReview", { count: part.count }) : part.filter === "handovers" ? df("handoversCount", { count: part.count }) : dc(part.label)}</Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-5xl space-y-6 px-4 sm:px-6">
        <StatusBanner drive={drive} />

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2" aria-labelledby="drive-details">
            <h2 id="drive-details" className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100"><UiText>Drive details</UiText></h2>
            <div className="flex flex-col gap-5 sm:flex-row">
              {drive.referencePhotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={drive.referencePhotoUrl} alt={ui("Reference photo")} className="h-32 w-full shrink-0 rounded-xl object-cover sm:w-40" />
              )}
              <dl className="grid flex-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {fields.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</dt>
                    <dd className="mt-0.5 break-words text-stone-800 dark:text-stone-200">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {drive.details && <p className="mt-4 text-sm text-stone-700 dark:text-stone-300"><strong><UiText>Details:</UiText></strong> {drive.details}</p>}
            <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">{drive.description}</p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900" aria-labelledby="drive-progress">
            <h2 id="drive-progress" className="text-lg font-bold text-stone-900 dark:text-stone-100"><UiText>Progress</UiText></h2>
            <div className="mt-4">
              <DriveQuantityBar needed={drive.quantityNeeded} received={drive.quantityReceived} pledged={drive.quantityPledged} unit={humanize(drive.unit)} />
            </div>
          </section>
        </div>

        {offersError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {offersError} <button type="button" className="font-bold underline" onClick={() => void load()}><UiText>Retry</UiText></button>
          </div>
        )}
      </div>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><UiText>Close this drive?</UiText></DialogTitle>
            <DialogDescription><UiText>Donors can't offer new items. Handovers already planned continue.</UiText></DialogDescription>
          </DialogHeader>
          {pending.length > 0 && (
            <p role="alert" data-testid="close-blocked" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              {df("offersWaitingReview", { count: pending.length })}{" "}
              <Link href={`/dashboard/ngo?tab=activity&filter=offers&drive=${drive.id}`} className="font-bold underline"><UiText>Review offers</UiText></Link>
            </p>
          )}
          <label className="block text-sm font-bold"><UiText>Reason for closing</UiText>
            <input value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder={ui("e.g. We have enough")}
              className="mt-1 block w-full rounded-lg border border-stone-300 p-2 font-normal dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}><UiText>Cancel</UiText></Button>
            <Button variant="destructive" disabled={!closeReason.trim() || saving || pending.length > 0} onClick={async () => {
              setSaving(true);
              try { await closeNgoDrive(drive.id, { reason: closeReason.trim() }); toast.success(ui("Drive closed.")); setCloseOpen(false); await load(); }
              catch (e) { toast.error(errorMessage(e, ui("We couldn't close the drive."))); }
              finally { setSaving(false); }
            }}><UiText>Close drive</UiText></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
