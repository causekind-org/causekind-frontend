import type { DonationOffer } from "@/lib/api";
import type { WizardPhoto } from "@/features/wizard-kit/types";

/**
 * The five editable steps. The submitted/result screen is deliberately NOT one
 * of them — it is a separate phase of the page, not "step 6". Counting it would
 * make the progress bar say "Step 6 of 6" on a screen with no form on it.
 */
export const OFFER_STEPS = ["photos", "details", "condition", "pickup", "review"] as const;
export type OfferStep = (typeof OFFER_STEPS)[number];

export function offerStepIndex(step: OfferStep): number {
  return OFFER_STEPS.indexOf(step);
}

/** Exactly the options the page offered before — deliberately unchanged. */
export const OFFER_CONDITIONS = [
  "Unused", "Like New", "Good", "Fair", "Needs Minor Repair", "Not Working",
] as const;

export const OFFER_AGE_RANGES = [
  "Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years", "Unknown",
] as const;

/** Backend values, with the friendly labels the old form used. */
export const DELIVERY_PAYERS = [
  { value: "DONOR", label: "I'll pay for delivery" },
  { value: "DONEE", label: "The recipient pays" },
  { value: "SHARED", label: "We'll share the cost" },
] as const;

export const MAX_OFFER_PHOTOS = 8;
export const MIN_OFFER_PHOTOS = 2;

/**
 * The declarations, verbatim from the page this replaces.
 *
 * <p>Seven statements, in three groups. Grouping is presentational only — the
 * backend stores one boolean, and the wording is a legal promise about *this*
 * action, which is why it is not shared with the listing wizard's set.
 */
export const OFFER_DECLARATION_GROUPS = [
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
      "I understand that the donation is subject to donee and admin approval.",
      "I agree to follow the CauseKind handover process.",
    ],
  },
] as const;

export const OFFER_GROUP_TITLES: Record<string, string> = {
  ownership: "Ownership & accuracy",
  disclosure: "Disclosure & conduct",
  process: "Approval & process",
};

export type OfferModel = {
  photos: WizardPhoto[];

  // Details
  quantity: string;
  approximateAge: string;
  accessoriesIncluded: string;
  specNotes: string;

  // Condition
  condition: string;
  hasKnownDefects: boolean;
  knownDefects: string;

  // Pickup
  pickupCity: string;
  pickupPincode: string;
  pickupLocality: string;
  latitude: number | null;
  longitude: number | null;
  donorDropOffAvailable: boolean;
  deliveryCostBornBy: string;

  // Review
  declarationsConfirmed: boolean;
};

export const emptyOfferModel: OfferModel = {
  photos: [],
  quantity: "1",
  approximateAge: "",
  accessoriesIncluded: "",
  specNotes: "",
  condition: "",
  hasKnownDefects: false,
  knownDefects: "",
  pickupCity: "",
  pickupPincode: "",
  pickupLocality: "",
  latitude: null,
  longitude: null,
  donorDropOffAvailable: false,
  deliveryCostBornBy: "DONOR",
  declarationsConfirmed: false,
};

/**
 * `specNotes` is only meaningful for a flow where the donor is describing
 * something that is not the exact requested item. ALREADY_OWN is the only live
 * flow and does not need it, so the field stays hidden rather than being
 * invented into the UI — but the value is preserved through serialization so a
 * future flow, or a value an admin already saw, is never silently dropped.
 */
export function needsSpecNotes(flowType: string | null | undefined): boolean {
  return flowType === "SIMILAR_ITEM";
}

/** Server media → wizard photos, already uploaded. */
export function photosFromOffer(offer: DonationOffer | null | undefined): WizardPhoto[] {
  const media = offer?.media ?? [];
  return media
    .filter(m => m.mediaType === "IMAGE")
    .map(m => ({
      id: `m${m.id}`,
      localUrl: null,
      remoteUrl: m.mediaUrl,
      mediaId: m.id,
      status: "uploaded" as const,
      file: null,
      error: null,
    }));
}

/**
 * Hydrates the full editor state from a saved offer.
 *
 * <p>`hasKnownDefects` is derived, not stored: the backend keeps a single text
 * column and the old form wrote the literal `"None"` when the donor said there
 * were none. Treating `"None"` (or blank) as "no defects" is what stops a
 * resumed draft showing the word "None" typed into the defects box.
 */
export function offerModelFrom(offer: DonationOffer | null | undefined): OfferModel {
  const item = offer?.itemDetails;
  if (!item) return { ...emptyOfferModel, photos: photosFromOffer(offer) };

  const rawDefects = item.knownDefects ?? "";
  const hasDefects = rawDefects.trim() !== "" && rawDefects.trim().toLowerCase() !== "none";

  return {
    photos: photosFromOffer(offer),
    quantity: item.quantity != null ? String(item.quantity) : "1",
    approximateAge: item.approximateAge ?? "",
    accessoriesIncluded: item.accessoriesIncluded ?? "",
    specNotes: item.specNotes ?? "",
    condition: item.condition ?? "",
    hasKnownDefects: hasDefects,
    knownDefects: hasDefects ? rawDefects : "",
    pickupCity: item.pickupCity ?? "",
    pickupPincode: item.pickupPincode ?? "",
    pickupLocality: item.pickupLocality ?? "",
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    donorDropOffAvailable: !!item.donorDropOffAvailable,
    deliveryCostBornBy: item.deliveryCostBornBy ?? "DONOR",
    // Never hydrated as true. The donor re-affirms on every visit to Review,
    // because the stored flag records a past agreement to possibly-different
    // content, and the page they are about to see may not match it.
    declarationsConfirmed: false,
  };
}

export function uploadedOfferPhotos(photos: WizardPhoto[]): WizardPhoto[] {
  return photos.filter(p => p.status === "uploaded" && p.remoteUrl);
}

/**
 * Where a resumed draft should open — the first step with work left.
 *
 * <p>Order matches the wizard's own, so a donor is never dropped past something
 * they still have to do. Anything already complete is behind them and reachable
 * from the progress bar.
 */
export function firstIncompleteOfferStep(model: OfferModel): OfferStep {
  if (uploadedOfferPhotos(model.photos).length < MIN_OFFER_PHOTOS) return "photos";

  const qty = Number(model.quantity);
  if (!Number.isInteger(qty) || qty < 1) return "details";

  if (!model.condition) return "condition";
  if (model.hasKnownDefects && model.knownDefects.trim().length < 3) return "condition";

  if (!model.pickupCity.trim()) return "pickup";

  return "review";
}
