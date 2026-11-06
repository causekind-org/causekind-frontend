"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import {
  adminGetPurchase, adminResolvePurchaseIssue, type PurchaseInfoAudience, type PurchaseIssueView, type PurchaseResolution, type PurchaseView,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { endOfDayLocal, formatLocal } from "@/features/purchase/purchaseModel";

const ISSUE_LABEL: Record<string, string> = {
  ITEM_NOT_RECEIVED: "Not received",
  ITEM_DAMAGED: "Damaged",
  WRONG_ITEM: "Wrong item",
  QUANTITY_MISMATCH: "Only part arrived",
  OTHER: "Other problem",
};
const AUDIENCE_LABEL: Record<PurchaseInfoAudience, string> = { DONEE: "the recipient", DONOR: "the donor", BOTH: "both" };

type Choice = "RETRY" | "CLOSE" | "ASK";
const today = () => new Date().toLocaleDateString("en-CA");

/**
 * Support's decision on an open purchase delivery problem, shared by every admin
 * surface that shows one (Purchases queue, Disputes, Issues), so they can never
 * offer different outcomes. The server re-checks every number.
 *
 * <ul>
 *   <li>The rest or a replacement is coming: the recipient confirms again when it arrives.</li>
 *   <li>Close and count what arrived, with an optional corrected count from the evidence;
 *       0 cancels the donation. Only the counted units reach the request and the certificate.</li>
 *   <li>Ask the recipient, the donor or both for more information; the problem stays open.</li>
 * </ul>
 */
