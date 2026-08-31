import { z } from "zod";
import {
  CATEGORIES, CONDITIONS, AGE_RANGES, WORKING_STATUSES,
  needsWorkingStatus, needsDimensions, subcategoriesFor,
  type WizardStep,
} from "./wizardModel";
import { isValidPostalCode } from "./wizardLocation";

/**
 * One validation source for every viewport, both entry points and every step.
 *
 * <p>Conditional rules live in `superRefine` rather than in the field shapes so
 * a rule can see the whole model — "working status is required *for these
 * categories*" cannot be expressed on the field alone, and expressing it twice
 * (once for create, once for edit) is what let the two pages drift.
 */

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 5;

const photoSchema = z.object({
  id: z.string(),
  localUrl: z.string().nullable(),
  remoteUrl: z.string().nullable(),
  status: z.enum(["pending", "uploading", "uploaded", "failed"]),
  file: z.any().nullable(),
  error: z.string().nullable(),
  mediaId: z.number().nullable().optional(),
  moderationStatus: z.enum([
    "UPLOADING", "QUARANTINED", "MODERATING_VISUAL",
    "APPROVED", "REJECTED", "REVIEW_REQUIRED", "FAILED", "DELETED",
  ]).nullable().optional(),
  moderationCode: z.string().nullable().optional(),
});

export const wizardSchema = z.object({
  photos: z.array(photoSchema),

  category: z.string().min(1, "Choose a category"),
  subcategory: z.string().min(1, "Choose a subcategory"),
  title: z.string().trim().min(1, "Give your item a title").max(120, "Keep the title under 120 characters"),
  quantity: z.coerce.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  brand: z.string().max(80, "Keep the brand under 80 characters"),
  model: z.string().max(80, "Keep the model under 80 characters"),

  approximateAge: z.string().min(1, "Choose an approximate age"),
  condition: z.string().min(1, "Choose the condition"),
  workingStatus: z.string(),
  noDefects: z.boolean(),
  knownDefects: z.string().max(600, "Keep defects under 600 characters"),
  accessoriesIncluded: z.string().max(300, "Keep accessories under 300 characters"),
  dimensions: z.string().max(120, "Keep dimensions under 120 characters"),
  approximateWeight: z.string().max(60, "Keep the weight under 60 characters"),
  description: z.string().trim()
    .min(30, "Describe the item in at least 30 characters")
    .max(2000, "Keep the description under 2000 characters"),

  countryIso: z.string().min(1, "Choose a country"),
  stateIso: z.string().min(1, "Choose a state or province"),
  city: z.string().trim().min(1, "Choose a city"),
  locality: z.string().max(120, "Keep the locality under 120 characters"),
  pincode: z.string().trim().min(1, "Enter a PIN or postal code"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  declarationsConfirmed: z.boolean(),
})
  .superRefine((v, ctx) => {
    /*
      ── Photos ──────────────────────────────────────────────────────────────

      Only a server-APPROVED photo counts. The rule this replaces counted
      `uploaded`, `uploading` **and** `pending` — so two files chosen from a
      picker satisfied a two-photo requirement before either had reached the
      server, let alone been screened, and the final serialisation then sent
      whatever URLs happened to exist. Upload state and screening verdict are
      different questions: a photo can be fully uploaded and rejected.

      The server enforces this independently and is the authority. This exists
      so the donor is told the truth before pressing a button that would fail,
      not as the protection itself.
    */
    const approved = v.photos.filter(p => p.moderationStatus === "APPROVED");
    if (approved.length < MIN_PHOTOS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["photos"],
        message: `Add at least ${MIN_PHOTOS} photos and wait for them to be checked`,
      });
    }
    if (v.photos.length > MAX_PHOTOS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["photos"], message: `You can add up to ${MAX_PHOTOS} photos` });
    }

    /*
      Every attached photo must be resolved, not just two of them.

      Without this a donor could leave a rejected third photo attached to a
      listing that two approved photos had already unlocked. Expressed as
      "attached and not approved" rather than by listing the blocking states, so
      a state added later blocks by default instead of quietly becoming
      submittable.
    */
    const unresolved = v.photos.filter(
      p => p.moderationStatus != null
        && p.moderationStatus !== "APPROVED"
        && p.moderationStatus !== "DELETED",
    );
    if (unresolved.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["photos"],
        message: "Every photo has to finish checking. Remove or replace the ones that can't be used.",
      });
    }

    if (v.photos.some(p => p.status === "failed")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["photos"], message: "Retry or remove the photos that failed to upload" });
    }

    // ── Category / subcategory must be a real, compatible pair ──────────────
    if (v.category && !CATEGORIES.includes(v.category)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["category"], message: "Choose a category from the list" });
    }
    if (v.category && v.subcategory && !subcategoriesFor(v.category).includes(v.subcategory)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subcategory"], message: "Choose a subcategory for this category" });
    }

    if (v.condition && !CONDITIONS.includes(v.condition)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["condition"], message: "Choose a condition from the list" });
    }
    if (v.approximateAge && !AGE_RANGES.includes(v.approximateAge)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["approximateAge"], message: "Choose an age from the list" });
    }

    // ── Working status: required only where the manifest asks for it ────────
    if (needsWorkingStatus(v.category, v.subcategory)) {
      if (!v.workingStatus) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["workingStatus"], message: "Tell us whether it works" });
      } else if (!WORKING_STATUSES.includes(v.workingStatus)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["workingStatus"], message: "Choose a working status from the list" });
      }
    }

    // ── Defects: either the checkbox or a description, never neither ────────
    if (!v.noDefects && !v.knownDefects.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["knownDefects"],
        message: "Describe the defects, or tick 'No known defects'",
      });
    }

    // ── Declarations ────────────────────────────────────────────────────────
    // Owned by the review step, so this never blocks an earlier Continue.
    if (!v.declarationsConfirmed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["declarationsConfirmed"],
        message: "Please confirm you have read and agree to all declarations",
      });
    }

    // ── Postal code, per country ────────────────────────────────────────────
    if (v.pincode && !isValidPostalCode(v.pincode, v.countryIso)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom, path: ["pincode"],
        message: v.countryIso.toUpperCase() === "IN"
          ? "An Indian PIN code is exactly 6 digits"
          : "Enter a valid postal code (3-10 letters, numbers, spaces or hyphens)",
      });
    }
  });

