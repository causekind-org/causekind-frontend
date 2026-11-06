"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Award, Check, Copy, ExternalLink, FileText, Handshake, Loader2, Lock, MapPin, MessageSquare, PackageCheck, ShieldCheck, Truck, Upload, Wand2 } from "lucide-react";
import { HandoverMapPinField } from "@/features/handover/HandoverMapPinField";
import { detectLocationFromServer } from "@/app/[locale]/actions/locations";
import {
  confirmPurchaseNoIssue, confirmPurchaseReceipt, downloadNonDeliveryConfirmation, reportPurchaseLateArrival, reportPurchaseNotReceived, decidePurchaseExtension, notifyPurchaseDelivered, reconfirmOfferAvailability, recordPurchaseOrder,
  reportPurchaseIssue, requestPurchaseExtension, respondToPurchaseIssue, replyToPurchaseInfoRequest, sharePurchaseAddress,
  updatePurchaseDeliveryDate, updatePurchaseDetails, uploadFlowBProof, uploadPurchaseRecipientEvidence, withdrawOffer,
  type DonationOffer, type ExtractedProofData, type PurchaseIssueType, type PurchaseIssueView, type PurchaseProofType, type PurchaseReceiptCondition, type PurchaseView,
} from "@/lib/api";
import { scanOrderProofImage } from "./proofOcr";
import { toast } from "@/lib/toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { purchaseChannelLabel, purchaseMethodLabel, purchaseTimelineLabel } from "@/features/donation-offer-wizard/offerModel";
import { PurchaseDetailsForm, type PurchaseFormValues } from "./PurchaseDetailsForm";
import {
  deliveryHistoryNote, deliverySummaryFromView, endOfDayLocal, formatLocal, purchaseNextAction, purchaseStage, purchaseStageLabel,
  type PurchaseRole, type PurchaseStage,
} from "./purchaseModel";
import { DeliveryActionsPanel, PurchaseChatPanel, type DeliveryChange } from "./PurchaseDeliveryUpdates";
import { DamageGallery, DamageReportForm, MoreDamageEvidence, type DamageReportData } from "./DamageReport";
import { LateArrivalForm, NothingArrivedFlow, type NotReceivedMode } from "./NothingArrived";

const input = "w-full min-h-12 rounded-xl border border-[#C9D0DB] bg-white px-3.5 py-2 text-base text-stone-900 focus:border-[var(--ck-role-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-stone-100 sm:text-[15px]";
const primary = "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[var(--ck-role-accent)] px-7 py-2 text-[16px] font-extrabold text-white hover:bg-[var(--ck-role-hover)] disabled:opacity-60";
const secondary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#C9D0DB] bg-white px-4 py-2 text-[15px] font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-transparent dark:text-stone-200 dark:hover:bg-zinc-800";

