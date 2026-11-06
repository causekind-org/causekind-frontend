import type { DeliverySummary, OfferStatus, PurchaseView } from "@/lib/api";

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
  | "AWAITING_RECONFIRMATION" // accepted, donor has not yet confirmed they'll still buy
  | "AWAITING_ADDRESS"       // direct: accepted, recipient has not shared delivery details
  | "AWAITING_APPROVAL"      // accepted, offer not yet ADMIN_APPROVED
  | "READY_TO_BUY"
  | "AWAITING_ITEM_PHOTO"    // physical: bought, no photo yet (or our team asked for a new one)
  | "PURCHASE_INFO_REQUIRED" // physical: our team asked the donor for more information
  | "AWAITING_PROOF_REVIEW"  // physical: photo uploaded, admin review pending
  | "READY_FOR_HANDOVER"
  | "IN_TRANSIT"             // direct: ordered / shipped
  | "DELIVERED"              // direct: delivery reported (courier or donor proof), recipient to confirm
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
  if (offerStatus === "COMPLETED" || view.offerStatus === "COMPLETED") return "COMPLETED";
  if (view.status === "CANCELLED" || view.status === "EXPIRED" || CLOSED_OFFER.has(offerStatus)) return "CLOSED";
  if (view.status === "ISSUE_RAISED" || offerStatus === "ISSUE_RAISED") return "ISSUE_OPEN";
  if (view.status === "RECEIPT_CONFIRMED" || offerStatus === "ISSUE_WINDOW_OPEN") return "ISSUE_WINDOW";
  if (!view.acceptedAt) return "AWAITING_ACCEPTANCE";

  if (!view.orderedAt) {
    if (view.readyToBuy) return "READY_TO_BUY";
    // Strict order: donor reconfirms, then ready to buy.
    if (offerStatus === "DONOR_RECONFIRMATION_REQUIRED") return "AWAITING_RECONFIRMATION";
    return "READY_TO_BUY";
  }

  if (view.method === "BUY_AND_HAND_OVER") {
    if (view.status === "READY_FOR_HANDOVER") return "READY_FOR_HANDOVER";
    // Seen by the donor and our team only; the recipient just sees the purchase being checked.
    if (view.status === "ORDER_PLACED" && view.details?.reviewOutcome === "INFO_REQUIRED") return "PURCHASE_INFO_REQUIRED";
    // Status, not "a photo exists": a rejected photo sends the purchase back to
    // ORDER_PLACED, and the old photo must not read as "under review".
    return view.status === "PROOF_UPLOADED" ? "AWAITING_PROOF_REVIEW" : "AWAITING_ITEM_PHOTO";
  }

  // A delivery report waits for the recipient even after an earlier partial receipt.
  if (view.deliveryReportedAt) return "DELIVERED";
  if (view.status === "PARTIALLY_RECEIVED") return "PARTIALLY_RECEIVED";
  return "IN_TRANSIT";
}

/** Plain-language status label for lists and the hub header. */
export function purchaseStageLabel(stage: PurchaseStage, view: Pick<PurchaseView, "method">, role: PurchaseRole): string {
  // In person, "ready to buy" means the donor has confirmed and is buying.
  if (view.method === "BUY_AND_HAND_OVER") {
    if (stage === "AWAITING_RECONFIRMATION") return role === "DONOR" ? "Your turn: confirm you can still buy it" : "Waiting for donor confirmation";
    if (stage === "READY_TO_BUY") return role === "DONOR" ? "Purchase in progress · your turn" : "Donor is buying it";
    if (stage === "AWAITING_ITEM_PHOTO" && role !== "DONOR") return "Bought — being checked";
  }
  if (stage === "AWAITING_RECONFIRMATION" && role === "DONOR") return "Your turn: confirm you'll buy it";
  return PURCHASE_STAGE_LABEL[stage];
}

