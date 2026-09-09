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
  { id: "trust-pan", label: "Trust PAN Card", category: "supporting" },
  { id: "trustee-info", label: "Current Trustee / Office-Bearer Info", category: "supporting" },
];

const SOCIETY_DOCS: DocDefinition[] = [
  { id: "society-reg-cert", label: "Society Registration Certificate", category: "must-have" },
  { id: "society-moa", label: "Memorandum of Association (MOA)", category: "must-have" },
  { id: "society-bye-laws", label: "Rules & Bye-laws", category: "must-have" },
  { id: "society-pan", label: "Society PAN Card", category: "supporting" },
  { id: "governing-body", label: "Current Governing Body Info", category: "supporting" },
];

const SECTION8_DOCS: DocDefinition[] = [
  { id: "coi", label: "Certificate of Incorporation", category: "must-have" },
  { id: "cin", label: "CIN (Corporate Identity Number)", category: "must-have" },
  { id: "s8-moa", label: "Memorandum of Association (MOA)", category: "must-have" },
  { id: "s8-aoa", label: "Articles of Association (AOA)", category: "must-have" },
  { id: "company-pan", label: "Company PAN Card", category: "supporting" },
  { id: "director-info", label: "Current Director Info", category: "supporting" },
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
// TEMPORARY: Demo Mode — bypasses S3 uploads and allows instant demo testing. Off by default.
export const IS_NGO_DEMO_MODE = process.env.NEXT_PUBLIC_NGO_DEMO_MODE === "true";

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

