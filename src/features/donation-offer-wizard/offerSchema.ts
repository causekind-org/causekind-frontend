import { z } from "zod";
import {
  MIN_OFFER_PHOTOS, PURCHASE_TIMELINES, isPurchaseFlow,
  offerStepsFor, type OfferModel, type OfferStep,
} from "./offerModel";

/**
 * One schema for the whole offer, with cross-field rules in `superRefine` so a
 * rule can see the entire model. Per-step filtering happens afterwards, against
 * `STEP_FIELDS` — the same shape the listing wizard uses, so the two validate
 * and report errors identically.
 *
 * <p>**Built per flow, not once.** A `WILL_PURCHASE` offer has no photographs
 * and no condition, so the rules demanding them would fail on every step and
 * leave Continue permanently dead — and the failure would be invisible, because
 * neither field is rendered for that flow for an error to attach to.
 */
export function buildOfferSchema(flowType?: string | null) {
  const purchase = isPurchaseFlow(flowType);
  return z
  .object({
    photos: z.array(z.any()),
    proposedBrand: z.string(),
    proposedModel: z.string(),
    estimatedCost: z.string(),
    intendedStore: z.string(),
    purchaseTimeline: z.string(),
    purchaseNotes: z.string(),
    quantity: z.string(),
    approximateAge: z.string(),
    accessoriesIncluded: z.string(),
    specNotes: z.string(),
    condition: z.string(),
    hasKnownDefects: z.boolean(),
    knownDefects: z.string(),
    pickupCity: z.string(),
    pickupPincode: z.string(),
    pickupLocality: z.string(),
    donorDropOffAvailable: z.boolean(),
    deliveryCostBornBy: z.string(),
    declarationsConfirmed: z.boolean(),
  })
  .superRefine((v, ctx) => {
    // Photos — counted by *uploaded*, not selected. A file still uploading is
    // not yet something the donee could ever see. Skipped entirely for a
    // purchase offer: the item does not exist to photograph.
    if (!purchase) {
      const uploaded = (v.photos as { status?: string; remoteUrl?: string | null }[])
        .filter(p => p?.status === "uploaded" && !!p.remoteUrl).length;
      if (uploaded < MIN_OFFER_PHOTOS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, path: ["photos"],
          message: `Add at least ${MIN_OFFER_PHOTOS} photos of the item.`,
        });
      }
    }

    // The purchase plan. Only the timeline is required — it is the one field a
    // scheduler needs. Brand, model, store and cost stay optional on purpose: a
    // donor who has not picked a shop yet is still making a real commitment,
    // and demanding the detail would only push them to invent it.
    if (purchase) {
      if (!v.purchaseTimeline) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, path: ["purchaseTimeline"],
          message: "How soon can you buy it?",
        });
      } else if (!PURCHASE_TIMELINES.some(o => o.value === v.purchaseTimeline)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, path: ["purchaseTimeline"],
          message: "Choose one of the options.",
        });
      }

      // Guards the value, not the donor's estimate. Absent is fine; a cost that
      // is not a number would reach the backend as NaN.
      const cost = v.estimatedCost.trim();
      if (cost !== "" && !(Number(cost) > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, path: ["estimatedCost"],
          message: "Enter the amount in rupees, or leave it blank.",
        });
      }
    }

    // Quantity — required, a positive whole number. No maximum is imposed here:
    // how much is "too much" is the backend's compatibility rule, and inventing
    // a cap in the form would silently disagree with it.
    const qty = Number(v.quantity);
    if (v.quantity.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quantity"], message: "How many are you donating?" });
    } else if (!Number.isInteger(qty) || qty < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["quantity"],
        message: "Enter a whole number of items, at least 1.",
      });
    }

    // Condition and defects describe an item that exists. A purchase offer is
    // for a new one and never renders this step.
    if (!purchase) {
      if (!v.condition) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["condition"], message: "Select the item's condition." });
      }

      // A ticked defects box with an empty box beneath it discloses nothing, which
      // is worse than not ticking it — the donee sees a warning with no substance.
      if (v.hasKnownDefects && v.knownDefects.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom, path: ["knownDefects"],
          message: "Describe the defects so the recipient knows what to expect.",
        });
      }
    }

    // Whitespace-only is not a city.
    if (!v.pickupCity.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["pickupCity"], message: "Where can this be collected from?" });
    }

    if (!v.declarationsConfirmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["declarationsConfirmed"],
        message: "Please confirm the declarations before submitting.",
      });
    }
  });
}

export type OfferValues = OfferModel;

export const OFFER_STEP_FIELDS: Record<OfferStep, readonly (keyof OfferValues)[]> = {
  photos: ["photos"],
  purchasePlan: [
    "purchaseTimeline", "estimatedCost", "proposedBrand", "proposedModel",
    "intendedStore", "purchaseNotes",
  ],
  details: ["quantity", "approximateAge", "accessoriesIncluded", "specNotes"],
  condition: ["condition", "hasKnownDefects", "knownDefects"],
  pickup: ["pickupCity", "pickupPincode", "pickupLocality", "donorDropOffAvailable", "deliveryCostBornBy"],
  review: ["declarationsConfirmed"],
};

function issuesToRecord(values: OfferValues, flowType?: string | null): Record<string, string> {
  const result = buildOfferSchema(flowType).safeParse(values);
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Validates the whole model but reports only this step's fields.
 *
 * <p>Running the full schema is deliberate: a cross-field rule cannot be
 * evaluated from a slice of the model, and filtering afterwards means one
 * definition of every rule rather than one per step.
 */
export function validateOfferStep(
  step: OfferStep, values: OfferValues, flowType?: string | null,
): Record<string, string> {
  const all = issuesToRecord(values, flowType);
  const fields = OFFER_STEP_FIELDS[step] as readonly string[];
  return Object.fromEntries(Object.entries(all).filter(([k]) => fields.includes(k)));
}

export function validateOfferAll(
  values: OfferValues, flowType?: string | null,
): Record<string, string> {
  return issuesToRecord(values, flowType);
}

/**
 * Which step owns a field — used to jump to the first error on submit.
 *
 * <p>Searches only the steps THIS flow renders. Searching the canonical list
 * would let a purchase offer jump to `condition`, a step it never shows, and
 * strand the donor on a blank card with no way to fix the error.
 */
export function offerStepForField(field: string, flowType?: string | null): OfferStep {
  const steps = offerStepsFor(flowType);
  for (const step of steps) {
    if ((OFFER_STEP_FIELDS[step] as readonly string[]).includes(field)) return step;
  }
  return "review";
}
