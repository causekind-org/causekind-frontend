import type { DonationOffer } from "@/lib/api";
import type { WizardPhoto } from "@/features/wizard-kit/types";

/**
 * Every step this wizard can render, in canonical order. This is the TYPE
 * source only — no flow shows all of them. The submitted/result screen is
 * deliberately not here: it is a separate phase of the page, not "step 6", and
 * counting it would make the progress bar say "Step 6 of 6" on a screen with no
 * form on it.
 */
export const ALL_OFFER_STEPS = [
  "photos", "purchasePlan", "details", "condition", "pickup", "review",
] as const;
export type OfferStep = (typeof ALL_OFFER_STEPS)[number];

/**
 * The default five — a donor who has the item in their hands.
 *
 * <p>Still exported under its original name because it is the shape every
 * existing caller means, and because `ALREADY_OWN` remains the only flow that
 * screens photographs.
 */
export const OFFER_STEPS = ["photos", "details", "condition", "pickup", "review"] as const;

/**
 * Flow B — the donor will buy the item. Four steps, and the two differences are
 * both deliberate:
 *
 * <p>**`photos` becomes `purchasePlan`.** There is nothing to photograph yet.
 * That also means no `ListingVisionService` screening happens here; the gate
 * moves to proof-upload time, once the item actually exists.
 *
 * <p>**`condition` is dropped entirely.** The item is new by definition. Asking
 * a donor to rate the condition of something that does not exist reads as a form
 * written for somebody else.
 */
export const PURCHASE_OFFER_STEPS = ["purchasePlan", "details", "pickup", "review"] as const;

export function isPurchaseFlow(flowType: string | null | undefined): boolean {
  return flowType === "WILL_PURCHASE";
}

/** The step list for a flow. Everything that walks the wizard reads this. */
export function offerStepsFor(flowType: string | null | undefined): readonly OfferStep[] {
  return isPurchaseFlow(flowType) ? PURCHASE_OFFER_STEPS : OFFER_STEPS;
}

/**
 * Position of a step within its own flow's list.
 *
 * <p>Takes the list rather than closing over one: with two flows, an index read
 * from the wrong array is an off-by-one that renders as "Step 3 of 4" on the
 * second step and is very hard to see in review.
 */
export function offerStepIndex(step: OfferStep, steps: readonly OfferStep[] = OFFER_STEPS): number {
  return steps.indexOf(step);
}

/**
 * How soon the donor commits to buying, as bounded options rather than free
 * text.
 *
 * <p>Two reasons, and the second is the load-bearing one. A chip is a better
 * control than a text box for something with three sensible answers — and a
 * scheduler cannot act on "in a couple of weeks". The deadline that drives
 * auto-release, the nudge ladder and the admin queue's sort order is computed
 * from this, so it has to be a machine-readable value.
 *
 * <p>The clock starts when the DONEE ACCEPTS, not at submit: a donor should not
 * be burning their window while waiting to hear back. That also makes the
 * reservation hold and the purchase window the same window.
 *
 * <p>The cap is the point. An unbounded promise ties up
 * `QuantityAllocation` headroom — and leaves the need unmet — for as long as the
 * donor feels like.
 */
export const PURCHASE_TIMELINES = [
  { value: "WITHIN_3_DAYS",  label: "Within 3 days",  days: 3 },
  { value: "WITHIN_7_DAYS",  label: "Within a week",  days: 7 },
  { value: "WITHIN_14_DAYS", label: "Within 2 weeks", days: 14 },
] as const;

export type PurchaseTimeline = (typeof PURCHASE_TIMELINES)[number]["value"];

