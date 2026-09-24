import type { OfferModel } from "./offerModel";
import { isPurchaseFlow } from "./offerModel";

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
  latitude?: number;
  longitude?: number;
  donorDropOffAvailable?: boolean;
  deliveryCostBornBy?: string;
};

export function serializeOffer(
  model: OfferModel,
  opts: { includeSpecNotes: boolean; flowType?: string | null },
): OfferPatch {
  const qty = Number(model.quantity);
  const purchase = isPurchaseFlow(opts.flowType);

  const patch: OfferPatch = {
    // Only send a quantity the backend can store. A half-typed "" or "abc"
    // would otherwise arrive as NaN and be rejected — or worse, coerced.
    ...(Number.isInteger(qty) && qty >= 1 ? { quantity: qty } : {}),

    // Editable text: always sent, empty when cleared. See rule 1 above.
    accessoriesIncluded: model.accessoriesIncluded.trim(),

    // Age joins condition and defects under rule 2 — omitted, not blanked. The
    // purchase wizard no longer renders it (the item does not exist yet and will
    // be new), so `""` would be this form wiping a column it never showed.
    ...(!purchase ? { approximateAge: model.approximateAge.trim() } : {}),

    // Condition and defects are OMITTED for a purchase offer rather than sent
    // blank — rule 2, not rule 1. The purchase wizard never shows these fields,
    // so `""` would not be "the donor cleared it", it would be this form wiping
    // a column it never rendered. The item is new; there is nothing to rate.
    ...(!purchase
      ? {
          condition: model.condition,
          // "None" when the donor says there are no defects. That literal is what
          // the previous form wrote and what OfferAiService's completeness check
          // expects; sending "" instead would read to it as "not answered yet".
          knownDefects: model.hasKnownDefects ? model.knownDefects.trim() : "None",
        }
      : {}),

    // "Use my location" has always written these into the model, and they were
    // never sent — the field simply did not exist on this payload, so the
    // coordinates died in the browser. The endpoint and the entity have both
    // accepted them all along (UpdateOfferItemRequest, DonationOfferItem).
    // Omitted rather than nulled when absent: rule 2 — this form must not wipe
    // coordinates a previous save established.
    ...(model.latitude != null ? { latitude: model.latitude } : {}),
    ...(model.longitude != null ? { longitude: model.longitude } : {}),

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

/**
 * The model → `POST /flow-b/commitment` body. `null` when there is nothing
 * worth saving yet, so autosave does not POST an empty commitment on the way
 * past the first step.
 *
 * <p>`itemName` comes from the REQUEST TITLE, not from a field. The column is
 * NOT NULL and the donor is buying the item this request asked for, so asking
 * again would be asking the same question in two places and inviting the two
 * answers to disagree.
 *
 * <p>`purchaseTimeline` carries the band (`WITHIN_7_DAYS`), not prose. The
 * column is a `VARCHAR(100)` today, which is why this fits with no migration —
 * but the value is machine-readable from the start, so the deadline column can
 * be computed from it later without a data backfill of free text.
 */
export type PurchaseCommitmentBody = {
  itemName: string;
  proposedBrand?: string;
  proposedModel?: string;
  estimatedCost?: number;
  purchaseTimeline: string;
  intendedStore?: string;
  notes?: string;
};

export function serializePurchaseCommitment(
  model: OfferModel, requestTitle: string | null,
): PurchaseCommitmentBody | null {
  if (!model.purchaseTimeline) return null;

  const cost = Number(model.estimatedCost.trim());
  const brand = model.proposedBrand.trim();
  const modelName = model.proposedModel.trim();
  const store = model.intendedStore.trim();
  const notes = model.purchaseNotes.trim();

  return {
    // The endpoint rejects a blank name. A request with no title is not
    // something this wizard can reach, but the fallback keeps a 400 out of the
    // autosave loop if it ever is.
    itemName: (requestTitle ?? "").trim() || "Requested item",
    purchaseTimeline: model.purchaseTimeline,
    ...(brand ? { proposedBrand: brand } : {}),
    ...(modelName ? { proposedModel: modelName } : {}),
    ...(store ? { intendedStore: store } : {}),
    ...(notes ? { notes } : {}),
    ...(cost > 0 ? { estimatedCost: cost } : {}),
  };
}

/** Stable digest of everything that would be sent — the autosave dedupe key. */
export function offerSnapshotKey(
  model: OfferModel, opts: { includeSpecNotes: boolean; flowType?: string | null },
): string {
  return JSON.stringify([
    serializeOffer(model, opts),
    // The commitment saves through its own endpoint, so a change to it has to
    // invalidate the snapshot here too — otherwise picking a timeline would
    // leave the draft showing "Saved" with nothing sent.
    serializePurchaseCommitment(model, null),
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
    // The purchase plan is material: it is the substance of what the donee is
    // being asked to accept, so changing it after ticking the declarations has
    // to void them exactly as changing the item would.
    model.proposedBrand, model.proposedModel, model.estimatedCost,
    model.intendedStore, model.purchaseTimeline, model.purchaseNotes,
    model.quantity, model.approximateAge, model.accessoriesIncluded, model.specNotes,
    model.condition, model.hasKnownDefects, model.knownDefects,
    model.pickupCity, model.pickupPincode, model.pickupLocality,
    model.donorDropOffAvailable, model.deliveryCostBornBy,
  ]);
}
