"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  adminResolvePurchaseIssue, type AdminPurchaseCase, type PurchaseInfoAudience, type PurchaseResolution, type ReturnPickupStatus,
} from "@/lib/api";
import { toast } from "@/lib/toast";

type Action = "DONOR_REDONATE" | "REDELIVERED" | "CLOSE_UNREACHABLE" | "CLOSE_REDONATION" | "REQUEST_INFO"
  | "VERIFY_DAMAGE" | "RECLASSIFY" | "REPLACEMENT_IN_PROGRESS"
  | "PACKAGE_FOUND" | "CLOSE_DISPUTED" | "LATE_ARRIVAL_CONFIRM" | "LATE_ARRIVAL_DISMISS";

const plural = (n: number) => `${n} item${n === 1 ? "" : "s"}`;

/**
 * Our team's decision on a partial or damaged delivery, after calling the donor
 * offline. The purchase itself already closed for both sides; only the issue is
 * decided here. A damage report is reviewed first (verify, ask the donee for more,
 * or reclassify units as usable); the resolutions unlock once it is verified.
 * Every action needs a note, which lands on the issue timeline. The server
 * re-checks every number and applies the same caps shown here.
 */
export function PartialDeliveryResolver({ purchase, onDone }: { purchase: AdminPurchaseCase; onDone: () => void }) {
  const damage = purchase.damage ?? null;
  const status = purchase.issueStatus;
  const redonating = status === "DONOR_REDONATING";
  const reviewing = !!damage && !damage.verifiedAt;
  // Still "nothing arrived" (package found turns it into a partial or damage case).
  const nothing = !!purchase.nonDelivery?.stillNothingArrived;
  const late = status === "LATE_ARRIVAL_REPORTED";
  const received = purchase.received ?? 0;
  const shortfall = purchase.shortfall ?? 0;
  const left = Math.max(0, shortfall - (purchase.redelivered ?? 0));
  const cap = purchase.redeliveryCap;
  const [action, setAction] = useState<Action | "">("");
  const [qty, setQty] = useState("");
  const [confirm, setConfirm] = useState("");
  const [audience, setAudience] = useState<PurchaseInfoAudience>(damage ? "DONEE" : "DONOR");
  const [pickup, setPickup] = useState<ReturnPickupStatus | "">("");
  const [pickupNote, setPickupNote] = useState("");
  const [minor, setMinor] = useState("");
  const [unusable, setUnusable] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const n = /^\d+$/.test(qty.trim()) ? Number(qty) : NaN;
  const c = /^\d+$/.test(confirm.trim()) ? Number(confirm) : NaN;
  const applied = Number.isFinite(n) ? Math.min(n, cap) : 0;
  const reclassApplied = Number.isFinite(n) ? Math.min(n, purchase.openOnRequest) : 0;
  const noteOk = note.trim().length >= 10;
  const mN = /^\d+$/.test(minor.trim()) ? Number(minor) : 0;
  const uN = /^\d+$/.test(unusable.trim()) ? Number(unusable) : 0;
  const pledged = purchase.pledged ?? 0;
  const foundCounted = Number.isFinite(n) ? Math.min(Math.max(0, n - uN), purchase.openOnRequest) : 0;
  const lateMax = Math.max(0, pledged - received);
  const lateApplied = Number.isFinite(n) ? Math.min(n, purchase.openOnRequest) : 0;

  let blocker: string | null = null;
  if (action === "DONOR_REDONATE" && purchase.openOnRequest <= 0)
    blocker = "Other donors have already covered what this request still needs, so there is nothing left to pledge. Close the issue instead.";
  if (action === "REDELIVERED") {
    if (cap <= 0) blocker = "Other donors have already covered the remaining need on this request, so nothing more can be counted. Close the issue instead.";
    else if (!(n >= 1 && n <= left)) blocker = `Enter how many ${damage ? "replacement items" : "more"} arrived: 1 to ${left}.`;
    else if (pickup === "SCHEDULED" && pickupNote.trim().length < 10) blocker = "Tell the donee when and how the pickup happens (at least 10 characters).";
  }
  if (action === "RECLASSIFY" && damage) {
    if (purchase.openOnRequest <= 0) blocker = "Other donors have already covered what this request still needs, so these units can't be counted.";
    else if (!(n >= 1 && n <= damage.unusable)) blocker = `Enter how many are actually usable: 1 to ${damage.unusable}.`;
  }
  if (action === "PACKAGE_FOUND") {
    if (!(n >= 1 && n <= pledged)) blocker = `Enter how many arrived: 1 to ${pledged}.`;
    else if (mN + uN > n) blocker = `Damaged items can't be more than the ${n} that arrived.`;
  }
  if (action === "LATE_ARRIVAL_CONFIRM") {
    if (purchase.openOnRequest <= 0) blocker = "Other donors have already covered what this request still needs, so these items can't be counted. Dismiss the report instead.";
    else if (!(n >= 1 && n <= lateMax)) blocker = `Enter how many to count: 1 to ${lateMax}.`;
  }
  if (action === "CLOSE_UNREACHABLE" && c !== received) blocker = `Type ${received} to confirm the final count.`;
  if (action && !blocker && !noteOk) blocker = "Add a note of at least 10 characters. It goes on the issue timeline.";
  const valid = !!action && !blocker;

  async function submit() {
    if (!valid || !action) return;
    const reason = note.trim();
    const data: PurchaseResolution =
      action === "REDELIVERED" ? { action, reason, additionalQuantity: n, ...(pickup ? { pickupStatus: pickup, pickupNote: pickupNote.trim() } : {}) }
        : action === "PACKAGE_FOUND" ? { action, reason, additionalQuantity: n, minorDamageQuantity: mN, unusableQuantity: uN }
        : action === "LATE_ARRIVAL_CONFIRM" ? { action, reason, additionalQuantity: n }
        : action === "CLOSE_DISPUTED" || action === "LATE_ARRIVAL_DISMISS" ? { action, reason }
        : action === "RECLASSIFY" ? { action, reason, additionalQuantity: n }
          : action === "CLOSE_UNREACHABLE" ? { action, reason, finalQuantity: received }
            : action === "REQUEST_INFO" ? { action, reason, audience }
              : { action, reason };
    setBusy(true);
    try {
      const result = await adminResolvePurchaseIssue(purchase.offerId, data);
      const counted = result?.capped ? `Counted ${result.applied}: ${result.message ?? "capped by the remaining need"}` : `Counted ${result?.applied ?? n}`;
      toast.success(
        action === "DONOR_REDONATE" ? "The donor can now pledge the remaining items from their history"
          : action === "REDELIVERED" ? `${counted} more as received`
            : action === "RECLASSIFY" ? `${counted} as usable; the donee was told why`
              : action === "VERIFY_DAMAGE" ? "Damage verified. You can resolve the issue now"
                : action === "REPLACEMENT_IN_PROGRESS" ? `Marked as ${damage ? "replacement" : "redelivery"} in progress; the donee was told`
                : action === "PACKAGE_FOUND" ? `${counted} as received from the found package`
                : action === "LATE_ARRIVAL_CONFIRM" ? `${counted} as arrived after closure`
                : action === "CLOSE_DISPUTED" ? "Closed as disputed; the donee got the neutral message"
                : action === "LATE_ARRIVAL_DISMISS" ? "Late arrival dismissed"
                  : action === "REQUEST_INFO" ? "Question sent" : "Issue closed");
      setAction(""); setNote(""); setQty(""); setConfirm(""); setPickup(""); setPickupNote(""); setMinor(""); setUnusable("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the decision");
    } finally {
      setBusy(false);
    }
  }

  const option = (value: Action, title: string, hint: string, disabled = false) => (
    <button type="button" role="radio" aria-checked={action === value} disabled={disabled} onClick={() => { setAction(value); setQty(""); }}
      className={`rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${action === value ? "border-[#b04a15] bg-orange-50 ring-1 ring-[#b04a15]" : "border-stone-200 bg-white hover:border-stone-400"}`}>
      <span className="block text-sm font-bold text-stone-900">{title}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{hint}</span>
    </button>
  );

  const reclassifyOption = damage && option("RECLASSIFY", "Reclassify",
    `The photos show some "unusable" items actually work. They then count as received; the donee is told why. ${damage.unusable} marked unusable.`,
    damage.unusable <= 0);

  return (
    <section aria-label={damage ? "Resolve this damage report" : "Resolve this partial delivery"} className="space-y-4">
      {late ? (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Late arrival reported</p>
          <div role="radiogroup" aria-label="Late arrival" className="grid gap-2.5 md:grid-cols-2">
            {option("LATE_ARRIVAL_CONFIRM", "Confirm the late arrival", `Count what arrived after closure, capped by what the request still needs. Note: "Arrived after issue closure".`)}
            {option("LATE_ARRIVAL_DISMISS", "Dismiss", "Nothing more is counted; the donee is told politely and the issue closes again.")}
          </div>
        </>
      ) : nothing ? (
        <>
          <div role="radiogroup" aria-label="Resolution" className="grid gap-2.5 md:grid-cols-3">
            {option("PACKAGE_FOUND", "Package found later", "Enter how many arrived (and any damaged). The issue continues as everything arrived, partial or damaged.")}
            {option("REDELIVERED", "Resolved: redelivery/replacement arrived", "Enter how many arrived, capped by the pledge and what the request still needs.")}
            {redonating
              ? option("CLOSE_REDONATION", "Close without waiting for the pledge", "Use when the donor changed their mind. The items stay open for other donors.")
              : option("DONOR_REDONATE", "Donor will donate again", "Their history shows \u201cHelp complete this request\u201d, through the normal pledge flow.")}
            {option("CLOSE_UNREACHABLE", "Close: donor unreachable / not willing", "Final count stays 0 and the items stay listed. The donee is told politely; the donor is not contacted.")}
            {option("CLOSE_DISPUTED", "Close as disputed", "The delivery evidence (courier OTP, signature) suggests it arrived. Final count stays 0 and the listing doesn't change.")}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {status === "OPEN" && (
              <button type="button" onClick={() => setAction("REPLACEMENT_IN_PROGRESS")}
                className={`font-semibold underline ${action === "REPLACEMENT_IN_PROGRESS" ? "text-[#b04a15]" : "text-stone-500 hover:text-stone-800"}`}>
                Redelivery on its way? Mark it in progress
              </button>
            )}
            <button type="button" onClick={() => setAction("REQUEST_INFO")}
              className={`font-semibold underline ${action === "REQUEST_INFO" ? "text-[#b04a15]" : "text-stone-500 hover:text-stone-800"}`}>
              Need more information first? Ask a participant
            </button>
          </div>
        </>
      ) : reviewing ? (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Step 1 · Review the damage proof</p>
          {status === "AWAITING_DONEE_INFO" && (
            <p className="rounded-xl bg-sky-50 p-3 text-xs text-sky-900">Waiting for the donee&apos;s answer. New photos appear in the gallery as they arrive.</p>
          )}
          <div role="radiogroup" aria-label="Review" className="grid gap-2.5 md:grid-cols-3">
            {option("VERIFY_DAMAGE", "Damage verified", "The photos match the report. Unlocks the resolutions.")}
            {option("REQUEST_INFO", "Need more info", "The donee is notified and can add more photos to this issue. Status: Awaiting donee info.")}
            {reclassifyOption}
          </div>
        </>
      ) : (
        <>
          {damage && <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Step 2 · Resolve</p>}
          <div role="radiogroup" aria-label="Resolution" className="grid gap-2.5 md:grid-cols-3">
            {redonating
              ? option("CLOSE_REDONATION", "Close without waiting for the pledge", "Use when the donor changed their mind. The remaining items stay open for other donors.")
              : option("DONOR_REDONATE", "Donor will donate again", "For cheaper items. Their history shows “Help complete this request”, which goes through the normal pledge flow. Closes when that pledge completes.")}
            {option("REDELIVERED", damage ? "Resolved: replacement delivered" : "Resolved: remaining items delivered",
              damage ? "The donor got a replacement through the seller. Enter how many arrived; optionally flag a return pickup."
                : "A replacement or redelivery the donor sorted out with the seller. Enter how many more arrived.")}
            {option("CLOSE_UNREACHABLE", "Close: donor unreachable / not willing",
              `Final count stays ${received}. The donee is told politely${damage ? " and may keep the damaged items" : ""}; the donor is not contacted or notified.`)}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {damage && status === "OPEN" && (
              <button type="button" onClick={() => setAction("REPLACEMENT_IN_PROGRESS")}
                className={`font-semibold underline ${action === "REPLACEMENT_IN_PROGRESS" ? "text-[#b04a15]" : "text-stone-500 hover:text-stone-800"}`}>
                Replacement on its way? Mark it in progress
              </button>
            )}
            {damage && damage.unusable > 0 && (
              <button type="button" onClick={() => { setAction("RECLASSIFY"); setQty(""); }}
                className={`font-semibold underline ${action === "RECLASSIFY" ? "text-[#b04a15]" : "text-stone-500 hover:text-stone-800"}`}>
                Reclassify units as usable
              </button>
            )}
            <button type="button" onClick={() => setAction("REQUEST_INFO")}
              className={`font-semibold underline ${action === "REQUEST_INFO" ? "text-[#b04a15]" : "text-stone-500 hover:text-stone-800"}`}>
              Need more information first? Ask a participant
            </button>
          </div>
        </>
      )}

      {action === "PACKAGE_FOUND" && (
        <div className="space-y-3 rounded-2xl bg-stone-50 p-4">
          <div className="flex flex-wrap gap-4">
            <label className="block text-xs font-semibold text-stone-700">
              How many arrived?
              <input inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)}
                className="mt-1 block w-24 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-stone-700">
              Minor damage (usable)
              <input inputMode="numeric" value={minor} onChange={e => setMinor(e.target.value)} placeholder="0"
                className="mt-1 block w-24 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-stone-700">
              Unusable
              <input inputMode="numeric" value={unusable} onChange={e => setUnusable(e.target.value)} placeholder="0"
                className="mt-1 block w-24 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm" />
            </label>
          </div>
          {Number.isFinite(n) && n - uN > purchase.openOnRequest && (
            <p role="alert" className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span><strong>Other donors have refilled part of the listing.</strong> The request needs only {purchase.openOnRequest} more, so {foundCounted} of the {n - uN} usable will be counted.</span>
            </p>
          )}
          {Number.isFinite(n) && n >= 1 && n <= pledged && mN + uN <= n && (
            <p className="text-xs text-stone-600">
              Counts {foundCounted}. {mN + uN > 0 ? "Continues as a damage report (already verified)." : n < pledged ? `Continues as a partial delivery for the other ${pledged - n}.` : "Resolves the issue."}
            </p>
          )}
        </div>
      )}

      {action === "LATE_ARRIVAL_CONFIRM" && (
        <div className="space-y-2 rounded-2xl bg-stone-50 p-4">
          <label className="block text-xs font-semibold text-stone-700">
            How many to count?
            <input inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)}
              placeholder={purchase.nonDelivery?.lateArrivalQuantity != null ? String(purchase.nonDelivery.lateArrivalQuantity) : undefined}
              className="mt-1 block w-28 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm" />
            <span className="mt-1 block font-normal text-stone-500">
              The donee reported {purchase.nonDelivery?.lateArrivalQuantity ?? "—"} ({purchase.nonDelivery?.lateArrivalCondition === "DAMAGED" ? "damaged: count only the usable ones" : "good"}). Up to {lateMax}.
            </span>
          </label>
          {Number.isFinite(n) && n > purchase.openOnRequest && purchase.openOnRequest > 0 && (
            <p role="alert" className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span><strong>Other donors have refilled part of the listing.</strong> The request needs only {purchase.openOnRequest} more, so {lateApplied} of the {n} will be counted.</span>
            </p>
          )}
        </div>
      )}

      {action === "CLOSE_DISPUTED" && (
        <p className="rounded-2xl bg-stone-50 p-4 text-xs text-stone-600">
          The donee will read: &ldquo;We reviewed this and closed it based on the available delivery evidence. Contact support if your package turns up.&rdquo;
          &ldquo;Disputed&rdquo; stays internal; the donor sees a neutral &ldquo;Issue closed&rdquo; and isn&apos;t notified.
        </p>
      )}

      {action === "REDELIVERED" && (
        <div className="space-y-3 rounded-2xl bg-stone-50 p-4">
          <label className="block text-xs font-semibold text-stone-700">
            {damage ? "Replacement quantity received" : nothing ? "How many arrived in the redelivery?" : "How many more items arrived?"}
            <input inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)}
              className="mt-1 block w-28 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm" />
            <span className="mt-1 block font-normal text-stone-500">Up to {plural(left)} still outstanding on this issue{damage ? " (unusable + missing)" : ""}.</span>
          </label>
          {Number.isFinite(n) && n > cap && cap > 0 && (
            <p role="alert" className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                <strong>Other donors have filled part of the gap since this issue opened.</strong> The request now needs only {cap} more,
                so {applied} of the {n} will be counted.
              </span>
            </p>
          )}
          {Number.isFinite(n) && n >= 1 && cap > 0 && n <= left && (
            <p className="text-xs text-stone-600">
              Result: {received + applied}/{purchase.pledged ?? "—"} received, marked &ldquo;{damage ? "Replaced after damage report" : purchase.nonDelivery ? "Delivered after non-delivery report" : "Arrived after issue resolution (replacement/redelivery)"}&rdquo; for both sides.
            </p>
          )}
          {damage && (
            <div className="space-y-2 border-t border-stone-200 pt-3">
              <label className="block text-xs font-semibold text-stone-700">
                Return pickup of the damaged items (optional)
                <select value={pickup} onChange={e => setPickup(e.target.value as ReturnPickupStatus | "")}
                  className="mt-1 block rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm">
                  <option value="">Not set</option>
                  <option value="NOT_NEEDED">Not needed</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PICKED_UP">Picked up</option>
                </select>
              </label>
              {pickup === "SCHEDULED" && (
                <label className="block text-xs font-semibold text-stone-700">
                  Pickup details for the donee (the donor&apos;s contact is never shared)
                  <textarea rows={2} value={pickupNote} onChange={e => setPickupNote(e.target.value)} maxLength={2000}
                    placeholder="e.g. The seller's courier collects the 2 damaged laptops on Friday between 10am and 1pm."
                    className="mt-1 block w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm font-normal" />
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {action === "RECLASSIFY" && damage && (
        <div className="space-y-2 rounded-2xl bg-stone-50 p-4">
          <label className="block text-xs font-semibold text-stone-700">
            How many &ldquo;unusable&rdquo; items are actually usable?
            <input inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)}
              className="mt-1 block w-28 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm" />
            <span className="mt-1 block font-normal text-stone-500">1 to {damage.unusable}. They count as received, usable with minor damage.</span>
          </label>
          {Number.isFinite(n) && n > purchase.openOnRequest && purchase.openOnRequest > 0 && (
            <p role="alert" className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                <strong>Other donors have already filled part of the released quantity.</strong> The request needs only {purchase.openOnRequest} more,
                so {reclassApplied} of the {n} will be counted.
              </span>
            </p>
          )}
        </div>
      )}

      {action === "CLOSE_UNREACHABLE" && (
        <div className="space-y-2 rounded-2xl bg-stone-50 p-4">
          <label className="block text-xs font-semibold text-stone-700">
            Confirm the final quantity received
            <input inputMode="numeric" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={String(received)}
              className="mt-1 block w-28 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm" />
          </label>
          <p className="text-xs text-stone-600">
            The donee will read: &ldquo;We tried to reach the donor but couldn&apos;t resolve this, so we are closing this issue.
            The remaining {plural(Math.min(left, purchase.stillNeededOnRequest))} {Math.min(left, purchase.stillNeededOnRequest) === 1 ? "is" : "are"} still open for other donors on your request.
            {damage ? " You may keep the damaged items." : ""}&rdquo; The donor&apos;s history shows a neutral &ldquo;Issue closed&rdquo;.
          </p>
        </div>
      )}

      {action === "REQUEST_INFO" && (
        <fieldset className="flex flex-wrap gap-3 text-sm">
          <legend className="mb-1 w-full text-xs font-semibold text-stone-700">Who to ask (the issue stays open)</legend>
          {(["DONEE", "DONOR", "BOTH"] as const).map(a => (
            <label key={a} className="flex items-center gap-1.5">
              <input type="radio" name={`partial-audience-${purchase.offerId}`} checked={audience === a} onChange={() => setAudience(a)} />
              {a === "DONEE" ? "Donee" : a === "DONOR" ? "Donor" : "Both"}
            </label>
          ))}
        </fieldset>
      )}

      {action && (
        <label className="block text-xs font-semibold text-stone-700">
          {action === "REQUEST_INFO" ? "Your question" : "Admin note (required, kept on the issue timeline)"}
          <textarea rows={3} value={note} maxLength={2000} onChange={e => setNote(e.target.value)}
            placeholder={action === "REQUEST_INFO" ? "e.g. Could you add a close-up of each cracked screen, switched on?"
              : action === "RECLASSIFY" ? "e.g. Photo 3 shows the laptop powered on; only the box is dented."
                : "e.g. Called the donor on 6 Nov; the seller shipped replacements, which arrived on 12 Nov."}
            className="mt-1 block w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm font-normal" />
        </label>
      )}

      {action && blocker && <p className="text-xs text-stone-600">{blocker}</p>}
      {action && (
        <button type="button" disabled={!valid || busy} onClick={() => void submit()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#b04a15] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {action === "PACKAGE_FOUND" ? (Number.isFinite(n) && n > 0 ? `Count ${foundCounted} and continue` : "Record the package")
            : action === "LATE_ARRIVAL_CONFIRM" ? (Number.isFinite(n) && n > 0 ? `Count ${lateApplied} and resolve` : "Confirm")
            : action === "CLOSE_DISPUTED" ? "Close as disputed"
            : action === "LATE_ARRIVAL_DISMISS" ? "Dismiss the late arrival"
            : action === "DONOR_REDONATE" ? "Link donor to the request"
            : action === "REDELIVERED" ? (Number.isFinite(n) && n > 0 ? `Count ${applied} more and resolve` : "Count and resolve")
              : action === "RECLASSIFY" ? (Number.isFinite(n) && n > 0 ? `Count ${reclassApplied} as usable` : "Reclassify")
                : action === "VERIFY_DAMAGE" ? "Mark damage verified"
                  : action === "REPLACEMENT_IN_PROGRESS" ? `Mark ${damage ? "replacement" : "redelivery"} in progress`
                    : action === "REQUEST_INFO" ? "Send question" : "Close the issue"}
        </button>
      )}
    </section>
  );
}
