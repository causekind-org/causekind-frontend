import type { NgoDrive, NgoDriveOfferResponse } from "@/lib/api";

/**
 * How the NGO side groups the real drive and offer statuses. No new statuses: each
 * group is a set of existing ones, and an offer belongs to exactly one list.
 */

export const DRIVE_GROUPS = {
  review: ["PENDING_REVIEW", "CHANGES_REQUESTED"],
  live: ["LIVE", "FULLY_PLEDGED"],
  // Collection done, proof not approved yet (PROOF_SUBMITTED waits on admin).
  completed: ["COLLECTION_COMPLETE", "PROOF_SUBMITTED"],
} as const;

/** Drives that left the dashboard's work: proof approved (FULFILLED/CLOSED), rejected or cancelled. History only. */
export const HISTORY_DRIVE_STATUSES = new Set(["FULFILLED", "CLOSED", "REJECTED", "CANCELLED"]);
export const isHistoryDrive = (d: Pick<NgoDrive, "status">) => HISTORY_DRIVE_STATUSES.has(d.status);

/** The label on each drive card. */
export const DRIVE_STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: "In review", CHANGES_REQUESTED: "Changes requested", LIVE: "Live", FULLY_PLEDGED: "Fully pledged",
  COLLECTION_COMPLETE: "Collection complete", PROOF_SUBMITTED: "Proof submitted",
  FULFILLED: "Drive completed", CLOSED: "Drive completed", REJECTED: "Rejected", CANCELLED: "Cancelled",
};
export type DriveChip = "all" | keyof typeof DRIVE_GROUPS;

export function driveInChip(status: string, chip: DriveChip): boolean {
  return chip === "all" || (DRIVE_GROUPS[chip] as readonly string[]).includes(status);
}

/** Offers to review: only PENDING_NGO_REVIEW. */
export const isOfferToReview = (o: Pick<NgoDriveOfferResponse, "status">) => o.status === "PENDING_NGO_REVIEW";

/** Handover chips over the real offer statuses (no "On the way"). */
export const HANDOVER_GROUPS = {
  scheduled: ["NGO_ACCEPTED", "PENDING_ADMIN_APPROVAL", "ADMIN_APPROVED", "HANDOVER_IN_PROGRESS"],
  received: ["ISSUE_WINDOW_OPEN", "COMPLETED"],
  issues: ["HANDOVER_AT_RISK", "ISSUE_RAISED"],
} as const;
export type HandoverChip = keyof typeof HANDOVER_GROUPS;
const HANDOVER_STATUSES = new Set<string>(Object.values(HANDOVER_GROUPS).flat());

/** In Handovers from acceptance until the drive's proof is approved (then History). */
export const isHandover = (o: Pick<NgoDriveOfferResponse, "status"> & { drive?: Pick<NgoDrive, "status"> }) =>
  HANDOVER_STATUSES.has(o.status) && !(o.drive && isHistoryDrive(o.drive));
export const HANDOVER_LABEL: Record<HandoverChip, string> = { scheduled: "Scheduled", received: "Received", issues: "Issue" };
export function handoverChipOf(status: string): HandoverChip | null {
  for (const [chip, statuses] of Object.entries(HANDOVER_GROUPS)) if ((statuses as readonly string[]).includes(status)) return chip as HandoverChip;
  return null;
}

/** Offers that ended without a handover: shown in History. */
export const HISTORY_OFFER_STATUSES = new Set(["NGO_DECLINED", "CANCELLED", "ENDED", "WITHDRAWN"]);
/** History: ended offers, and every handed-over offer of a drive that is in History. */
export const isHistoryOffer = (o: Pick<NgoDriveOfferResponse, "status"> & { drive?: Pick<NgoDrive, "status"> }) =>
  HISTORY_OFFER_STATUSES.has(o.status) || (HANDOVER_STATUSES.has(o.status) && !!o.drive && isHistoryDrive(o.drive));

/** Proof due: collection complete and proof not approved yet (PROOF_SUBMITTED shows "Waiting for admin"). */
export const isProofDue = (d: Pick<NgoDrive, "status">) => d.status === "COLLECTION_COMPLETE" || d.status === "PROOF_SUBMITTED";

export type ActivityFilter = "offers" | "handovers" | "proof";

export function activityHref(filter: ActivityFilter, driveId?: number) {
  return `/dashboard/ngo?tab=activity&filter=${filter}${driveId != null ? `&drive=${driveId}` : ""}`;
}

/** The drive page's read-only line, e.g. "1 offer to review - 2 handovers - proof pending". */
export function driveSummaryParts(drive: NgoDrive, offers: NgoDriveOfferResponse[]) {
  const parts: { filter: ActivityFilter; label: string; href: string; count: number }[] = [];
  const toReview = offers.filter(isOfferToReview).length;
  const handovers = offers.filter(isHandover).length;
  if (toReview) parts.push({ filter: "offers", label: `${toReview} ${toReview === 1 ? "offer" : "offers"} to review`, href: activityHref("offers", drive.id), count: toReview });
  if (handovers) parts.push({ filter: "handovers", label: `${handovers} ${handovers === 1 ? "handover" : "handovers"}`, href: activityHref("handovers", drive.id), count: handovers });
  if (isProofDue(drive)) parts.push({ filter: "proof", label: "proof pending", href: activityHref("proof", drive.id), count: 1 });
  return parts;
}
