import type { ItemListing } from "@/lib/api";
import { DONOR_LISTING_CATEGORIES, ITEM_SUBCATEGORIES } from "@/lib/categoryVisuals";
import { parseCity } from "./wizardLocation";
import { fieldsFor } from "./wizardFields";

/**
 * The single typed form model for creating, resuming and resubmitting a listing.
 * Create and edit previously kept two copies of this shape and two validators,
 * which is why they had already drifted.
 */

export const WIZARD_STEPS = ["photos", "basics", "condition", "location", "review"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export function stepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

export type WizardMode = "create" | "draft" | "needs-info";

export const CATEGORIES = DONOR_LISTING_CATEGORIES;
export const SUBCATEGORIES = ITEM_SUBCATEGORIES;

export const CONDITIONS = ["Unused", "Like New", "Good", "Fair", "Needs Minor Repair", "Not Working"];
export const AGE_RANGES = ["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years", "Unknown"];
export const WORKING_STATUSES = ["Fully working", "Partially working", "Not working"];

/**
 * Normalises a working status arriving from the vision service.
 *
 * <p>`ListingVisionService` whitelists `WORKING` / `PARTIALLY_WORKING` /
 * `NOT_WORKING`, while this form (and the value the donor actually submits) uses
 * title case. Assigning the raw value straight through put a string in the model
 * that no `<option>` matched — the select rendered **blank** — and that the zod
 * rule then rejected, so the donor saw an empty required field carrying an error
 * about a value the AI had in fact supplied.
 *
 * <p>Normalising on receipt rather than changing the backend enum: the column is
 * a free-form String already holding title-case values written by this form, so
 * rewriting the enum would leave old rows inconsistent with new ones.
 *
 * <p>Returns `""` for anything unrecognised, so an unknown value is dropped
 * rather than smuggled past the validator.
 */
export function normalizeWorkingStatus(raw: string | null | undefined): string {
  if (!raw) return "";
  const value = raw.trim();
  if (WORKING_STATUSES.includes(value)) return value;

  switch (value.toUpperCase().replace(/[\s-]+/g, "_")) {
    case "WORKING":
    case "FULLY_WORKING":
      return "Fully working";
    case "PARTIALLY_WORKING":
    case "PARTIAL":
      return "Partially working";
    case "NOT_WORKING":
    case "BROKEN":
      return "Not working";
    default:
      return "";
  }
}

/**
 * Conditional-field rules.
 *
 * <p>"Tools & Equipment" was in both lists but is NOT a donor listing category
 * (see DONOR_LISTING_CATEGORIES) — it was dead configuration that could never
 * match, so it is gone. Every entry below is verified against the real category
 * list; a typo here silently disables a required field.
 */
/**
 * Both now delegate to the per-category manifest (`wizardFields.ts`) so there is
 * one source of truth. Signatures are unchanged, which is why every existing
 * caller keeps working.
 *
 * <p>`subcategory` is optional here because most callers only know the category;
 * omitting it just means subcategory overrides do not apply, which is the safe
 * direction (a field is shown by the category rule or not at all).
 */
export function needsWorkingStatus(category: string, subcategory = ""): boolean {
  return fieldsFor(category, subcategory).visible("workingStatus");
}
export function needsDimensions(category: string, subcategory = ""): boolean {
  return fieldsFor(category, subcategory).visible("dimensions");
}
export function subcategoriesFor(category: string): string[] {
  return SUBCATEGORIES[category] ?? [];
}
export function isSubcategoryValid(category: string, subcategory: string): boolean {
  return !!subcategory && subcategoriesFor(category).includes(subcategory);
}

/**
 * The eight declaration texts, verbatim from the previous implementation.
 * Legal/process copy — do not reword. Grouped only for readability; the backend
 * stores a single boolean, so there is no eight-flag model to mirror.
 */
export const DECLARATION_GROUPS = [
  {
    key: "ownership",
    items: [
      "I own this item or am authorized to donate it.",
      "The description and photographs are accurate.",
      "I have disclosed all known defects.",
    ],
  },
  {
    key: "safety",
    items: [
      "The item does not contain prohibited or illegal material.",
      "I will not request money from the recipient.",
    ],
  },
  {
    key: "screening",
    items: [
      "I understand that CauseKind may reject, pause or remove the listing.",
      "I will update CauseKind if the item becomes unavailable or its condition changes.",
      "I consent to screening, matching and processing for the donation journey.",
    ],
  },
] as const;

// Photo types now live in the wizard kit so both wizards share one definition.
// Re-exported here so every existing `from "./wizardModel"` import keeps working.
export type { PhotoStatus, WizardPhoto } from "@/features/wizard-kit/types";
import type { WizardPhoto } from "@/features/wizard-kit/types";

export type WizardModel = {
  photos: WizardPhoto[];
  category: string;
  subcategory: string;
  title: string;
  quantity: number;
  brand: string;
  model: string;
  approximateAge: string;
  condition: string;
  workingStatus: string;
  noDefects: boolean;
  knownDefects: string;
  accessoriesIncluded: string;
  dimensions: string;
  approximateWeight: string;
  description: string;
  countryIso: string;
  stateIso: string;
  city: string;
  locality: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  declarationsConfirmed: boolean;
};

export const emptyModel: WizardModel = {
  photos: [],
  category: "", subcategory: "", title: "", quantity: 1, brand: "", model: "",
  approximateAge: "", condition: "", workingStatus: "",
  noDefects: false, knownDefects: "", accessoriesIncluded: "",
  dimensions: "", approximateWeight: "", description: "",
  countryIso: "IN", stateIso: "", city: "", locality: "", pincode: "",
  latitude: undefined, longitude: undefined,
  declarationsConfirmed: false,
};

/** Server photo columns are `imageUrl` + a `|`-joined `imageUrls` tail. */
export function photosFromListing(listing: ItemListing): WizardPhoto[] {
  const urls = [
    listing.imageUrl ?? "",
    ...(listing.imageUrls ? listing.imageUrls.split("|") : []),
  ].map(u => u.trim()).filter(Boolean);

  return urls.map((url, i) => ({
    id: `server-${i}-${url.slice(-24)}`,
    localUrl: null,
    remoteUrl: url,
    status: "uploaded" as const,
    file: null,
    error: null,
  }));
}

/**
 * Hydrates a saved DRAFT / NEEDS_INFORMATION listing into the form model.
 *
 * <p>`declarationsConfirmed` deliberately starts **false** even when the server
 * says true: the donor is about to review and possibly change the listing, and a
 * stale server `true` must not let changed content skip re-confirmation.
 */
export function modelFromListing(listing: ItemListing): WizardModel {
  const loc = parseCity(listing.city);
  const category = listing.category ?? "";
  const subcategory = listing.subcategory ?? "";

  return {
    ...emptyModel,
    photos: photosFromListing(listing),
    category,
    // Drop a subcategory that no longer belongs to its category rather than
    // carrying an impossible pair into review.
    subcategory: isSubcategoryValid(category, subcategory) ? subcategory : "",
    title: listing.title ?? "",
    quantity: listing.quantity ?? 1,
    brand: listing.brand ?? "",
    model: listing.model ?? "",
    approximateAge: listing.approximateAge ?? "",
    condition: listing.condition ?? "",
    workingStatus: needsWorkingStatus(category) ? (listing.workingStatus ?? "") : "",
    noDefects: listing.knownDefects === "NONE",
    knownDefects: listing.knownDefects === "NONE" ? "" : (listing.knownDefects ?? ""),
    accessoriesIncluded: listing.accessoriesIncluded ?? "",
    dimensions: needsDimensions(category) ? (listing.dimensions ?? "") : "",
    approximateWeight: needsDimensions(category) ? (listing.approximateWeight ?? "") : "",
    description: listing.description ?? "",
    countryIso: loc.countryIso || "IN",
    stateIso: loc.stateIso,
    city: loc.city,
    locality: listing.locality ?? "",
    pincode: listing.pincode ?? "",
    latitude: listing.latitude ?? undefined,
    longitude: listing.longitude ?? undefined,
    declarationsConfirmed: false,
  };
}

/** Uploaded S3 URLs in display order — the only photos that may be submitted. */
export function uploadedUrls(photos: WizardPhoto[]): string[] {
  return photos.filter(p => p.status === "uploaded" && p.remoteUrl).map(p => p.remoteUrl!);
}
