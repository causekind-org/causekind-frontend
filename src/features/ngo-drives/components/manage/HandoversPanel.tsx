"use client";

import { useState } from "react";
import Link from "next/link";
import { releaseNgoDriveOffer } from "@/lib/api";
import { formatISTDate } from "@/lib/formatIST";
import { toast } from "@/lib/toast";
import { serverDate } from "@/lib/serverTime";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage } from "@/features/ngo-drives/driveGiveState";
import { DriveOfferChatPanel } from "@/features/ngo-drives/components/DriveOfferChatPanel";
import { Chip } from "./YourDrivesTab";
import { HANDOVER_GROUPS, HANDOVER_LABEL, handoverChipOf, type HandoverChip } from "./driveActivity";
import { humanize } from "./NgoOfferReviewCard";
import type { DriveOffer } from "./useNgoOffers";

/** The NGO's status wording (same as the old drive page's handover list). */
export const HANDOVER_STATUS: Record<string, string> = {
  NGO_ACCEPTED: "Accepted, waiting for the donor's plan",
  PENDING_ADMIN_APPROVAL: "Accepted, waiting for the donor's plan",
  ADMIN_APPROVED: "Accepted, waiting for the donor's plan",
  HANDOVER_IN_PROGRESS: "Handover planned",
  HANDOVER_AT_RISK: "Handover needs attention",
  ISSUE_WINDOW_OPEN: "Received",
  ISSUE_RAISED: "Issue being reviewed",
  COMPLETED: "Completed",
};
const PILL: Record<HandoverChip, string> = {
  scheduled: "bg-ngo-100 text-ngo-800 dark:bg-ngo-900/40 dark:text-ngo-100",
  received: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100",
  issues: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
};
/** "Received on 19 Oct 2026 · 5 Pieces". */
export function receivedLine(o: { receivedAt?: string | null; receivedQuantity?: number | null; quantity?: number | null; drive: { unit?: string | null } }): string {
  const when = o.receivedAt ? formatISTDate(o.receivedAt) : null;
  const qty = o.receivedQuantity ?? o.quantity;
  return ["Received" + (when ? ` on ${when}` : ""), qty != null ? `${qty} ${humanize(o.drive.unit)}` : null].filter(Boolean).join(" · ");
}

/** The existing NGO cancel (release) works until the donor has planned the handover. */
const CANCELLABLE = new Set(["NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL"]);
const CHIPS: [HandoverChip, string][] = [["scheduled", "Scheduled"], ["received", "Received"], ["issues", "Issues"]];

/** Accepted offers. Receiving happens in the Handover Hub (donor's code + receipt photo), never here. */
export function HandoversPanel({ offers, reload }: { offers: DriveOffer[]; reload: () => Promise<void> | void }) {
  const [chip, setChip] = useState<HandoverChip>("scheduled");
  const [chatFor, setChatFor] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState<DriveOffer | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = offers.filter((o) => (HANDOVER_GROUPS[chip] as readonly string[]).includes(o.status));

  async function confirmCancel() {
    if (!cancelling || !reason.trim()) return;
    setBusy(true);
    try {
      await releaseNgoDriveOffer(cancelling.drive.id, cancelling.id, reason.trim());
      toast.success("Handover cancelled. The donor was told and the quantity went back to the drive.");
      setCancelling(null); setReason("");
      await reload();
    } catch (e) { toast.error(errorMessage(e, "We couldn't cancel this handover.")); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter handovers">
        {CHIPS.map(([key, label]) => (
          <Chip key={key} active={chip === key} onClick={() => setChip(key)} testId={`handover-chip-${key}`}>
            {label} <span className="tabular-nums opacity-70">{offers.filter((o) => handoverChipOf(o.status) === key).length}</span>
          </Chip>
        ))}
      </div>
      {shown.length === 0 ? <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">No handovers here.</p> : (
        <ul className="space-y-3">
          {shown.map((offer) => {
            const group = handoverChipOf(offer.status) ?? "scheduled";
            const area = [offer.donorLocality, offer.donorCity].filter(Boolean).join(", ");
            const received = group === "received";
            return (
              <li key={offer.id} data-testid="handover-row" className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-stone-900 dark:text-stone-100">{offer.donorDisplayName || "Donor"}</h3>
                      {offer.distanceKm != null && <span className="text-xs text-stone-500">{offer.distanceKm.toFixed(1)} km away</span>}
                      <span title={HANDOVER_STATUS[offer.status] ?? humanize(offer.status)} data-testid="handover-status-label" className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${PILL[group]}`}>{HANDOVER_LABEL[group]}</span>
                    </div>
                    <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">
                      {offer.drive.itemName} · {offer.quantity} {humanize(offer.drive.unit)} · {offer.drive.title}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400" data-testid="handover-plan">
                      {received
                        ? receivedLine(offer)
                        : <>Plan: {offer.handoverMethod === "NGO_PICKUP" ? "You pick up" : offer.handoverMethod ? "Donor drops off" : "Donor hasn't planned yet"}{area ? ` · ${area}` : ""}</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {received ? (
                      // Received: no chat. "View handover" is the full read-only handover record, so it stays
                      // visible after the issue window closes (status unchanged from before).
                      offer.status === "ISSUE_WINDOW_OPEN" && (
                        <Link href={`/ngo/drives/${offer.drive.id}/offers/${offer.id}/handover`} className="text-sm font-semibold text-ngo-700 underline dark:text-ngo-300">View handover</Link>
                      )
                    ) : (<>
                    <Button size="sm" variant="outline" aria-expanded={chatFor === offer.id} onClick={() => setChatFor(chatFor === offer.id ? null : offer.id)}>Chat</Button>
                    <Button size="sm" asChild className="bg-ngo-700 hover:bg-ngo-800">
                      <Link href={`/ngo/drives/${offer.drive.id}/offers/${offer.id}/handover`}>Open handover</Link>
                    </Button>
                    </>)}
                    {CANCELLABLE.has(offer.status) && (
                      <Button size="sm" variant="destructive" onClick={() => { setCancelling(offer); setReason(""); }}>Cancel</Button>
                    )}
                  </div>
                </div>
                {chatFor === offer.id && <div className="mt-3"><DriveOfferChatPanel offerId={offer.id} status={offer.status} role="NGO" /></div>}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!cancelling} onOpenChange={(o) => { if (!o) setCancelling(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this handover?</DialogTitle>
            <DialogDescription>The donor will see your reason. Their quantity goes back to the drive.</DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-bold">Reason
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} data-testid="cancel-reason"
              className="mt-1 block w-full rounded-lg border border-stone-300 p-2 font-normal dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelling(null)}>Keep it</Button>
            <Button variant="destructive" disabled={!reason.trim() || busy} onClick={() => void confirmCancel()}>Cancel handover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
