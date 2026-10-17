"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Award, Check, Copy, ExternalLink, FileText, Handshake, Loader2, Lock, MapPin, MessageSquare, PackageCheck, ShieldCheck, Truck, Upload } from "lucide-react";
import { HandoverMapPinField } from "@/features/handover/HandoverMapPinField";
import { detectLocationFromServer } from "@/app/actions/locations";
import {
  confirmPurchaseNoIssue, confirmPurchaseReceipt, decidePurchaseExtension, reconfirmOfferAvailability, recordPurchaseOrder,
  reportPurchaseIssue, requestPurchaseExtension, respondToPurchaseIssue, revokePurchaseAddress, sharePurchaseAddress,
  updatePurchaseShipment, uploadFlowBProof, uploadPurchaseRecipientEvidence,
  type DonationOffer, type PurchaseIssueType, type PurchaseIssueView, type PurchaseProofType, type PurchaseReceiptCondition, type PurchaseView,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { purchaseMethodLabel } from "@/features/donation-offer-wizard/offerModel";
import {
  PURCHASE_STAGE_LABEL, endOfDayLocal, formatLocal, purchaseNextAction, purchaseStage,
  type PurchaseRole, type PurchaseStage,
} from "./purchaseModel";

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

const today = () => new Date().toISOString().slice(0, 10);

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

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      await onChanged();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That didn't work. Please try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  const orderedOpen = !!view.orderedAt && !["ISSUE_OPEN", "COMPLETED", "CLOSED", "ISSUE_WINDOW"].includes(stage);
  const handoverStage = stage === "READY_FOR_HANDOVER" || (!direct && ["HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"].includes(offer.status));
  const plan = offer.purchaseCommitment;
  const inTransit = stage === "IN_TRANSIT" || stage === "PARTIALLY_RECEIVED" || stage === "DELIVERED";
  const openIssue = view.issues.find(i => !i.resolvedAt);
  // The participant who didn't report the open issue can answer it once.
  const canRespond = !!openIssue && !openIssue.response
    && ((donor && openIssue.reportedByRole === "DONEE") || (donee && openIssue.reportedByRole === "DONOR"));
  const showDeliveryProof = donor && direct && (inTransit || stage === "ISSUE_OPEN");
  const deliveryProofDone = view.evidence.some(e => e.type === "DELIVERY_PROOF");
  const showAddress = donee && direct && !!view.acceptedAt && !view.orderedAt && stage !== "CLOSED";
  const showExtensionDecision = donee && !!view.extensionRequestedUntil && !view.extensionDecidedAt && !view.orderedAt && stage !== "CLOSED";
  const showPhoto = donor && !direct && (stage === "AWAITING_ITEM_PHOTO" || stage === "AWAITING_PROOF_REVIEW");
  // After the recipient accepts, the donor confirms here that they'll still buy it.
  const showReconfirm = donor && offer.status === "DONOR_RECONFIRMATION_REQUIRED";
  // Whether the main column has a form for this viewer; otherwise it explains the wait.
  const hasMainAction = showAddress || showExtensionDecision || showPhoto || showReconfirm
    || (donor && stage === "READY_TO_BUY")
    || (direct && inTransit && (donor || donee))
    || (donee && direct && stage === "ISSUE_WINDOW")
    || showDeliveryProof || canRespond || (donee && direct && stage === "ISSUE_OPEN")
    || (direct && stage === "COMPLETED" && (donor || donee));

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#1B2430] dark:bg-zinc-950 dark:text-stone-100" style={{ fontFamily: "var(--font-nunito), system-ui, sans-serif" }}>
      <div className="mx-auto flex max-w-[1360px] flex-col gap-6 px-4 pb-[calc(var(--ck-bottom-chrome)+1.5rem)] pt-4 sm:px-8 lg:pb-12">
        <Link href={donor ? "/offers" : role === "ADMIN" ? "/admin/offers" : "/donee/offers"} className="inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-bold text-[var(--ck-role-accent)]">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {donor ? "Back to my offers" : "Back to offers"}
        </Link>

        {/* Header: title on the left, deadline and quantity tiles on the right */}
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0 max-w-3xl space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ck-role-soft)] px-3 py-[5px] text-[13px] font-extrabold text-[var(--ck-role-accent)]">
                {direct ? <Truck className="size-4" aria-hidden /> : <Handshake className="size-4" aria-hidden />}
                {donor ? purchaseMethodLabel(view.method) : `Promise to buy · ${direct ? "Delivered to you" : "Handed over in person"}`}
              </span>
              {showReconfirm
                ? <span className="rounded-full bg-amber-50 px-3 py-[5px] text-[13px] font-extrabold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Your turn: confirm you&apos;ll buy it</span>
                : <span className={`rounded-full px-3 py-[5px] text-[13px] font-extrabold ${stageTone(stage, role)}`}>{stageBadge(stage, role)}</span>}
            </div>
            <h1 className="break-words text-[32px] font-extrabold leading-[1.1] sm:text-[40px]">{offer.requestTitle}</h1>
            <p className="text-[16px] leading-relaxed text-[#3D4756] dark:text-stone-300" role="status">{purchaseNextAction(stage, role, view)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!view.orderedAt && view.deadline && (
              <Tile label={donor ? (direct ? "Order by" : "Buy by") : (direct ? "Donor orders by" : "Donor buys by")}
                value={formatShort(view.deadline)} sub={daysLeft(view.deadline)} />
            )}
            {view.orderedAt && view.expectedDeliveryAt && (
              <Tile label={direct ? "Expected delivery" : "Ready from"} value={formatShort(view.expectedDeliveryAt)} sub={view.retailer ?? undefined} />
            )}
            <Tile label="Quantity" value={`${view.acceptedQuantity ?? "—"} accepted`}
              sub={direct ? `${view.receivedQuantity ?? 0} received so far` : view.orderedQuantity != null ? `${view.orderedQuantity} bought` : undefined} />
          </div>
        </header>

        <ProgressBar stage={stage} role={role} direct={direct} />

        {handoverStage && (
          <Link href={`/offers/${id}/handover`} className={`${primary} self-start`}>
            <Handshake className="size-4" aria-hidden /> Arrange handover
          </Link>
        )}

        <div className="flex flex-wrap items-start gap-6">
          {/* What this person has to do now */}
          <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            {showReconfirm && (
              <Panel title="Still planning to buy it?" icon={<Check className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
                <p className="mb-4 text-[15px] text-[#3D4756] dark:text-stone-300">
                  The recipient said yes to your plan. Confirm you&apos;ll still buy it so our team can approve.
                  Don&apos;t buy yet — wait until this page shows <strong>Ready to buy</strong>.
                </p>
                <button type="button" className={primary} disabled={!!busy}
                  onClick={() => void run("reconfirm", () => reconfirmOfferAvailability(id), "Confirmed — our team approves next")}>
                  {busy === "reconfirm" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} Yes, I&apos;ll buy it
                </button>
                <p className="mt-3 text-[13px] text-stone-500 dark:text-stone-400">Can&apos;t buy it any more? Withdraw the offer from your offers page so another donor can help.</p>
              </Panel>
            )}

            {showAddress && (
              <AddressPanel view={view} busy={busy}
                onShare={a => run("address", () => sharePurchaseAddress(id, a), "Delivery details shared with the donor")}
                onRevoke={() => run("revoke", () => revokePurchaseAddress(id), "Delivery details withdrawn")} />
            )}

            {showExtensionDecision && (
              <ExtensionDecisionPanel view={view} busy={busy}
                onDecide={(approve, reason) => run("extdecide", () => decidePurchaseExtension(id, { approve, reason }), approve ? "Extension approved" : "Extension declined")} />
            )}

            {donor && stage === "READY_TO_BUY" && direct && (
              <EvidencePanel title="1. Upload the order confirmation" type="ORDER_CONFIRMATION" busy={busy}
                hint="A screenshot or PDF of the shop's confirmation. Hide card numbers and payment details first. Only our team sees it."
                done={view.evidence.some(e => e.type === "ORDER_CONFIRMATION")}
                onUpload={f => run("upload", () => uploadFlowBProof(id, "ORDER_CONFIRMATION", f), "Order confirmation uploaded")} />
            )}

            {donor && stage === "READY_TO_BUY" && (
              <OrderPanel view={view} direct={direct} busy={busy}
                blocked={direct && !view.evidence.some(e => e.type === "ORDER_CONFIRMATION")}
                onSubmit={data => run("order", () => recordPurchaseOrder(id, data), direct ? "Order recorded" : "Purchase recorded")} />
            )}

            {showPhoto && (
              <>
                <EvidencePanel title={stage === "AWAITING_ITEM_PHOTO" ? "Upload a photo of the item" : "Replace the item photo"} type="ITEM_PHOTO" busy={busy} accept="image/*"
                  hint="A clear, recent photo of the actual item you bought. This is not the handover photo — that comes later."
                  done={stage === "AWAITING_PROOF_REVIEW"}
                  onUpload={f => run("upload", () => uploadFlowBProof(id, "ITEM_PHOTO", f), "Photo uploaded for review")} />
                <EvidencePanel title="Receipt (optional, private)" type="RECEIPT" busy={busy}
                  hint="Only our team sees it. Hide payment details."
                  done={view.evidence.some(e => e.type === "RECEIPT")}
                  onUpload={f => run("upload", () => uploadFlowBProof(id, "RECEIPT", f), "Receipt uploaded")} />
              </>
            )}

            {showDeliveryProof && (
              <EvidencePanel title="Upload delivery proof" type="DELIVERY_PROOF" busy={busy}
                hint="A screenshot of the courier's 'Delivered' status, or their proof-of-delivery slip (image or PDF). Hide payment details first. The recipient and our team can see it."
                done={deliveryProofDone}
                doneText="Delivery proof submitted — awaiting recipient confirmation."
                onUpload={f => run("upload", () => uploadFlowBProof(id, "DELIVERY_PROOF", f), "Delivery proof submitted — the recipient has been asked to confirm")} />
            )}

            {donor && direct && inTransit && (
              <ShipmentPanel view={view} busy={busy}
                onSubmit={data => run("ship", () => updatePurchaseShipment(id, data), "Shipping details updated")} />
            )}

            {donee && direct && inTransit && (
              <ReceiptPanel view={view} busy={busy}
                onSubmit={(outcome, file) => run("receipt", async () => {
                  const confirming = outcome.kind === "receipt" && (outcome.data.condition === "GOOD" || outcome.data.condition === "PARTIAL");
                  // A receipt needs the photo on file first; the server refuses it otherwise.
                  if (confirming) {
                    if (!file) throw new Error("Add a photo of the items you received.");
                    await uploadPurchaseRecipientEvidence(id, "RECEIVED_PHOTO", file);
                  }
                  if (outcome.kind === "receipt") await confirmPurchaseReceipt(id, outcome.data);
                  else await reportPurchaseIssue(id, outcome.data);
                  if (file && !confirming) {
                    await uploadPurchaseRecipientEvidence(id, "ISSUE_EVIDENCE", file).catch(() =>
                      toast.error("Saved — but the file didn't upload. You can add it again from this page."));
                  }
                }, outcome.kind === "receipt" && outcome.data.condition === "GOOD" ? "Thanks — receipt recorded" : "Thanks — we've recorded it and support will follow up")} />
            )}

            {view.issues.length > 0 && (
              <IssuesPanel issues={view.issues} role={role} canRespond={canRespond} busy={busy}
                onRespond={message => run("respond", () => respondToPurchaseIssue(id, message), "Response sent to support")} />
            )}

            {donee && direct && stage === "ISSUE_OPEN" && (
              <EvidencePanel title="Add evidence (optional)" type="ISSUE_EVIDENCE" busy={busy}
                hint="Photos of the damage, the wrong item or the packaging help support resolve this. Images or PDF."
                done={view.evidence.some(e => e.type === "ISSUE_EVIDENCE")}
                onUpload={f => run("upload", () => uploadPurchaseRecipientEvidence(id, "ISSUE_EVIDENCE", f), "Evidence added")} />
            )}

            {direct && stage === "COMPLETED" && (donor || donee) && (
              <Panel title="Donation complete" icon={<Award className="size-5 text-green-700" aria-hidden />}>
                <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
                  {view.receivedQuantity ?? 0} of {view.acceptedQuantity ?? "—"} received and confirmed.
                  {donor ? " Your certificate covers only what was received." : " Thank you for confirming."}
                </p>
                {/* Certificates are the donor's; the server refuses anyone else. */}
                {donor && (
                  <Link href={`/certificate?offerId=${id}`} className={primary}>
                    <Award className="size-4" aria-hidden /> View certificate
                  </Link>
                )}
              </Panel>
            )}

            {donee && direct && stage === "ISSUE_WINDOW" && (
              <Panel title="Everything fine?" icon={<ShieldCheck className="size-5 text-green-700" aria-hidden />}>
                <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">If the item is as expected, close the issue window now and complete the donation.</p>
                <button type="button" className={primary} disabled={!!busy}
                  onClick={() => void run("noissue", () => confirmPurchaseNoIssue(id), "Donation completed")}>
                  {busy === "noissue" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} Everything is fine
                </button>
              </Panel>
            )}

            {/* Nothing to do right now: say what we're waiting for, never an empty column */}
            {!hasMainAction && (
              <Panel title={stage === "COMPLETED" ? "All done" : stage === "CLOSED" || stage === "LEGACY" ? "Closed" : "Nothing to do right now"}>
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{purchaseNextAction(stage, role, view)}</p>
              </Panel>
            )}
          </main>

          {/* Reference: what was agreed, where it goes, help */}
          <aside aria-label="About this purchase" className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
            {view.address && (donor || role === "ADMIN") && (
              <Panel title="Deliver to" small aside={<span className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 dark:text-stone-400"><Lock className="size-3.5" aria-hidden /> Shared with you only</span>}>
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
                <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">Use it only for this order. Prepaid only — never cash on delivery. Never ask for delivery OTP.</p>
              </Panel>
            )}

            <Panel title={donor ? "What you agreed to buy" : "What the donor will buy"} small>
              <dl className="grid grid-cols-2 gap-3">
                <Fact label="Brand" value={plan?.proposedBrand || "Not decided"} />
                <Fact label="Model" value={plan?.proposedModel || "Not decided"} />
                {(view.retailer || plan?.intendedStore) && <Fact label="Shop" value={view.retailer ?? plan?.intendedStore} />}
                <Fact label="Delivery" value={direct ? "Shipped to the recipient" : "Handed over in person"} />
                {view.orderReference && <Fact label="Order number (private)" value={view.orderReference} />}
                {view.trackingReference && <Fact label="Tracking number" value={view.trackingReference} />}
              </dl>
              {plan?.productUrl && /^https?:\/\//i.test(plan.productUrl) && (
                <a href={plan.productUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--ck-role-accent)] hover:underline">
                  <ExternalLink className="size-4" aria-hidden /> View the product
                </a>
              )}
              {view.trackingUrl && (
                <a href={view.trackingUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--ck-role-accent)] hover:underline">
                  <ExternalLink className="size-4" aria-hidden /> Tracking link (from the donor)
                </a>
              )}
            </Panel>

            {donee && (
              <Panel title="How this works" small>
                <ol className="list-decimal space-y-2 ps-5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {direct ? (
                    <>
                      <li>You share an address. Our team approves the offer.</li>
                      <li>The donor places a prepaid order and uploads the confirmation.</li>
                      <li>When the parcel arrives, you confirm what came — or report a problem.</li>
                    </>
                  ) : (
                    <>
                      <li>Our team approves the offer. The donor buys the item.</li>
                      <li>We check a photo of what they bought.</li>
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

            {view.evidence.length > 0 && (
              <Panel title="Evidence" small icon={<FileText className="size-4 text-stone-500" aria-hidden />}>
                <ul className="space-y-1">
                  {view.evidence.map(e => (
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
                <Link href="/contact" className={secondary}>Contact support</Link>
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
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
};

const STEPS: Record<string, string[]> = {
  "direct-DONEE": ["You accepted", "Share address", "Team approves", "Donor orders", "On the way", "You confirm it arrived"],
  "direct-DONOR": ["Recipient accepted", "Address shared", "Team approved", "You order", "On the way", "Recipient confirms"],
  "physical-DONEE": ["You accepted", "Team approves", "Donor buys it", "Photo checked", "Handover", "You received it"],
  "physical-DONOR": ["Recipient accepted", "Team approved", "You buy it", "Photo checked", "Handover", "Recipient received it"],
};

/** Index of the step in progress; steps before it are done. 6 = everything done, -1 = no bar. */
function stepIndex(stage: PurchaseStage, direct: boolean): number {
  const map: Partial<Record<PurchaseStage, number>> = direct
    ? { AWAITING_ACCEPTANCE: 0, AWAITING_ADDRESS: 1, AWAITING_APPROVAL: 2, READY_TO_BUY: 3, IN_TRANSIT: 4, PARTIALLY_RECEIVED: 4, DELIVERED: 5, ISSUE_OPEN: 4, ISSUE_WINDOW: 5, COMPLETED: 6 }
    : { AWAITING_ACCEPTANCE: 0, AWAITING_APPROVAL: 1, READY_TO_BUY: 2, AWAITING_ITEM_PHOTO: 3, AWAITING_PROOF_REVIEW: 3, READY_FOR_HANDOVER: 4, ISSUE_OPEN: 4, ISSUE_WINDOW: 5, COMPLETED: 6 };
  return map[stage] ?? -1;
}

function ProgressBar({ stage, role, direct }: { stage: PurchaseStage; role: PurchaseRole; direct: boolean }) {
  const idx = stepIndex(stage, direct);
  if (idx < 0) return null;
  const steps = STEPS[`${direct ? "direct" : "physical"}-${role === "DONOR" ? "DONOR" : "DONEE"}`];
  const issue = stage === "ISSUE_OPEN";
  return (
    <nav aria-label="Purchase progress" className="overflow-x-auto rounded-[18px] border border-[#E3E7EE] bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <ol className="grid min-w-[640px] grid-cols-6 gap-3">
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

function stageBadge(stage: PurchaseStage, role: PurchaseRole): string {
  if (role === "DONEE" && stage === "AWAITING_ADDRESS") return "Your turn: share delivery details";
  if (role === "DONOR" && (stage === "READY_TO_BUY" || stage === "AWAITING_ITEM_PHOTO")) return `${PURCHASE_STAGE_LABEL[stage]} · your turn`;
  if (role === "DONEE" && stage === "DELIVERED") return "Your turn: confirm what arrived";
  if (role === "DONEE" && (stage === "IN_TRANSIT" || stage === "PARTIALLY_RECEIVED")) return "Your turn when it arrives";
  return PURCHASE_STAGE_LABEL[stage];
}

function stageTone(stage: PurchaseStage, role: PurchaseRole): string {
  const yourTurn = (role === "DONEE" && (stage === "AWAITING_ADDRESS" || stage === "DELIVERED")) || (role === "DONOR" && (stage === "READY_TO_BUY" || stage === "AWAITING_ITEM_PHOTO"));
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

function AddressPanel({ view, busy, onShare, onRevoke }: {
  view: PurchaseView; busy: string | null;
  onShare: (a: { address: string; contactName: string; contactPhone: string; latitude?: number; longitude?: number }) => Promise<boolean>;
  onRevoke: () => Promise<boolean>;
}) {
  // Separate fields make a complete address more likely; the backend stores
  // one text, so they are joined on submit. An already-shared address cannot
  // be split back, so it reopens whole in the first field.
  const shared = view.address?.address ?? "";
  const [line1, setLine1] = useState(shared);
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState(view.address?.contactName ?? "");
  const [phone, setPhone] = useState(view.address?.contactPhone ?? "");
  const [consent, setConsent] = useState(false);
  // Optional pin: helps the donor (and courier) find the door; the typed address stays required.
  const [lat, setLat] = useState<number | null>(view.address?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(view.address?.longitude ?? null);
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

  const editingShared = !!shared && line1 === shared;
  const placeOk = editingShared || (city.trim().length >= 2 && /^\d{6}$/.test(pin.trim()));
  const valid = line1.trim().length >= 5 && placeOk && consent;
  const joined = editingShared
    ? line1.trim()
    : [line1.trim(), area.trim(), landmark.trim() && `Near ${landmark.trim()}`, [city.trim(), pin.trim()].filter(Boolean).join(" - ")]
        .filter(Boolean).join(", ");

  return (
    <Panel title={view.address ? "Your shared delivery details" : "Where should it be delivered?"}
      aside={<span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600 dark:bg-zinc-800 dark:text-stone-300"><Lock className="size-3.5" aria-hidden /> Private</span>}>
      <p className="-mt-1 mb-5 text-[15px] text-[#3D4756] dark:text-stone-300">Only this donor sees it, to enter at the shop&apos;s checkout for this one order.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="House / flat and street">
            <input className={input} value={line1} maxLength={300} autoComplete="address-line1" onChange={e => setLine1(e.target.value)} placeholder="e.g. Flat 12, Shanti Apartments, Station Road" />
          </Field>
        </div>
        {!editingShared && (
          <>
            <Field label="Area / locality"><input className={input} value={area} maxLength={100} autoComplete="address-line2" onChange={e => setArea(e.target.value)} /></Field>
            <Field label="Landmark (optional)"><input className={input} value={landmark} maxLength={100} onChange={e => setLandmark(e.target.value)} /></Field>
            <Field label="City"><input className={input} value={city} maxLength={60} autoComplete="address-level2" onChange={e => setCity(e.target.value)} /></Field>
            <Field label="PIN code"><input className={input} inputMode="numeric" value={pin} maxLength={6} autoComplete="postal-code" onChange={e => setPin(e.target.value.replace(/\D/g, ""))} /></Field>
          </>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">Pin the exact spot <span className="font-semibold text-[#5B6575]">(optional)</span></span>
          <p className="text-[13px] text-[#5B6575] dark:text-stone-400">Helps find your door. Your typed address is still what goes on the order.</p>
          <HandoverMapPinField lat={lat} lng={lng} disabled={busy !== null} onChange={(a, b) => { setLat(a); setLng(b); void fillFromPin(a, b); }} />
          {pinFill && <p role="status" className="text-[13px] font-semibold text-[#3D4756] dark:text-stone-300">{pinFill}</p>}
        </div>
      </div>
      <label className="mt-5 flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm leading-relaxed text-stone-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-300">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={consent} onChange={e => setConsent(e.target.checked)} />
        <span>I agree to share this address with this donor only, so they can enter it at the shop for this order. If I stop sharing later, the donor won&apos;t see it again — but it can&apos;t undo what they or the shop have already seen.</span>
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className={primary} disabled={!valid || !!busy}
          onClick={() => void onShare({
            address: joined,
            ...(name.trim() ? { contactName: name.trim() } : {}),
            ...(phone.trim() ? { contactPhone: phone.trim() } : {}),
            ...(lat != null && lng != null ? { latitude: lat, longitude: lng } : {}),
          }).then(ok => ok && setConsent(false))}>
          {busy === "address" && <Loader2 className="size-4 animate-spin" aria-hidden />} {view.address ? "Update and share" : "Share with the donor"}
        </button>
        {view.address && (
          <button type="button" className={secondary} disabled={!!busy} onClick={() => void onRevoke()}>Stop sharing</button>
        )}
        <span className="text-xs text-stone-500 dark:text-stone-400">Delivery is prepaid — you never pay on delivery.</span>
      </div>
    </Panel>
  );
}

function OrderPanel({ view, direct, blocked, busy, onSubmit }: {
  view: PurchaseView; direct: boolean; blocked: boolean; busy: string | null;
  onSubmit: (d: { idempotencyKey: string; retailer: string; reference?: string; quantity: number; expectedDeliveryAt: string; prepaid: true }) => Promise<boolean>;
}) {
  // One key per form mount, so a double-click or retry cannot record two orders.
  const key = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const [retailer, setRetailer] = useState("");
  const [reference, setReference] = useState("");
  const [qty, setQty] = useState(String(view.acceptedQuantity ?? 1));
  const [date, setDate] = useState(today());
  const [prepaid, setPrepaid] = useState(false);
  const n = Number(qty);
  const valid = retailer.trim() && Number.isInteger(n) && n >= 1 && n <= (view.acceptedQuantity ?? 1) && date && prepaid && (!direct || reference.trim());

  return (
    <Panel title={direct ? "2. Record the order" : "I have bought it"} icon={<Check className="size-4 text-[var(--ck-role-accent)]" aria-hidden />}>
      {blocked && <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">Upload the order confirmation first.</p>}
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={direct ? "Retailer" : "Where you bought it"}><input className={input} value={retailer} maxLength={200} onChange={e => setRetailer(e.target.value)} /></Field>
          <Field label={direct ? "Order number" : "Bill number (optional)"} hint="Private — the recipient doesn't see it."><input className={input} value={reference} maxLength={200} onChange={e => setReference(e.target.value)} /></Field>
          <Field label="Quantity" hint={`Up to ${view.acceptedQuantity ?? 1} accepted`}><input className={input} inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} /></Field>
          <Field label={direct ? "Expected delivery date" : "Ready to hand over from"}><input type="date" className={input} min={today()} value={date} onChange={e => setDate(e.target.value)} /></Field>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 size-4 shrink-0" checked={prepaid} onChange={e => setPrepaid(e.target.checked)} />
          <span>{direct ? "I paid in full. This is not cash on delivery — the recipient will pay nothing." : "I paid for this myself in full."}</span>
        </label>
        <button type="button" className={primary} disabled={!valid || blocked || !!busy}
          onClick={() => void onSubmit({ idempotencyKey: key.current, retailer: retailer.trim(), ...(reference.trim() ? { reference: reference.trim() } : {}), quantity: n, expectedDeliveryAt: endOfDayLocal(date), prepaid: true })}>
          {busy === "order" && <Loader2 className="size-4 animate-spin" aria-hidden />} {direct ? "Record order" : "Record purchase"}
        </button>
      </div>
    </Panel>
  );
}

function EvidencePanel({ title, hint, type, done, doneText = "Uploaded", busy, accept = "image/*,application/pdf", onUpload }: {
  title: string; hint: string; type: PurchaseProofType; done: boolean; doneText?: string; busy: string | null; accept?: string;
  onUpload: (f: File) => Promise<boolean>;
}) {
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

function ShipmentPanel({ view, busy, onSubmit }: {
  view: PurchaseView; busy: string | null;
  onSubmit: (d: { trackingUrl?: string; reference?: string; expectedDeliveryAt: string; deliveredByRetailer: boolean }) => Promise<boolean>;
}) {
  const [url, setUrl] = useState(view.trackingUrl ?? "");
  const [ref, setRef] = useState(view.trackingReference ?? "");
  const [date, setDate] = useState(view.expectedDeliveryAt?.slice(0, 10) ?? today());
  const [delivered, setDelivered] = useState(false);
  const urlOk = !url.trim() || /^https?:\/\/[^\s/@]+/i.test(url.trim());
  return (
    <Panel title="Shipping updates" icon={<Truck className="size-4 text-[var(--ck-role-accent)]" aria-hidden />}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tracking link (optional)"><input className={input} inputMode="url" value={url} maxLength={2000} onChange={e => setUrl(e.target.value)} placeholder="https://" /></Field>
          <Field label="Tracking number (optional)"><input className={input} value={ref} maxLength={200} onChange={e => setRef(e.target.value)} /></Field>
          <Field label="Expected delivery"><input type="date" className={input} value={date} onChange={e => setDate(e.target.value)} /></Field>
        </div>
        {!urlOk && <p className="text-xs text-red-600">Use a link starting with https://</p>}
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 size-4 shrink-0" checked={delivered} onChange={e => setDelivered(e.target.checked)} />
          <span>The retailer shows it as delivered. (The recipient still confirms what actually arrived.)</span>
        </label>
        <button type="button" className={primary} disabled={!urlOk || !date || !!busy}
          onClick={() => void onSubmit({ ...(url.trim() ? { trackingUrl: url.trim() } : {}), ...(ref.trim() ? { reference: ref.trim() } : {}), expectedDeliveryAt: endOfDayLocal(date), deliveredByRetailer: delivered })}>
          {busy === "ship" && <Loader2 className="size-4 animate-spin" aria-hidden />} Save update
        </button>
      </div>
    </Panel>
  );
}

type ReceiptOutcome =
  | { kind: "receipt"; data: { cumulativeQuantity: number; condition: PurchaseReceiptCondition; closeRemainder: boolean; affectedQuantity?: number; note?: string } }
  | { kind: "issue"; data: { type: PurchaseIssueType; description: string } };

type OutcomeChoice = "ALL" | "PARTIAL" | "PROBLEM" | "NOT_RECEIVED";

const OUTCOMES: { value: OutcomeChoice; label: string; hint: string }[] = [
  { value: "ALL", label: "I received everything", hint: "In good condition" },
  { value: "PARTIAL", label: "Only part of it arrived", hint: "Some items are still missing" },
  { value: "PROBLEM", label: "Damaged or wrong items", hint: "Broken, wrong product or model" },
  { value: "NOT_RECEIVED", label: "I didn't receive it", hint: "Even if tracking says delivered" },
];

const NOT_RECEIVED_REASONS = [
  "Tracking says delivered, but nothing arrived",
  "Delivered to the wrong address or person",
  "Courier never came",
  "Something else",
];

/**
 * The recipient's four answers to a delivery. Every count is the running total
 * of good units, so a second shipment never double-counts; the server re-checks
 * each number against what was ordered and what was already confirmed.
 */
function ReceiptPanel({ view, busy, onSubmit }: {
  view: PurchaseView; busy: string | null;
  onSubmit: (outcome: ReceiptOutcome, file: File | null) => Promise<boolean>;
}) {
  const max = view.orderedQuantity ?? view.acceptedQuantity ?? 1;
  const prev = view.receivedQuantity ?? 0;
  const fileRef = useRef<HTMLInputElement>(null);
  const [choice, setChoice] = useState<OutcomeChoice | "">("");
  const [total, setTotal] = useState(String(max));
  const [partialTotal, setPartialTotal] = useState(String(Math.max(prev, 1)));
  const [remainder, setRemainder] = useState<"EXPECTED" | "CLOSE">("EXPECTED");
  const [closeReason, setCloseReason] = useState("");
  const [problem, setProblem] = useState<"DAMAGED" | "WRONG_ITEM">("DAMAGED");
  const [good, setGood] = useState(String(prev));
  const [affected, setAffected] = useState(String(Math.max(1, max - prev)));
  const [details, setDetails] = useState("");
  const [reason, setReason] = useState(NOT_RECEIVED_REASONS[0]);
  const [file, setFile] = useState<File | null>(null);

  const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
  const totalN = int(total), partialN = int(partialTotal), goodN = int(good), affectedN = int(affected);

  let error: string | null = null;
  let outcome: ReceiptOutcome | null = null;
  if (choice === "ALL") {
    if (!(totalN >= Math.max(1, prev) && totalN <= max)) error = `Enter a number from ${Math.max(1, prev)} to ${max}.`;
    else outcome = { kind: "receipt", data: { cumulativeQuantity: totalN, condition: "GOOD", closeRemainder: false } };
  } else if (choice === "PARTIAL") {
    if (!(partialN >= Math.max(1, prev) && partialN < max)) error = `Enter how many arrived in total — at least ${Math.max(1, prev)} and fewer than ${max}.`;
    else if (remainder === "CLOSE" && closeReason.trim().length < 10) error = "Tell us why the rest won't come (at least 10 characters).";
    else outcome = { kind: "receipt", data: {
      cumulativeQuantity: partialN, condition: "PARTIAL", closeRemainder: remainder === "CLOSE",
      ...(remainder === "CLOSE" ? { note: closeReason.trim() } : {}),
    } };
  } else if (choice === "PROBLEM") {
    if (!(goodN >= prev && goodN <= max)) error = `Usable items received in total must be from ${prev} to ${max}.`;
    else if (!(affectedN >= 1 && goodN + affectedN <= max)) error = `Affected items must be at least 1, and together with usable items no more than ${max}.`;
    else if (details.trim().length < 10) error = "Describe what's wrong (at least 10 characters).";
    else outcome = { kind: "receipt", data: { cumulativeQuantity: goodN, condition: problem, closeRemainder: false, affectedQuantity: affectedN, note: details.trim() } };
  } else if (choice === "NOT_RECEIVED") {
    const description = details.trim() ? `${reason}. ${details.trim()}` : reason;
    outcome = { kind: "issue", data: { type: "ITEM_NOT_RECEIVED", description } };
  }

  const photoRequired = choice === "ALL" || choice === "PARTIAL";
  const photoLabel = photoRequired ? "Photo of the items you received" : "Photo or document (optional)";
  if (outcome && photoRequired && !file) { error = "Add a photo of the items you received."; outcome = null; }

  return (
    <Panel title={view.deliveryReportedAt ? "Your order was reported delivered" : "Did it arrive?"} icon={<PackageCheck className="size-5 text-[var(--ck-role-accent)]" aria-hidden />}>
      <p className="-mt-1 mb-4 text-[15px] text-[#3D4756] dark:text-stone-300">
        Tell us what actually arrived. Nothing counts as donated until you confirm it{prev ? ` — ${prev} already confirmed` : ""}.
      </p>
      <div role="radiogroup" aria-label="What happened with the delivery" className="grid gap-2 sm:grid-cols-2">
        {OUTCOMES.map(o => (
          <button key={o.value} type="button" role="radio" aria-checked={choice === o.value} onClick={() => setChoice(o.value)}
            className={`min-h-14 rounded-xl border px-3.5 py-2.5 text-left ${choice === o.value ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-soft)] ring-1 ring-[var(--ck-role-accent)]" : "border-stone-300 dark:border-zinc-700"}`}>
            <span className="block text-[15px] font-bold text-stone-900 dark:text-stone-100">{o.label}</span>
            <span className="block text-[13px] text-stone-500 dark:text-stone-400">{o.hint}</span>
          </button>
        ))}
      </div>

      {choice && (
        <div className="mt-5 space-y-4">
          {choice === "ALL" && (
            <Field label="How many have you received in total?" hint={`Ordered: ${max}`}>
              <input className={input} inputMode="numeric" value={total} onChange={e => setTotal(e.target.value)} />
            </Field>
          )}

          {choice === "PARTIAL" && (
            <>
              <Field label="How many have arrived in total so far?" hint={`Ordered: ${max}${prev ? ` · already confirmed: ${prev}` : ""}`}>
                <input className={input} inputMode="numeric" value={partialTotal} onChange={e => setPartialTotal(e.target.value)} />
              </Field>
              <fieldset className="space-y-2">
                <legend className="mb-1 text-[14px] font-bold text-stone-900 dark:text-stone-100">What about the rest?</legend>
                <label className="flex items-start gap-3 text-sm">
                  <input type="radio" name="remainder" className="mt-1 size-4 shrink-0" checked={remainder === "EXPECTED"} onChange={() => setRemainder("EXPECTED")} />
                  <span>I&apos;m still expecting it — keep the rest open.</span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input type="radio" name="remainder" className="mt-1 size-4 shrink-0" checked={remainder === "CLOSE"} onChange={() => setRemainder("CLOSE")} />
                  <span>It won&apos;t come — ask support to close the remainder.</span>
                </label>
              </fieldset>
              {remainder === "CLOSE" && (
                <Field label="Why won't the rest come?" hint="At least 10 characters. Support reviews this before closing.">
                  <textarea rows={2} className={input} value={closeReason} maxLength={2000} onChange={e => setCloseReason(e.target.value)} />
                </Field>
              )}
            </>
          )}

          {choice === "PROBLEM" && (
            <>
              <fieldset className="flex flex-wrap gap-2">
                <legend className="mb-1 w-full text-[14px] font-bold text-stone-900 dark:text-stone-100">What&apos;s wrong?</legend>
                {([["DAMAGED", "Damaged"], ["WRONG_ITEM", "Wrong product or model"]] as const).map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={problem === v} onClick={() => setProblem(v)}
                    className={`min-h-11 rounded-xl border px-3.5 text-sm font-bold ${problem === v ? "border-[var(--ck-role-accent)] ring-1 ring-[var(--ck-role-accent)]" : "border-stone-300 dark:border-zinc-700"}`}>{l}</button>
                ))}
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Usable items received in total" hint={prev ? `Including the ${prev} already confirmed` : "0 if nothing usable arrived"}>
                  <input className={input} inputMode="numeric" value={good} onChange={e => setGood(e.target.value)} />
                </Field>
                <Field label="Items with the problem" hint={`Ordered: ${max}`}>
                  <input className={input} inputMode="numeric" value={affected} onChange={e => setAffected(e.target.value)} />
                </Field>
              </div>
              <Field label="What's wrong with them?" hint="At least 10 characters. The donor and support will see this.">
                <textarea rows={3} className={input} value={details} maxLength={2000} onChange={e => setDetails(e.target.value)} />
              </Field>
            </>
          )}

          {choice === "NOT_RECEIVED" && (
            <>
              <Field label="What happened?">
                <select className={input} value={reason} onChange={e => setReason(e.target.value)}>
                  {NOT_RECEIVED_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Anything else? (optional)" hint="e.g. you checked with neighbours or security. You don't need proof.">
                <textarea rows={2} className={input} value={details} maxLength={1800} onChange={e => setDetails(e.target.value)} />
              </Field>
              <p className="text-[13px] text-stone-600 dark:text-stone-300">Support will look at the courier&apos;s information and the donor&apos;s proof, and contact you both. Nobody is blamed automatically.</p>
            </>
          )}

          <div>
            <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">{photoLabel}</span>
            {photoRequired && <span className="block text-[13px] text-stone-500 dark:text-stone-400">Required. A clear photo of what came in the parcel — the donor and our team can see it.</span>}
            <input ref={fileRef} type="file" accept={choice === "ALL" || choice === "PARTIAL" ? "image/*" : "image/*,application/pdf"} className="sr-only"
              onChange={e => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button type="button" className={secondary} onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" aria-hidden /> {file ? "Change file" : "Choose file"}
              </button>
              {file && (
                <>
                  <span className="max-w-[16rem] truncate text-sm text-stone-600 dark:text-stone-300">{file.name}</span>
                  <button type="button" className="min-h-11 text-sm font-bold text-stone-500 underline" onClick={() => setFile(null)}>Remove</button>
                </>
              )}
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
          <button type="button" className={primary} disabled={!outcome || !!busy}
            onClick={() => outcome && void onSubmit(outcome, file).then(ok => { if (ok) { setChoice(""); setFile(null); } })}>
            {busy === "receipt" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {choice === "ALL" ? "Confirm receipt" : choice === "NOT_RECEIVED" ? "Report not received" : "Send"}
          </button>
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
function IssuesPanel({ issues, role, canRespond, busy, onRespond }: {
  issues: PurchaseIssueView[]; role: PurchaseRole; canRespond: boolean; busy: string | null;
  onRespond: (message: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
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
