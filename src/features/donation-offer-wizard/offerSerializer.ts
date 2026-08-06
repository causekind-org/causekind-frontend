import type { OfferModel } from "./offerModel";

/**
 * The one and only model → PATCH mapper for donation offers.
 *
 * <p>Two rules that are easy to get wrong and impossible to see in the UI:
 *
 * <p>**1. Cleared editable fields send `""`, not `undefined`.** The endpoint is
 * a PATCH and the service guards every field with `!= null`, so an omitted key
 * leaves the previous server value in place. The page this replaces built its
 * payload with `value || undefined`, which meant a donor who deleted a saved
 * "Approximate age" watched it come straight back on the next load — the clear
 * was never sent. Empty string is a real value the backend stores; that is the
 * whole fix.
 *
 * <p>**2. Fields this form does not show are omitted entirely.** `brand`,
 * `model`, `dimensions`, `approximateWeight`, `workingStatus`,
 * `maxTravelDistanceKm`, `pickupDays`, `pickupTimeSlots` and the handover dates
 * all exist on the DTO, and some carry values an admin or an earlier flow set.
 * Sending `""` for them would wipe data this screen never showed the donor and
 * never gave them a chance to keep. Omission is the correct choice here, and it
 * is the exact inverse of rule 1 — which is why both are written down.
 */
export type OfferPatch = {
  quantity?: number;
  approximateAge?: string;
  accessoriesIncluded?: string;
  specNotes?: string;
  condition?: string;
  knownDefects?: string;
  pickupCity?: string;
  pickupPincode?: string;
  pickupLocality?: string;
  donorDropOffAvailable?: boolean;
  deliveryCostBornBy?: string;
};

export function serializeOffer(model: OfferModel, opts: { includeSpecNotes: boolean }): OfferPatch {
  const qty = Number(model.quantity);

  const patch: OfferPatch = {
    // Only send a quantity the backend can store. A half-typed "" or "abc"
    // would otherwise arrive as NaN and be rejected — or worse, coerced.
    ...(Number.isInteger(qty) && qty >= 1 ? { quantity: qty } : {}),

    // Editable text: always sent, empty when cleared. See rule 1 above.
    approximateAge: model.approximateAge.trim(),
    accessoriesIncluded: model.accessoriesIncluded.trim(),
    condition: model.condition,

    // "None" when the donor says there are no defects. That literal is what the
    // previous form wrote and what OfferAiService's completeness check expects;
    // sending "" instead would read to it as "not answered yet".
    knownDefects: model.hasKnownDefects ? model.knownDefects.trim() : "None",

    pickupCity: model.pickupCity.trim(),
    pickupPincode: model.pickupPincode.trim(),
    pickupLocality: model.pickupLocality.trim(),
    donorDropOffAvailable: model.donorDropOffAvailable,

    // Hidden values are omitted, not blanked. If the donor later turns drop-off
    // off again, their earlier payer choice should still be there.
    ...(!model.donorDropOffAvailable
      ? { deliveryCostBornBy: model.deliveryCostBornBy }
      : {}),
  };

  if (opts.includeSpecNotes) patch.specNotes = model.specNotes.trim();

  return patch;
}

/** Stable digest of everything that would be sent — the autosave dedupe key. */
export function offerSnapshotKey(model: OfferModel, opts: { includeSpecNotes: boolean }): string {
  return JSON.stringify([
    serializeOffer(model, opts),
    // Photos are uploaded through their own endpoint, not this PATCH, but a
    // change to the set still has to invalidate the snapshot — otherwise adding
    // a photo would leave the draft looking "Saved" when Review had changed.
    model.photos.filter(p => p.status === "uploaded").map(p => p.remoteUrl),
  ]);
}

/**
 * The fields whose change voids a prior declarations confirmation.
 *
 * <p>Ticking the box and then editing the item would otherwise submit content
 * the donor never agreed to. Deliberately excludes `declarationsConfirmed`
 * itself, and excludes nothing else that a donee would see.
 */
export function offerMaterialDigest(model: OfferModel): string {
  return JSON.stringify([
    model.photos.filter(p => p.status === "uploaded").map(p => p.remoteUrl),
    model.quantity, model.approximateAge, model.accessoriesIncluded, model.specNotes,
    model.condition, model.hasKnownDefects, model.knownDefects,
    model.pickupCity, model.pickupPincode, model.pickupLocality,
    model.donorDropOffAvailable, model.deliveryCostBornBy,
  ]);
}