/** Main-column panels are roomy; `small` is the side-column variant. */
function Panel({ title, icon, aside, small = false, children }: { title: string; icon?: ReactNode; aside?: ReactNode; small?: boolean; children: ReactNode }) {
  return (
    <section className={`rounded-[20px] border border-[#E3E7EE] bg-white dark:border-zinc-800 dark:bg-zinc-900 ${small ? "p-5 sm:p-6" : "p-5 sm:p-7"}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className={`flex items-center gap-2 font-extrabold text-stone-900 dark:text-stone-100 ${small ? "text-[17px]" : "text-[22px]"}`}>{icon}{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">{label}</span>
      {children}
      {hint && <span className="block text-[13px] text-stone-500 dark:text-stone-400">{hint}</span>}
    </label>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-bold text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-0.5 break-words text-[15px] font-bold text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}

// The viewer's local calendar date (YYYY-MM-DD); toISOString would give UTC and lag in IST mornings.
const today = () => new Date().toLocaleDateString("en-CA");

/**
 * The purchase hub — one page for both purchase journeys and both roles.
 *
 * <p>Shows each viewer their next action and only the controls that stage
 * allows; the server re-checks actor, method and stage on every call. Direct
 * delivery never shows handover-code controls, and the physical journey hands
 * off to `/offers/[id]/handover` once the item photo is approved.
 *
 * <p>Addresses, phone numbers and order references are rendered without
 * `data-auto-translate`, so they never go to the translation service.
 */
export function PurchaseHub({
  offer, view, role, onChanged,
}: {
  offer: DonationOffer;
  view: PurchaseView;
  role: PurchaseRole;
  onChanged: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const stage = purchaseStage(view, offer.status);
  const donor = role === "DONOR";
  const donee = role === "DONEE";
  const direct = view.method === "DIRECT_DELIVERY";
  const id = offer.id;

  // Bumped after an action that posts to the chat, so the thread shows it at once.
  const [chatRefresh, setChatRefresh] = useState(0);
  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      setChatRefresh(n => n + 1);
      await onChanged();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work. Please try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  const sendDateUpdate = (d: { kind: DeliveryChange; expectedOn: string; message: string }) =>
    run("date", () => updatePurchaseDeliveryDate(id, d), "Update sent to the recipient");

  /** Records the purchase, then the item photo and the optional private receipt. */
  async function submitPurchase(v: PurchaseFormValues) {
    if (!v.photo) throw new Error("Add a photo of the item you bought.");
    await recordPurchaseOrder(id, {
      idempotencyKey: purchaseKey, retailer: v.retailer, quantity: v.quantity,
      expectedDeliveryAt: endOfDayLocal(today()), prepaid: true,
      itemName: v.itemName, brand: v.brand, model: v.model, actualPrice: v.actualPrice,
      purchasedQuantity: v.purchasedQuantity, purchasedOn: v.purchasedOn, notes: v.notes,
    });
    // Recorded now; a failed photo leaves the donor on the photo step with the form's data kept.
    await uploadFlowBProof(id, "ITEM_PHOTO", v.photo);
    if (v.receipt) await uploadFlowBProof(id, "RECEIPT", v.receipt).catch(() => toast.error("Sent — but the receipt didn't upload. You can add it again below."));
  }
  /** After our team asked for more: the corrected details, then a new photo if one was chosen. */
  async function resubmitPurchase(v: PurchaseFormValues) {
    if (v.receipt) await uploadFlowBProof(id, "RECEIPT", v.receipt);
    const base = {
      itemName: v.itemName, brand: v.brand, model: v.model, actualPrice: v.actualPrice, purchasedQuantity: v.purchasedQuantity,
      quantity: v.quantity, retailer: v.retailer, purchasedOn: v.purchasedOn, notes: v.notes,
    };
    // A new photo sends it back for review by itself, so the details go first without resubmitting.
    await updatePurchaseDetails(id, { ...base, resubmit: !v.photo });
    if (v.photo) await uploadFlowBProof(id, "ITEM_PHOTO", v.photo);
  }

  const orderedOpen = !!view.orderedAt && !["ISSUE_OPEN", "COMPLETED", "CLOSED", "ISSUE_WINDOW"].includes(stage);
  // In person, the handover page owns the handover and its issue window ("Everything's fine" / report).
  const physicalWindow = !direct && stage === "ISSUE_WINDOW";
  const handoverStage = stage === "READY_FOR_HANDOVER" || physicalWindow
    || (!direct && ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"].includes(offer.status));
  // Before approval the buying window is provisional: it restarts in full when our team approves.
  const beforeApproval = offer.status === "DONOR_RECONFIRMATION_REQUIRED" || stage === "AWAITING_ADDRESS" || stage === "AWAITING_APPROVAL";
  const plan = offer.purchaseCommitment;
  const inTransit = stage === "IN_TRANSIT" || stage === "PARTIALLY_RECEIVED" || stage === "DELIVERED";
  const openIssue = view.issues.find(i => !i.resolvedAt);
  // The participant who didn't report the open issue can answer it once.
  const canRespond = !donor && !!openIssue && !openIssue.response
    && (donee && openIssue.reportedByRole === "DONOR");
  const [extractedOrder, setExtractedOrder] = useState<ExtractedProofData | null>(null);
  const deliveryProofDone = view.evidence.some(e => e.type === "DELIVERY_PROOF");
  // Direct delivery, ready to buy: step 1 is the checklist; the upload and order
  // details follow once the donor says they've ordered (or already uploaded proof).
  const [placedClicked, setPlacedClicked] = useState(false);
  const orderPlaced = placedClicked || view.evidence.some(e => e.type === "ORDER_CONFIRMATION");
  const checklistStep = donor && direct && stage === "READY_TO_BUY" && !orderPlaced;
  // A re-upload replaces the earlier file of that type; only the newest is shown.
  const latestEvidence = view.evidence.filter(e =>
    !view.evidence.some(o => o.type === e.type && o.uploadedByRole === e.uploadedByRole && o.uploadedAt > e.uploadedAt));
  const latestConfirmation = latestEvidence.find(e => e.type === "ORDER_CONFIRMATION");
  // Where the purchase stands, so the sidebar speaks in the right tense.
  const phase: "planned" | "ordered" | "delivered" =
    ["DELIVERED", "ISSUE_WINDOW", "COMPLETED"].includes(stage) || (view.receivedQuantity ?? 0) > 0 ? "delivered"
      : view.orderedAt || (donor && orderPlaced) ? "ordered" : "planned";
  const copy = {
    addressTitle: { planned: donor ? "Deliver to" : "Delivering to", ordered: donor ? "Your order ships to" : "Your order ships to", delivered: "Delivered to" }[phase],
    productTitle: {
      planned: donor ? "What you agreed to buy" : "What the donor will buy",
      ordered: donor ? "What you ordered" : "What the donor ordered",
      delivered: donor ? "What you donated" : "What you received",
    }[phase],
    delivery: direct
      ? { planned: donor ? "To be shipped to the recipient" : "To be shipped to you", ordered: donor ? "Shipping to the recipient" : "Shipping to you", delivered: donor ? "Delivered to the recipient" : "Delivered to you" }[phase]
      : "Handed over in person",
    donorAddressNote: phase === "planned"
      ? "Use this address only for this order. Pay in full online — never choose cash on delivery, and never ask the recipient for a delivery OTP."
      : "This address was used only for this order. Never ask the recipient for a delivery OTP.",
    doneeAddressNote: phase === "planned"
      ? "Shared with the donor. If it is incorrect, please contact support before the order is placed."
      : phase === "ordered"
        ? "The donor has placed the order to this address. If there is a problem, please contact support."
        : "Your order was delivered to this address.",
  };
  const showDeliveryProof = donor && direct && (inTransit || stage === "ISSUE_OPEN" || (stage === "ISSUE_WINDOW" && !deliveryProofDone));
  const closedNote = stage === "COMPLETED" ? deliveryHistoryNote(deliverySummaryFromView(view), role) : null;
  const damageIssue = view.issues.find(i => i.arrivedQuantity != null) ?? null;
  const nonDeliveryIssue = view.issues.find(i => i.nonDelivery) ?? null;
  const damageGallery = [
    ...view.evidence.filter(e => e.type === "DAMAGE_PHOTO").map(e => ({ kind: "PHOTO" as const, label: "Damage photo", url: e.url })),
    ...(view.damageVideos ?? []).map(v => ({ kind: "VIDEO" as const, label: "Damage video", url: v.playbackUrl, status: v.status })),
  ];
  // After an "everything arrived" closure the recipient can still flag a problem for a
  // short while; it goes to our team and nothing reopens.
  const lateReport = donee && direct && stage === "COMPLETED" && view.deliveryOutcome === "ALL" && !openIssue
    && !!view.issueWindowExpiresAt && new Date(view.issueWindowExpiresAt).getTime() > Date.now();
  // The form only while it's the recipient's turn; afterwards a status update replaces it.
  const showAddress = donee && direct && stage === "AWAITING_ADDRESS";
  const doneeWaiting = donee && direct && (stage === "AWAITING_APPROVAL" || stage === "READY_TO_BUY");
  const showExtensionDecision = donee && !!view.extensionRequestedUntil && !view.extensionDecidedAt && !view.orderedAt && stage !== "CLOSED";
  const showPhoto = donor && !direct && (stage === "AWAITING_ITEM_PHOTO" || stage === "AWAITING_PROOF_REVIEW");
  const showInfoRequired = donor && !direct && stage === "PURCHASE_INFO_REQUIRED";
  // In person, the donor is committed once they say yes; they tell us what they bought here.
  const showPurchaseForm = donor && !direct && stage === "READY_TO_BUY";
  const details = view.details ?? null;
  const [purchaseKey] = useState(() => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  // "I can't buy it any more": until the item is bought (the server re-checks).
  const canWithdraw = donor && !view.orderedAt && (offer.status === "DONOR_RECONFIRMATION_REQUIRED" || (!direct && stage === "READY_TO_BUY"));
  // After the recipient accepts, the donor confirms here that they'll still buy it.
  const showReconfirm = donor && offer.status === "DONOR_RECONFIRMATION_REQUIRED";
  const showReview = donee && stage === "AWAITING_ACCEPTANCE";
  // Whether the main column has a form for this viewer; otherwise it explains the wait.
  const waitingForAddress = donor && direct && stage === "AWAITING_ADDRESS";
  const hasMainAction = showAddress || waitingForAddress || doneeWaiting || showExtensionDecision || showPhoto || showReconfirm || showReview
    || showInfoRequired || showPurchaseForm
    || (donor && stage === "READY_TO_BUY")
    || (direct && inTransit && (donor || donee))
    || (donee && direct && stage === "ISSUE_WINDOW")
    || showDeliveryProof || canRespond || (donee && direct && stage === "ISSUE_OPEN")
    || (stage === "COMPLETED" && (donor || donee));

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#1B2430] dark:bg-zinc-950 dark:text-stone-100" style={{ fontFamily: "var(--font-nunito), system-ui, sans-serif" }}>
      <div className="mx-auto flex max-w-[1360px] flex-col gap-6 px-4 pb-[calc(var(--ck-bottom-chrome)+1.5rem)] pt-4 sm:px-8 lg:pb-12">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2.5 text-[15px]">
          <Link href={donor ? "/offers" : role === "ADMIN" ? "/admin/offers" : "/donee/offers"} className="inline-flex min-h-11 items-center gap-2 font-bold text-[var(--ck-role-accent)]">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {donor ? "Back to my offers" : "Back to offers"}
          </Link>
          <span className="text-stone-300 dark:text-zinc-700" aria-hidden>·</span>
          <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
            Back to dashboard
          </Link>
        </nav>

        {/* Header: title on the left, deadline and quantity tiles on the right */}
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0 max-w-3xl space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ck-role-soft)] px-3 py-[5px] text-[13px] font-extrabold text-[var(--ck-role-accent)]">
                {direct ? <Truck className="size-4" aria-hidden /> : <Handshake className="size-4" aria-hidden />}
                {donor ? purchaseMethodLabel(view.method) : `Promise to buy · ${direct ? "Delivered to you" : "Handed over in person"}`}
              </span>
              {showReconfirm
                ? <span className="rounded-full bg-amber-50 px-3 py-[5px] text-[13px] font-extrabold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{purchaseStageLabel(stage, view, role)}</span>
                : <span className={`rounded-full px-3 py-[5px] text-[13px] font-extrabold ${stageTone(stage, role)}`}>{stageBadge(stage, role, view)}</span>}
            </div>
            <h1 className="break-words text-[32px] font-extrabold leading-[1.1] sm:text-[40px]">{offer.requestTitle}</h1>
            <p className="text-[16px] leading-relaxed text-[#3D4756] dark:text-stone-300" role="status">{purchaseNextAction(stage, role, view)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!view.orderedAt && view.deadline && (
              <Tile label={donor ? (direct ? "Order by" : "Buy by") : (direct ? "Donor orders by" : "Donor buys by")}
                value={formatShort(view.deadline)} sub={beforeApproval && direct ? "Restarts when our team approves" : daysLeft(view.deadline)} />
            )}
            {view.orderedAt && view.expectedDeliveryAt && (
              <Tile label={direct ? "Expected delivery" : "Ready from"} value={formatShort(view.expectedDeliveryAt)} sub={view.retailer ?? undefined} />
            )}
            <Tile label="Quantity" value={`${view.acceptedQuantity ?? "—"} accepted`}
              sub={direct ? `${view.receivedQuantity ?? 0} received so far` : view.orderedQuantity != null ? `${view.orderedQuantity} bought` : undefined} />
          </div>
        </header>

        <ProgressBar stage={stage} role={role} direct={direct} />

        {handoverStage && (donor || donee) && (
          <Link href={`/offers/${id}/handover`} className={`${primary} self-start`}>
            <Handshake className="size-4" aria-hidden /> {physicalWindow ? (donee ? "Confirm or report on the handover page" : "Open the handover page") : "Arrange handover"}
          </Link>
        )}

        <div className="flex flex-wrap items-start gap-6">
          {/* What this person has to do now */}
          <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            {showReconfirm && (
              <Panel title={direct ? "Still planning to buy it?" : "Can you still purchase this item?"} icon={<Check className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
                <p className="mb-4 text-[15px] text-[#3D4756] dark:text-stone-300">
                  {direct
                    ? <>The recipient said yes to your plan. Confirm you&apos;ll still buy it so our team can approve. Don&apos;t buy yet — wait until this page shows <strong>Ready to buy</strong>.</>
                    : "The recipient has accepted your offer. Please confirm that you're still able to purchase and hand over the promised quantity."}
                </p>
                {!direct && <PlanSummary offer={offer} view={view} donor />}
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" className={primary} disabled={!!busy}
                    onClick={() => void run("reconfirm", () => reconfirmOfferAvailability(id), direct ? "Confirmed — you can place the order now" : "Confirmed — you can buy the item now")}>
                    {busy === "reconfirm" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} Yes, I&apos;ll buy it
                  </button>
                  <button type="button" className={secondary} disabled={!!busy} onClick={() => setConfirmWithdraw(true)}>
                    No, I can&apos;t buy it anymore
                  </button>
                </div>
              </Panel>
            )}

            {showReview && (
              <Panel title="Review the proposal" icon={<FileText className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
                <p className="mb-4 text-[15px] text-[#3D4756] dark:text-stone-300">
                  {direct
                    ? "Check what the donor plans to buy and how it reaches you, then accept or decline it on your offers page. After you accept, you'll share a delivery address here."
                    : "Accepting reserves the offered quantity with this donor. The donor then confirms, buys the item and arranges a handover with you."}
                </p>
                <Link href="/donee/offers" className={primary}>Review on my offers page</Link>
              </Panel>
            )}

            {showAddress && (
              <AddressPanel view={view} busy={busy}
                onShare={a => run("address", () => sharePurchaseAddress(id, a), "Delivery details shared with the donor")} />
            )}

            {doneeWaiting && <DoneeStatusPanel stage={stage} view={view} />}

            {waitingForAddress && (
              <Panel title="The recipient is sharing their delivery address" icon={<MapPin className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
                <p className="text-[15px] leading-relaxed text-[#3D4756] dark:text-stone-300">
                  The recipient has accepted your offer of {view.acceptedQuantity ?? "the"} {view.acceptedQuantity === 1 ? "item" : "items"} and is now providing the address the order should be shipped to.
                  No action is needed from you at this stage.
                </p>
                <ol className="mt-4 space-y-2 text-sm text-[#3D4756] dark:text-stone-300">
                  <li className="flex gap-2"><span className="font-bold text-[var(--ck-role-accent)]">1.</span> The recipient shares their delivery address.</li>
                  <li className="flex gap-2"><span className="font-bold text-[var(--ck-role-accent)]">2.</span> Our team reviews and approves the offer.</li>
                  <li className="flex gap-2"><span className="font-bold text-[var(--ck-role-accent)]">3.</span> You receive the address here, along with everything you need to place the order.</li>
                </ol>
                <div role="note" className="mt-5 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p><strong>Please don&apos;t place the order yet.</strong> This page will show <strong>Ready to buy</strong> once the address is shared and our team has approved the offer.</p>
                </div>
              </Panel>
            )}

            {showExtensionDecision && (
              <ExtensionDecisionPanel view={view} busy={busy}
                onDecide={(approve, reason) => run("extdecide", () => decidePurchaseExtension(id, { approve, reason }), approve ? "Extension approved" : "Extension declined")} />
            )}

            {donor && stage === "READY_TO_BUY" && direct && !orderPlaced && (
              <OrderChecklistPanel view={view} plan={plan} onPlaced={() => setPlacedClicked(true)} />
            )}

            {showPurchaseForm && (
              <>
                <Panel title="You're committed to purchasing this item" icon={<Handshake className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
                  <PlanSummary offer={offer} view={view} donor />
                </Panel>
                <Panel title="I've purchased the item" icon={<PackageCheck className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
                  <p className="-mt-1 mb-5 text-[15px] text-[#3D4756] dark:text-stone-300">
                    <strong>Tell us what you purchased.</strong> Enter the actual purchase details and upload a clear photograph of the item to proceed to the handover.
                  </p>
                  <PurchaseDetailsForm mode="new" acceptedQuantity={view.acceptedQuantity ?? 1} heldQuantity={view.acceptedQuantity ?? 1}
                    acceptedAt={view.acceptedAt} defaults={{ ...details, itemName: details?.plannedItem ?? offer.requestTitle }} busy={busy === "purchase"}
                    onSubmit={v => run("purchase", () => submitPurchase(v), "Purchase confirmed — you can now arrange the handover")} />
                </Panel>
              </>
            )}

            {showInfoRequired && (
              <Panel title="Our team needs more information" icon={<AlertTriangle className="size-5 text-amber-600" aria-hidden />}>
                <div role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-[15px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  {view.proofRejectionReason}
                </div>
                <PurchaseDetailsForm mode="edit" acceptedQuantity={view.acceptedQuantity ?? 1} heldQuantity={view.orderedQuantity ?? view.acceptedQuantity ?? 1}
                  acceptedAt={view.acceptedAt} defaults={{ ...details, intendedStore: view.retailer ?? details?.intendedStore }} busy={busy === "purchase"}
                  onSubmit={v => run("purchase", () => resubmitPurchase(v), "Sent — our team will check it again")} />
              </Panel>
            )}

            {donor && stage === "READY_TO_BUY" && direct && orderPlaced && (
              <OrderPanel view={view} direct={direct} busy={busy} extractedOrder={extractedOrder}
                confirmation={latestConfirmation}
                onUploadConfirmation={async f => {
                  return run("upload", async () => {
                    let ocrExtracted: ExtractedProofData | null = null;
                    if (f.type.startsWith("image/")) {
                      try {
                        ocrExtracted = await scanOrderProofImage(f);
                      } catch (err) {
                        console.warn("Client-side OCR scanning error:", err);
                      }
                    }

                    const res = await uploadFlowBProof(
                      id,
                      "ORDER_CONFIRMATION",
                      f,
                      ocrExtracted?.trackingNumber ?? undefined,
                      undefined,
                      {
                        retailer: ocrExtracted?.retailer ?? undefined,
                        orderNumber: ocrExtracted?.orderNumber ?? undefined,
                        expectedDeliveryDate: ocrExtracted?.expectedDeliveryDate ?? undefined,
                        trackingUrl: ocrExtracted?.trackingUrl ?? undefined,
                      }
                    );

                    const merged: ExtractedProofData = {
                      retailer: res?.extracted?.retailer || ocrExtracted?.retailer || null,
                      orderNumber: res?.extracted?.orderNumber || ocrExtracted?.orderNumber || null,
                      expectedDeliveryDate: res?.extracted?.expectedDeliveryDate || ocrExtracted?.expectedDeliveryDate || null,
                      quantity: res?.extracted?.quantity || ocrExtracted?.quantity || null,
                      totalAmountInr: res?.extracted?.totalAmountInr || null,
                      trackingNumber: res?.extracted?.trackingNumber || ocrExtracted?.trackingNumber || null,
                      trackingUrl: res?.extracted?.trackingUrl || ocrExtracted?.trackingUrl || null,
                    };

                    // Always replace: a new file whose scan finds nothing still clears the old file's details.
                    setExtractedOrder(merged);
                  }, "Order confirmation attached — details filled in below");
                }}
                onSubmit={data => run("order", () => recordPurchaseOrder(id, data), direct ? "Order recorded" : "Purchase recorded — now upload a photo of the item")} />
            )}

            {canWithdraw && !showReconfirm && (
              <p className="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
                Can&apos;t buy it after all? Ask for more time below, or{" "}
                <button type="button" className="font-bold text-[var(--ck-role-accent)] underline" onClick={() => setConfirmWithdraw(true)}>withdraw your offer</button>
                {" "}so another donor can help.
              </p>
            )}

            {donor && stage === "READY_TO_BUY" && direct && (
              <p className="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
                Can&apos;t buy it after all? Approved offers can&apos;t be withdrawn here — ask for more time, or{" "}
                <Link href="/contact" className="font-bold text-[var(--ck-role-accent)] underline">contact support</Link> so the recipient isn&apos;t left waiting.
              </p>
            )}

            {showPhoto && (
              <>
                {stage === "AWAITING_ITEM_PHOTO" && view.proofRejectionReason && (
                  <div role="alert" className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[15px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                    <p><strong>Our team couldn&apos;t accept the last photo.</strong> {view.proofRejectionReason} Upload a new photo below.</p>
                  </div>
                )}
                <EvidencePanel title={stage === "AWAITING_ITEM_PHOTO" ? (view.proofRejectionReason ? "Upload a new photo of the item" : "Upload a photo of the item") : "Replace the item photo"} type="ITEM_PHOTO" busy={busy} accept="image/*" replaceable
                  hint="A clear, recent photo of the actual item you bought. This is not the handover photo — that comes later."
                  done={stage === "AWAITING_PROOF_REVIEW"}
                  doneText="Purchase sent — our team is verifying it. You can replace the photo until it's verified."
                  onUpload={f => run("upload", () => uploadFlowBProof(id, "ITEM_PHOTO", f), "Photo uploaded — our team will check it before the handover")} />
                <EvidencePanel title="Receipt (optional, private)" type="RECEIPT" busy={busy}
                  hint="Only our team sees it. Hide payment details."
                  done={view.evidence.some(e => e.type === "RECEIPT")}
                  onUpload={f => run("upload", () => uploadFlowBProof(id, "RECEIPT", f), "Receipt uploaded")} />
              </>
            )}

            {donor && direct && stage === "ISSUE_WINDOW" && !deliveryProofDone && (
              <div role="alert" className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[15px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div>
                  <p className="font-bold">Delivery proof required to finish transaction</p>
                  <p className="mt-1 text-sm">The recipient confirmed that they have received the items. To complete the donation and receive your completion certificate, please upload proof of delivery below.</p>
                </div>
              </div>
            )}

            {showDeliveryProof && (
              <EvidencePanel
                title={stage === "ISSUE_WINDOW" ? "Upload delivery proof (required to finish)" : "Upload delivery proof"}
                type="DELIVERY_PROOF"
                busy={busy}
                hint="A screenshot of the courier's 'Delivered' status, or their proof-of-delivery slip (image or PDF). Hide payment details first. The recipient and our team can see it."
                done={deliveryProofDone}
                doneText={stage === "ISSUE_WINDOW" ? "Delivery proof submitted. The purchase is closing." : "Delivery proof submitted. Waiting for the recipient to confirm what arrived."}
                onUpload={f => run("upload", () => uploadFlowBProof(id, "DELIVERY_PROOF", f), "Delivery proof submitted")} />
            )}

            {view.notReceivedYetAt && direct && inTransit && (donor || donee) && (
              <div role="status" data-testid="not-received-yet" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[15px] text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-bold">Not received yet · marked {formatShort(view.notReceivedYetAt)}</p>
                <p className="mt-1 text-sm">
                  {donor
                    ? "The recipient hasn't received the package yet. Please check tracking on your end."
                    : view.notReceivedPromptSentAt
                      ? "It's been 48 hours. If it still hasn't come, choose \"Nothing arrived\" below to confirm; or tell us what did arrive."
                      : "We've asked the donor to check tracking. If it turns up, tell us what arrived below."}
                </p>
              </div>
            )}

            {donor && direct && inTransit && (
              <DeliveryActionsPanel view={view} busy={busy}
                onNotifyDelivered={() => run("delivered", () => notifyPurchaseDelivered(id), "The recipient has been asked to confirm what arrived")}
                onUpdateDate={sendDateUpdate} />
            )}

            {donee && direct && inTransit && (
              <ReceiptPanel view={view} offerId={id} busy={busy}
                onNotReceived={(mode, declaration, note) => run("receipt", () => reportPurchaseNotReceived(id, {
                  checkedNeighbours: true, checkedFamily: true, checkedTracking: true, mode, declaration, ...(note ? { note } : {}),
                }), mode === "NOT_YET" ? "Thanks. We've asked the donor to check tracking" : "Reported. This purchase is closed and our team will follow up")}
                onDamage={(data, photos) => run("receipt", async () => {
                  // Photos first: the report closes the purchase, and the server needs at least one on file.
                  for (const f of photos) await uploadPurchaseRecipientEvidence(id, "DAMAGE_PHOTO", f);
                  await confirmPurchaseReceipt(id, {
                    cumulativeQuantity: 0, condition: data.condition, closeRemainder: true, note: data.note,
                    arrivedQuantity: data.arrivedQuantity, minorDamageQuantity: data.minorDamageQuantity, unusableQuantity: data.unusableQuantity,
                  });
                }, "Damage reported. This purchase is closed and our team will follow up")}
                onSubmit={(outcome, files) => run("receipt", async () => {
                  const confirming = outcome.kind === "receipt" && (outcome.data.condition === "GOOD" || outcome.data.condition === "PARTIAL");
                  // A receipt needs the photos on file first; the server refuses it otherwise.
                  if (confirming) {
                    if (!files.length) throw new Error("Add a photo of the items you received.");
                    for (const f of files) await uploadPurchaseRecipientEvidence(id, "RECEIVED_PHOTO", f);
                  } else {
                    // Before the report: reporting closes the purchase, after which uploads are refused.
                    for (const f of files) await uploadPurchaseRecipientEvidence(id, "ISSUE_EVIDENCE", f);
                  }
                  if (outcome.kind === "receipt") await confirmPurchaseReceipt(id, outcome.data);
                  else await reportPurchaseIssue(id, outcome.data);
                }, outcome.kind === "receipt" && outcome.data.condition === "GOOD" ? "Thanks — receipt recorded"
                  : outcome.kind === "receipt" && outcome.data.condition === "PARTIAL" ? "Thanks. This purchase is closed and our team will follow up on the rest"
                  : "Issue raised — our team will review it and follow up")} />
            )}



            {stage === "COMPLETED" && (donor || donee) && (
              <Panel title={closedNote?.tone === "pending" ? "Purchase closed" : "Donation complete"} icon={<Award className="size-5 text-green-700" aria-hidden />}>
                {direct && closedNote ? (
                  <div className="mb-4 space-y-2">
                    <p className={`inline-flex rounded-lg px-2.5 py-1 text-sm font-bold ${closedNote.tone === "pending"
                      ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                      : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>{closedNote.line}</p>
                    {closedNote.note && <p className="text-sm text-stone-600 dark:text-stone-300">{closedNote.note}</p>}
                    <p className="text-sm text-stone-600 dark:text-stone-300">
                      {donor ? "Your certificate covers what was received. Nothing more is needed from you here." : "Nothing more is needed from you here."}
                    </p>
                    {damageIssue && donee && damageIssue.returnPickupStatus === "SCHEDULED" && damageIssue.returnPickupNote && (
                      <p className="rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                        <strong>Return pickup scheduled.</strong> {damageIssue.returnPickupNote}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
                    {view.receivedQuantity ?? 0} of {view.acceptedQuantity ?? "—"} {direct ? "received" : "handed over"} and confirmed.
                    {donor ? " Your certificate covers only what was received." : " Thank you for confirming."}
                  </p>
                )}
                {/* Certificates are the donor's; the server refuses anyone else. */}
                <div className="flex flex-wrap items-center gap-3">
                  {donor && (
                    <Link href={`/certificate?offerId=${id}`} className={primary}>
                      <Award className="size-4" aria-hidden /> View certificate
                    </Link>
                  )}
                  <Link href="/dashboard" className={donor ? secondary : primary}>
                    <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> Back to dashboard
                  </Link>
                </div>
              </Panel>
            )}

            {!donor && view.issues.length > 0 && (
              <IssuesPanel issues={view.issues} role={role} canRespond={canRespond} busy={busy}
                onRespond={message => run("respond", () => respondToPurchaseIssue(id, message), "Response sent to support")}
                onInfoReply={message => run("info", () => replyToPurchaseInfoRequest(id, message), "Answer sent to our team")} />
            )}

            {donee && direct && stage === "ISSUE_OPEN" && (
              <EvidencePanel title="Add evidence (optional)" type="ISSUE_EVIDENCE" busy={busy}
                hint="Photos of the damage, the wrong item or the packaging help support resolve this. Images or PDF."
                done={view.evidence.some(e => e.type === "ISSUE_EVIDENCE")}
                onUpload={f => run("upload", () => uploadPurchaseRecipientEvidence(id, "ISSUE_EVIDENCE", f), "Evidence added")} />
            )}

            

            {donee && direct && stage === "ISSUE_WINDOW" && (
              <Panel title="You're all set" icon={<ShieldCheck className="size-5 text-green-700" aria-hidden />}>
                <p className="text-sm text-stone-600 dark:text-stone-300">
                  {deliveryProofDone
                    ? "Thanks for confirming. You can close this now."
                    : "Thanks for confirming. Nothing more is needed from you: the purchase closes as soon as the donor adds delivery proof."}
                </p>
                {/* Purchases confirmed before delivery proof closed automatically still finish here. */}
                {deliveryProofDone && (
                  <button type="button" className={`${primary} mt-4`} disabled={!!busy}
                    onClick={() => void run("noissue", () => confirmPurchaseNoIssue(id), "Donation completed")}>
                    {busy === "noissue" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} Close the purchase
                  </button>
                )}
              </Panel>
            )}

            {donor && stage === "COMPLETED" && nonDeliveryIssue?.confirmationGeneratedAt && (
              <Panel title="Non-delivery confirmation" small>
                <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
                  Our team prepared a confirmation you can attach to an &ldquo;item not received&rdquo; claim with the seller. It carries no recipient contact details.
                </p>
                <button type="button" className={secondary} disabled={!!busy}
                  onClick={() => void run("pdf", () => downloadNonDeliveryConfirmation(id), "Downloaded")}>
                  <FileText className="size-4" aria-hidden /> Download PDF
                </button>
              </Panel>
            )}

            {donee && view.lateArrivalOpen && stage === "COMPLETED" && (
              <Panel title="Package arrived later?" icon={<PackageCheck className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
                <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">If some or all of it turned up after the issue closed, tell our team. They confirm before anything is counted.</p>
                <LateArrivalForm max={Math.max(0, (view.orderedQuantity ?? view.acceptedQuantity ?? 0) - (view.receivedQuantity ?? 0))} busy={busy === "late-arrival"}
                  onSubmit={(data, photos) => run("late-arrival", async () => {
                    // Photos first: the report needs at least one when damaged.
                    for (const f of photos) await uploadPurchaseRecipientEvidence(id, "DAMAGE_PHOTO", f);
                    await reportPurchaseLateArrival(id, { quantity: data.quantity, condition: data.condition, ...(data.note ? { note: data.note } : {}) });
                  }, "Thanks. Our team will confirm and update the count")} />
              </Panel>
            )}

            {damageIssue && (donor || donee) && stage === "COMPLETED" && (
              <Panel title="Damage photos and video" small>
                <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
                  {donor
                    ? "What the recipient shared about the damage. You can use these to raise a return or replacement with the seller."
                    : "What you shared with our team and the donor."}
                </p>
                <DamageGallery items={damageGallery} />
              </Panel>
            )}

            {donee && view.evidenceOpen && stage === "COMPLETED" && (
              <Panel title="Add more photos for our team" icon={<Upload className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
                <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">Our team asked for more about the damage. Add photos (and a video if it helps), then answer their question below.</p>
                <MoreDamageEvidence offerId={id} busy={busy === "upload"}
                  onUpload={files => run("upload", async () => {
                    for (const f of files) await uploadPurchaseRecipientEvidence(id, "DAMAGE_PHOTO", f);
                  }, "Photos sent to our team")} />
              </Panel>
            )}

            {lateReport && (
              <LateProblemPanel received={view.receivedQuantity ?? 0} busy={busy}
                onReport={data => run("late", () => reportPurchaseIssue(id, data), "Thanks. Our team will look into it")} />
            )}

            {direct && view.acceptedAt && (
              <PurchaseChatPanel offerId={id} view={view} isDonor={donor} busy={busy} refreshKey={chatRefresh}
                closed={stage === "COMPLETED" || stage === "CLOSED" || stage === "LEGACY"}
                onUpdateDate={sendDateUpdate} />
            )}

            {/* Nothing to do right now: say what we're waiting for, never an empty column */}
            {!hasMainAction && (
              <Panel title={stage === "COMPLETED" ? "All done" : stage === "CLOSED" || stage === "LEGACY" ? "Closed" : "Nothing to do right now"}>
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{purchaseNextAction(stage, role, view)}</p>
                {(stage === "COMPLETED" || stage === "CLOSED" || stage === "LEGACY") && (
                  <div className="mt-4">
                    <Link href="/dashboard" className={secondary}>
                      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> Back to dashboard
                    </Link>
                  </div>
                )}
              </Panel>
            )}
            <AlertDialog open={confirmWithdraw} onOpenChange={setConfirmWithdraw}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you can no longer fulfil this offer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your offer will be closed and the {view.acceptedQuantity ?? ""} reserved {view.acceptedQuantity === 1 ? "item goes" : "items go"} back to the request, so another donor can help. The recipient will be told. This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my offer</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void run("withdraw", () => withdrawOffer(id, "The donor can no longer buy this item"), "Offer withdrawn — the recipient has been told")}>
                    Withdraw offer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </main>

          {/* Reference: what was agreed, where it goes, help */}
          <aside aria-label="About this purchase" className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
            {view.address && donee && direct && !showAddress && (
              <Panel title={copy.addressTitle} small aside={<span className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 dark:text-stone-400"><Lock className="size-3.5" aria-hidden /> Locked</span>}>
                <p className="flex gap-2 text-[15px] leading-relaxed [overflow-wrap:anywhere]">
                  <MapPin className="mt-1 size-4 shrink-0 text-[var(--ck-role-accent)]" aria-hidden /> {view.address.address}
                </p>
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{copy.doneeAddressNote}</p>
              </Panel>
            )}

            {view.address && (donor || role === "ADMIN") && !checklistStep && (
              <Panel title={copy.addressTitle} small aside={<span className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 dark:text-stone-400"><Lock className="size-3.5" aria-hidden /> Shared with you only</span>}>
                <address className="whitespace-pre-line text-[15px] not-italic leading-relaxed">
                  {[view.address.contactName, view.address.address, view.address.contactPhone].filter(Boolean).join("\n")}
                </address>
                <button type="button" className={`${secondary} mt-3`}
                  onClick={() => {
                    const text = [view.address?.contactName, view.address?.address, view.address?.contactPhone].filter(Boolean).join("\n");
                    void navigator.clipboard?.writeText(text).then(() => toast.success("Address copied"), () => toast.error("Couldn't copy — select it instead"));
                  }}>
                  <Copy className="size-4" aria-hidden /> Copy address
                </button>
                {view.address.latitude != null && view.address.longitude != null && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${view.address.latitude},${view.address.longitude}`}
                    target="_blank" rel="noopener noreferrer" className={`${secondary} ms-2 mt-3`}>
                    <MapPin className="size-4" aria-hidden /> Open pin in Maps
                  </a>
                )}
                <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">{copy.donorAddressNote}</p>
              </Panel>
            )}

            {!direct && (donor || donee || role === "ADMIN") && !showReconfirm && !showPurchaseForm && (
              <Panel title={view.orderedAt ? (donor ? "What you bought" : "What the donor bought") : (donor ? "Your purchase plan" : "The donor's purchase plan")} small>
                {view.orderedAt && details?.actualItemName ? <ActualSummary view={view} donor={donor || role === "ADMIN"} /> : <PlanSummary offer={offer} view={view} donor={donor} compact />}
              </Panel>
            )}

            {direct && !checklistStep && <Panel title={copy.productTitle} small>
              <dl className="grid grid-cols-2 gap-3">
                <Fact label="Brand" value={plan?.proposedBrand || "Not decided"} />
                <Fact label="Model" value={plan?.proposedModel || "Not decided"} />
                {/* Scanned order details (retailer, tracking) reach the recipient only once the donor submits the order. */}
                {(() => { const shop = view.orderedAt ? view.retailer ?? plan?.intendedStore : plan?.intendedStore; return shop && <Fact label="Shop" value={shop} />; })()}
                <Fact label="Delivery" value={copy.delivery} />
                {phase !== "planned" && view.orderedQuantity != null && <Fact label="Quantity ordered" value={String(view.orderedQuantity)} />}
                {view.orderedAt && view.orderReference && <Fact label="Order number (private)" value={view.orderReference} />}
                {view.orderedAt && view.trackingReference && <Fact label="Tracking number" value={view.trackingReference} />}
              </dl>
              {plan?.productUrl && /^https?:\/\//i.test(plan.productUrl) && (
                <a href={plan.productUrl} target="_blank" rel="noopener noreferrer nofollow" className="group/product mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--ck-role-accent)]/30 bg-[var(--ck-role-accent)]/10 px-4 text-sm font-bold text-[var(--ck-role-accent)] shadow-sm transition-colors hover:bg-[var(--ck-role-accent)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2">
                  <ExternalLink className="size-4" aria-hidden /> View the product
                  <span aria-hidden className="transition-transform group-hover/product:translate-x-0.5">→</span>
                </a>
              )}
              {/* Only a link the donor entered and submitted with the order; a scanned draft never shows. */}
              {view.orderedAt && view.trackingUrl && /^https?:\/\//i.test(view.trackingUrl) && (
                <a href={view.trackingUrl} target="_blank" rel="noopener noreferrer nofollow"
                  className="group/track mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-4 text-sm font-extrabold text-white shadow-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] focus-visible:ring-offset-2">
                  <Truck className="size-4" aria-hidden /> {donee ? "Track your parcel" : "Track the parcel"}
                  <span aria-hidden className="transition-transform group-hover/track:translate-x-0.5">→</span>
                </a>
              )}
            </Panel>}

            {donee && (
              <Panel title="How this works" small>
                <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {direct ? (
                    <>
                      <li>You share an address. Our team approves the offer.</li>
                      <li>The donor places a prepaid order and uploads the confirmation.</li>
                      <li>When the parcel arrives, you take a photo of what came and confirm it — or report a problem.</li>
                    </>
                  ) : (
                    <>
                      <li>Accepting reserves the quantity with this donor; the donor confirms they can still buy it.</li>
                      <li>The donor buys a suitable item and our team verifies the purchase. You don&apos;t need to approve the product.</li>
                      <li>You meet for the handover and confirm with the handover code.</li>
                    </>
                  )}
                </ol>
                {direct && <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">Never share delivery OTP here.</p>}
              </Panel>
            )}

            {donor && view.acceptedAt && !view.orderedAt && !view.extensionRequestedUntil && view.deadline && stage !== "CLOSED" && (
              <ExtensionRequestPanel view={view} busy={busy}
                onSubmit={data => run("ext", () => requestPurchaseExtension(id, data), "Extension requested")} />
            )}
            {donor && view.extensionRequestedUntil && (
              <p className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-300">
                Extension to {formatLocal(view.extensionRequestedUntil)} {view.extensionDecidedAt ? "was decided by the recipient." : "is waiting for the recipient."}
              </p>
            )}

            {/* Proof joins the record once the order is submitted, not while it's being filled in. */}
            {latestEvidence.length > 0 && !!view.orderedAt && (
              <Panel title="Evidence" small icon={<FileText className="size-4 text-stone-500" aria-hidden />}>
                <ul className="space-y-1">
                  {latestEvidence.map(e => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>{EVIDENCE_LABEL[e.type] ?? e.type}{e.uploadedByRole === "DONEE" && !donee ? " (recipient)" : ""} · {formatLocal(e.uploadedAt)}
                        {e.prohibited && <span className="ms-2 text-xs font-semibold text-red-700">Flagged</span>}
                      </span>
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold text-[var(--ck-role-accent)] underline">View</a>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Links expire after 10 minutes — reload for fresh ones.</p>
              </Panel>
            )}

            <Panel title="Something not right?" small>
              <div className="flex flex-col gap-2">
                {(donor || donee) && (orderedOpen || (stage === "ISSUE_WINDOW" && direct)) && (
                  <IssuePanel busy={busy} onSubmit={data => run("issue", () => reportPurchaseIssue(id, data), "Problem reported — support will follow up")} />
                )}
                {(donor || donee) && physicalWindow && (
                  <Link href={`/offers/${id}/handover`} className={secondary}>Report a problem on the handover page</Link>
                )}
                <Link href="/contact" className={secondary}>Contact support</Link>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * The donor's commitment as both sides see it. Only what was given is shown; a
 * shop purchase with no details says so plainly instead of listing blanks.
 */
function PlanSummary({ offer, view, donor, compact = false }: { offer: DonationOffer; view: PurchaseView; donor: boolean; compact?: boolean }) {
  const d = view.details;
  const plan = offer.purchaseCommitment;
  const brand = d?.plannedBrand ?? plan?.proposedBrand;
  const model = d?.plannedModel ?? plan?.proposedModel;
  const cost = d?.estimatedCost ?? plan?.estimatedCost;
  const store = d?.intendedStore ?? plan?.intendedStore;
  const url = d?.productUrl ?? plan?.productUrl;
  const notes = d?.planNotes ?? plan?.notes;
  const channel = purchaseChannelLabel(d?.channel ?? plan?.purchaseChannel);
  const offline = (d?.channel ?? plan?.purchaseChannel) === "OFFLINE";
  const product = [brand, model].filter(Boolean).join(" ");
  const nothing = !product && cost == null && !store && !url && !notes;
  return (
    <div className="space-y-4">
      <dl className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {!compact && <Fact label="Request" value={offer.requestTitle} />}
        {!compact && offer.doneeName && donor && <Fact label="Recipient" value={offer.doneeName} />}
        <Fact label="Quantity" value={`${view.acceptedQuantity ?? offer.itemDetails?.quantity ?? "—"} accepted`} />
        {channel && <Fact label="Purchasing" value={offline ? "Offline store" : channel} />}
        {view.deadline
          ? <Fact label={donor ? "Buy by" : "Donor buys by"} value={formatShort(view.deadline)} />
          : plan && <Fact label="Buying" value={`${purchaseTimelineLabel(plan.purchaseTimeline)} of acceptance`} />}
        {product && <Fact label="Planned product" value={product} />}
        {cost != null && <Fact label="Estimated cost" value={`₹${Number(cost).toLocaleString("en-IN")}`} />}
        {store && <Fact label="Store" value={store} />}
      </dl>
      {notes && <p className="text-sm text-[#3D4756] [overflow-wrap:anywhere] dark:text-stone-300">{notes}</p>}
      {nothing && (
        <p className="text-sm text-[#3D4756] dark:text-stone-300">
          {donor
            ? "The exact product details will be updated after purchase."
            : "The donor will purchase the item from a physical store. Actual purchase details will be available once the donor completes the purchase."}
        </p>
      )}
      {url && /^https?:\/\//i.test(url) && (
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" className={`${secondary} w-full sm:w-auto`}>
          <ExternalLink className="size-4" aria-hidden /> View product
        </a>
      )}
    </div>
  );
}

/** What was actually bought. The price paid is shown to the donor and our team only (the server omits it otherwise). */
function ActualSummary({ view, donor }: { view: PurchaseView; donor: boolean }) {
  const d = view.details;
  if (!d) return null;
  const product = [d.actualBrand, d.actualModel].filter(Boolean).join(" ");
  return (
    <dl className="grid grid-cols-2 gap-3">
      <Fact label="Item" value={d.actualItemName} />
      {product && <Fact label="Brand and model" value={product} />}
      <Fact label="Donated here" value={String(view.orderedQuantity ?? "—")} />
      {donor && d.purchasedQuantity != null && <Fact label="Bought" value={String(d.purchasedQuantity)} />}
      {view.retailer && <Fact label="Store" value={view.retailer} />}
      {d.purchasedOn && <Fact label="Bought on" value={new Date(`${d.purchasedOn}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />}
      {donor && d.actualPrice != null && <Fact label="Price paid (private)" value={`₹${Number(d.actualPrice).toLocaleString("en-IN")}`} />}
      {d.purchaseNotes && <div className="col-span-2"><Fact label="Details" value={d.purchaseNotes} /></div>}
    </dl>
  );
}

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="min-w-[150px] rounded-[14px] border border-[#E3E7EE] bg-white px-[18px] py-[14px] dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#5B6575] dark:text-stone-400">{label}</div>
      <div className="mt-1 text-[18px] font-extrabold">{value}</div>
      {sub && <div className="text-[13px] text-[#5B6575] dark:text-stone-400">{sub}</div>}
    </div>
  );
}

const EVIDENCE_LABEL: Record<PurchaseProofType, string> = {
  ITEM_PHOTO: "Item photo",
  ORDER_CONFIRMATION: "Order confirmation",
  RECEIPT: "Receipt",
  DELIVERY_PROOF: "Delivery proof",
  RECEIVED_PHOTO: "Photo of what arrived",
  ISSUE_EVIDENCE: "Problem evidence",
  DAMAGE_PHOTO: "Damage photo",
};

const STEPS: Record<string, string[]> = {
  "direct-DONEE": ["You accepted", "Donor confirms", "Donor orders", "On the way", "You confirm it arrived"],
  "direct-DONOR": ["Recipient accepted", "You confirm", "You order", "On the way", "Recipient confirms"],
  "physical-DONEE": ["Offer accepted", "Donor confirmed", "Purchase in progress", "Handover", "Completed"],
  "physical-DONOR": ["Offer accepted", "You confirmed", "Purchase in progress", "Handover", "Completed"],
};

/** Index of the step in progress; steps before it are done. steps.length = everything done, -1 = no bar. */
function stepIndex(stage: PurchaseStage, direct: boolean): number {
  const map: Partial<Record<PurchaseStage, number>> = direct
    ? { AWAITING_ACCEPTANCE: 0, AWAITING_RECONFIRMATION: 1, READY_TO_BUY: 2, IN_TRANSIT: 3, PARTIALLY_RECEIVED: 3, DELIVERED: 4, ISSUE_OPEN: 3, ISSUE_WINDOW: 4, COMPLETED: 5 }
    : { AWAITING_ACCEPTANCE: 0, AWAITING_RECONFIRMATION: 1, AWAITING_APPROVAL: 1, READY_TO_BUY: 2, AWAITING_ITEM_PHOTO: 2, PURCHASE_INFO_REQUIRED: 2, AWAITING_PROOF_REVIEW: 2, READY_FOR_HANDOVER: 3, ISSUE_OPEN: 3, ISSUE_WINDOW: 4, COMPLETED: 5 };
  return map[stage] ?? -1;
}

function ProgressBar({ stage, role, direct }: { stage: PurchaseStage; role: PurchaseRole; direct: boolean }) {
  const idx = stepIndex(stage, direct);
  if (idx < 0) return null;
  const steps = STEPS[`${direct ? "direct" : "physical"}-${role === "DONOR" ? "DONOR" : "DONEE"}`];
  const issue = stage === "ISSUE_OPEN";
  return (
    <nav aria-label="Purchase progress" className="overflow-x-auto rounded-[18px] border border-[#E3E7EE] bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <ol className="grid min-w-[640px] gap-3" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((label, i) => {
          const done = i < idx;
          const current = i === idx;
          return (
            <li key={label} aria-current={current ? "step" : undefined} className="flex flex-col gap-2.5">
              <span aria-hidden className={`h-1.5 rounded-full ${current && issue ? "bg-amber-500" : done || current ? "bg-[var(--ck-role-accent)]" : "bg-stone-200 dark:bg-zinc-700"}`} />
              <span className={`flex items-center gap-1.5 text-[14px] ${current ? `font-extrabold ${issue ? "text-amber-800 dark:text-amber-300" : "text-[var(--ck-role-accent)]"}` : done ? "font-bold" : "font-semibold text-stone-500 dark:text-stone-400"}`}>
                {done && <Check className="size-4 shrink-0 text-green-700" aria-hidden strokeWidth={2.5} />}
                {label}{current && (issue ? " · problem reported" : " · now")}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function stageBadge(stage: PurchaseStage, role: PurchaseRole, view: PurchaseView): string {
  if (view.method === "BUY_AND_HAND_OVER") {
    const label = purchaseStageLabel(stage, view, role);
    return role === "DONOR" && (stage === "AWAITING_ITEM_PHOTO" || stage === "PURCHASE_INFO_REQUIRED") ? `${label} · your turn` : label;
  }
  if (role === "DONEE" && stage === "AWAITING_ADDRESS") return "Your turn: share delivery details";
  if (role === "DONOR" && (stage === "READY_TO_BUY" || stage === "AWAITING_ITEM_PHOTO")) return `${purchaseStageLabel(stage, view, role)} · your turn`;
  if (role === "DONEE" && stage === "DELIVERED") return "Your turn: confirm what arrived";
  if (role === "DONEE" && (stage === "IN_TRANSIT" || stage === "PARTIALLY_RECEIVED")) return "Your turn when it arrives";
  return purchaseStageLabel(stage, view, role);
}

function stageTone(stage: PurchaseStage, role: PurchaseRole): string {
  const yourTurn = (role === "DONEE" && (stage === "AWAITING_ADDRESS" || stage === "DELIVERED")) || (role === "DONOR" && (stage === "READY_TO_BUY" || stage === "AWAITING_ITEM_PHOTO" || stage === "PURCHASE_INFO_REQUIRED"));
  if (stage === "ISSUE_OPEN" || yourTurn) return "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
  if (stage === "COMPLETED" || stage === "ISSUE_WINDOW" || stage === "READY_FOR_HANDOVER") return "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300";
  return "bg-stone-200/70 text-stone-700 dark:bg-zinc-800 dark:text-stone-300";
}

function formatShort(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function daysLeft(value: string): string | undefined {
  const ms = new Date(value).getTime() - Date.now();
  if (Number.isNaN(ms)) return undefined;
  if (ms <= 0) return "Deadline passed";
  const days = Math.floor(ms / 86_400_000);
  return days >= 1 ? `${days} day${days === 1 ? "" : "s"} left` : "Less than a day left";
}

function AddressPanel({ view, busy, onShare }: {
  view: PurchaseView; busy: string | null;
  onShare: (a: { address: string; contactName?: string; contactPhone?: string; latitude?: number; longitude?: number }) => Promise<boolean>;
}) {
  // Shared once, then locked: a donor may already have typed it into the
  // shop's checkout, so a later edit could send the parcel to the wrong place.
  if (view.address) return <SharedAddressPanel address={view.address} />;
  return <AddressForm busy={busy} onShare={onShare} />;
}

function SharedAddressPanel({ address: a }: { address: NonNullable<PurchaseView["address"]> }) {
  return (
    <Panel title="Your shared delivery details"
      aside={<span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600 dark:bg-zinc-800 dark:text-stone-300"><Lock className="size-3.5" aria-hidden /> Locked</span>}>
      <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--ck-role-accent)]" aria-hidden />
        <div className="min-w-0 space-y-1 text-[15px] text-stone-800 [overflow-wrap:anywhere] dark:text-stone-200">
          <p className="font-semibold">{a.address}</p>
          {(a.contactName || a.contactPhone) && (
            <p className="text-sm text-[#3D4756] dark:text-stone-300">{[a.contactName, a.contactPhone].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm text-[#3D4756] dark:text-stone-300">
        This address has been shared with the donor and can&apos;t be changed. If it&apos;s wrong, contact support before the donor places the order.
      </p>
    </Panel>
  );
}

function AddressForm({ busy, onShare }: {
  busy: string | null;
  onShare: (a: { address: string; contactName?: string; contactPhone?: string; latitude?: number; longitude?: number }) => Promise<boolean>;
}) {
  // Separate fields make a complete address more likely; the backend stores
  // one text, so they are joined on submit.
  const [line1, setLine1] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [pin, setPin] = useState("");
  const [name] = useState("");
  const [phone] = useState("");
  const [consent, setConsent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Optional pin: helps the donor (and courier) find the door; the typed address stays required.
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [pinFill, setPinFill] = useState<string | null>(null);
  // What the last pin wrote into each field. A field still holding that value
  // may be refilled by a new pin; one the person typed over is never touched.
  const autoFilled = useRef<Record<string, string>>({});
  const pinSeq = useRef(0);

  async function fillFromPin(la: number, ln: number) {
    const seq = ++pinSeq.current;
    setPinFill("Looking up the address at your pin…");
    const res = await detectLocationFromServer(la, ln).catch(() => null);
    if (seq !== pinSeq.current) return; // a newer pin superseded this one
    if (!res || !res.ok) {
      setPinFill("Couldn't read an address at that pin — please type it in.");
      return;
    }
    const a = res.address;
    const street = [a.house_number, a.building ?? a.amenity, a.road].filter(Boolean).join(", ");
    const values: Record<string, [string, (v: string) => void, string]> = {
      line1: [street, setLine1, line1],
      area: [a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? "", setArea, area],
      city: [a.city ?? a.town ?? a.village ?? a.state_district ?? a.county ?? "", setCity, city],
      pin: [(a.postcode ?? "").replace(/\D/g, "").slice(0, 6), setPin, pin],
    };
    let filled = 0;
    for (const [key, [next, set, current]] of Object.entries(values)) {
      if (!next) continue;
      const untouched = current.trim() === "" || current === autoFilled.current[key];
      if (untouched) { set(next); autoFilled.current[key] = next; filled++; }
    }
    setPinFill(filled
      ? "Filled from your pin — please check it and add your flat or house number."
      : "Pin saved. Your typed address was kept.");
  }

  const placeOk = city.trim().length >= 2 && /^\d{6}$/.test(pin.trim());
  const valid = line1.trim().length >= 5 && placeOk && consent;
  const joined = [line1.trim(), area.trim(), landmark.trim() && `Near ${landmark.trim()}`, [city.trim(), pin.trim()].filter(Boolean).join(" - ")]
    .filter(Boolean).join(", ");

  return (
    <Panel title="Where should it be delivered?"
      aside={<span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600 dark:bg-zinc-800 dark:text-stone-300"><Lock className="size-3.5" aria-hidden /> Private</span>}>
      <p className="-mt-1 mb-5 text-[15px] text-[#3D4756] dark:text-stone-300">Only this donor sees it, to enter at the shop&apos;s checkout for this one order.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">Pin the exact spot <span className="font-semibold text-[#5B6575]">(optional)</span></span>
          <p className="text-[13px] text-[#5B6575] dark:text-stone-400">Drop a pin and we&apos;ll fill in the address below. Your typed address is still what goes on the order.</p>
          <HandoverMapPinField lat={lat} lng={lng} disabled={busy !== null} hint="Drag the pin to your door" onChange={(a, b) => { setLat(a); setLng(b); void fillFromPin(a, b); }} />
          {pinFill && <p role="status" className="text-[13px] font-semibold text-[#3D4756] dark:text-stone-300">{pinFill}</p>}
        </div>
        <div className="sm:col-span-2">
          <Field label="House / flat and street">
            <input className={input} value={line1} maxLength={300} autoComplete="address-line1" onChange={e => setLine1(e.target.value)} placeholder="e.g. Flat 12, Shanti Apartments, Station Road" />
          </Field>
        </div>
        <Field label="Area / locality"><input className={input} value={area} maxLength={100} autoComplete="address-line2" onChange={e => setArea(e.target.value)} /></Field>
        <Field label="Landmark (optional)"><input className={input} value={landmark} maxLength={100} onChange={e => setLandmark(e.target.value)} /></Field>
        <Field label="City"><input className={input} value={city} maxLength={60} autoComplete="address-level2" onChange={e => setCity(e.target.value)} /></Field>
        <Field label="PIN code"><input className={input} inputMode="numeric" value={pin} maxLength={6} autoComplete="postal-code" onChange={e => setPin(e.target.value.replace(/\D/g, ""))} /></Field>
      </div>
      <label className="mt-5 flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm leading-relaxed text-stone-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-300">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={consent} onChange={e => setConsent(e.target.checked)} />
        <span>I agree to share this address with this donor only, so they can enter it at the shop for this order. Once shared, it can&apos;t be changed.</span>
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className={primary} disabled={!valid || !!busy} onClick={() => setConfirming(true)}>
          {busy === "address" && <Loader2 className="size-4 animate-spin" aria-hidden />} Share with the donor
        </button>
        <span className="text-xs text-stone-500 dark:text-stone-400">Delivery is prepaid — you never pay on delivery.</span>
      </div>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Is this address correct?</AlertDialogTitle>
            <AlertDialogDescription>
              Once you share it, the address can&apos;t be changed — the donor will use it to place the order. Please check every detail before you continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm font-semibold text-stone-800 [overflow-wrap:anywhere] dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-200">{joined}</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back and edit</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onShare({
              address: joined,
              contactName: name.trim(),
              contactPhone: phone.trim(),
              ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
            })}>
              Yes, share this address
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

/* The recipient's view while others act: one plain message about what is
   happening now (the progress bar above already shows the steps). */
function DoneeStatusPanel({ stage, view }: { stage: PurchaseStage; view: PurchaseView }) {
  const qty = view.acceptedQuantity;
  const items = qty ? `${qty} ${qty === 1 ? "item" : "items"}` : "your items";
  return (
    <Panel title="The donor is placing your order"
      icon={<PackageCheck className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
      <p className="text-[15px] leading-relaxed text-[#3D4756] dark:text-stone-300">
        {`The donor is now ordering ${items} for delivery to your address${view.deadline ? `. The order will be placed by ${formatShort(view.deadline)}` : ""}.`}
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-[#3D4756] dark:text-stone-300">
        No action is required from you at this stage. Once the order is placed, the expected delivery date and tracking details will appear here.
      </p>
    </Panel>
  );
}

/* Everything the donor needs at the shop's checkout, in one place: what to
   buy, how many, and where it ships. */
function OrderChecklistPanel({ view, plan, onPlaced }: { view: PurchaseView; plan: DonationOffer["purchaseCommitment"]; onPlaced: () => void }) {
  const a = view.address;
  const addressText = a ? [a.contactName, a.address, a.contactPhone].filter(Boolean).join("\n") : "";
  const product = [plan?.proposedBrand, plan?.proposedModel].filter(Boolean).join(" ") || "The item you agreed to buy";
  const shop = view.retailer ?? plan?.intendedStore;
  return (
    <Panel title="1. Place the order" icon={<PackageCheck className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
      <p className="-mt-1 mb-5 text-[15px] text-[#3D4756] dark:text-stone-300">
        Our team approved this. Order exactly what&apos;s below and ship it to the recipient&apos;s address.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">What to order</p>
          <p className="mt-1.5 text-[17px] font-extrabold [overflow-wrap:anywhere]">{product}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex gap-2"><dt className="text-stone-500 dark:text-stone-400">Quantity:</dt><dd className="font-bold">{view.acceptedQuantity ?? "—"}</dd></div>
            {shop && <div className="flex gap-2"><dt className="text-stone-500 dark:text-stone-400">Shop:</dt><dd className="font-bold">{shop}</dd></div>}
            {view.deadline && <div className="flex gap-2"><dt className="text-stone-500 dark:text-stone-400">Order by:</dt><dd className="font-bold">{formatShort(view.deadline)}</dd></div>}
          </dl>
          {plan?.productUrl && /^https?:\/\//i.test(plan.productUrl) && (
            <a href={plan.productUrl} target="_blank" rel="noopener noreferrer nofollow"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-4 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90">
              <ExternalLink className="size-4" aria-hidden /> Open the product page
            </a>
          )}
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400"><Truck className="size-3.5" aria-hidden /> Ship to</p>
          {a ? (
            <>
              <address className="mt-1.5 whitespace-pre-line text-[15px] font-semibold not-italic leading-relaxed [overflow-wrap:anywhere]">{addressText}</address>
              <button type="button" className={`${secondary} mt-3`}
                onClick={() => void navigator.clipboard?.writeText(addressText).then(() => toast.success("Address copied"), () => toast.error("Couldn't copy — select it instead"))}>
                <Copy className="size-4" aria-hidden /> Copy address
              </button>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-300">The address isn&apos;t available. Please contact support.</p>
          )}
        </div>
      </div>
      <ul className="mt-5 space-y-1.5 text-sm text-[#3D4756] dark:text-stone-300">
        <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden /> Pay in full online — never choose cash on delivery.</li>
        <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden /> Use this address only for this order.</li>
      </ul>
      <button type="button" className={`${primary} mt-5`} onClick={onPlaced}>
        <Check className="size-4" aria-hidden /> I&apos;ve placed the order
      </button>
      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Next, you&apos;ll attach the shop&apos;s order confirmation and confirm the order details.</p>
    </Panel>
  );
}

function OrderPanel({ view, direct, busy, extractedOrder, confirmation, onUploadConfirmation, onSubmit }: {
  view: PurchaseView; direct: boolean; busy: string | null;
  extractedOrder?: ExtractedProofData | null;
  /** Direct delivery: the shop's confirmation is attached in this same step (latest upload). */
  confirmation?: PurchaseView["evidence"][number];
  onUploadConfirmation: (f: File) => Promise<boolean>;
  onSubmit: (d: {
    idempotencyKey: string; retailer: string; reference?: string; quantity: number;
    expectedDeliveryAt: string; prepaid: true;
    trackingUrl?: string; trackingReference?: string;
  }) => Promise<boolean>;
}) {
  // One key per form mount, so a double-click or retry cannot record two orders.
  const key = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const [retailer, setRetailer] = useState(extractedOrder?.retailer ?? view.retailer ?? "");
  const [reference, setReference] = useState(extractedOrder?.orderNumber ?? view.orderReference ?? "");
  // The agreed quantity, never the scan's: confirmations often read "Qty 1", and
  // a scan used to quietly replace the donor's 3 with it.
  const [qty, setQty] = useState(String(view.acceptedQuantity ?? 1));
  const [date, setDate] = useState(extractedOrder?.expectedDeliveryDate ?? view.expectedDeliveryAt?.slice(0, 10) ?? today());
  const [trackingUrl, setTrackingUrl] = useState(extractedOrder?.trackingUrl ?? view.trackingUrl ?? "");
  const [trackingRef, setTrackingRef] = useState(extractedOrder?.trackingNumber ?? view.trackingReference ?? "");
  const [prepaid, setPrepaid] = useState(false);
  // The donor opens the tracking link and confirms it is the right parcel; any edit asks again.
  const [linkChecked, setLinkChecked] = useState(false);
  useEffect(() => { setLinkChecked(false); }, [trackingUrl]);
  const [aiFilled, setAiFilled] = useState(false);

  // A new confirmation replaces every scanned field with what it shows, or blank,
  // so nothing from an earlier file lingers. Runs once per scan, not on every
  // page refresh, so the donor's own corrections are kept.
  useEffect(() => {
    if (!extractedOrder) return;
    setRetailer(extractedOrder.retailer ?? "");
    setReference(extractedOrder.orderNumber ?? "");
    setDate(extractedOrder.expectedDeliveryDate ?? "");
    setTrackingUrl(extractedOrder.trackingUrl ?? "");
    setTrackingRef(extractedOrder.trackingNumber ?? "");
    setAiFilled(!!(extractedOrder.retailer || extractedOrder.orderNumber
      || extractedOrder.expectedDeliveryDate || extractedOrder.trackingUrl || extractedOrder.trackingNumber));
  }, [extractedOrder]);

  // Coming back to the page: fill empty fields from what the server saved from the last scan.
  useEffect(() => {
    if (extractedOrder) return;
    let filled = false;
    if (view.retailer && !retailer) { setRetailer(view.retailer); filled = true; }
    if (view.orderReference && !reference) { setReference(view.orderReference); filled = true; }
    if (view.expectedDeliveryAt && date === today()) { setDate(view.expectedDeliveryAt.slice(0, 10)); filled = true; }
    if (view.trackingUrl && !trackingUrl) { setTrackingUrl(view.trackingUrl); filled = true; }
    if (view.trackingReference && !trackingRef) { setTrackingRef(view.trackingReference); filled = true; }
    if (filled) setAiFilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const n = Number(qty);
  const scannedQty = extractedOrder?.quantity ?? null;
  const urlOk = !trackingUrl.trim() || /^https?:\/\/[^\s/@]+/i.test(trackingUrl.trim());
  const blocked = direct && !confirmation;
  // The server refuses a past date; a scanned confirmation often carries one (e.g. an old order).
  const dateOk = !!date && date >= today();
  const valid = retailer.trim() && Number.isInteger(n) && n >= 1 && n <= (view.acceptedQuantity ?? 1) && dateOk && prepaid && urlOk && (!trackingUrl.trim() || linkChecked) && (!direct || reference.trim());
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Panel title={direct ? "2. Confirm your order" : "I have bought it"} icon={<Check className="size-4 text-[var(--ck-role-accent)]" aria-hidden />}>
      {direct && (
        <div className="mb-5 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-[14px] font-bold text-stone-900 dark:text-stone-100">Order confirmation</p>
          <p className="mt-1 text-[13px] text-[#5B6575] dark:text-stone-400">
            Attach a screenshot or PDF of the shop&apos;s confirmation. Please hide card numbers and payment details first. We&apos;ll read it to fill in the details below.
          </p>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" data-proof-type="ORDER_CONFIRMATION"
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void onUploadConfirmation(f); }} />
          {confirmation ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p role="status" className="me-2 flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400">
                <Check className="size-4" aria-hidden /> Confirmation attached
              </p>
              <a href={confirmation.url} target="_blank" rel="noopener noreferrer" className={secondary}>
                <ExternalLink className="size-4" aria-hidden /> View
              </a>
              <button type="button" className={secondary} disabled={!!busy} onClick={() => fileRef.current?.click()}>
                {busy === "upload" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />} Replace
              </button>
            </div>
          ) : (
            <button type="button" className={`${secondary} mt-3`} disabled={!!busy} onClick={() => fileRef.current?.click()}>
              {busy === "upload" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />} Attach confirmation
            </button>
          )}
        </div>
      )}
      {aiFilled && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
          <Wand2 className="size-3.5 shrink-0" aria-hidden />
          <span>Filled in from your order confirmation. Please check each detail and correct anything that is wrong before submitting.</span>
        </div>
      )}
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={direct ? "Retailer" : "Where you bought it"}><input className={input} value={retailer} maxLength={200} onChange={e => setRetailer(e.target.value)} /></Field>
          <Field label={direct ? "Order number" : "Bill number (optional)"} hint="Private — the recipient doesn't see it."><input className={input} value={reference} maxLength={200} onChange={e => setReference(e.target.value)} /></Field>
          <div className="space-y-1">
            <Field label="Quantity" hint={`Up to ${view.acceptedQuantity ?? 1} accepted`}><input className={input} inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} /></Field>
            {scannedQty != null && scannedQty !== n && (
              <p role="status" className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Your confirmation seems to show {scannedQty}. Enter the number you actually ordered.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Field label={direct ? "Expected delivery date" : "Ready to hand over from"}><input type="date" className={input} min={today()} value={date} onChange={e => setDate(e.target.value)} aria-invalid={!!date && !dateOk} /></Field>
            {date && !dateOk && (
              <p className="text-xs font-semibold text-red-600">This date has already passed. Please enter the expected delivery date shown on your order.</p>
            )}
          </div>
          {direct && (
            <>
              <div className="space-y-2">
                <Field label="Tracking link (optional)"><input className={input} inputMode="url" value={trackingUrl} maxLength={2000} onChange={e => setTrackingUrl(e.target.value)} placeholder="https://" /></Field>
                {trackingUrl.trim() && urlOk && (
                  <div className="rounded-xl border border-[var(--ck-role-accent)]/25 bg-[var(--ck-role-accent)]/5 p-3">
                    <a href={trackingUrl.trim()} target="_blank" rel="noopener noreferrer nofollow"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--ck-role-accent)] px-3 text-sm font-bold text-white hover:opacity-90">
                      <ExternalLink className="size-4" aria-hidden /> Open link
                    </a>
                    <label className="mt-2.5 flex items-start gap-2 text-[13px] text-stone-700 dark:text-stone-300">
                      <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={linkChecked} onChange={e => setLinkChecked(e.target.checked)} />
                      <span>I&apos;ve opened this link and it shows the tracking for this order.</span>
                    </label>
                  </div>
                )}
              </div>
              <Field label="Tracking number / ID (optional)"><input className={input} value={trackingRef} maxLength={200} onChange={e => setTrackingRef(e.target.value)} /></Field>
            </>
          )}
        </div>
        {!urlOk && <p className="text-xs text-red-600">Use a link starting with https://</p>}
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 size-4 shrink-0" checked={prepaid} onChange={e => setPrepaid(e.target.checked)} />
          <span>{direct ? "I paid in full. This is not cash on delivery — the recipient will pay nothing." : "I paid for this myself in full."}</span>
        </label>
        <button type="button" className={primary} disabled={!valid || blocked || !!busy}
          onClick={() => void onSubmit({
            idempotencyKey: key.current,
            retailer: retailer.trim(),
            ...(reference.trim() ? { reference: reference.trim() } : {}),
            quantity: n,
            expectedDeliveryAt: endOfDayLocal(date),
            prepaid: true,
            ...(trackingUrl.trim() ? { trackingUrl: trackingUrl.trim() } : {}),
            ...(trackingRef.trim() ? { trackingReference: trackingRef.trim() } : {}),
          })}>
          {busy === "order" && <Loader2 className="size-4 animate-spin" aria-hidden />} {direct ? "Submit order details" : "Record purchase"}
        </button>
      </div>
    </Panel>
  );
}

function EvidencePanel({ title, hint, type, done, doneText = "Uploaded", busy, accept = "image/*,application/pdf", replaceable = true, onUpload }: {
  title: string; hint: string; type: PurchaseProofType; done: boolean; doneText?: string; busy: string | null; accept?: string;
  /** False locks the panel after the first upload; by default a new upload replaces the old one. */
  replaceable?: boolean;
  onUpload: (f: File) => Promise<boolean>;
}) {
  if (done && !replaceable) {
    return (
      <Panel title={title} icon={<Upload className="size-4 text-[var(--ck-role-accent)]" aria-hidden />}>
        <p role="status" className="flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400"><Check className="size-4" aria-hidden /> {doneText}</p>
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Already submitted — it can&apos;t be changed. If it&apos;s wrong, contact support.</p>
      </Panel>
    );
  }
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Panel title={title} icon={<Upload className="size-4 text-[var(--ck-role-accent)]" aria-hidden />}>
      <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">{hint}</p>
      {done && <p role="status" className="mb-3 flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400"><Check className="size-4" aria-hidden /> {doneText}</p>}
      <input ref={ref} type="file" accept={accept} className="sr-only" data-proof-type={type}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void onUpload(f); }} />
      <button type="button" className={done ? secondary : primary} disabled={!!busy} onClick={() => ref.current?.click()}>
        {busy === "upload" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />} {done ? "Upload again" : "Choose file"}
      </button>
    </Panel>
  );
}

/**
 * A problem the recipient notices shortly after confirming everything arrived. It
 * goes to our team as an issue; the purchase stays closed and nothing is recounted.
 */
function LateProblemPanel({ received, busy, onReport }: {
  received: number; busy: string | null;
  onReport: (d: { type: PurchaseIssueType; description: string; affectedQuantity?: number }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PurchaseIssueType>("ITEM_DAMAGED");
  const [count, setCount] = useState("");
  const [text, setText] = useState("");
  const n = /^\d+$/.test(count.trim()) ? Number(count) : null;
  const error = text.trim().length < 10 ? "Describe the problem (at least 10 characters)."
    : count.trim() && (n == null || n < 1 || n > received) ? `Enter a number from 1 to ${received}, or leave it empty.` : null;
  if (!open) {
    return (
      <p className="text-[13px] text-stone-500 dark:text-stone-400">
        Noticed a problem after confirming?{" "}
        <button type="button" className="font-bold text-[var(--ck-role-accent)] underline" onClick={() => setOpen(true)}>Tell our team</button>
      </p>
    );
  }
  return (
    <Panel title="Tell our team about a problem" icon={<AlertTriangle className="size-5 text-amber-600" aria-hidden />}>
      <div className="space-y-3">
        <Field label="What's wrong?">
          <select className={input} value={type} onChange={e => setType(e.target.value as PurchaseIssueType)}>
            <option value="ITEM_DAMAGED">Damaged</option>
            <option value="WRONG_ITEM">Wrong product or model</option>
            <option value="OTHER">Something else</option>
          </select>
        </Field>
        <Field label="How many items are affected? (optional)">
          <input className={input} inputMode="numeric" value={count} onChange={e => setCount(e.target.value)} />
        </Field>
        <Field label="What happened?" hint="Our team reads this and contacts the donor only if needed.">
          <textarea rows={3} className={input} value={text} maxLength={1800} onChange={e => setText(e.target.value)} />
        </Field>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        <button type="button" className={primary} disabled={!!error || !!busy}
          onClick={() => void onReport({ type, description: text.trim(), ...(n ? { affectedQuantity: n } : {}) }).then(ok => { if (ok) setOpen(false); })}>
          {busy === "late" && <Loader2 className="size-4 animate-spin" aria-hidden />} Send to our team
        </button>
      </div>
    </Panel>
  );
}

type ReceiptOutcome =
  | { kind: "receipt"; data: { cumulativeQuantity: number; condition: PurchaseReceiptCondition; closeRemainder: boolean; affectedQuantity?: number; note?: string } }
  | { kind: "issue"; data: { type: PurchaseIssueType; description: string; affectedQuantity?: number } };

type OutcomeChoice = "ALL" | "PARTIAL" | "PROBLEM" | "NOT_RECEIVED";

const OUTCOMES: { value: OutcomeChoice; label: string; hint: string }[] = [
  { value: "ALL", label: "I received everything", hint: "In good condition" },
  { value: "PARTIAL", label: "Only part of it arrived", hint: "Fewer items than ordered" },
  { value: "PROBLEM", label: "Some or all items damaged", hint: "Broken, dented, or the wrong product" },
  { value: "NOT_RECEIVED", label: "Nothing arrived", hint: "Even if tracking says delivered" },
];


/**
 * The recipient's four answers to a delivery. Only good units are ever credited:
 * a short, damaged, wrong or missing delivery opens an issue for support, who
 * either expects the rest or closes it, and the donation, the request's count and
 * the donor's certificate all use what actually arrived. Counts are running
 * totals, so a second shipment never double-counts; the server re-checks each
 * number against what was ordered and what was already confirmed.
 */
function ReceiptPanel({ view, offerId, busy, onSubmit, onDamage, onNotReceived }: {
  view: PurchaseView; offerId: number; busy: string | null;
  onSubmit: (outcome: ReceiptOutcome, files: File[]) => Promise<boolean>;
  onDamage: (data: DamageReportData, photos: File[]) => Promise<boolean>;
  onNotReceived: (mode: NotReceivedMode, declaration: boolean, note: string) => Promise<boolean>;
}) {
  const max = view.orderedQuantity ?? view.acceptedQuantity ?? 1;
  // Never more than the request still needs (the server enforces the same cap).
  const cap = Math.min(max, view.receivableMax ?? max);
  const prev = view.receivedQuantity ?? 0;
  const fileRef = useRef<HTMLInputElement>(null);
  const [choice, setChoice] = useState<OutcomeChoice | "">("");
  const [partialTotal, setPartialTotal] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
  const partialN = int(partialTotal);
  const range = (lo: number, hi: number) => (lo === hi ? String(lo) : `${lo} to ${hi}`);

  let error: string | null = null;
  let outcome: ReceiptOutcome | null = null;
  if (choice === "ALL") {
    outcome = { kind: "receipt", data: { cumulativeQuantity: max, condition: "GOOD", closeRemainder: false } };
  } else if (choice === "PARTIAL") {
    const least = Math.max(1, prev);
    // Fewer than ordered, never equal (an equal count is "I received everything"),
    // and never more than the request still needs.
    const most = Math.min(max - 1, cap);
    if (least > most) error = cap < max ? `Your request only needs ${cap} more, so choose "I received everything".` : "Everything ordered is already counted. Choose another option.";
    else if (!Number.isFinite(partialN)) error = `Enter how many arrived in total: ${range(least, most)}.`;
    else if (partialN > max - 1) error = `That's everything the donor ordered. Choose "I received everything" instead.`;
    else if (partialN > cap) error = `Your request only needs ${cap} more, so enter at most ${cap}.`;
    else if (partialN < least) error = `Enter how many arrived in total: ${range(least, most)}.`;
    else outcome = { kind: "receipt", data: {
      // Closes the purchase now; the shortfall goes to our team and back on the request.
      cumulativeQuantity: partialN, condition: "PARTIAL", closeRemainder: true, ...(details.trim() ? { note: details.trim() } : {}),
    } };
  }

  const photoRequired = choice === "ALL" || choice === "PARTIAL";
  const photoLabel = photoRequired ? "Photos of the items you received" : "Photo or document (optional)";
  const photoHint = "Required. Clear photos of what came in the parcel — the donor and our team can see them.";
  if (outcome && photoRequired && files.length === 0) {
    error = "Add a photo of the items you received.";
    outcome = null;
  }

  const pick = (o: OutcomeChoice) => { setChoice(o); setDetails(""); setFiles([]); };

  return (
    <Panel title={view.deliveryReportedAt ? "Your order was reported delivered" : "Did it arrive?"} icon={<PackageCheck className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
      <p className="-mt-1 mb-4 text-[15px] text-[#3D4756] dark:text-stone-300">
        Tell us what actually arrived. Only what you receive counts as donated{prev ? ` — ${prev} already confirmed` : ""}.
      </p>
      <div role="radiogroup" aria-label="What happened with the delivery" className="grid gap-2 sm:grid-cols-2">
        {OUTCOMES.map(o => (
          <button key={o.value} type="button" role="radio" aria-checked={choice === o.value} onClick={() => pick(o.value)}
            className={`min-h-14 rounded-xl border px-3.5 py-2.5 text-left ${choice === o.value ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-soft)] ring-1 ring-[var(--ck-role-accent)]" : "border-stone-300 dark:border-zinc-700"}`}>
            <span className="block text-[15px] font-bold text-stone-900 dark:text-stone-100">{o.label}</span>
            <span className="block text-[13px] text-stone-500 dark:text-stone-400">{o.hint}</span>
          </button>
        ))}
      </div>

      {choice && (
        <div className="mt-5 space-y-4">
          {choice === "ALL" && (
            <p className="text-[14px] text-stone-700 dark:text-stone-300">
              All {max} item{max === 1 ? "" : "s"} ordered arrived in good condition.
              {cap < max && ` Your request only needed ${cap} more, so ${cap} will be counted.`}
            </p>
          )}

          {choice === "PARTIAL" && (
            <>
              <Field label="How many have arrived in total?" hint={`Fewer than the ${max} ordered${cap < max - 1 ? ` · your request needs at most ${cap}` : ""}${prev ? ` · already confirmed: ${prev}` : ""}`}>
                <input className={input} inputMode="numeric" value={partialTotal} onChange={e => setPartialTotal(e.target.value)} />
              </Field>
              <Field label="Anything to add? (optional)" hint="Our team will see this.">
                <textarea rows={3} className={input} value={details} maxLength={1800} placeholder="e.g. The parcel had 3 laptops instead of 5."
                  onChange={e => setDetails(e.target.value)} />
              </Field>
            </>
          )}

          {choice === "PROBLEM" && (
            <DamageReportForm view={view} offerId={offerId} busy={busy === "receipt"}
              onSubmit={(data, photos) => onDamage(data, photos).then(ok => { if (ok) setChoice(""); return ok; })} />
          )}

          {choice === "NOT_RECEIVED" && (
            <NothingArrivedFlow view={view} busy={busy === "receipt"}
              onSubmit={(mode, declaration, note) => onNotReceived(mode, declaration, note).then(ok => { if (ok) setChoice(""); return ok; })} />
          )}

          {choice === "PARTIAL" && (
            <p className="text-[13px] text-stone-600 dark:text-stone-300">
              {Number.isFinite(partialN) && partialN >= 1 && partialN < max
                ? `${partialN} will count as received. This purchase then closes for you both, and our team follows up on the remaining ${max - partialN}. They go back on your request so other donors can help too.`
                : "What arrived counts as received. This purchase then closes for you both, and our team follows up on the rest."}
            </p>
          )}
          {choice !== "PROBLEM" && choice !== "NOT_RECEIVED" && <>
          <div>
            <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">{photoLabel}</span>
            {photoRequired && <span className="block text-[13px] text-stone-500 dark:text-stone-400">{photoHint}</span>}
            <input ref={fileRef} type="file" multiple accept="image/*" className="sr-only"
              onChange={e => { const picked = Array.from(e.target.files ?? []); e.target.value = ""; setFiles(f => [...f, ...picked].slice(0, 5)); }} />
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {files.map((f, i) => (
                <span key={`${f.name}-${i}`} className="flex min-h-11 items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 text-sm dark:bg-zinc-800">
                  <span className="max-w-[12rem] truncate">{f.name}</span>
                  <button type="button" aria-label={`Remove ${f.name}`} className="px-1 font-bold text-stone-500" onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
              {files.length < 5 && (
                <button type="button" className={secondary} onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" aria-hidden /> {files.length ? "Add another" : "Choose photos"}
                </button>
              )}
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
          <button type="button" className={primary} disabled={!outcome || !!busy}
            onClick={() => outcome && void onSubmit(outcome, files).then(ok => { if (ok) { setChoice(""); setFiles([]); } })}>
            {busy === "receipt" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {choice === "ALL" ? "Confirm receipt" : "Confirm what arrived"}
          </button>
          </>}
        </div>
      )}
    </Panel>
  );
}

const ISSUE_LABEL: Record<string, string> = {
  ITEM_NOT_RECEIVED: "Not received",
  ITEM_DAMAGED: "Damaged",
  WRONG_ITEM: "Wrong item",
  QUANTITY_MISMATCH: "Remainder / quantity",
  OTHER: "Other problem",
};

/** Reported problems, each side's account and support's decision. */
function IssuesPanel({ issues, role, canRespond, busy, onRespond, onInfoReply }: {
  issues: PurchaseIssueView[]; role: PurchaseRole; canRespond: boolean; busy: string | null;
  onRespond: (message: string) => Promise<boolean>;
  onInfoReply: (message: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  // Support's open question to this participant (the server sends only the one put to them).
  const asked = issues.find(i => !i.resolvedAt && i.infoRequest);
  const myAnswer = asked ? (role === "DONOR" ? asked.infoReplyDonor : asked.infoReplyDonee) : null;
  const who = (r: "DONOR" | "DONEE") => (role === r ? "You" : r === "DONOR" ? "The donor" : "The recipient");
  return (
    <Panel title="Reported problems" icon={<AlertTriangle className="size-5 text-amber-600" aria-hidden />}>
      <ul className="space-y-4">
        {issues.map(i => (
          <li key={i.id} className="rounded-xl border border-stone-200 p-4 dark:border-zinc-700">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-extrabold">{ISSUE_LABEL[i.type] ?? i.type.replace(/_/g, " ").toLowerCase()}</span>
              {i.affectedQuantity != null && <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold dark:bg-zinc-800">{i.affectedQuantity} affected</span>}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${i.resolvedAt ? "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                {i.resolvedAt ? "Resolved" : "Under review"}
              </span>
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-300"><strong>{who(i.reportedByRole)}</strong> · {formatLocal(i.createdAt)}: {i.description}</p>
            {i.response && (
              <p className="mt-2 flex gap-2 text-sm text-stone-700 dark:text-stone-300">
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-stone-400" aria-hidden />
                <span><strong>{who(i.reportedByRole === "DONOR" ? "DONEE" : "DONOR")}</strong> replied: {i.response}</span>
              </p>
            )}
            {i.resolution && (
              <p className="mt-2 text-sm text-green-800 dark:text-green-300"><strong>Support decision</strong> · {formatLocal(i.resolvedAt)}: {i.resolution}</p>
            )}
          </li>
        ))}
      </ul>
      {asked && (
        <div className="mt-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="text-sm text-blue-950 dark:text-blue-100">
            <strong>Our team asked you</strong> · {formatLocal(asked.infoRequestedAt)}: {asked.infoRequest}
          </p>
          {myAnswer ? (
            <p className="text-sm text-blue-950 dark:text-blue-100"><strong>Your answer:</strong> {myAnswer}</p>
          ) : (
            <>
              <Field label="Your answer" hint={`Our team reads this before deciding. You can answer once.${role === "DONEE" ? " If they asked for photos, add them under “Add evidence” below." : ""}`}>
                <textarea rows={3} className={input} value={answer} maxLength={2000} onChange={e => setAnswer(e.target.value)} />
              </Field>
              <button type="button" className={primary} disabled={answer.trim().length < 5 || !!busy}
                onClick={() => void onInfoReply(answer.trim()).then(ok => ok && setAnswer(""))}>
                {busy === "info" && <Loader2 className="size-4 animate-spin" aria-hidden />} Send answer
              </button>
            </>
          )}
        </div>
      )}
      {canRespond && (
        <div className="mt-4 space-y-3">
          <Field label="Your side of the story" hint="At least 10 characters. Support sees it with the case. You can answer once.">
            <textarea rows={3} className={input} value={text} maxLength={2000} onChange={e => setText(e.target.value)} />
          </Field>
          <button type="button" className={primary} disabled={text.trim().length < 10 || !!busy}
            onClick={() => void onRespond(text.trim()).then(ok => ok && setText(""))}>
            {busy === "respond" && <Loader2 className="size-4 animate-spin" aria-hidden />} Send response
          </button>
        </div>
      )}
    </Panel>
  );
}

const ISSUES: { value: PurchaseIssueType; label: string }[] = [
  { value: "ITEM_NOT_RECEIVED", label: "Not received" },
  { value: "ITEM_DAMAGED", label: "Damaged" },
  { value: "WRONG_ITEM", label: "Wrong item" },
  { value: "QUANTITY_MISMATCH", label: "Wrong quantity" },
  { value: "OTHER", label: "Something else" },
];

function IssuePanel({ busy, onSubmit }: { busy: string | null; onSubmit: (d: { type: PurchaseIssueType; description: string }) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<PurchaseIssueType>("ITEM_NOT_RECEIVED");
  const [text, setText] = useState("");
  if (!open) {
    return (
      <button type="button" className={`${secondary} w-full`} onClick={() => setOpen(true)}>
        <AlertTriangle className="size-4" aria-hidden /> Report a problem
      </button>
    );
  }
  return (
    <Panel title="Report a problem" icon={<AlertTriangle className="size-4 text-amber-600" aria-hidden />}>
      <div className="space-y-3">
        <Field label="What went wrong?">
          <select className={input} value={type} onChange={e => setType(e.target.value as PurchaseIssueType)}>
            {ISSUES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </Field>
        <Field label="Details" hint="At least 10 characters. Don't include card or payment details.">
          <textarea rows={3} className={input} value={text} maxLength={2000} onChange={e => setText(e.target.value)} />
        </Field>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className={primary} disabled={text.trim().length < 10 || !!busy}
            onClick={() => void onSubmit({ type, description: text.trim() }).then(ok => ok && setOpen(false))}>
            {busy === "issue" && <Loader2 className="size-4 animate-spin" aria-hidden />} Send to support
          </button>
          <button type="button" className={secondary} onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </div>
    </Panel>
  );
}

function ExtensionRequestPanel({ view, busy, onSubmit }: {
  view: PurchaseView; busy: string | null; onSubmit: (d: { requestedUntil: string; reason: string }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  // The server allows deadline < requested ≤ deadline + 7 days. Keeping the
  // deadline's own time of day on the chosen date keeps both ends inclusive.
  const base = view.deadline ?? `${today()}T23:00:00`;
  const timePart = base.slice(10);
  const shift = (days: number) => { const d = new Date(`${base.slice(0, 10)}T12:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
  const minDate = shift(1);
  const maxDate = shift(7);
  const [date, setDate] = useState(maxDate);
  const [reason, setReason] = useState("");
  if (!open) {
    return <button type="button" className={`${secondary} w-full`} onClick={() => setOpen(true)}>Need more time?</button>;
  }
  return (
    <Panel title="Ask for more time">
      <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">One extension of up to 7 days, if the recipient agrees.</p>
      <div className="space-y-3">
        <Field label="New date"><input type="date" className={input} min={minDate} max={maxDate} value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Why do you need it?" hint="At least 10 characters."><textarea rows={2} className={input} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} /></Field>
        <button type="button" className={primary} disabled={reason.trim().length < 10 || !date || date < minDate || date > maxDate || !!busy}
          onClick={() => void onSubmit({ requestedUntil: `${date}${timePart}`, reason: reason.trim() }).then(ok => ok && setOpen(false))}>
          {busy === "ext" && <Loader2 className="size-4 animate-spin" aria-hidden />} Send request
        </button>
      </div>
    </Panel>
  );
}

function ExtensionDecisionPanel({ view, busy, onDecide }: {
  view: PurchaseView; busy: string | null; onDecide: (approve: boolean, reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState("");
  return (
    <Panel title="The donor asked for more time">
      <p className="mb-3 text-sm">New date: <strong>{formatLocal(view.extensionRequestedUntil)}</strong> (currently {formatLocal(view.deadline)}).</p>
      <Field label="Your note to the donor" hint="At least 10 characters.">
        <textarea rows={2} className={input} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} />
      </Field>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button type="button" className={primary} disabled={reason.trim().length < 10 || !!busy} onClick={() => void onDecide(true, reason.trim())}>Approve</button>
        <button type="button" className={secondary} disabled={reason.trim().length < 10 || !!busy} onClick={() => void onDecide(false, reason.trim())}>Decline</button>
      </div>
    </Panel>
  );
}

export type { PurchaseStage };