export const PURCHASE_STAGE_LABEL: Record<PurchaseStage, string> = {
  AWAITING_ACCEPTANCE: "Waiting for recipient",
  AWAITING_RECONFIRMATION: "Waiting for donor to confirm",
  AWAITING_ADDRESS: "Waiting for delivery details",
  AWAITING_APPROVAL: "Waiting for approval",
  READY_TO_BUY: "Ready to buy",
  AWAITING_ITEM_PHOTO: "Bought — photo needed",
  PURCHASE_INFO_REQUIRED: "More information needed",
  AWAITING_PROOF_REVIEW: "Purchase being verified",
  READY_FOR_HANDOVER: "Ready for handover",
  IN_TRANSIT: "Ordered",
  DELIVERED: "Delivered — awaiting recipient",
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
        : "Review this purchase proposal on your offers page and accept or decline it. Nothing is bought until you accept and the donor confirms.";
    case "AWAITING_RECONFIRMATION":
      return donor
        ? direct
          ? "The recipient has accepted your offer. Please confirm that you will still buy it."
          : "The recipient has accepted your offer. Please confirm that you're still able to purchase and hand over the promised quantity."
        : direct
          ? "You have accepted the offer. The donor is now confirming they will still buy it — you'll be asked for your delivery address once they do."
          : "You accepted, which reserves this quantity with this donor. Waiting for the donor to confirm they can still buy it.";
    case "AWAITING_ADDRESS":
      return donor
        ? "The recipient has accepted your offer and is now sharing their delivery address. Please don't place the order yet."
        : "Share where the item should be delivered so the donor can place the order.";
    case "AWAITING_APPROVAL":
      return donor
        ? direct
          ? "The recipient has shared their delivery address. Our team is now reviewing the offer — please don't place the order yet."
          : "Accepted. Our team approves next — don't buy yet."
        : direct
          ? "Your address has been shared. Our team is reviewing the offer; the donor will place the order once it's approved."
          : "You accepted. The donor will buy once our team has approved the offer.";
    case "READY_TO_BUY":
      return donor
        ? direct
          ? "You can place the prepaid order now. Order the item to the recipient's address, tap \"I've placed the order\", then attach the shop's confirmation and confirm the order details."
          : "You're committed to buying this item. Once you've bought it, tap \"I've purchased the item\" and tell us what you bought, with a photo."
        : direct
          ? "Our team approved the offer. The donor can place the order now — you'll be notified when it's on its way."
          : "The donor confirmed and is buying the item. You'll be notified once our team has verified the purchase and the handover can be arranged.";
    case "PURCHASE_INFO_REQUIRED":
      return donor
        ? `Our team needs more information about your purchase: ${view.proofRejectionReason ?? ""} Update the details below and send them again.`
        : "Our team asked the donor for more information about the purchase.";
    case "AWAITING_ITEM_PHOTO":
      if (!donor) return "The donor bought the item. Our team checks it before the handover.";
      return view.proofRejectionReason
        ? `Our team couldn't accept the item photo: ${view.proofRejectionReason} Please upload a new photo.`
        : "Upload a clear photo of the item you bought. Our team checks it before the handover.";
    case "AWAITING_PROOF_REVIEW":
      return donor
        ? "Our team is verifying what you bought. The handover opens once it's verified."
        : "The donor has bought the item. Our team is verifying it — the handover opens once it's verified.";
    case "READY_FOR_HANDOVER":
      return donor
        ? "Our team verified the purchase. Open the handover page to agree a time and place — the recipient confirms with your handover code."
        : "The donor has the item. Open the handover page to agree a time and place — you'll confirm with the donor's handover code.";
    case "DELIVERED":
      if (donor) {
        const proof = view.evidence.some(e => e.type === "DELIVERY_PROOF");
        if (view.deliveryEscalatedAt) return "The recipient hasn't responded yet. Our support team is reviewing the delivery evidence.";
        return proof
          ? "Delivery proof submitted — awaiting recipient confirmation."
          : "Reported as delivered. Upload the courier's proof of delivery to help the recipient confirm.";
      }
      return view.deliveryEscalatedAt
        ? "Please confirm what you received or report a problem. Our support team is now reviewing this delivery."
        : "The order was reported delivered. Confirm what you received — or tell us if something is wrong.";
    case "IN_TRANSIT":
      return donor
        ? "Keep the tracking details up to date. When the courier delivers, upload their proof of delivery. Only the recipient can confirm what arrived."
        : "When the parcel arrives, take a photo of what came, then confirm it here — or report a problem if it's damaged, wrong or missing.";
    case "PARTIALLY_RECEIVED":
      return donor
        ? "Part of the order arrived. The recipient confirms the rest when it comes."
        : "Tell us what has arrived in total: everything, or only part of it.";
    case "ISSUE_OPEN":
      return "A problem was reported. Our support team is reviewing it and will contact you both — you'll be notified of the decision.";
    case "ISSUE_WINDOW":
      if (view.receiptRecordedBySupport && !donor)
        return "Our support team recorded this delivery from the evidence. If something is wrong, report a problem before the window closes.";
      if (!direct)
        return donor
          ? "The handover is confirmed. The donation completes when the recipient's issue window closes."
          : "Thanks for confirming the handover. If everything is fine, close the issue window on the handover page — or report a problem there.";
      if (donor) {
        const hasDeliveryProof = view.evidence.some(e => e.type === "DELIVERY_PROOF");
        return hasDeliveryProof
          ? "The recipient confirmed everything arrived and your delivery proof is on file. The donation is closing."
          : "The recipient confirmed everything arrived. Upload proof of delivery to close the purchase and get your certificate.";
      }
      return "Thanks for confirming. You're all set: the purchase closes as soon as the donor adds delivery proof.";
    case "COMPLETED": {
      const note = deliveryHistoryNote(deliverySummaryFromView(view), role);
      if (note?.tone === "pending") return donor
        ? "This purchase is closed. Our team is looking into the missing items. Nothing more is needed from you."
        : "This purchase is closed. Our team is looking into the missing items, and they're back on your request for other donors.";
      return donor ? "This donation is complete. Your certificate is ready." : "This donation is complete. Thank you for confirming.";
    }
    case "CLOSED":
      return "This purchase offer is closed.";
  }
}

