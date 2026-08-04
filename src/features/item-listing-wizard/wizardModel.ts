import type { ItemListing } from "@/lib/api";
import { DONOR_LISTING_CATEGORIES, ITEM_SUBCATEGORIES } from "@/lib/categoryVisuals";
import { parseCity } from "./wizardLocation";

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
 * Conditional-field rules.
 *
 * <p>"Tools & Equipment" was in both lists but is NOT a donor listing category
 * (see DONOR_LISTING_CATEGORIES) — it was dead configuration that could never
 * match, so it is gone. Every entry below is verified against the real category
 * list; a typo here silently disables a required field.
 */
export const NEEDS_WORKING_STATUS = ["Electronics", "Household", "Medical aid", "Sports"] as const;
export const NEEDS_DIMENSIONS = ["Furniture", "Clothing", "Medical aid"] as const;

export function needsWorkingStatus(category: string): boolean {
  return (NEEDS_WORKING_STATUS as readonly string[]).includes(category);
}
export function needsDimensions(category: string): boolean {
  return (NEEDS_DIMENSIONS as readonly string[]).includes(category);
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

export type PhotoStatus = "pending" | "uploading" | "uploaded" | "failed";

export type WizardPhoto = {
  /** Stable client id — never the array index, which reorders when main changes. */
  id: string;
  /** Object URL for instant preview; null once it is a server-hydrated photo. */
  localUrl: string | null;
  /** S3 URL, present only once uploaded. */
  remoteUrl: string | null;
  status: PhotoStatus;
  /** Retained so a failed upload can be retried without re-picking the file. */
  file: File | null;
  error: string | null;
};

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
