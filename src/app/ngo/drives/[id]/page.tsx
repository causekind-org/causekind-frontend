"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import {
  getNgoDriveDetail, getNgoDriveOffersForNgo, reviewNgoDriveOffer, uploadDistributionProof, closeNgoDrive,
  type NgoDrive, type NgoDriveOfferResponse,
} from "@/lib/api";
import { isNgoRole } from "@/lib/isNgoRole";
import { PageSkeleton } from "@/components/skeletons";
import { toast } from "@/lib/toast";
import { ArrowLeft, Loader2, ShieldCheck, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DriveLoadError, DriveNotFound } from "@/features/ngo-drives/components/DriveLoadState";
import { DriveQuantityBar } from "@/features/ngo-drives/components/DriveQuantityBar";
import { errorMessage, isNotFound } from "@/features/ngo-drives/driveGiveState";

type Tab = "review" | "handovers" | "proof" | "close";
const CLOSED_OFFER = new Set(["NGO_DECLINED", "CANCELLED", "WITHDRAWN", "ADMIN_REJECTED", "ENDED", "DRAFT"]);
const humanize = (v?: string | null) => (v ? v.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "");
const OFFER_STATUS: Record<string, string> = {
  NGO_ACCEPTED: "Accepted · waiting for the donor's plan",
  PENDING_ADMIN_APPROVAL: "Accepted · waiting for the donor's plan",
  ADMIN_APPROVED: "Accepted · waiting for the donor's plan",
  HANDOVER_IN_PROGRESS: "Handover planned",
  HANDOVER_AT_RISK: "Handover needs attention",
  ISSUE_WINDOW_OPEN: "Received",
  ISSUE_RAISED: "Issue being reviewed",
  COMPLETED: "Completed",
  SUBMITTED: "Being checked",
  AI_ELIGIBILITY_SCREENING: "Being checked",
  AI_COMPATIBILITY_SCREENING: "Being checked",
  NEEDS_INFORMATION: "Waiting for the donor",
};

/** Status banner for every drive state the NGO can be in. */
function StatusBanner({ drive }: { drive: NgoDrive }) {
  const banners: Record<string, { tone: string; title: string; body: React.ReactNode }> = {
    PENDING_REVIEW: { tone: "amber", title: "Under review", body: "Our team is checking this drive. We'll notify you when it goes live." },
    CHANGES_REQUESTED: { tone: "amber", title: "Changes requested", body: <><strong>Reason:</strong> {drive.adminReason || "No reason was given."}</> },
    REJECTED: { tone: "red", title: "This drive was rejected", body: <><strong>Reason:</strong> {drive.adminReason || "No reason was given."}</> },
    LIVE: { tone: "green", title: "Live", body: "Donors near you can see this drive and offer items. Review their offers below." },
    FULLY_PLEDGED: { tone: "green", title: "Fully pledged", body: "Every item has been offered. Complete the handovers to collect them." },
    COLLECTION_COMPLETE: { tone: "amber", title: "Collection complete", body: "Distribute what you received, then upload your distribution proof." },
    PROOF_SUBMITTED: { tone: "blue", title: "Proof submitted", body: "Our team is reviewing your distribution proof." },
    FULFILLED: { tone: "green", title: "Fulfilled", body: "Your proof was approved and donors can see it. You can start a new drive." },
    CLOSED: { tone: "stone", title: "Closed", body: drive.quantityReceived > 0 ? "This drive closed. Upload your distribution proof for what you received." : "This drive closed with nothing received. You can start a new drive." },
    CANCELLED: { tone: "stone", title: "Cancelled", body: "This drive was cancelled." },
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
          Edit &amp; resubmit
        </Link>
      )}
    </div>
  );
}