/** A closed purchase's delivery as both histories show it. */
export type DeliveryHistoryNote = {
  line: string; note: string | null; tone: "ok" | "pending" | "neutral";
  /** A damage report: the donor can open the photos from the purchase page. */
  damage?: boolean;
  /** The donor can download the non-delivery confirmation. */
  confirmation?: boolean;
  /** The recipient can still report "package arrived later". */
  lateArrival?: boolean;
};

const items = (n: number) => `${n} item${n === 1 ? "" : "s"}`;

/**
 * "3/5 items received · Issue raised for 2 items" plus a note for this side.
 * The donor's wording stays hopeful and never asks anything of them; a closed
 * issue reads as a neutral "Issue closed" whatever the reason.
 */
export function deliveryHistoryNote(s: DeliverySummary | null | undefined, role: PurchaseRole): DeliveryHistoryNote | null {
  const note = deliveryHistoryNoteText(s, role);
  if (!note || !s) return note;
  return {
    ...note,
    ...(s.damageReport ? { damage: true } : {}),
    ...(role === "DONOR" && s.confirmationAvailable ? { confirmation: true } : {}),
    ...(role === "DONEE" && s.lateArrivalOpen ? { lateArrival: true } : {}),
  };
}

function deliveryHistoryNoteText(s: DeliverySummary | null | undefined, role: PurchaseRole): DeliveryHistoryNote | null {
  if (!s || s.received == null || s.pledged == null) return null;
  const donor = role === "DONOR";
  const damage = !!s.damageReport;
  const nothing = !!s.nonDelivery;
  if (nothing) return nonDeliveryNote(s, donor);
  if (s.arrivedAfterClosure) return { line: `${s.received}/${s.pledged} items received`, note: "Arrived after issue closure", tone: "ok" };
  const minor = damage && (s.minorDamage ?? 0) > 0 ? ` (${s.minorDamage} received with minor damage)` : "";
  const line = damage ? `${s.received}/${s.pledged} usable items received${minor}` : `${s.received}/${s.pledged} items received`;
  if ((!s.shortfall && !damage) || !s.issueStatus) return { line, note: null, tone: "ok" };
  const unusable = s.unusable ?? 0, missing = s.missing ?? 0;
  const raised = damage
    ? [unusable > 0 ? `${unusable} reported damaged` : "", missing > 0 ? `${missing} missing` : ""].filter(Boolean).join(" · ")
    : `Issue raised for ${items(s.shortfall ?? 0)}`;
  const pickup = !donor && s.returnPickupStatus === "SCHEDULED" ? " A return pickup of the damaged items is scheduled." : "";
  switch (s.issueStatus) {
    case "OPEN":
    case "AWAITING_DONEE_INFO":
    case "PACKAGE_FOUND":
    case "LATE_ARRIVAL_REPORTED":
    case "DONOR_REDONATING":
      return {
        line: raised ? `${line} · ${raised}` : line,
        note: donor
          ? "Our team is looking into this. Thank you for your support!"
          : damage
            ? "Our team is looking into the damaged items. Anything not counted is back on your request, so other donors can help too."
            : "Our team is looking into the missing items. They're back on your request, so other donors can help too.",
        tone: "pending",
      };
    case "REPLACEMENT_IN_PROGRESS":
      return {
        line: raised ? `${line} · ${raised}` : line,
        note: donor ? "A replacement is being arranged. Thank you for your support!" : "A replacement is on its way." + pickup,
        tone: "pending",
      };
    case "RESOLVED":
      return (s.redelivered ?? 0) > 0
        ? { line, note: (damage ? "Replaced after damage report" : "Arrived after issue resolution (replacement/redelivery)") + pickup, tone: "ok" }
        : { line, note: donor ? "Issue resolved. Thank you for helping complete this request!" : "Issue resolved.", tone: "ok" };
    case "CLOSED":
    case "DISPUTED":
      return {
        line,
        note: donor ? "Issue closed"
          : "Issue closed. Any remaining items stay open for other donors on your request." + (damage ? " You may keep the damaged items." : ""),
        tone: "neutral",
      };
  }
}

