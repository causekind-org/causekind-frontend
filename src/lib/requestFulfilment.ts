/**
 * How much of a donee's request has actually been received, and which part of
 * the dashboard it belongs in.
 *
 * One pure module instead of the inline `(r.fulfilledQuantity ?? 0) < r.quantity`
 * filters the dashboard, its admin donee tab and the history page each carried.
 * Those copies ignored status, so a request completed through the item-listing
 * match flow — which closes the request without ever counting a delivery — sat
 * under "Pending" at 0 / N and never reached History.
 *
 * Mirrors ItemRequestResponse on the backend, and applies the same rules again
 * here so the UI stays right against a backend that predates them.
 */
import type { DonationOffer, ItemRequest } from "@/lib/api";
import { isRequestActive } from "@/lib/requestActions";

type QuantityFields = Pick<ItemRequest, "status" | "quantity" | "fulfilledQuantity">;

export type RequestFulfilment = {
  requested: number;
  /** Received so far — never more than was requested. */
  fulfilled: number;
  /** Always `requested - fulfilled`, so the three numbers shown together add up. */
  remaining: number;
  /** Everything asked for has arrived, or the request was closed as fulfilled. */
  isFullyFulfilled: boolean;
  /** Something has arrived, but not everything. */
  isPartiallyFulfilled: boolean;
};

const FULFILLED_STATUSES = new Set(["FULFILLED", "FULLY_FULFILLED"]);

export function getRequestFulfilment(r: QuantityFields): RequestFulfilment {
  const requested = Math.max(0, r.quantity || 0);
  const closedAsFulfilled = FULFILLED_STATUSES.has(r.status);
  // The match flow closes a request as FULFILLED without recording a delivery
  // count, so the status wins over a zero counter. Capped because a donor can
  // hand over more than was asked for.
  const fulfilled = closedAsFulfilled
    ? requested
    : Math.min(Math.max(0, r.fulfilledQuantity ?? 0), requested);
  const isFullyFulfilled = closedAsFulfilled || (requested > 0 && fulfilled >= requested);
  return {
    requested,
    fulfilled,
    // Derived rather than read from `remainingQuantity`: that came from a
    // requirement the backend could hold stale, which rendered "3 / 10 ·
    // Remaining: 0".
    remaining: requested - fulfilled,
    isFullyFulfilled,
    isPartiallyFulfilled: !isFullyFulfilled && fulfilled > 0,
  };
}

export type RequestGroups<T> = {
  /** Still open, nothing received yet. */
  pending: T[];
  /** Still open, some of it received. */
  partial: T[];
  /** Rejected, expired or withdrawn before everything arrived. */
  closed: T[];
  /** Everything received — these live on the History page. */
  fulfilled: T[];
};

/** Splits requests into dashboard groups; each request lands in exactly one. */
export function groupRequestsByFulfilment<T extends QuantityFields>(requests: T[]): RequestGroups<T> {
  const groups: RequestGroups<T> = { pending: [], partial: [], closed: [], fulfilled: [] };
  for (const r of requests) {
    const f = getRequestFulfilment(r);
    if (f.isFullyFulfilled) groups.fulfilled.push(r);
    else if (!isRequestActive(r.status)) groups.closed.push(r);
    else if (f.isPartiallyFulfilled) groups.partial.push(r);
    else groups.pending.push(r);
  }
  return groups;
}

/**
 * What a completed offer delivered: the donee's confirmed count, else what was
 * offered — the same rule HandoverService.deliveredQuantity counts toward the
 * request, so a list of deliveries adds up to the request's total.
 */
export function offerDeliveredQuantity(o: Pick<DonationOffer, "receivedQuantity" | "itemDetails">): number {
  return o.receivedQuantity ?? o.itemDetails?.quantity ?? 0;
}