export function purchaseTimelineLabel(value: string): string {
  return PURCHASE_TIMELINES.find(t => t.value === value)?.label ?? value;
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

/**
 * The same promise, rewritten for a donor who does not own the item yet.
 *
 * <p>**This is not a copy change.** The default set has the donor swear "I own
 * this item or am authorised to donate it" and "the photographs are recent and
 * genuine". On a purchase offer the first is false and the second refers to
 * photographs that do not exist. Showing a donor a legal declaration that
 * cannot be true of them is worse than showing none — it makes the whole block
 * something to click past.
 *
 * <p>What replaces them is the commitment itself: that they will actually buy
 * it, within the window they chose, and evidence it.
 */
export const PURCHASE_DECLARATION_GROUPS = [
  {
    key: "ownership",
    items: [
      "I intend to buy this item myself, with my own money.",
      "I will buy it within the timeframe I selected, once the recipient accepts.",
      "The brand, model and cost above are my honest expectation.",
    ],
  },
  {
    key: "disclosure",
    items: [
      "I will provide a photo of the item and a receipt once I have bought it.",
      "I will not request payment or reimbursement for the item.",
    ],
  },
  {
    key: "process",
    items: [
      "I understand that the donation is subject to donee and admin approval.",
      "I understand that if I do not buy it in time, the offer may be released to someone else.",
      "I agree to follow the CauseKind handover process.",
    ],
  },
] as const;

export function declarationGroupsFor(flowType: string | null | undefined) {
  return isPurchaseFlow(flowType) ? PURCHASE_DECLARATION_GROUPS : OFFER_DECLARATION_GROUPS;
}

export const OFFER_GROUP_TITLES: Record<string, string> = {
  ownership: "Ownership & accuracy",
  disclosure: "Disclosure & conduct",
  process: "Approval & process",
};

export type OfferModel = {
  photos: WizardPhoto[];

  // Purchase plan — WILL_PURCHASE only. Collected before submit, because the
  // donee has to know what they are accepting; the purchase itself happens
  // after they accept.
  //
  // There is deliberately no item name here. PurchaseCommitment.itemName is
  // NOT NULL on the backend, but the donor is buying the item this request
  // asked for — so it is filled from the request title at serialization time
  // rather than asked for a second time in a second place.
  proposedBrand: string;
  proposedModel: string;
  estimatedCost: string;
  intendedStore: string;
  purchaseTimeline: string;
  purchaseNotes: string;

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
  proposedBrand: "",
  proposedModel: "",
  estimatedCost: "",
  intendedStore: "",
  purchaseTimeline: "",
  purchaseNotes: "",
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
/**
 * The purchase plan, read back off the offer.
 *
 * <p>Everything in the wizard model is a string because it is bound to inputs,
 * so the numeric `estimatedCost` is stringified here rather than at the field.
 * An absent commitment yields empty strings, which is the same shape a brand
 * new draft has — so the caller never has to branch on whether one existed.
 */
function purchasePlanFrom(offer: DonationOffer | null | undefined) {
  const c = offer?.purchaseCommitment;
  if (!c) return null;
  return {
    proposedBrand: c.proposedBrand ?? "",
    proposedModel: c.proposedModel ?? "",
    estimatedCost: c.estimatedCost != null ? String(c.estimatedCost) : "",
    intendedStore: c.intendedStore ?? "",
    purchaseTimeline: c.purchaseTimeline ?? "",
    purchaseNotes: c.notes ?? "",
  };
}

export function offerModelFrom(offer: DonationOffer | null | undefined): OfferModel {
  const item = offer?.itemDetails;
  // The purchase plan IS hydrated now that the commitment rides on the offer
  // DTO. It is read separately from `itemDetails` on purpose: the two are
  // different tables with different lifecycles, and a Flow B draft can easily
  // have a saved plan and no item row yet — which is exactly why the early
  // return below carries it too, rather than falling through to empty.
  const plan = purchasePlanFrom(offer);

  if (!item) return { ...emptyOfferModel, ...(plan ?? {}), photos: photosFromOffer(offer) };

  const rawDefects = item.knownDefects ?? "";
  const hasDefects = rawDefects.trim() !== "" && rawDefects.trim().toLowerCase() !== "none";

  return {
    // Empty model first as the floor, then the saved purchase plan over it.
    // The spread also means the next field added to OfferModel cannot break
    // this function the way the six purchase fields did — they were added to
    // the type and to emptyOfferModel but missed here, and only `tsc` caught it.
    ...emptyOfferModel,
    ...(plan ?? {}),
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
export function firstIncompleteOfferStep(
  model: OfferModel,
  flowType?: string | null,
): OfferStep {
  const purchase = isPurchaseFlow(flowType);

  if (purchase) {
    if (!model.purchaseTimeline) return "purchasePlan";
  } else if (uploadedOfferPhotos(model.photos).length < MIN_OFFER_PHOTOS) {
    return "photos";
  }

  const qty = Number(model.quantity);
  if (!Number.isInteger(qty) || qty < 1) return "details";

  // Condition is not a step in the purchase flow, so it can never be the answer
  // — returning it would drop the donor onto a step the wizard does not render.
  if (!purchase) {
    if (!model.condition) return "condition";
    if (model.hasKnownDefects && model.knownDefects.trim().length < 3) return "condition";
  }

  if (!model.pickupCity.trim()) return "pickup";

  return "review";
}
