import type { NgoDriveOfferResponse } from "@/lib/api";
import { emptyOfferModel, offerModelFrom, type OfferModel } from "@/features/donation-offer-wizard/offerModel";

/**
 * The drive wizard reuses the donation-offer steps, but a drive offer is a different
 * record. These map the shared form model to and from the drive offer's own shape
 * (UpdateDriveOfferItemRequest / NgoDriveOfferResponse).
 *
 * Using the donation serializer here sent fields the drive DTO does not have and never
 * sent matchesRequirements, notesForNgo or handoverMethod, so the server refused the
 * submit as an "Incomplete offer". The donation hydrator read a nested item the drive
 * offer does not have, so a resumed draft came back without its condition and details.
 */
export type DriveOfferPatch = {
  quantity?: number;
  condition: string;
  approximateAge: string;
  knownDefects: string;
  notesForNgo: string;
  matchesRequirements: boolean;
  // No handoverMethod or pickup address: the give form has no Pickup step. The donor
  // chooses drop-off or NGO pickup, and the pickup address, on the handover page.
};

export function serializeDriveOffer(model: OfferModel, opts: { maxQuantity?: number | null }): DriveOfferPatch {
  const qty = Number(model.quantity);
  const withinNeed = opts.maxQuantity == null || opts.maxQuantity <= 0 || qty <= opts.maxQuantity;
  return {
    // Only a quantity the server can store; an over-the-need value stays local so the
    // rest of the autosave is not refused with it (the inline error explains it).
    ...(Number.isInteger(qty) && qty >= 1 && withinNeed ? { quantity: qty } : {}),
    condition: model.condition,
    approximateAge: model.approximateAge.trim(),
    // "None" when the donor says there are no defects (same rule as donation offers).
    knownDefects: model.hasKnownDefects ? model.knownDefects.trim() : "None",
    notesForNgo: [model.accessoriesIncluded.trim(), model.specNotes.trim()].filter(Boolean).join("\n"),
    // The Review declaration covers "the item matches what the drive asks for".
    matchesRequirements: model.declarationsConfirmed,
  };
}

/** Form model from a saved drive offer (flat fields; photos come from its media). */
export function driveOfferModelFrom(offer: NgoDriveOfferResponse | null | undefined): OfferModel {
  if (!offer) return emptyOfferModel;
  // offerModelFrom only contributes the photos here (it finds no donation item).
  const base = offerModelFrom(offer as never);
  const defects = (offer.knownDefects ?? "").trim();
  return {
    ...base,
    quantity: offer.quantity != null ? String(offer.quantity) : base.quantity,
    condition: offer.condition ?? "",
    approximateAge: offer.approximateAge ?? "",
    hasKnownDefects: defects !== "" && defects.toLowerCase() !== "none",
    knownDefects: defects.toLowerCase() === "none" ? "" : defects,
    accessoriesIncluded: offer.notesForNgo ?? "",
    pickupCity: offer.pickupCity ?? "",
    pickupLocality: offer.pickupLocality ?? "",
    pickupPincode: offer.pickupPincode ?? "",
    donorDropOffAvailable: offer.handoverMethod ? offer.handoverMethod !== "NGO_PICKUP" : base.donorDropOffAvailable,
  };
}

export function driveOfferSnapshotKey(model: OfferModel, opts: { maxQuantity?: number | null }): string {
  return JSON.stringify([
    serializeDriveOffer(model, opts),
    model.photos.filter(p => p.status === "uploaded").map(p => p.remoteUrl),
  ]);
}

export function driveOfferMaterialDigest(model: OfferModel): string {
  return JSON.stringify([
    model.photos.filter(p => p.status === "uploaded").map(p => p.remoteUrl),
    model.quantity, model.approximateAge, model.accessoriesIncluded, model.specNotes,
    model.condition, model.hasKnownDefects, model.knownDefects,
  ]);
}

export const DRIVE_OFFER_DECLARATION_GROUPS = [
  {
    key: "ownership",
    items: [
      "I own this item or am authorised to donate it.",
      "The photographs are recent and genuine.",
      "The item details and condition are accurate.",
    ],
  },
  {
    key: "disclosure",
    items: [
      "I have disclosed all known defects.",
      "I will not request payment for the donated item.",
    ],
  },
  {
    key: "process",
    items: [
      "I understand that the donation is subject to the NGO's acceptance.",
      "I agree to follow the CauseKind handover process.",
    ],
  },
] as const;

