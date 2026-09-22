import type { ItemListing, ItemMatch } from "@/lib/api";

export const MATCHED_DONATION_STAGES = ["Listed", "Verified", "Matching", "Matched", "Donated"];

export const CERTIFICATE_ELIGIBLE_MATCH_STATUSES = new Set(["COMPLETED", "FULFILLED"]);

export function isCompletedMatch(match: ItemMatch | null | undefined): boolean {
  if (!match) return false;
  return CERTIFICATE_ELIGIBLE_MATCH_STATUSES.has(match.status) || Boolean(match.deliveryVerificationMethod);
}

export function findMatchForListing(listing: ItemListing, matches: ItemMatch[]): ItemMatch | null {
  // Match ONLY by listingId — never match by title
  const listingMatches = matches.filter((m) => m.listingId === listing.id);
  if (listingMatches.length === 0) return null;

  // Prefer completed matches if available
  const completedMatches = listingMatches.filter(isCompletedMatch);
  const candidates = completedMatches.length > 0 ? completedMatches : listingMatches;

  return candidates.slice().sort((a, b) => {
    const timeA = new Date(a.completedAt ?? a.doneeConfirmedAt ?? a.closedAt ?? a.createdAt).getTime();
    const timeB = new Date(b.completedAt ?? b.doneeConfirmedAt ?? b.closedAt ?? b.createdAt).getTime();
    return timeB - timeA;
  })[0];
}

export function getListingCompletionDate(listing: ItemListing, match: ItemMatch | null): string {
  if (match) {
    const matchTime = match.completedAt ?? match.doneeConfirmedAt ?? match.closedAt;
    if (matchTime) return matchTime;
  }
  return listing.submittedAt ?? listing.createdAt;
}
