/**
 * Which destructive actions a donee may take on their own request, by status.
 *
 * Pure policy, deliberately kept out of the dashboard component so it can be
 * read (and tested) on its own — the failure mode this guards against is an
 * action quietly going missing from one of the dozen-plus active statuses,
 * which is invisible when the rule is buried in JSX.
 *
 * The backend is the real enforcement point (ItemRequestService.cancelRequest
 * and .deleteDraftRequest both re-check). This module only decides what to draw.
 */

/**
 * Mirrors ItemRequestService.NOT_CANCELLABLE_STATUSES.
 *
 * DRAFT is here because a draft is *deleted*, not withdrawn — there is nothing
 * to notify and no audit trail to preserve. The rest are terminal: the request
 * has already finished, been refused, lapsed, or been withdrawn once already.
 */
export const NOT_CANCELLABLE_STATUSES = new Set<string>([
  "DRAFT",
  "FULFILLED",
  "FULLY_FULFILLED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
]);

/** Every status a request can hold — mirrors the backend RequestStatus enum. */
export const ALL_REQUEST_STATUSES = [
  "DRAFT",
  "PENDING_VERIFICATION",
  "VERIFIED_PRIVATE_MATCHING",
  "POTENTIAL_MATCH_FOUND",
  "AWAITING_MATCH_APPROVAL",
  "PUBLICATION_CONSENT_REQUIRED",
  "PUBLIC_REQUEST",
  "RESERVED",
  "MATCH_IN_PROGRESS",
  "FULFILMENT_IN_PROGRESS",
  "PARTIALLY_MATCHED",
  "PARTIALLY_FULFILLED",
  "FULLY_FULFILLED",
  "FULFILLED",
  "EXPIRED",
  "REJECTED",
  "ON_HOLD",
  "CANCELLED",
] as const;

/** Statuses where the request is over — neither action applies. */
export const TERMINAL_STATUSES = new Set<string>([
  "CANCELLED",
  "REJECTED",
  "EXPIRED",
  "FULFILLED",
  "FULLY_FULFILLED",
]);

/** A draft is the only thing that can be deleted outright. */
export function canDeleteDraft(status: string): boolean {
  return status === "DRAFT";
}

/**
 * Anything submitted and not yet finished can be withdrawn — including
 * mid-handover, which is a deliberate product decision (2026-07-23) rather than
 * an oversight: a donee whose circumstances change must not be trapped by a
 * match they no longer need.
 */
export function canWithdrawRequest(status: string): boolean {
  return !NOT_CANCELLABLE_STATUSES.has(status);
}

/**
 * A withdrawn request can be cleared off the donee's own dashboard.
 *
 * <p>CANCELLED only — deliberately NOT extended to FULFILLED or EXPIRED. Those
 * are outcomes worth keeping in front of the person they happened to, and the
 * backend refuses them anyway.
 */
export function canHideWithdrawnRequest(status: string): boolean {
  return status === "CANCELLED";
}

/**
 * Statuses where CauseKind is actively working the request — what "on the road"
 * and "scanning donor inventories" claim. Every terminal state is excluded:
 * telling someone we're searching for an item they already withdrew is just
 * wrong, and that was the bug behind "1 request on the road" for a withdrawn one.
 */
const NOT_ACTIVE_STATUSES = new Set<string>([
  "FULFILLED",
  "FULLY_FULFILLED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
]);

export function isRequestActive(status: string): boolean {
  return !NOT_ACTIVE_STATUSES.has(status);
}
