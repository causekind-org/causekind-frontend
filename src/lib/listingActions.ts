/**
 * Destructive and lifecycle actions a donor may take on their own item listing, by status.
 *
 * Mirrors the policy in requestActions.ts for donee requests:
 * - A DRAFT is discarded/deleted outright (never withdrawn).
 * - Live submitted items can be paused, resumed, or withdrawn.
 * - Terminal items (REJECTED, WITHDRAWN, EXPIRED, FAILED) can be deleted/cleared by the donor.
 *
 * Local persistent storage is used as a safety rail so that if the backend prevents hard-deleting
 * audited or non-draft rows, the donor's dashboard immediately and permanently filters out the
 * removed item.
 */

export const NOT_WITHDRAWABLE_LISTING_STATUSES = new Set<string>([
  "DRAFT",
  "DONATED",
  "FULFILLED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
  "CANCELLED",
  "FAILED",
]);

/**
 * Anything submitted and not yet terminal can be withdrawn.
 * DRAFT is excluded because drafts are discarded/deleted, not withdrawn.
 */
export function canWithdrawListing(status: string): boolean {
  return !NOT_WITHDRAWABLE_LISTING_STATUSES.has(status);
}

/**
 * Statuses where the donor can delete/clear the listing from their inventory:
 * unsubmitted drafts and terminal states.
 */
export function canDeleteListing(status: string): boolean {
  return ["DRAFT", "REJECTED", "WITHDRAWN", "EXPIRED", "CANCELLED", "FAILED"].includes(status);
}

export function canPauseListing(status: string): boolean {
  return status === "ELIGIBLE_FOR_MATCHING" || status === "AVAILABLE";
}

export function canResumeListing(status: string): boolean {
  return status === "PAUSED";
}

export function canEditListing(status: string): boolean {
  return status === "DRAFT" || status === "NEEDS_INFORMATION";
}

export const HIDDEN_LISTINGS_KEY = "causekind_hidden_listing_ids";

export function getHiddenListingIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIDDEN_LISTINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => !isNaN(n)) : [];
  } catch {
    return [];
  }
}

export function hideListingLocally(id: number): void {
  if (typeof window === "undefined") return;
  try {
    const current = getHiddenListingIds();
    if (!current.includes(id)) {
      localStorage.setItem(HIDDEN_LISTINGS_KEY, JSON.stringify([...current, id]));
    }
  } catch {
    // Storage unavailable / blocked
  }
}

export function filterVisibleListings<T extends { id: number }>(listings: T[]): T[] {
  if (!listings || !Array.isArray(listings)) return [];
  const hidden = new Set(getHiddenListingIds());
  if (hidden.size === 0) return listings;
  return listings.filter((l) => !hidden.has(l.id));
}
