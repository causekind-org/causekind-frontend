/**
 * NGO Registration — data model, step definitions and document catalogue.
 *
 * This module is intentionally free of JSX so it can be imported from both
 * server and client components without "use client" hoisting.
 */

// ── Steps ──────────────────────────────────────────────────────────────────────

export const NGO_STEPS = [
  "org-details",
  "legal-documents",
  "authorized-rep",
  "org-photos",
  "review-submit",
  "email-verification",
] as const;

export type NGOStep = (typeof NGO_STEPS)[number];

export const NGO_STEP_LABELS: Record<NGOStep, string> = {
  "org-details": "Organization",
  "legal-documents": "Documents",
  "authorized-rep": "Representative",
  "org-photos": "Photos",
  "review-submit": "Review",
  "email-verification": "Verify Email",
};

export interface NGOProgressInfo {
  completedCount: number;
  totalSteps: number;
  percent: number;
  currentStep: NGOStep;
}

// ── Legal structure ────────────────────────────────────────────────────────────

export type LegalStructure = "trust" | "society" | "section8" | "";

export interface LegalStructureInfo {
  id: LegalStructure;
  label: string;
  icon: string;
  description: string;
}

export const LEGAL_STRUCTURES: LegalStructureInfo[] = [
  {
    id: "trust",
    label: "Trust",
    icon: "⚖️",
    description: "Registered under Indian Trusts Act or state-specific trust laws",
  },
  {
    id: "society",
    label: "Society",
    icon: "🏛️",
    description: "Registered under Societies Registration Act 1860",
  },
  {
    id: "section8",
    label: "Section 8 Company",
    icon: "📋",
    description: "Licensed company under Companies Act 2013",
  },
];

// ── Document catalogue ─────────────────────────────────────────────────────────

export type DocCategory = "must-have" | "supporting";

export interface DocDefinition {
  id: string;
  label: string;
  category: DocCategory;
}

const TRUST_DOCS: DocDefinition[] = [
  { id: "trust-reg-cert", label: "Trust Registration Certificate", category: "must-have" },
  { id: "trust-deed", label: "Registered Trust Deed", category: "must-have" },
  { id: "trust-pan", label: "Trust PAN Card", category: "must-have" },
  { id: "trustee-info", label: "Current Trustee / Office-Bearer Info", category: "must-have" },
];

const SOCIETY_DOCS: DocDefinition[] = [
  { id: "society-reg-cert", label: "Society Registration Certificate", category: "must-have" },
  { id: "society-moa", label: "Memorandum of Association (MOA)", category: "must-have" },
  { id: "society-bye-laws", label: "Rules & Bye-laws", category: "must-have" },
  { id: "society-pan", label: "Society PAN Card", category: "must-have" },
  { id: "governing-body", label: "Current Governing Body Info", category: "must-have" },
];

const SECTION8_DOCS: DocDefinition[] = [
  { id: "coi", label: "Certificate of Incorporation", category: "must-have" },
  { id: "cin", label: "CIN (Corporate Identity Number)", category: "must-have" },
  { id: "s8-moa", label: "Memorandum of Association (MOA)", category: "must-have" },
  { id: "s8-aoa", label: "Articles of Association (AOA)", category: "must-have" },
  { id: "company-pan", label: "Company PAN Card", category: "must-have" },
  { id: "director-info", label: "Current Director Info", category: "must-have" },
];

export function getDocsForStructure(structure: LegalStructure): DocDefinition[] {
  switch (structure) {
    case "trust":
      return TRUST_DOCS;
    case "society":
      return SOCIETY_DOCS;
    case "section8":
      return SECTION8_DOCS;
    default:
      return [];
  }
}

// ── Form state ─────────────────────────────────────────────────────────────────

export interface UploadedFile {
  name: string;
  documentId?: number;
  photoId?: number;
  s3Key?: string;
  s3Url?: string;
  size?: number;
  mimeType?: string;
  /** true when the user used "Mark as uploaded" demo shortcut */
  demo?: boolean;
  /** Set when the server refused this file on submit; the user must re-upload it. */
  rejectedReason?: string;
}

export interface NGOFormState {
  // Step 1 — Organization Details
  organizationName: string;
  legalStructure: LegalStructure;
  registrationNumber: string;
  registeredOfficeAddress: string;
  yearOfEstablishment: string;

  // Step 2 — Legal Documents (keyed by DocDefinition.id)
  documents: Record<string, UploadedFile | null>;

  // Step 3 — Authorized Representative
  representativeName: string;
  designation: string;
  mobileNumber: string;
  officialEmail: string;
  authorizationLetter: UploadedFile | null;

  // Step 4 — Photos
  logo: UploadedFile | null;
  officePhoto: UploadedFile | null;
  activityPhotos: (UploadedFile | null)[];

  // Step 5 — Confirmation
  confirmationChecked: boolean;

