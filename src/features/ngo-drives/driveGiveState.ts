import { ApiError, type NgoDriveOfferResponse, type PublicNgoDrive } from "@/lib/api";

/** Offer statuses that no longer count as "this donor's offer on the drive". */
const FINISHED_OFFER = new Set(["CANCELLED", "WITHDRAWN", "NGO_DECLINED", "ADMIN_REJECTED", "ENDED"]);
/** Offer statuses the donor can still edit in the give wizard. */
export const EDITABLE_OFFER = new Set(["DRAFT", "NEEDS_INFORMATION"]);
/** Offer statuses whose next step happens on the handover page. */
const HANDOVER_OFFER = new Set([
  "NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK",
  "ISSUE_WINDOW_OPEN", "ISSUE_RAISED", "COMPLETED",
]);

export function findActiveOffer(offers: NgoDriveOfferResponse[], driveId: number) {
  return offers.find((o) => o.driveId === driveId && !FINISHED_OFFER.has(o.status)) ?? null;
}

/** Where a donor follows up an offer they already made. */
export function offerHref(offer: NgoDriveOfferResponse) {
  return HANDOVER_OFFER.has(offer.status) ? `/ngo-drive-offers/${offer.id}/handover` : "/dashboard";
}

export function stillNeeded(drive: Pick<PublicNgoDrive, "quantityNeeded" | "quantityReceived" | "quantityPledged">) {
  return Math.max(0, drive.quantityNeeded - drive.quantityReceived - drive.quantityPledged);
}

/** Why a drive is not taking offers, or null when it is LIVE. */
export function closedReason(drive: Pick<PublicNgoDrive, "status">): string | null {
  switch (drive.status) {
    case "LIVE": return null;
    case "FULLY_PLEDGED": return "Every item for this drive has been offered. Check back in case an offer falls through.";
    case "COLLECTION_COMPLETE": return "This drive has finished collecting and the NGO is now distributing the items.";
    case "PROOF_SUBMITTED":
    case "FULFILLED": return "This drive is complete. Thank you to everyone who gave.";
    default: return "This drive is not collecting items right now.";
  }
}

export type GiveState =
  | { kind: "login"; href: string }
  | { kind: "give"; href: string }
  | { kind: "continue"; href: string; offer: NgoDriveOfferResponse }
  | { kind: "offered"; href: string; offer: NgoDriveOfferResponse }
  | { kind: "wrong-role"; reason: string }
  | { kind: "closed"; reason: string };

/** What the Give button does for this viewer. Only donor accounts give to drives. */
export function giveState(
  drive: PublicNgoDrive,
  user: { role?: string | null } | null,
  offers: NgoDriveOfferResponse[],
): GiveState {
  const giveHref = `/drives/${drive.id}/give`;
  if (!user) return { kind: "login", href: `/login?next=${encodeURIComponent(giveHref)}` };
  const role = (user.role ?? "").toUpperCase();
  if (role !== "DONOR") {
    return {
      kind: "wrong-role",
      reason: role === "NGO_PARTNER" || role === "NGO"
        ? "NGO accounts run drives and can't give to them."
        : role === "DONEE"
          ? "Giving to drives needs a donor account."
          : "Only donor accounts can give to drives.",
    };
  }
  const offer = findActiveOffer(offers, drive.id);
  if (offer && EDITABLE_OFFER.has(offer.status)) return { kind: "continue", href: giveHref, offer };
  if (offer) return { kind: "offered", href: offerHref(offer), offer };
  const reason = closedReason(drive);
  if (reason) return { kind: "closed", reason };
  if (stillNeeded(drive) === 0) return { kind: "closed", reason: closedReason({ status: "FULLY_PLEDGED" })! };
  return { kind: "give", href: giveHref };
}

export function isNotFound(e: unknown) {
  return e instanceof ApiError && e.status === 404;
}

export function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}