export default function NgoDriveManagePage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [drive, setDrive] = useState<NgoDrive | null>(null);
  const [loadError, setLoadError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [offers, setOffers] = useState<NgoDriveOfferResponse[]>([]);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("review");
  const [declining, setDeclining] = useState<NgoDriveOfferResponse | null>(null);
  const [declineReason, setDeclineReason] = useState("");
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
      setLoadError({ notFound: isNotFound(e), message: errorMessage(e, "Please check your connection and try again.") });
      setLoading(false);
      return;
    }
    try { setOffers(await getNgoDriveOffersForNgo(id)); }
    catch (e) { setOffersError(errorMessage(e, "We couldn't load the offers.")); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!isNgoRole(user.role?.toUpperCase())) { router.replace("/dashboard"); return; }
    void load();
  }, [authLoading, user, router, load]);
  useEntityUpdates(["NGO_DRIVE", "NGO_DRIVE_OFFER"], () => { void load(); });

  useEffect(() => {
    if (!drive) return;
    if (drive.status === "COLLECTION_COMPLETE" || drive.status === "PROOF_SUBMITTED" || drive.status === "FULFILLED") setTab("proof");
  }, [drive?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function accept(offer: NgoDriveOfferResponse) {
    setBusy(offer.id);
    try { await reviewNgoDriveOffer(id, offer.id, "ACCEPT"); toast.success("Offer accepted. The donor can now plan the handover."); await load(); }
    catch (e) { toast.error(errorMessage(e, "We couldn't accept this offer.")); }
    finally { setBusy(null); }
  }

  async function decline() {
    if (!declining) return;
    setBusy(declining.id);
    try {
      await reviewNgoDriveOffer(id, declining.id, "DECLINE", declineReason.trim());
      toast.success("Offer declined. The donor will see your reason.");
      setDeclining(null); setDeclineReason("");
      await load();
    } catch (e) { toast.error(errorMessage(e, "We couldn't decline this offer.")); }
    finally { setBusy(null); }
  }

  if (authLoading || loading) return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (loadError?.notFound) return <DriveNotFound backHref="/dashboard/ngo" backLabel="Back to dashboard" />;
  if (loadError || !drive) return <DriveLoadError message={loadError?.message ?? "Something went wrong."} onRetry={() => { setLoading(true); void load(); }} />;

  const pending = offers.filter((o) => o.status === "PENDING_NGO_REVIEW");
  const handovers = offers.filter((o) => o.status !== "PENDING_NGO_REVIEW" && !CLOSED_OFFER.has(o.status));

  const canClose = drive.status === "LIVE" || drive.status === "FULLY_PLEDGED";
  const canUploadProof = drive.status === "COLLECTION_COMPLETE" || (drive.status === "CLOSED" && drive.quantityReceived > 0);
  // Stored as "MON,TUE,..." on the NGO's own drive record.
  const days = String(drive.availableDays ?? "").split(",").filter(Boolean).join(", ");

  const fields: [string, React.ReactNode][] = [
    ["Category", drive.category],
    ["Item", drive.itemName],
    ["Quantity", `${drive.quantityNeeded} ${humanize(drive.unit)}`],
    ["Condition", humanize(drive.itemCondition)],
    ["Urgency", humanize(drive.urgency)],
    ["Beneficiaries", `${drive.beneficiaryCount} ${drive.beneficiaryGroup ?? ""}`],
    ["Needed by", drive.neededBy ? new Date(drive.neededBy).toLocaleDateString() : ""],
    ["Handover days & hours", `${days}${drive.availableFrom ? `, ${drive.availableFrom}–${drive.availableTo}` : ""}`],
    ["Contact", `${drive.contactName ?? ""}${drive.contactPhone ? ` · ${drive.contactPhone}` : ""}`],
  ];
  const tabs: [Tab, string][] = [
    ["review", `Offers to review (${pending.length})`],
    ["handovers", `Handovers (${handovers.length})`],
    ["proof", "Distribution proof"],
    ["close", "Close drive"],
  ];

  return (
    <main className="min-h-screen bg-stone-50 pb-20 dark:bg-zinc-950">
      <div className="bg-ngo-900 px-4 py-6 text-ngo-50 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/dashboard/ngo" className="mb-5 inline-flex items-center gap-2 text-sm text-ngo-200 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
          </Link>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-ngo-700 bg-ngo-800/50 px-3 py-1">
            <ShieldCheck className="h-4 w-4 text-ngo-300" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider text-ngo-200">Manage drive</span>
          </div>
          <h1 className="text-2xl font-black text-white sm:text-4xl">{drive.title}</h1>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-5xl space-y-6 px-4 sm:px-6">
        <StatusBanner drive={drive} />

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2" aria-labelledby="drive-details">
            <h2 id="drive-details" className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">Drive details</h2>
            <div className="flex flex-col gap-5 sm:flex-row">
              {drive.referencePhotoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={drive.referencePhotoUrl} alt="Reference photo" className="h-32 w-full shrink-0 rounded-xl object-cover sm:w-40" />
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
            {drive.details && <p className="mt-4 text-sm text-stone-700 dark:text-stone-300"><strong>Details:</strong> {drive.details}</p>}
            <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">{drive.description}</p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900" aria-labelledby="drive-progress">
            <h2 id="drive-progress" className="text-lg font-bold text-stone-900 dark:text-stone-100">Progress</h2>
            <div className="mt-4">
              <DriveQuantityBar needed={drive.quantityNeeded} received={drive.quantityReceived} pledged={drive.quantityPledged} unit={humanize(drive.unit)} />
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div role="tablist" aria-label="Drive management" className="mb-5 flex gap-5 overflow-x-auto border-b border-stone-200 dark:border-zinc-800">
            {tabs.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={`shrink-0 pb-2 text-sm font-bold ${tab === key ? "border-b-2 border-ngo-600 text-ngo-700 dark:text-ngo-300" : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"}`}>
                {label}
              </button>
            ))}
          </div>

          {offersError && (tab === "review" || tab === "handovers") && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {offersError} <button type="button" className="font-bold underline" onClick={() => void load()}>Retry</button>
            </div>
          )}

          {tab === "review" && (
            pending.length === 0 ? <p className="text-sm text-stone-500 dark:text-stone-400">No offers waiting for your decision.</p> : (
              <ul className="space-y-4">
                {pending.map((offer) => (
                  <li key={offer.id} className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 sm:flex-row">
                    <div className="min-w-0">
                      <h3 className="font-bold text-stone-900 dark:text-stone-100">{offer.donorDisplayName || "Donor"}</h3>
                      <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                        {offer.quantity} {humanize(drive.unit)} · {offer.condition || "Condition not given"} · {humanize(offer.handoverMethod) || "Handover to agree"}
                      </p>
                      {offer.notesForNgo && <p className="mt-2 rounded border border-amber-100 bg-white/60 p-2 text-xs text-stone-600 dark:border-amber-900/30 dark:bg-black/20 dark:text-stone-300">&ldquo;{offer.notesForNgo}&rdquo;</p>}
                      {offer.media && offer.media.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {offer.media.map((m) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={m.mediaUrl} src={m.mediaUrl} alt="Offered item" className="h-16 w-16 rounded-lg object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                      <button disabled={busy === offer.id} onClick={() => void accept(offer)}
                        className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-ngo-700 px-4 text-sm font-bold text-white hover:bg-ngo-800 disabled:opacity-50 sm:flex-none">
                        {busy === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept
                      </button>
                      <button disabled={busy === offer.id} onClick={() => { setDeclining(offer); setDeclineReason(""); }}
                        className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-red-100 px-4 text-sm font-bold text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300 sm:flex-none">
                        <X className="h-4 w-4" /> Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "handovers" && (
            handovers.length === 0 ? <p className="text-sm text-stone-500 dark:text-stone-400">No accepted offers yet.</p> : (
              <ul className="space-y-3">
                {handovers.map((offer) => (
                  <li key={offer.id} className="flex flex-col justify-between gap-3 rounded-xl border border-stone-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-bold text-stone-900 dark:text-stone-100">{offer.donorDisplayName || "Donor"}</h3>
                      <p className="text-sm text-stone-600 dark:text-stone-400">{offer.quantity} {humanize(drive.unit)} · {OFFER_STATUS[offer.status] ?? humanize(offer.status)}</p>
                    </div>
                    <Link href={`/ngo/drives/${drive.id}/offers/${offer.id}/handover`}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-stone-100 px-4 text-sm font-bold text-stone-800 hover:bg-stone-200 dark:bg-zinc-800 dark:text-stone-100 dark:hover:bg-zinc-700">
                      Open handover
                    </Link>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "proof" && (
            drive.status === "PROOF_SUBMITTED" ? (
              <p className="rounded-xl bg-sky-50 p-4 text-sm font-semibold text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">Proof submitted{drive.beneficiariesReached ? ` (${drive.beneficiariesReached} people reached)` : ""}. Our team is reviewing it.</p>
            ) : drive.status === "FULFILLED" ? (
              <p className="rounded-xl bg-ngo-50 p-4 text-sm font-semibold text-ngo-900 dark:bg-ngo-950/30 dark:text-ngo-100">
                Proof approved. <Link href={`/drives/${drive.id}/proof`} className="underline">See the public impact report</Link>
              </p>
            ) : canUploadProof ? (
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const files = Array.from((form.elements.namedItem("proofFiles") as HTMLInputElement).files ?? []);
                const reached = Number((form.elements.namedItem("beneficiariesReached") as HTMLInputElement).value);
                if (files.length < 1 || files.length > 10) { toast.error("Please upload between 1 and 10 photos."); return; }
                if (!Number.isInteger(reached) || reached < 1) { toast.error("Enter how many people you reached (at least 1)."); return; }
                setSaving(true);
                try { await uploadDistributionProof(drive.id, files, reached); toast.success("Proof submitted. We'll review it soon."); await load(); }
                catch (err) { toast.error(errorMessage(err, "We couldn't upload your proof.")); }
                finally { setSaving(false); }
              }}>
                {drive.adminReason && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <strong>Proof needs another look:</strong> {drive.adminReason}
                  </p>
                )}
                {drive.proofDueAt && <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Due by {new Date(drive.proofDueAt).toLocaleString()}</p>}
                <label className="block text-sm font-bold text-stone-800 dark:text-stone-200">Distribution photos (1–10)
                  <input type="file" name="proofFiles" accept="image/*" multiple required className="mt-1 block w-full text-sm font-normal" />
                </label>
                <label className="block text-sm font-bold text-stone-800 dark:text-stone-200">People reached
                  <input type="number" name="beneficiariesReached" min={1} defaultValue={drive.beneficiaryCount} required
                    className="mt-1 block w-full max-w-xs rounded-lg border border-stone-300 bg-white p-2 font-normal dark:border-zinc-700 dark:bg-zinc-950" />
                </label>
                <Button type="submit" disabled={saving} className="bg-ngo-700 hover:bg-ngo-800">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit proof
                </Button>
              </form>
            ) : (
              <p className="text-sm text-stone-500 dark:text-stone-400">You can upload distribution proof once collection is complete.</p>
            )
          )}

          {tab === "close" && (
            canClose ? (
              <div>
                <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
                  Close the drive early if you have enough or can't store more. Donors can't offer new items; handovers already planned continue.
                </p>
                <Button variant="destructive" onClick={() => setCloseOpen(true)}>Close drive</Button>
              </div>
            ) : <p className="text-sm text-stone-500 dark:text-stone-400">Only a live or fully pledged drive can be closed.</p>
          )}
        </section>
      </div>

      <Dialog open={!!declining} onOpenChange={(o) => { if (!o) setDeclining(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this offer?</DialogTitle>
            <DialogDescription>The donor will see your reason. Their quantity goes back to the drive.</DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-bold">Reason
            <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={3} maxLength={500}
              className="mt-1 block w-full rounded-lg border border-stone-300 p-2 font-normal dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!declineReason.trim() || busy !== null} onClick={() => void decline()}>Decline offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this drive?</DialogTitle>
            <DialogDescription>Donors can't offer new items. Handovers already planned continue.</DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-bold">Reason for closing
            <input value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="e.g. We have enough"
              className="mt-1 block w-full rounded-lg border border-stone-300 p-2 font-normal dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!closeReason.trim() || saving} onClick={async () => {
              setSaving(true);
              try { await closeNgoDrive(drive.id, { reason: closeReason.trim() }); toast.success("Drive closed."); setCloseOpen(false); await load(); }
              catch (e) { toast.error(errorMessage(e, "We couldn't close the drive.")); }
              finally { setSaving(false); }
            }}>Close drive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