  // Step 6 — OTP (frontend-only, accepts any 6 digits)
  emailOtp: string;

  // Post-submit
  applicationId: string;
  submittedAt: string;
}

export const INITIAL_NGO_FORM: NGOFormState = {
  organizationName: "",
  legalStructure: "",
  registrationNumber: "",
  registeredOfficeAddress: "",
  yearOfEstablishment: "",
  documents: {},
  representativeName: "",
  designation: "",
  mobileNumber: "",
  officialEmail: "",
  authorizationLetter: null,
  logo: null,
  officePhoto: null,
  activityPhotos: [null, null, null],
  confirmationChecked: false,
  emailOtp: "",
  applicationId: "",
  submittedAt: "",
};

// ── Designation options (Step 3 dropdown) ─────────────────────────────────────

export const DESIGNATIONS = [
  "Founder / Trustee",
  "Executive Director",
  "CEO",
  "Secretary",
  "Managing Trustee",
  "Chairperson",
  "Director",
  "Programme Manager",
  "Other",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * @deprecated No longer used in the production registration flow.
 *
 * The canonical application ID is issued by the backend at POST /api/v1/ngo-registration/submit
 * and stored directly into `NGOFormState.applicationId` from the API response.
 *
 * This function is retained only because the test file `ngoRegistrationModel.test.ts` imports
 * it. Do NOT call this in any component or wizard step — the value it produces will differ
 * from the backend-issued ID and must not be shown to users.
 */
export function generateApplicationId(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `CK-NGO-2026-${num.toString().padStart(4, "0")}`;
}

export function formatSubmissionTime(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Human-readable label for the legal structure value. */
export function legalStructureLabel(s: LegalStructure): string {
  return LEGAL_STRUCTURES.find((x) => x.id === s)?.label ?? "";
}

// ── Temporary Demo Mode Configuration ──────────────────────────────────────────
// TEMPORARY: Demo Mode — simulates submit and OTP in the browser without calling the
// backend. Off by default, and only ever on in a development build: a production
// bundle with the flag set by mistake would otherwise "accept" applications that
// never reach the server.
export const IS_NGO_DEMO_MODE =
  process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_NGO_DEMO_MODE === "true";

let nextDemoDocId = -1;
/** Returns an incrementing negative document ID for demo mode uploads. */
export function getNextDemoDocId(): number {
  return nextDemoDocId--;
}

let nextDemoPhotoId = -101;
/** Returns an incrementing negative photo ID for demo mode uploads. */
export function getNextDemoPhotoId(): number {
  return nextDemoPhotoId--;
}

// ── Step Navigation & Readiness Checklist ─────────────────────────────────────

export const NGO_STEP_FULL_TITLES: Record<NGOStep, string> = {
  "org-details": "Organization Details",
  "legal-documents": "Legal Documents",
  "authorized-rep": "Authorized Representative",
  "org-photos": "Organization Photos",
  "review-submit": "Review & Submit",
  "email-verification": "Email Verification",
};

/**
 * Text value of a form field. Saved drafts and server applications can carry numbers
 * (year, registration number, mobile) where the form keeps strings, so never call
 * string methods on the raw value.
 */
export function fieldText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

/**
 * Returns an array of human-readable missing item descriptions for a given step.
 * Returns an empty array if the step is fully completed.
 */
export function getNgoStillNeededItems(step: NGOStep, data: NGOFormState): string[] {
  const missing: string[] = [];
  switch (step) {
    case "org-details":
      if (!fieldText(data.organizationName)) missing.push("Organization name");
      if (!data.legalStructure) missing.push("Legal structure (Trust, Society, or Section 8)");
      if (!fieldText(data.registrationNumber)) missing.push("Registration number");
      if (!fieldText(data.registeredOfficeAddress)) missing.push("Registered office address");
      if (!fieldText(data.yearOfEstablishment) || !/^(18|19|20)\d{2}$/.test(fieldText(data.yearOfEstablishment))) missing.push("Valid year of establishment (4 digits)");
      break;
    case "legal-documents":
      if (!data.legalStructure) {
        missing.push("Select legal structure in Step 1 first");
      } else {
        const mustHaves = getDocsForStructure(data.legalStructure).filter((d) => d.category === "must-have");
        for (const doc of mustHaves) {
          if (!data.documents?.[doc.id]) {
            missing.push(doc.label);
          }
        }
      }
      break;
    case "authorized-rep":
      if (!fieldText(data.representativeName)) missing.push("Representative full name");
      if (!data.designation) missing.push("Designation");
      if (!fieldText(data.mobileNumber) || !/^\d{10}$/.test(fieldText(data.mobileNumber).replace(/\D/g, "").slice(-10))) missing.push("10-digit mobile number");
      if (!fieldText(data.officialEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldText(data.officialEmail))) missing.push("Valid official email address");
      if (!data.authorizationLetter) missing.push("Authorization letter");
      break;
    case "org-photos":
      if (!data.logo) missing.push("Official organization logo");
      if (!data.officePhoto) missing.push("Office premises photo");
      break;
    case "review-submit":
      if (!data.confirmationChecked) missing.push("Declaration & legal verification confirmation");
      break;
    case "email-verification":
      if (!data.emailOtp || data.emailOtp.length < 6) missing.push("6-digit verification code");
      break;
  }
  return missing;
}

export function isNgoStepComplete(step: NGOStep, data: NGOFormState): boolean {
  return getNgoStillNeededItems(step, data).length === 0;
}

export interface CalculatedNgoProgress {
  completedCount: number;
  totalSteps: number;
  percent: number;
  completedSteps: Set<NGOStep>;
  nextIncompleteStep: NGOStep | null;
  nextIncompleteLabel?: string;
  isComplete: boolean;
}

export function calculateNgoProgress(data: NGOFormState): CalculatedNgoProgress {
  const completedSteps = new Set<NGOStep>();
  for (const s of NGO_STEPS) {
    if (isNgoStepComplete(s, data)) {
      completedSteps.add(s);
    }
  }
  const completedCount = completedSteps.size;
  const totalSteps = NGO_STEPS.length;
  const percent = Math.min(100, Math.round((completedCount / totalSteps) * 100));
  const nextIncompleteStep = NGO_STEPS.find((s) => !completedSteps.has(s)) ?? null;
  const nextIncompleteLabel = nextIncompleteStep ? NGO_STEP_FULL_TITLES[nextIncompleteStep] : undefined;

  return {
    completedCount,
    totalSteps,
    percent,
    completedSteps,
    nextIncompleteStep,
    nextIncompleteLabel,
    isComplete: completedCount === totalSteps,
  };
}

/**
 * Fills the organization name, mobile and official email from the signup account
 * (NGO signups store the organization name as the account's full name). Only empty
 * fields are filled, so nothing the NGO typed is replaced; fields in {@code skip}
 * (items a reviewer flagged for correction) are left as they are.
 */
export function prefillNgoFormWithUser(
  form: NGOFormState,
  user: { fullName?: string | null; phone?: string | null; email?: string | null } | null | undefined,
  skip: Iterable<string> = [],
): NGOFormState {
  if (!user) return form;
  const skipped = new Set(skip);
  const fill = (key: "organizationName" | "mobileNumber" | "officialEmail", value: string | null | undefined) =>
    skipped.has(key) || fieldText(form[key]) ? form[key] : fieldText(value);
  return {
    ...form,
    organizationName: fill("organizationName", user.fullName),
    mobileNumber: fill("mobileNumber", user.phone),
    officialEmail: fill("officialEmail", user.email),
  };
}

// ── Per-item corrections ───────────────────────────────────────────────────────

const CORRECTION_FIELD_LABELS: Record<string, string> = {
  organizationName: "Organization name",
  legalStructure: "Legal structure",
  registrationNumber: "Registration number",
  registeredOfficeAddress: "Registered office address",
  yearOfEstablishment: "Year of establishment",
  representativeName: "Representative name",
  designation: "Designation",
  mobileNumber: "Mobile number",
  officialEmail: "Official email",
  authorizationLetter: "Authorization letter",
  logo: "Organization logo",
  officePhoto: "Office photo",
};

/** Readable name of a correction item key ("documents.trust-deed" → "Registered Trust Deed"). */
export function correctionFieldLabel(field: string): string {
  if (CORRECTION_FIELD_LABELS[field]) return CORRECTION_FIELD_LABELS[field];
  if (field.startsWith("activityPhotos.")) return `Activity photo ${Number(field.slice(15)) + 1}`;
  if (field.startsWith("documents.")) {
    const id = field.slice(10);
    return [...TRUST_DOCS, ...SOCIETY_DOCS, ...SECTION8_DOCS].find((d) => d.id === id)?.label ?? id;
  }
  return field;
}

/** The wizard step that holds a correction item. */
export function correctionFieldStep(field: string): NGOStep {
  if (["organizationName", "legalStructure", "registrationNumber", "registeredOfficeAddress", "yearOfEstablishment"].includes(field))
    return "org-details";
  if (field.startsWith("documents.")) return "legal-documents";
  if (["representativeName", "designation", "mobileNumber", "officialEmail", "authorizationLetter"].includes(field))
    return "authorized-rep";
  return "org-photos";
}

/** The first step (in wizard order) that has a flagged item, or null when nothing is flagged. */
export function firstCorrectionStep(fields: Iterable<string>): NGOStep | null {
  const steps = new Set([...fields].map(correctionFieldStep));
  return NGO_STEPS.find((s) => steps.has(s)) ?? null;
}
