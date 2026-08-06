import { z } from "zod";
import {
  MIN_OFFER_PHOTOS, OFFER_STEPS, type OfferModel, type OfferStep,
} from "./offerModel";

/**
 * One schema for the whole offer, with cross-field rules in `superRefine` so a
 * rule can see the entire model. Per-step filtering happens afterwards, against
 * `STEP_FIELDS` — the same shape the listing wizard uses, so the two validate
 * and report errors identically.
 */
export const offerSchema = z
  .object({
    photos: z.array(z.any()),
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
    // not yet something the donee could ever see.
    const uploaded = (v.photos as { status?: string; remoteUrl?: string | null }[])
      .filter(p => p?.status === "uploaded" && !!p.remoteUrl).length;
    if (uploaded < MIN_OFFER_PHOTOS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["photos"],
        message: `Add at least ${MIN_OFFER_PHOTOS} photos of the item.`,
      });
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

export type OfferValues = OfferModel;

export const OFFER_STEP_FIELDS: Record<OfferStep, readonly (keyof OfferValues)[]> = {
  photos: ["photos"],
  details: ["quantity", "approximateAge", "accessoriesIncluded", "specNotes"],
  condition: ["condition", "hasKnownDefects", "knownDefects"],
  pickup: ["pickupCity", "pickupPincode", "pickupLocality", "donorDropOffAvailable", "deliveryCostBornBy"],
  review: ["declarationsConfirmed"],
};

function issuesToRecord(values: OfferValues): Record<string, string> {
  const result = offerSchema.safeParse(values);
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
export function validateOfferStep(step: OfferStep, values: OfferValues): Record<string, string> {
  const all = issuesToRecord(values);
  const fields = OFFER_STEP_FIELDS[step] as readonly string[];
  return Object.fromEntries(Object.entries(all).filter(([k]) => fields.includes(k)));
}

export function validateOfferAll(values: OfferValues): Record<string, string> {
  return issuesToRecord(values);
}

/** Which step owns a field — used to jump to the first error on submit. */
export function offerStepForField(field: string): OfferStep {
  for (const step of OFFER_STEPS) {
    if ((OFFER_STEP_FIELDS[step] as readonly string[]).includes(field)) return step;
  }
  return "review";
}