export function PurchaseIssueResolver({ view, onDone }: { view: PurchaseView; onDone: () => void }) {
  const issue: PurchaseIssueView | undefined = view.issues.find(i => !i.resolvedAt);
  const ordered = view.orderedQuantity ?? view.acceptedQuantity ?? 0;
  const counted = view.receivedQuantity ?? 0;
  const direct = view.method === "DIRECT_DELIVERY";
  const [choice, setChoice] = useState<Choice | "">("");
  const [finalQty, setFinalQty] = useState(String(counted));
  const [expectedBy, setExpectedBy] = useState("");
  const [audience, setAudience] = useState<PurchaseInfoAudience>(issue?.reportedByRole === "DONOR" ? "DONOR" : "DONEE");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!issue) return null;

  const n = /^\d+$/.test(finalQty.trim()) ? Number(finalQty) : NaN;
  const qtyOk = !direct || (n >= 0 && n <= ordered);
  const finalN = direct ? n : counted;
  const changedCount = direct && qtyOk && finalN !== counted;
  const reasonOk = reason.trim().length >= 10;
  const dateOk = !expectedBy || expectedBy >= today();
  const valid = !!choice && reasonOk && (choice !== "CLOSE" || qtyOk) && (choice !== "RETRY" || dateOk);
  const hasDeliveryProof = view.evidence.some(e => e.type === "DELIVERY_PROOF");
  const recipientFiles = view.evidence.filter(e => e.uploadedByRole === "DONEE");
  const waitingOn = issue.infoRequest
    ? (["DONOR", "DONEE"] as const).filter(r => (issue.infoAudience === r || issue.infoAudience === "BOTH")
        && !(r === "DONOR" ? issue.infoReplyDonor : issue.infoReplyDonee))
    : [];

  async function submit() {
    if (!valid || !choice) return;
    const data: PurchaseResolution = choice === "RETRY"
      ? { action: "RETRY_DELIVERY", reason: reason.trim(), ...(expectedBy ? { expectedBy: endOfDayLocal(expectedBy) } : {}) }
      : choice === "CLOSE"
        ? { action: "CANCEL_REMAINDER", reason: reason.trim(), ...(direct ? { finalQuantity: finalN } : {}) }
        : { action: "REQUEST_INFO", reason: reason.trim(), audience };
    setBusy(true);
    try {
      await adminResolvePurchaseIssue(view.offerId, data);
      toast.success(choice === "RETRY" ? "Decided: the rest is expected — both participants were told"
        : choice === "CLOSE" ? (finalN > 0 ? `Closed — ${finalN} counted as donated` : "Closed — donation cancelled, nothing counted")
          : `Question sent to ${AUDIENCE_LABEL[audience]}`);
      setChoice(""); setReason("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the decision");
    } finally {
      setBusy(false);
    }
  }

  const option = (value: Choice, title: string, hint: string) => (
    <button type="button" role="radio" aria-checked={choice === value} onClick={() => setChoice(value)}
      className={`rounded-xl border px-3 py-2.5 text-left ${choice === value ? "border-[#b04a15] bg-orange-50 ring-1 ring-[#b04a15]" : "border-stone-300 hover:border-stone-400"}`}>
      <span className="block text-sm font-bold text-stone-900">{title}</span>
      <span className="block text-xs text-stone-500">{hint}</span>
    </button>
  );

  return (
    <section aria-label="Decide this problem" className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 text-stone-900">
      <div className="space-y-1">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
          <strong>{ISSUE_LABEL[issue.type] ?? issue.type.replace(/_/g, " ").toLowerCase()}</strong>
          <span className="text-xs text-stone-500">reported by the {issue.reportedByRole === "DONOR" ? "donor" : "recipient"} · {formatLocal(issue.createdAt)}</span>
        </p>
        <p className="whitespace-pre-line rounded-lg bg-stone-50 p-2.5 text-sm text-stone-800">{issue.description}</p>
        {issue.response && <p className="text-xs text-stone-600"><strong>{issue.reportedByRole === "DONOR" ? "Recipient" : "Donor"} replied:</strong> {issue.response}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3 text-xs sm:grid-cols-4">
        <div><dt className="text-stone-500">Claimed / Ordered</dt><dd className="text-base font-bold">{ordered}</dd></div>
        <div><dt className="text-stone-500">Received & Confirmed</dt><dd className="text-base font-bold text-emerald-700">{counted}</dd></div>
        <div><dt className="text-stone-500">Reported affected</dt><dd className="text-base font-bold text-amber-700">{issue.affectedQuantity ?? "—"}</dd></div>
        <div><dt className="text-stone-500">Not counted / Missing</dt><dd className="text-base font-bold text-stone-900">{Math.max(0, ordered - counted)}</dd></div>
      </dl>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-stone-500">Evidence:</span>
        {recipientFiles.length === 0 && <span className="text-stone-500">no recipient photos</span>}
        {recipientFiles.map((e, i) => (
          <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#b04a15] underline">
            {e.type === "ISSUE_EVIDENCE" ? "Problem photo" : "Received photo"} {i + 1} <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ))}
        {view.evidence.filter(e => e.type === "DELIVERY_PROOF").map(e => (
          <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#b04a15] underline">
            Donor delivery proof <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ))}
        {view.trackingUrl && <a href={view.trackingUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-semibold text-[#b04a15] underline">Tracking <ExternalLink className="h-3 w-3" aria-hidden /></a>}
      </div>

      {issue.infoRequest && (
        <div className="space-y-1 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950">
          <p><strong>You asked {AUDIENCE_LABEL[issue.infoAudience ?? "DONEE"]}</strong> · {formatLocal(issue.infoRequestedAt)}: {issue.infoRequest}</p>
          {issue.infoReplyDonee && <p><strong>Recipient answered:</strong> {issue.infoReplyDonee}</p>}
          {issue.infoReplyDonor && <p><strong>Donor answered:</strong> {issue.infoReplyDonor}</p>}
          {waitingOn.length > 0 && <p className="font-semibold">Waiting for {waitingOn.map(r => r === "DONOR" ? "the donor" : "the recipient").join(" and ")} to answer.</p>}
        </div>
      )}

      <div role="radiogroup" aria-label="Decision" className="grid gap-2 sm:grid-cols-3">
        {option("RETRY", "Option A: Request remaining items (The rest is coming)", "Donor receives an optional update in their donation history to voluntarily fulfill the missing quantity")}
        {option("CLOSE", "Option B: Close and count what arrived", "Keeps the donation completed for what arrived. No notification or request sent to the donor")}
        {option("ASK", "Option C: Ask for more information", "Keep it open and ask the recipient, the donor or both")}
      </div>

      {choice === "RETRY" && (
        <label className="block text-xs font-semibold text-stone-700">
          New expected delivery date (optional)
          <input type="date" min={today()} value={expectedBy} onChange={e => setExpectedBy(e.target.value)}
            className="mt-1 block rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
          {!dateOk && <span className="mt-1 block text-red-600">Pick today or a later date.</span>}
          <span className="mt-1 block font-normal text-stone-500">The {counted} already counted stay counted.</span>
        </label>
      )}

      {choice === "CLOSE" && (
        <div className="space-y-2">
          {direct ? (
            <label className="block text-xs font-semibold text-stone-700">
              Final count of usable items received
              <input inputMode="numeric" value={finalQty} onChange={e => setFinalQty(e.target.value)} aria-invalid={!qtyOk}
                className="mt-1 block w-24 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
              <span className="mt-1 block font-normal text-stone-500">0 to {ordered}. Defaults to the recipient&apos;s count; change it only if the evidence shows otherwise.</span>
            </label>
          ) : (
            <p className="text-xs text-stone-600">For a buy-and-hand-over purchase the count is the one confirmed at the handover ({counted}).</p>
          )}
          {qtyOk && (
            <p className={`rounded-lg p-2.5 text-xs ${finalN > 0 ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
              {finalN > 0
                ? <>Counts <strong>{finalN}</strong> as donated — on the request, both dashboards and the donor&apos;s certificate.{ordered > finalN ? <> <strong>{ordered - finalN}</strong> go back to the request as still needed.</> : null}</>
                : <>Nothing is counted: the donation is <strong>cancelled</strong>, all {ordered} go back to the request, and no certificate is issued.</>}
            </p>
          )}
          {changedCount && <p className="text-xs font-semibold text-amber-700">You&apos;re changing the recipient&apos;s count from {counted} to {finalN}. Say why below — it&apos;s shown to both participants and kept in the audit log.</p>}
          {direct && finalN > 0 && !hasDeliveryProof && (
            <p className="text-xs text-amber-700">The donor hasn&apos;t uploaded delivery proof yet; the donation completes once they do.</p>
          )}
        </div>
      )}

      {choice === "ASK" && (
        <fieldset className="flex flex-wrap gap-3 text-sm">
          <legend className="mb-1 w-full text-xs font-semibold text-stone-700">Who to ask</legend>
          {(["DONEE", "DONOR", "BOTH"] as const).map(a => (
            <label key={a} className="flex items-center gap-1.5">
              <input type="radio" name={`audience-${view.offerId}`} checked={audience === a} onChange={() => setAudience(a)} />
              {a === "DONEE" ? "Recipient" : a === "DONOR" ? "Donor" : "Both"}
            </label>
          ))}
        </fieldset>
      )}

      {choice && (
        <label className="block text-xs font-semibold text-stone-700">
          {choice === "ASK" ? `Your question — ${AUDIENCE_LABEL[audience]} will see it` : "Reason — shown to both participants and kept in the audit log"}
          <textarea rows={2} value={reason} maxLength={2000} onChange={e => setReason(e.target.value)}
            placeholder={choice === "ASK" ? "e.g. Please send a photo of the parcel label and of all items side by side." : "e.g. The photos show 2 bags; the retailer confirmed the third was cancelled."}
            className="mt-1 block w-full rounded-lg border border-stone-300 p-2 text-sm font-normal" />
          {!reasonOk && <span className="mt-1 block font-normal text-stone-500">At least 10 characters.</span>}
        </label>
      )}

      {choice && (
        <button type="button" disabled={!valid || busy} onClick={() => void submit()}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold text-white disabled:opacity-50 ${choice === "CLOSE" && finalN === 0 ? "bg-red-700" : "bg-[#b04a15]"}`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {choice === "RETRY" ? "Expect the rest" : choice === "ASK" ? "Send question"
            : finalN > 0 ? `Close and count ${finalN}` : "Close and cancel the donation"}
        </button>
      )}
    </section>
  );
}

/** The resolver for surfaces that know only the offer (Disputes, Issues): loads the purchase first. */
export function PurchaseIssueResolverFor({ offerId, onDone }: { offerId: number; onDone: () => void }) {
  const [view, setView] = useState<PurchaseView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let live = true;
    setError(null);
    adminGetPurchase(offerId).then(v => { if (live) setView(v); })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : "Couldn't load this purchase"); });
    return () => { live = false; };
  }, [offerId, nonce]);
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (!view) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-stone-400" aria-label="Loading purchase" /></div>;
  return <PurchaseIssueResolver view={view} onDone={() => { setNonce(x => x + 1); onDone(); }} />;
}