export type WizardValues = z.input<typeof wizardSchema>;

/**
 * Which model fields each step owns. Continue validates only these, so an
 * incomplete later step can never block an earlier one — and the final submit
 * re-runs the whole schema regardless.
 */
export const STEP_FIELDS: Record<WizardStep, readonly (keyof WizardValues)[]> = {
  photos: ["photos"],
  basics: ["category", "subcategory", "title", "quantity", "brand", "model"],
  condition: [
    "approximateAge", "condition", "workingStatus", "noDefects", "knownDefects",
    "accessoriesIncluded", "dimensions", "approximateWeight", "description",
  ],
  location: ["countryIso", "stateIso", "city", "locality", "pincode"],
  review: ["declarationsConfirmed"],
};

/**
 * Validates one step by running the full schema and keeping only the issues that
 * belong to that step. Running the whole schema is deliberate: a cross-field rule
 * such as working-status-by-category has to see fields the step does not own.
 */
export function validateStep(step: WizardStep, values: WizardValues): Record<string, string> {
  const result = wizardSchema.safeParse(values);
  if (result.success) return {};

  const owned = new Set<string>(STEP_FIELDS[step] as readonly string[]);
  const errors: Record<string, string> = {};

  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!owned.has(key)) continue;
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Full-model validation for the final submit. */
export function validateAll(values: WizardValues): Record<string, string> {
  const result = wizardSchema.safeParse(values);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** The step a given field lives on — used to route review "Edit" and error jumps. */
export function stepForField(field: string): WizardStep {
  for (const [step, fields] of Object.entries(STEP_FIELDS)) {
    if ((fields as readonly string[]).includes(field)) return step as WizardStep;
  }
  return "review";
}
