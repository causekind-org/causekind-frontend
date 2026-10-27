"use client";
import { driveDropOffAddress } from "@/features/ngo-drives/driveFormatters";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { AlertCircle, ArrowLeft, Camera, CalendarDays, ClipboardList, ExternalLink, FileText, Handshake, Inbox, MapPin, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DriveLoadError, DriveNotFound } from "@/features/ngo-drives/components/DriveLoadState";
import { errorMessage, isNotFound } from "@/features/ngo-drives/driveGiveState";
import { driveConditionLabel, driveConditionRule } from "@/features/ngo-drives/driveConditions";
import { activityHref, driveSummaryParts, isHandover, isOfferToReview, isProofDue, DRIVE_STATUS_LABEL } from "@/features/ngo-drives/components/manage/driveActivity";
import { categoryDetailRows } from "@/features/ngo-drives/driveCategoryDetails";
import { formatDaysLeft } from "@/features/ngo-drives/ngoDriveFilters";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { formatISTDate } from "@/lib/formatIST";

const humanize = (v?: string | null) => (v ? v.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "");

/** Status banner for every drive state the NGO can be in. */
function StatusBanner({ drive }: { drive: NgoDrive }) {
  const banners: Record<string, { tone: string; title: string; body: React.ReactNode }> = {
    PENDING_REVIEW: { tone: "amber", title: "Under review", body: "Our team is checking this drive. We'll notify you when it goes live." },
    CHANGES_REQUESTED: { tone: "amber", title: "Changes requested", body: <><strong>Reason:</strong> {drive.adminReason || "No reason was given."}</> },
    REJECTED: { tone: "red", title: "This drive was rejected", body: <><strong>Reason:</strong> {drive.adminReason || "No reason was given."}</> },
    LIVE: { tone: "green", title: "Live", body: "Donors near you can see this drive and offer items. Review their offers in your dashboard's Activity." },
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

/** Statuses where the NGO still has to confirm the handover. */
const TO_CONFIRM = new Set(["NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"]);
/** Offers that count as a donor on the drive (same set the public donor count uses). */
const COUNTED = new Set([...TO_CONFIRM, "ISSUE_WINDOW_OPEN", "ISSUE_RAISED", "COMPLETED"]);

const STATUS_TONE: Record<string, string> = {
  LIVE: "bg-ngo-100 text-ngo-900 dark:bg-ngo-900/50 dark:text-ngo-100",
  FULLY_PLEDGED: "bg-ngo-100 text-ngo-900 dark:bg-ngo-900/50 dark:text-ngo-100",
  FULFILLED: "bg-ngo-100 text-ngo-900 dark:bg-ngo-900/50 dark:text-ngo-100",
  PENDING_REVIEW: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  CHANGES_REQUESTED: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  COLLECTION_COMPLETE: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  PROOF_SUBMITTED: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  REJECTED: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
};

const SECTIONS = [["overview", "Overview"], ["offers", "Offers"], ["handovers", "Handovers"], ["proof", "Proof & report"]] as const;

function Panel({ id, title, icon: Icon, children, action }: {
  id?: string; title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="scroll-mt-24 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={id ? `${id}-title` : undefined} className="flex items-center gap-2 font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
          {Icon && <Icon className="h-5 w-5 text-ngo-700 dark:text-ngo-300" aria-hidden="true" />}{title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const pill = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-colors";
const pillPrimary = `${pill} bg-ngo-700 text-white hover:bg-ngo-800`;
const pillGhost = `${pill} border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-100 dark:hover:bg-zinc-800`;
const linkCls = "inline-flex min-h-[44px] items-center text-sm font-bold text-ngo-800 hover:underline dark:text-ngo-300";

export default function NgoDriveManagePage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // "Back to dashboard" returns to the tab the NGO came from: ?from=<tab>, else browser history.
  const from = searchParams?.get("from") ?? null;
  const backHref = from && /^[a-z-]+$/i.test(from) ? `/dashboard/ngo?tab=${from}` : "/dashboard/ngo";
  const goBack = (e: React.MouseEvent) => {
    if (from) return;
    if (typeof document !== "undefined" && document.referrer.includes("/dashboard/ngo") && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };

  if (authLoading || loading) return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (loadError?.notFound) return <DriveNotFound backHref="/dashboard/ngo" backLabel="Back to dashboard" />;
  if (loadError || !drive) return <DriveLoadError message={loadError?.message ?? "Something went wrong."} onRetry={() => { setLoading(true); void load(); }} />;

  const pending = offers.filter((o) => o.status === "PENDING_NGO_REVIEW");
  const toReview = offers.filter(isOfferToReview);
  const handovers = offers.filter((o) => isHandover(o));
  const toConfirm = offers.filter((o) => TO_CONFIRM.has(o.status));
  const proofDue = isProofDue(drive);
  const canClose = drive.status === "LIVE" || drive.status === "FULLY_PLEDGED";
  const summary = driveSummaryParts(drive, offers);
  // Stored as "MON,TUE,..." on the NGO's own drive record.
  const days = String(drive.availableDays ?? "").split(",").filter(Boolean).join(", ");
  const hours = `${days}${drive.availableFrom ? `, ${drive.availableFrom}–${drive.availableTo}` : ""}`;
  const unit = humanize(drive.unit).toLowerCase();
  const needed = Math.max(0, drive.quantityNeeded ?? 0);
  const received = Math.max(0, drive.quantityReceived ?? 0);
  const pledged = Math.max(0, drive.quantityPledged ?? 0);
  const still = Math.max(0, needed - received - pledged);
  const donors = drive.donorCount ?? new Set(offers.filter((o) => COUNTED.has(o.status)).map((o) => o.donorDisplayName)).size;
  const pct = (n: number) => `${needed ? Math.min(100, (n / needed) * 100) : 0}%`;
  const daysLeft = formatDaysLeft(drive.neededBy);
  const statusLabel = DRIVE_STATUS_LABEL[drive.status] ?? humanize(drive.status);
  const photo = resolveMediaUrl(drive.coverPhotoUrl ?? drive.referencePhotoUrl);
  const isPublic = ["LIVE", "FULLY_PLEDGED", "COLLECTION_COMPLETE", "PROOF_SUBMITTED", "FULFILLED"].includes(drive.status);

  const details: [string, React.ReactNode][] = [
    ["Category", drive.category],
    ["Item", drive.itemName],
    ["Quantity", `${drive.quantityNeeded} ${humanize(drive.unit)}`],
    ["Condition accepted", [driveConditionLabel(drive.itemCondition), driveConditionRule(drive.itemCondition)].filter(Boolean).join(" · ")],
    ...categoryDetailRows(drive.category, drive.categoryDetails).map((r) => [r.label, r.value] as [string, React.ReactNode]),
    ["Urgency", humanize(drive.urgency)],
    ["People who will benefit", `${drive.beneficiaryCount} ${drive.beneficiaryGroup ?? ""}`],
    ["Location", [drive.locationArea, drive.locationCity, drive.locationState, drive.locationPincode].filter(Boolean).join(", ")],
    ["Drop-off address", driveDropOffAddress(drive)],
    ["Pickup radius", drive.pickupRadiusKm ? `NGO picks up within ${drive.pickupRadiusKm} km; donors farther away drop off` : "Donors drop off at the drive address"],
    ["Needed by", drive.neededBy ? formatISTDate(drive.neededBy) : ""],
    ["Handover days & hours", hours],
    ["Handover contact", `${drive.contactName ?? ""}${drive.contactPhone ? ` · ${drive.contactPhone}` : ""}`],
  ];

  type Attention = { key: string; icon: React.ComponentType<{ className?: string }>; label: string; href: string };
  const attention: Attention[] = [];
  if (toReview.length) attention.push({ key: "offers", icon: Inbox, label: `${toReview.length} ${toReview.length === 1 ? "offer" : "offers"} to review`, href: activityHref("offers", drive.id) });
  if (toConfirm.length) attention.push({ key: "handovers", icon: Handshake, label: `${toConfirm.length} ${toConfirm.length === 1 ? "handover" : "handovers"} to confirm`, href: activityHref("handovers", drive.id) });
  if (proofDue) attention.push({ key: "proof", icon: Camera, label: "Distribution photos due", href: activityHref("proof", drive.id) });
  const primary: Attention | null = attention[0] ?? (isPublic ? { key: "preview", label: "View as donor", href: `/drives/${drive.id}`, icon: ExternalLink } : null);

  return (
    <main data-ck-role-theme="ngo" className="min-h-screen bg-[var(--surface-cream,#faf8f5)] pb-28 dark:bg-zinc-950 sm:pb-16">
      {/* Header: title, status, category, needed-by, actions */}
      <div className="border-b border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
          <Link href={backHref} onClick={goBack} data-testid="back-to-dashboard"
            className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-ngo-800 hover:underline dark:text-ngo-300">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to dashboard
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage link
              <img src={photo} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-24 sm:w-24" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span data-testid="drive-status-badge" className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[drive.status] ?? "bg-stone-100 text-stone-800 dark:bg-zinc-800 dark:text-stone-200"}`}>{statusLabel}</span>
                <span className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-700 dark:border-zinc-700 dark:text-stone-300">{drive.category}</span>
              </div>
              <h1 className="mt-2 break-words font-serif text-2xl font-semibold text-stone-900 dark:text-stone-50 sm:text-4xl">{drive.title}</h1>
              {drive.neededBy && (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-stone-600 dark:text-stone-400">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> Needed by {formatISTDate(drive.neededBy)}
                  {daysLeft && <span className={daysLeft.isAmber ? "font-bold text-amber-700 dark:text-amber-400" : "font-semibold"}>· {daysLeft.label}</span>}
                </p>
              )}
              {summary.length > 0 && (
                <p data-testid="drive-activity-summary" className="mt-2 flex flex-wrap gap-x-2 text-sm text-stone-700 dark:text-stone-300">
                  {summary.map((part, i) => (
                    <span key={part.filter}>
                      {i > 0 && <span aria-hidden="true" className="mr-2">-</span>}
                      <Link href={part.href} className="font-semibold text-ngo-800 underline underline-offset-2 hover:text-ngo-900 dark:text-ngo-300">{part.label}</Link>
                    </span>
                  ))}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {drive.status === "CHANGES_REQUESTED" && (
                <Link href={`/ngo/drives/new?edit=${drive.id}`} className={pillPrimary}>Edit &amp; resubmit</Link>
              )}
              {isPublic && (
                <Link href={`/drives/${drive.id}`} target="_blank" data-testid="donor-preview-link" className={pillGhost}>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" /> View as donor
                </Link>
              )}
              {canClose && (
                <Button variant="outline" data-testid="close-drive" onClick={() => setCloseOpen(true)}
                  className="min-h-[44px] rounded-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">Close drive</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-6xl space-y-6 px-4 sm:px-6">
        {/* KPI strip */}
        <dl data-testid="drive-kpis" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([["Needed", needed], ["Pledged", pledged], ["Received", received], ["Still needed", still], ["Donors", donors]] as const).map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <dt className="text-xs font-semibold text-stone-500 dark:text-stone-400">{label}</dt>
              <dd className="mt-1 font-serif text-2xl font-semibold text-stone-900 dark:text-stone-100">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Multi-segment progress + legend */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div role="img" aria-label={`${received} received, ${pledged} pledged, ${still} still needed of ${needed} ${unit}`}
            className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-zinc-800">
            <div className="h-full bg-ngo-700" style={{ width: pct(received) }} />
            <div className="h-full bg-ngo-300 dark:bg-ngo-600" style={{ width: pct(pledged) }} />
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ngo-700" aria-hidden="true" />Received {received}</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ngo-300 dark:bg-ngo-600" aria-hidden="true" />Pledged {pledged}</li>
            <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-stone-200 dark:bg-zinc-700" aria-hidden="true" />Still needed {still}</li>
          </ul>
        </div>

        <StatusBanner drive={drive} />

        {attention.length > 0 && (
          <section data-testid="needs-attention" aria-labelledby="attention-title" className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
            <h2 id="attention-title" className="flex items-center gap-2 font-serif text-lg font-semibold text-amber-950 dark:text-amber-100">
              <AlertCircle className="h-5 w-5" aria-hidden="true" /> Needs your attention
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {attention.map((a) => (
                <li key={a.key}>
                  <Link href={a.href} className="flex min-h-[44px] items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-stone-900 shadow-sm hover:bg-stone-50 dark:bg-zinc-900 dark:text-stone-100 dark:hover:bg-zinc-800">
                    <a.icon className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />{a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {offersError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {offersError} <button type="button" className="min-h-[44px] font-bold underline" onClick={() => void load()}>Retry</button>
          </div>
        )}

        {/* Section links (every section stays on the page) */}
        <nav aria-label="Drive sections" className="sticky top-0 z-20 -mx-4 overflow-x-auto bg-[var(--surface-cream,#faf8f5)]/95 px-4 py-2 backdrop-blur dark:bg-zinc-950/95 sm:mx-0">
          <ul className="flex gap-2">
            {SECTIONS.map(([key, label]) => (
              <li key={key}>
                <a href={`#${key}`} className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800 hover:border-ngo-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200">{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Panel id="overview" title="Drive details" icon={ClipboardList}>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {details.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</dt>
                    <dd className="mt-0.5 break-words text-stone-800 dark:text-stone-200">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              {drive.details && <p className="mt-4 break-words text-sm text-stone-700 dark:text-stone-300"><strong>Details:</strong> {drive.details}</p>}
              {drive.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-stone-700 dark:text-stone-300">{drive.description}</p>}
            </Panel>

            <Panel id="offers" title="Offers" icon={Inbox} action={<Link href={activityHref("offers", drive.id)} className={linkCls}>Review offers</Link>}>
              {offers.length === 0 ? (
                <p className="text-sm text-stone-600 dark:text-stone-400">No offers yet. Donors see your drive once it&apos;s live.</p>
              ) : (
                <p className="text-sm text-stone-700 dark:text-stone-300">
                  {offers.length} {offers.length === 1 ? "offer" : "offers"} in total · {toReview.length} waiting for your review.
                </p>
              )}
            </Panel>

            <Panel id="handovers" title="Handovers" icon={Handshake} action={<Link href={activityHref("handovers", drive.id)} className={linkCls}>All handovers</Link>}>
              {handovers.length === 0 ? (
                <p className="text-sm text-stone-600 dark:text-stone-400">No handovers yet. Accepted offers appear here.</p>
              ) : (
                <ul className="divide-y divide-stone-100 dark:divide-zinc-800">
                  {handovers.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="min-w-0 break-words text-sm text-stone-800 dark:text-stone-200">
                        <strong>{o.donorDisplayName}</strong> · {o.quantity ?? 0} {unit} · {humanize(o.status)}
                      </span>
                      <Link href={`/ngo-drive-offers/${o.id}/handover`} className={linkCls}>Open handover</Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel id="proof" title="Proof & report" icon={FileText}>
              <p className="text-sm text-stone-700 dark:text-stone-300">
                {proofDue ? "Distribute what you received, then upload photos and details of the distribution."
                  : drive.status === "FULFILLED" ? "Your distribution proof is approved and visible to donors."
                    : "After collection, you'll upload distribution photos here."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {proofDue && <Link href={activityHref("proof", drive.id)} className={pillPrimary}><Camera className="h-4 w-4" aria-hidden="true" /> Upload proof</Link>}
                <Link href={`/ngo/drives/${drive.id}/report`} data-testid="drive-report-link" className={pillGhost}><FileText className="h-4 w-4" aria-hidden="true" /> Drive report</Link>
              </div>
            </Panel>
          </div>

          <aside className="min-w-0 space-y-6">
            <Panel title="Handover at a glance">
              <ul className="space-y-3 text-sm text-stone-700 dark:text-stone-300">
                <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ngo-700 dark:text-ngo-300" aria-hidden="true" />
                  <span className="min-w-0 break-words">{[drive.locationArea, drive.locationCity].filter(Boolean).join(", ") || "—"}{drive.pickupRadiusKm ? ` · pickup within ${drive.pickupRadiusKm} km` : ""}</span></li>
                <li className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-ngo-700 dark:text-ngo-300" aria-hidden="true" /><span className="min-w-0 break-words">{hours || "—"}</span></li>
                <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-ngo-700 dark:text-ngo-300" aria-hidden="true" />
                  <span className="min-w-0 break-words">{[drive.contactName, drive.contactPhone].filter(Boolean).join(" · ") || "—"}</span></li>
                <li className="flex gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-ngo-700 dark:text-ngo-300" aria-hidden="true" />
                  <span>{drive.beneficiaryCount} {drive.beneficiaryGroup ?? "people"}</span></li>
              </ul>
            </Panel>
          </aside>
        </div>
      </div>

      {/* Mobile: the most useful next action stays in reach */}
      {primary && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 p-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 sm:hidden">
          <Link href={primary.href} data-testid="sticky-primary-action" className={`${pillPrimary} w-full`}>{primary.label}</Link>
        </div>
      )}

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this drive?</DialogTitle>
            <DialogDescription>Donors can&apos;t offer new items. Handovers already planned continue.</DialogDescription>
          </DialogHeader>
          {pending.length > 0 && (
            <p role="alert" data-testid="close-blocked" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              {pending.length === 1 ? "1 offer is" : `${pending.length} offers are`} waiting for your review. Accept or decline {pending.length === 1 ? "it" : "them"} first.{" "}
              <Link href={`/dashboard/ngo?tab=activity&filter=offers&drive=${drive.id}`} className="font-bold underline">Review offers</Link>
            </p>
          )}
          <label className="block text-sm font-bold">Reason for closing
            <input value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="e.g. We have enough"
              className="mt-1 block w-full rounded-lg border border-stone-300 p-2 font-normal dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!closeReason.trim() || saving || pending.length > 0} onClick={async () => {
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
