import type { ItemListing, ItemRequest } from "@/lib/api";
import { getRequestFulfilment } from "@/lib/requestFulfilment";
import { isRequestActive } from "@/lib/requestActions";

/**
 * Sub-filters for the dashboard's two ledgers — the donor's inventory and the
 * donee's requests.
 *
 * <p>Every item lands in exactly one bucket, so the chip counts add up to the
 * total and clicking through the chips visits each item once. "all" is not a
 * bucket: it is what the ledger already shows, which deliberately leaves out
 * finished items (those live in Matched Donations / History). "completed" is
 * the only chip that reaches them from here.
 *
 * <p>Pure functions over data the dashboard already holds — filtering never
 * fetches and never reloads the page.
 */

export type FilterOption<K extends string> = { key: K; label: string; count: number };

// ── Donor inventory ─────────────────────────────────────────────────────────

export const INVENTORY_FILTERS = [
  "all", "drafts", "review", "listed", "matched", "paused", "completed", "closed",
] as const;
export type InventoryFilter = (typeof INVENTORY_FILTERS)[number];

const INVENTORY_LABELS: Record<InventoryFilter, string> = {
  all: "All",
  drafts: "Drafts",
  review: "In review",
  listed: "Listed",
  matched: "Matched",
  paused: "Paused",
  completed: "Completed",
  closed: "Closed",
};

const LISTING_REVIEW = new Set(["SUBMITTED", "AI_SCREENING", "NEEDS_INFORMATION", "MANUAL_REVIEW"]);
const LISTING_LIVE = new Set(["ELIGIBLE_FOR_MATCHING", "AVAILABLE"]);
const LISTING_RESERVED = new Set(["SOFT_RESERVED", "MATCHED", "PARTIALLY_DONATED"]);
const LISTING_DONE = new Set(["DONATED", "FULFILLED"]);

/**
 * The one bucket a listing belongs to.
 *
 * <p>A live listing with a nearby need already matched to it counts as
 * "matched", not "listed": its status stays ELIGIBLE until the match is
 * reserved, but to the donor it is no longer just waiting.
 */
export function inventoryBucket(
  listing: Pick<ItemListing, "status">,
  hasLiveMatch = false,
): Exclude<InventoryFilter, "all"> {
  const s = listing.status;
  if (s === "DRAFT") return "drafts";
  if (LISTING_REVIEW.has(s)) return "review";
  if (LISTING_RESERVED.has(s)) return "matched";
  if (LISTING_LIVE.has(s)) return hasLiveMatch ? "matched" : "listed";
  if (s === "PAUSED") return "paused";
  if (LISTING_DONE.has(s)) return "completed";
  return "closed";
}

export function filterInventory<T extends Pick<ItemListing, "id" | "status">>(
  listings: T[],
  filter: InventoryFilter,
  liveMatchListingIds: ReadonlySet<number> = new Set(),
): T[] {
  return listings.filter(l => {
    const bucket = inventoryBucket(l, liveMatchListingIds.has(l.id));
    return filter === "all" ? bucket !== "completed" : bucket === filter;
  });
}

export function inventoryFilterOptions(
  listings: Pick<ItemListing, "id" | "status">[],
  liveMatchListingIds: ReadonlySet<number> = new Set(),
): FilterOption<InventoryFilter>[] {
  return INVENTORY_FILTERS.map(key => ({
    key,
    label: INVENTORY_LABELS[key],
    count: filterInventory(listings, key, liveMatchListingIds).length,
  }));
}

// ── Donee requests ──────────────────────────────────────────────────────────

export const REQUEST_FILTERS = [
  "all", "drafts", "review", "open", "matched", "partial", "completed", "closed",
] as const;
export type RequestFilter = (typeof REQUEST_FILTERS)[number];

const REQUEST_LABELS: Record<RequestFilter, string> = {
  all: "All",
  drafts: "Drafts",
  review: "In review",
  open: "Open",
  matched: "Matched",
  partial: "Partly received",
  completed: "Completed",
  closed: "Closed",
};

const REQUEST_REVIEW = new Set(["PENDING_VERIFICATION", "ON_HOLD"]);
const REQUEST_MATCHED = new Set([
  "POTENTIAL_MATCH_FOUND", "AWAITING_MATCH_APPROVAL", "RESERVED",
  "MATCH_IN_PROGRESS", "FULFILMENT_IN_PROGRESS", "PARTIALLY_MATCHED",
]);

type RequestLike = Pick<ItemRequest, "id" | "status"> & Parameters<typeof getRequestFulfilment>[0];

/**
 * The one bucket a request belongs to.
 *
 * <p>Fulfilment is read from quantities first, the same way
 * {@link groupRequestsByFulfilment} reads it, so "completed" and "partly
 * received" here always agree with the groups the ledger already draws.
 */
export function requestBucket(request: RequestLike, hasLiveMatch = false): Exclude<RequestFilter, "all"> {
  const f = getRequestFulfilment(request);
  if (f.isFullyFulfilled) return "completed";
  if (!isRequestActive(request.status)) return "closed";
  if (f.isPartiallyFulfilled) return "partial";
  const s = request.status;
  if (s === "DRAFT") return "drafts";
  if (REQUEST_REVIEW.has(s)) return "review";
  if (REQUEST_MATCHED.has(s) || hasLiveMatch) return "matched";
  return "open";
}

export function filterRequests<T extends RequestLike>(
  requests: T[],
  filter: RequestFilter,
  liveMatchRequestIds: ReadonlySet<number> = new Set(),
): T[] {
  return requests.filter(r => {
    const bucket = requestBucket(r, liveMatchRequestIds.has(r.id));
    return filter === "all" ? bucket !== "completed" : bucket === filter;
  });
}

export function requestFilterOptions(
  requests: RequestLike[],
  liveMatchRequestIds: ReadonlySet<number> = new Set(),
): FilterOption<RequestFilter>[] {
  return REQUEST_FILTERS.map(key => ({
    key,
    label: REQUEST_LABELS[key],
    count: filterRequests(requests, key, liveMatchRequestIds).length,
  }));
}
