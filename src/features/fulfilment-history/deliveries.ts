/**
 * One delivery a donee received toward a request — from a completed donation
 * offer or a completed item-listing match — in the shape the History page stacks.
 *
 * <p>Each row's quantity is what the donee confirmed receiving, the same number the
 * request's total is built from (HandoverService.deliveredQuantity and
 * ItemMatchService.recordMatchDelivery on the backend). Showing what was *offered*
 * instead is how the page once listed 25 + 10 + 10 under a total of 50/50.
 */
import type { DonationOffer, ItemMatch } from "@/lib/api";
import { offerDeliveredQuantity } from "@/lib/requestFulfilment";
import { matchCommittedQuantity } from "@/features/handover/adapters";

type DeliveryBase = {
  /** Unique across both kinds — offer and match ids share a number space. */
  key: string;
  id: number;
  requestId: number;
  donorName: string;
  /** When it finished: completion for an offer, receipt for a match. */
  deliveredAt: number;
  /** What the donee confirmed receiving; null when no count was ever recorded. */
  received: number | null;
  /** What the donor committed to; null when unknown. */
  offered: number | null;
};

export type Delivery =
  | (DeliveryBase & { kind: "offer"; offer: DonationOffer })
  | (DeliveryBase & { kind: "match"; match: ItemMatch });

/** Match statuses that mean the item reached the donee. */
export const MATCH_DELIVERED_STATUSES = new Set(["COMPLETED", "FULFILLED"]);

const time = (iso: string | null | undefined) => (iso ? new Date(iso).getTime() : NaN);
const firstValid = (...values: number[]) => values.find(v => Number.isFinite(v)) ?? 0;
const positive = (n: number | null | undefined) => (n != null && n > 0 ? n : null);

export function offerDelivery(offer: DonationOffer): Delivery {
  return {
    kind: "offer",
    key: `offer-${offer.id}`,
    id: offer.id,
    requestId: offer.requestId,
    donorName: offer.donorName || "Donor",
    deliveredAt: firstValid(time(offer.closedAt), time(offer.createdAt)),
    received: positive(offerDeliveredQuantity(offer)),
    offered: positive(offer.itemDetails?.quantity),
    offer,
  };
}

export function matchDelivery(match: ItemMatch): Delivery {
  return {
    kind: "match",
    key: `match-${match.id}`,
    id: match.id,
    requestId: match.requestId ?? -1,
    donorName: match.donorName || "Donor",
    deliveredAt: firstValid(time(match.doneeConfirmedAt), time(match.closedAt), time(match.createdAt)),
    // Same rule as the backend's count: the donee's number, else the allocation.
    received: positive(match.doneeConfirmedQty) ?? positive(match.allocatedQuantity),
    offered: matchCommittedQuantity(match),
    match,
  };
}

/** Every completed delivery toward one request, oldest first — the order they arrived. */
export function deliveriesForRequest(requestId: number, offers: DonationOffer[], matches: ItemMatch[]): Delivery[] {
  return [
    ...offers.filter(o => o.requestId === requestId && o.status === "COMPLETED").map(offerDelivery),
    ...matches.filter(m => m.requestId === requestId && MATCH_DELIVERED_STATUSES.has(m.status)).map(matchDelivery),
  ].sort((a, b) => a.deliveredAt - b.deliveredAt);
}

/** Sum of the confirmed counts — compared against the request's total to flag old, mismatched records. */
export function totalReceived(deliveries: Delivery[]): number {
  return deliveries.reduce((sum, d) => sum + (d.received ?? 0), 0);
}