/** "0/5 items received · Delivery not confirmed" and where it stands. */
function nonDeliveryNote(s: DeliverySummary, donor: boolean): DeliveryHistoryNote {
  const line = `${s.received ?? 0}/${s.pledged} items received`;
  switch (s.issueStatus) {
    case "RESOLVED":
      return (s.redelivered ?? 0) > 0
        ? { line, note: "Delivered after non-delivery report", tone: "ok" }
        : { line, note: donor ? "Issue resolved. Thank you for your support!" : "Issue resolved.", tone: "ok" };
    case "CLOSED":
    case "DISPUTED":
      return { line, note: donor ? "Issue closed" : "Issue closed. The items stay open for other donors on your request.", tone: "neutral" };
    case "REPLACEMENT_IN_PROGRESS":
      return { line: `${line} · Delivery not confirmed`, note: donor ? "A redelivery is being arranged. Thank you for your support!" : "A redelivery is being arranged.", tone: "pending" };
    default:
      return {
        line: `${line} · Delivery not confirmed`,
        note: donor
          ? "Our team is looking into this. Thank you for your support!"
          : "Our team is looking into the missing delivery. The items are back on your request, so other donors can help too.",
        tone: "pending",
      };
  }
}

/** The same summary, read from the purchase hub's view. */
export function deliverySummaryFromView(view: PurchaseView): DeliverySummary {
  const issue = view.issues.find(i => i.type === "QUANTITY_MISMATCH" || i.arrivedQuantity != null || i.nonDelivery);
  const damage = issue?.arrivedQuantity != null;
  return {
    pledged: view.orderedQuantity ?? view.acceptedQuantity,
    received: view.receivedQuantity,
    shortfall: issue ? (issue.shortfallQuantity ?? issue.affectedQuantity) : null,
    redelivered: issue?.redeliveredQuantity ?? null,
    issueStatus: issue?.status ?? (issue ? (issue.resolvedAt ? "RESOLVED" : "OPEN") : null),
    outcome: view.deliveryOutcome ?? null,
    damageReport: damage,
    arrived: damage ? issue!.arrivedQuantity : null,
    minorDamage: damage ? issue!.minorDamageQuantity ?? 0 : null,
    unusable: damage ? issue!.unusableQuantity ?? 0 : null,
    missing: damage ? issue!.missingQuantity ?? 0 : null,
    returnPickupStatus: issue?.returnPickupStatus ?? null,
    nonDelivery: !!issue?.nonDelivery && issue.type === "ITEM_NOT_RECEIVED",
    confirmationAvailable: !!issue?.confirmationGeneratedAt,
    lateArrivalOpen: !!view.lateArrivalOpen,
  };
}

/**
 * The damage form's live summary, e.g. "Pledged 5 · Arrived 5 · Good 2 · Usable with
 * minor damage 1 · Unusable 2 · Missing 0". Counted = good + minor; the rest is released.
 */
export function damageBreakdown(pledged: number, arrived: number, damaged: number, unusable: number) {
  const minor = Math.max(0, damaged - unusable);
  const good = Math.max(0, arrived - damaged);
  const missing = Math.max(0, pledged - arrived);
  return {
    pledged, arrived, good, minor, unusable, missing,
    counted: good + minor,
    notCounted: unusable + missing,
    text: `Pledged ${pledged} · Arrived ${arrived} · Good ${good} · Usable with minor damage ${minor} · Unusable ${unusable} · Missing ${missing}`,
  };
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
