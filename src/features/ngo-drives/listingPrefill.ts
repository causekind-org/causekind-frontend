import {
  getItemListing, getNgoDriveOffer, updateNgoDriveOfferItem, uploadNgoDriveOfferMedia,
  type ItemListing, type NgoDriveOfferResponse, type PublicNgoDrive,
} from "@/lib/api";
import { driveAcceptedConditions } from "./driveConditions";
import { stillNeeded } from "./driveGiveState";

const LISTING_AVAILABLE = new Set(["ELIGIBLE_FOR_MATCHING", "AVAILABLE"]);
const MAX_PHOTOS = 5;

/** The listing, when it is the donor's own and still available; otherwise null. */
export function usableListing(listing: ItemListing | null | undefined, userId: number | undefined): ItemListing | null {
  if (!listing || userId == null || listing.donorId !== userId) return null;
  return LISTING_AVAILABLE.has((listing.status ?? "").toUpperCase()) ? listing : null;
}

/** Offer fields to prefill from a listing: quantity capped at still needed, an accepted condition, item name and category. */
export function listingOfferFields(listing: ItemListing, drive: PublicNgoDrive): Partial<NgoDriveOfferResponse> {
  const fields: Partial<NgoDriveOfferResponse> = {};
  const cap = stillNeeded(drive);
  if (listing.quantity > 0 && cap > 0) fields.quantity = Math.min(listing.quantity, cap);
  const accepted = drive.acceptedConditions?.length ? drive.acceptedConditions : driveAcceptedConditions(drive.condition);
  const condition = accepted?.find((c) => c.toLowerCase() === (listing.condition ?? "").toLowerCase());
  if (condition) fields.condition = condition;
  fields.notesForNgo = `Item: ${listing.title}${listing.category ? ` (${listing.category})` : ""}`;
  return fields;
}

/**
 * Prefills a fresh drive-offer draft from the donor's listing (?listingId= on a suggestion link).
 * Returns the updated offer, or null when the listing is invalid. Never throws: a failed photo
 * copy is skipped, so the donor can still add photos by hand.
 */
export async function prefillOfferFromListing(
  listingId: number, userId: number | undefined, drive: PublicNgoDrive, offer: NgoDriveOfferResponse,
): Promise<NgoDriveOfferResponse | null> {
  if (!Number.isInteger(listingId) || listingId <= 0) return null;
  try {
    const listing = usableListing(await getItemListing(listingId), userId);
    if (!listing) return null;
    await updateNgoDriveOfferItem(offer.id, listingOfferFields(listing, drive));
    for (const url of (listing.photoUrls ?? []).slice(0, MAX_PHOTOS)) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        const form = new FormData();
        form.append("files", new File([blob], `listing-${listing.id}.jpg`, { type: blob.type || "image/jpeg" }));
        await uploadNgoDriveOfferMedia(offer.id, form);
      } catch { /* skip this photo */ }
    }
    return await getNgoDriveOffer(offer.id);
  } catch {
    return null;
  }
}
