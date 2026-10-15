import type { OfferStatus, PurchaseView } from "@/lib/api";

/**
 * What the purchase hub should ask of this viewer right now.
 *
 * <p>Pure on purpose: the backend decides what is *allowed* (every action is
 * actor-, method- and stage-checked there), and this decides only what to
 * *show*. Keeping it out of the component lets the stage table be tested
 * without rendering, and keeps the two roles from drifting apart.
 */
export type PurchaseRole = "DONOR" | "DONEE" | "ADMIN";

export type PurchaseStage =
  | "AWAITING_ACCEPTANCE"
  | "AWAITING_ADDRESS"       // direct: accepted, recipient has not shared delivery details
  | "AWAITING_APPROVAL"      // accepted, offer not yet ADMIN_APPROVED
  | "READY_TO_BUY"
  | "AWAITING_ITEM_PHOTO"    // physical: bought, no photo yet
  | "AWAITING_PROOF_REVIEW"  // physical: photo uploaded, admin review pending
  | "READY_FOR_HANDOVER"
  | "IN_TRANSIT"             // direct: ordered / shipped / delivered-by-retailer
  | "PARTIALLY_RECEIVED"
  | "ISSUE_OPEN"
  | "ISSUE_WINDOW"           // receipt confirmed, issue window open
  | "COMPLETED"
  | "CLOSED"                 // cancelled / expired / withdrawn
  | "LEGACY";                // commitment predates the method choice

const CLOSED_OFFER: ReadonlySet<string> = new Set([
  "WITHDRAWN", "CANCELLED", "DONEE_DECLINED", "ADMIN_REJECTED", "EXPIRED",
]);

export function purchaseStage(view: PurchaseView, offerStatus: OfferStatus | string): PurchaseStage {
  if (!view.method) return "LEGACY";
  if (offerStatus === "COMPLETED") return "COMPLETED";
  if (view.status === "CANCELLED" || view.status === "EXPIRED" || CLOSED_OFFER.has(offerStatus)) return "CLOSED";
  if (view.status === "ISSUE_RAISED" || offerStatus === "ISSUE_RAISED") return "ISSUE_OPEN";
  if (view.status === "RECEIPT_CONFIRMED" || offerStatus === "ISSUE_WINDOW_OPEN") return "ISSUE_WINDOW";
  if (!view.acceptedAt) return "AWAITING_ACCEPTANCE";

  if (!view.orderedAt) {
    if (view.readyToBuy) return "READY_TO_BUY";
    if (view.method === "DIRECT_DELIVERY" && !view.address) return "AWAITING_ADDRESS";
    return "AWAITING_APPROVAL";
  }

  if (view.method === "BUY_AND_HAND_OVER") {
    if (view.status === "READY_FOR_HANDOVER") return "READY_FOR_HANDOVER";
    const hasPhoto = view.evidence.some(e => e.type === "ITEM_PHOTO");
    return hasPhoto ? "AWAITING_PROOF_REVIEW" : "AWAITING_ITEM_PHOTO";
  }

  if (view.status === "PARTIALLY_RECEIVED") return "PARTIALLY_RECEIVED";
  return "IN_TRANSIT";
}

/** Plain-language status label for lists and the hub header. */
export const PURCHASE_STAGE_LABEL: Record<PurchaseStage, string> = {
  AWAITING_ACCEPTANCE: "Waiting for recipient",
  AWAITING_ADDRESS: "Waiting for delivery details",
  AWAITING_APPROVAL: "Waiting for approval",
  READY_TO_BUY: "Ready to buy",
  AWAITING_ITEM_PHOTO: "Bought — photo needed",
  AWAITING_PROOF_REVIEW: "Photo under review",
  READY_FOR_HANDOVER: "Ready for handover",
  IN_TRANSIT: "Ordered",
  PARTIALLY_RECEIVED: "Partly received",
  ISSUE_OPEN: "Problem reported",
  ISSUE_WINDOW: "Received",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  LEGACY: "Needs a new proposal",
};

/** One sentence telling this viewer what happens next, never a dead end. */
export function purchaseNextAction(stage: PurchaseStage, role: PurchaseRole, view: PurchaseView): string {
  const donor = role === "DONOR";
  const direct = view.method === "DIRECT_DELIVERY";
  switch (stage) {
    case "LEGACY":
      return "This purchase offer was made before delivery options existed. Withdraw it and send a new proposal to continue.";
    case "AWAITING_ACCEPTANCE":
      return donor
        ? "The recipient is reviewing your proposal. Please don't buy anything yet."
        : "Review this purchase proposal from your offers page and accept or decline it.";
    case "AWAITING_ADDRESS":
      return donor
        ? "Accepted. Waiting for the recipient to share delivery details — don't buy yet."
        : "Share where the item should be delivered so the donor can place the order.";
    case "AWAITING_APPROVAL":
      return donor
        ? "Accepted. Finish any reconfirmation on your offers page; our team approves next. Don't buy yet."
        : "You accepted. The donor will buy once our team has approved the offer.";
    case "READY_TO_BUY":
      return donor
        ? direct
          ? "You can place the prepaid order now. Upload the order confirmation, then record the order."
          : "You can buy the item now. Record the purchase, then upload a photo of the item."
        : "The donor can buy the item now.";
    case "AWAITING_ITEM_PHOTO":
      return donor ? "Upload a clear photo of the item you bought." : "The donor bought the item and is uploading a photo.";
    case "AWAITING_PROOF_REVIEW":
      return "Our team is checking the item photo. The handover opens once it's approved.";
    case "READY_FOR_HANDOVER":
      return "The item is ready. Arrange the handover — the usual handover code applies.";
    case "IN_TRANSIT":
      return donor
        ? "Keep the tracking details up to date. Only the recipient can confirm what arrived."
        : "When the parcel arrives, confirm what you received — or report a problem.";
    case "PARTIALLY_RECEIVED":
      return donor
        ? "Part of the order arrived. Update tracking for the rest."
        : "Confirm the rest when it arrives, or ask to close the remainder.";
    case "ISSUE_OPEN":
      return "A problem was reported. Our support team will contact you both.";
    case "ISSUE_WINDOW":
      return donor
        ? "The recipient confirmed receipt. The donation completes when the issue window closes."
        : "Thanks for confirming. If everything is fine you can close the issue window now.";
    case "COMPLETED":
      return "This donation is complete.";
    case "CLOSED":
      return "This purchase offer is closed.";
  }
}

/** Java LocalDateTime from a yyyy-mm-dd date input — end of that day, no zone. */
export function endOfDayLocal(date: string): string {
  return `${date}T18:00:00`;
}

export function formatLocal(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
