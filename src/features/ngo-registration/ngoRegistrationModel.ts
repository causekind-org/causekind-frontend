/**
 * NGO Registration — data model, step definitions and document catalogue.
 *
 * This module is intentionally free of JSX so it can be imported from both
 * server and client components without "use client" hoisting.
 */

import { formatIST } from "@/lib/formatIST";

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
  /** Short help shown under the label. */
  hint?: string;
}

/** Step 1: the organization's PAN card (same key for every structure). */
export const PAN_DOC: DocDefinition = {
  id: "pan",
  label: "PAN card",
  category: "must-have",
  hint: "The organization's PAN card or e-PAN",
};

/** Step 1: the registration certificate, named by legal structure. */
export function getRegistrationCertificateDoc(structure: LegalStructure): DocDefinition | null {
  switch (structure) {
    case "trust":
      return { id: "trust-reg-cert", label: "Trust Registration Certificate", category: "must-have" };
    case "society":
      return { id: "society-reg-cert", label: "Society Registration Certificate", category: "must-have" };
    case "section8":
      return { id: "coi", label: "Certificate of Incorporation (MCA)", category: "must-have" };
    default:
      return null;
  }
}

const TRUST_DOCS: DocDefinition[] = [
  { id: "trust-deed", label: "Registered Trust Deed", category: "must-have" },
];

const SOCIETY_DOCS: DocDefinition[] = [
  { id: "society-moa", label: "Memorandum of Association (MoA)", category: "must-have" },
  { id: "society-bye-laws", label: "Rules & Bye-laws", category: "must-have" },
];

const SECTION8_DOCS: DocDefinition[] = [
  { id: "s8-moa", label: "MoA and AoA", category: "must-have", hint: "Memorandum and Articles of Association" },
  { id: "s8-licence", label: "Section 8 Licence (Form INC-12)", category: "must-have" },
];

/** Asked of every structure in step 2 (after the structure's own documents). */
export const COMMON_DOCS: DocDefinition[] = [
  {
    id: "bank-proof",
    label: "Bank account proof",
    category: "must-have",
    hint: "Cancelled cheque or passbook first page in the organization's own name",
  },
  { id: "cert-12a", label: "12A certificate", category: "must-have" },
  { id: "cert-80g", label: "80G certificate", category: "supporting" },
  { id: "darpan", label: "NGO Darpan registration", category: "supporting" },
  { id: "financials", label: "Latest audited financial statements or ITR", category: "supporting" },
];

/** Step 2 documents for a structure: its own documents, then the common ones. */
export function getDocsForStructure(structure: LegalStructure): DocDefinition[] {
  switch (structure) {
    case "trust":
      return [...TRUST_DOCS, ...COMMON_DOCS];
    case "society":
      return [...SOCIETY_DOCS, ...COMMON_DOCS];
    case "section8":
      return [...SECTION8_DOCS, ...COMMON_DOCS];
    default:
      return [];
  }
}

/** Every document key the wizard sends for a structure (steps 1 and 2). */
export function allDocumentIdsForStructure(structure: LegalStructure): string[] {
  const cert = getRegistrationCertificateDoc(structure);
  return [PAN_DOC.id, ...(cert ? [cert.id] : []), ...getDocsForStructure(structure).map((d) => d.id)];
}

/** Documents kept when the legal structure changes: the PAN card and the common step 2 documents. */
export const STRUCTURE_INDEPENDENT_DOC_IDS = [PAN_DOC.id, ...COMMON_DOCS.map((d) => d.id)];

/** Documents of applications submitted before the current wizard (shown by name only). */
const OLDER_DOC_LABELS: Record<string, string> = {
  "trust-pan": "Trust PAN Card",
  "society-pan": "Society PAN Card",
  "company-pan": "Company PAN Card",
  "trustee-info": "Current Trustee / Office-Bearer Info",
  "governing-body": "Current Governing Body Info",
  cin: "CIN (Corporate Identity Number)",
  "s8-aoa": "Articles of Association (AOA)",
};

/** Readable name of any document key, current or older. */
export function documentLabel(id: string): string {
  if (id === PAN_DOC.id) return PAN_DOC.label;
  for (const s of ["trust", "society", "section8"] as const) {
    const cert = getRegistrationCertificateDoc(s);
    if (cert?.id === id) return cert.label;
    const doc = getDocsForStructure(s).find((d) => d.id === id);
    if (doc) return doc.label;
  }
  return OLDER_DOC_LABELS[id] ?? id;
}

/** Drafts saved before the current wizard keep the PAN card under a per-structure key. */
export function normalizeDraftDocuments<T>(docs: Record<string, T | null>): Record<string, T | null> {
  const out: Record<string, T | null> = { ...docs };
  for (const legacy of ["trust-pan", "society-pan", "company-pan"]) {
    if (legacy in out) {
      const file = out[legacy];
      delete out[legacy];
      if (file && !out[PAN_DOC.id]) out[PAN_DOC.id] = file;
    }
  }
  return out;
}

/** Step 3: what the authorization document must be, by structure. */
export function authorizationDocumentLabel(structure: LegalStructure): string {
  switch (structure) {
    case "trust":
      return "Trustee resolution or authorization letter signed by the trustees";
    case "society":
      return "Managing committee resolution signed by the President or Secretary";
    case "section8":
      return "Board resolution (certified true copy) signed by a director or company secretary";
    default:
      return "Authorization document";
  }
}

// ── PAN ───────────────────────────────────────────────────────────────────────

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Upper case, no spaces. */
export function normalizePan(value: string): string {
  return fieldText(value).replace(/\s+/g, "").toUpperCase();
}

export function isValidPan(value: string): boolean {
  return PAN_PATTERN.test(normalizePan(value));
}

/** A person's PAN has P as its 4th letter (representatives should use their own). */
export function isPersonalPan(value: string): boolean {
  const pan = normalizePan(value);
  return PAN_PATTERN.test(pan) && pan[3] === "P";
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

/** One authorized representative card (step 3). */
export interface RepresentativeCard {
  fullName: string;
  designation: string;
  mobileNumber: string;
  email: string;
  panNumber: string;
  idProof: UploadedFile | null;
  /** Confirmed by the server for this exact email; never trusted from the browser. */
  emailVerified: boolean;
}

export const MAX_REPRESENTATIVES = 5;

export const EMPTY_REPRESENTATIVE: RepresentativeCard = {
  fullName: "",
  designation: "",
  mobileNumber: "",
  email: "",
  panNumber: "",
  idProof: null,
  emailVerified: false,
};

export interface NGOFormState {
  // Step 1 — Organization Details (the PAN card and registration certificate are in `documents`)
  organizationName: string;
  legalStructure: LegalStructure;
  panNumber: string;
  registrationNumber: string;
  registeredOfficeAddress: string;
  organizationPhone: string;
  /** About us: what the NGO does, how, and its causes (100-2000 characters). */
  aboutUs: string;
  /**
   * A corrections resubmission: About us is optional there (as on the server), so
   * an application from before it existed can still be fixed and resubmitted.
   */
  aboutUsOptional?: boolean;
  yearOfEstablishment: string;

  // Steps 1–2 — documents keyed by DocDefinition.id
  documents: Record<string, UploadedFile | null>;

  // Step 3 — Authorized Representatives (card 1 also fills the four fields below)
  representatives: RepresentativeCard[];
  representativeName: string;
  designation: string;
  mobileNumber: string;
  officialEmail: string;
  authorizationLetter: UploadedFile | null;

  // Step 4 — Photos
  logo: UploadedFile | null;
  officePhoto: UploadedFile | null;
  activityPhotos: (UploadedFile | null)[];
  /** Past activities (with a photo) the NGO has saved; loaded from the server, never part of the draft. */
  pastActivitiesWithPhoto?: number;

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
  panNumber: "",
  registrationNumber: "",
  registeredOfficeAddress: "",
  organizationPhone: "",
  aboutUs: "",
  yearOfEstablishment: "",
  documents: {},
  representatives: [EMPTY_REPRESENTATIVE],
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

/** "Other" + "Please specify": 2–60 letters, spaces and . , - & (same rule as the backend's NgoOtherText). */
export const OTHER_TEXT_PATTERN = /^[A-Za-z][A-Za-z .,&-]{1,59}$/;

/** "" when the typed "Other" value is fine, else the message to show. */
export function otherTextError(text: string): string {
  const t = (text ?? "").trim();
  if (!t || t.toLowerCase() === "other") return "Please specify";
  return OTHER_TEXT_PATTERN.test(t) ? "" : "Use 2–60 letters (spaces and . , - & allowed)";
}

/** A stored value that is not one of the list's options is the NGO's own "Other" text ("Other" alone = not typed yet). */
export function isOtherChoice(value: string | null | undefined, options: readonly string[]): boolean {
  const v = (value ?? "").trim();
  return !!v && (v === "Other" || !options.includes(v));
}

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
  return formatIST(date);
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
export const INDIAN_MOBILE_WITH_PREFIX_REGEX = /^\+91[6-9]\d{9}$/;
export const INDIAN_MOBILE_DIGITS_REGEX = /^[6-9]\d{9}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidMobile(value: string): boolean {
  const clean = fieldText(value).replace(/[\s-]/g, "");
  return INDIAN_MOBILE_WITH_PREFIX_REGEX.test(clean) || INDIAN_MOBILE_DIGITS_REGEX.test(clean);
}

/** Why a mobile number is invalid ("" when valid): a wrong first digit, else a wrong length. Same wording as the backend. */
export function mobileError(value: string): string {
  if (isValidMobile(value)) return "";
  let digits = fieldText(value).replace(/[\s-]/g, "");
  if (digits.startsWith("+91")) digits = digits.slice(3);
  if (digits && !/^[6-9]/.test(digits)) return "Mobile numbers start with 6, 7, 8 or 9.";
  return "Enter a 10-digit mobile number.";
}

/** Extracts the 10 digits of an Indian mobile number, or whatever digits exist without truncating saved data. */
export function extractIndianMobileDigits(value: string): string {
  const clean = fieldText(value).replace(/[\s-]/g, "");
  if (clean.startsWith("+91")) return clean.slice(3);
  if (clean.startsWith("91") && clean.length > 10) return clean.slice(2);
  if (clean.startsWith("0") && clean.length > 10) return clean.replace(/^0+/, "");
  return clean;
}

/** Formats a mobile number for storage and backend submit: "+91XXXXXXXXXX" */
export function formatIndianMobileForStorage(value: string): string {
  const digits = extractIndianMobileDigits(value);
  return digits ? `+91${digits}` : "";
}

/** Sanitizes input on typing or paste: strips non-digits, leading "+91", "91" or "0", max 10 chars */
export function cleanIndianMobileInput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  cleaned = cleaned.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.replace(/^0+/, "");
  }
  return cleaned.slice(0, 10);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(fieldText(value));
}

/** True when nothing on the card has been filled in. */
export function isRepresentativeEmpty(card: RepresentativeCard | undefined): boolean {
  return !card || (!fieldText(card.fullName) && !fieldText(card.designation) && !fieldText(card.mobileNumber)
    && !fieldText(card.email) && !fieldText(card.panNumber) && !card.idProof);
}

/** What a representative card still needs (empty when complete). */
export function getRepresentativeIssues(card: RepresentativeCard, index: number): string[] {
  const who = `Representative ${index + 1}`;
  const issues: string[] = [];
  if (!fieldText(card.fullName)) issues.push(`${who}: full name`);
  if (!fieldText(card.designation)) issues.push(`${who}: designation / role`);
  else if (isOtherChoice(card.designation, DESIGNATIONS) && otherTextError(card.designation)) issues.push(`${who}: designation / role (please specify)`);
  if (!isValidMobile(card.mobileNumber)) issues.push(`${who}: valid mobile number`);
  if (!isValidEmail(card.email)) issues.push(`${who}: valid email`);
  else if (!card.emailVerified) issues.push(`${who}: verify email with the code`);
  if (!fieldText(card.panNumber)) issues.push(`${who}: PAN number`);
  else if (!isValidPan(card.panNumber)) issues.push(`${who}: valid PAN number`);
  if (!card.idProof) issues.push(`${who}: ID proof`);
  return issues;
}

export const ABOUT_US_MIN = 100;
export const ABOUT_US_MAX = 2000;

/** About us is 100 to 2000 characters once trimmed. */
export function isValidAboutUs(text: string): boolean {
  const n = (text ?? "").trim().length;
  return n >= ABOUT_US_MIN && n <= ABOUT_US_MAX;
}

/** Required on a new application; on a corrections resubmission only checked when filled in. */
export function aboutUsMissing(data: Pick<NGOFormState, "aboutUs" | "aboutUsOptional">): boolean {
  const text = (data.aboutUs ?? "").trim();
  if (!text && data.aboutUsOptional) return false;
  return !isValidAboutUs(text);
}

export function getNgoStillNeededItems(step: NGOStep, data: NGOFormState): string[] {
  const missing: string[] = [];
  switch (step) {
    case "org-details": {
      if (!fieldText(data.organizationName)) missing.push("Organization name");
      if (!data.legalStructure) missing.push("Legal structure (Trust, Society, or Section 8)");
      if (!data.documents?.[PAN_DOC.id]) missing.push("PAN card upload");
      if (!isValidPan(data.panNumber ?? "")) missing.push("Organization PAN number (10 characters)");
      const cert = getRegistrationCertificateDoc(data.legalStructure);
      if (cert && !data.documents?.[cert.id]) missing.push(cert.label);
      if (!fieldText(data.registrationNumber)) missing.push("Registration number");
      if (!isValidEmail(data.officialEmail ?? "")) missing.push("Organization email");
      if (!isValidMobile(data.organizationPhone ?? "")) missing.push("Organization phone number (10 digits)");
      if (aboutUsMissing(data)) missing.push(`About us (${ABOUT_US_MIN} to ${ABOUT_US_MAX} characters)`);
      if (!fieldText(data.yearOfEstablishment) || !/^(18|19|20)\d{2}$/.test(fieldText(data.yearOfEstablishment))) missing.push("Valid year of establishment (4 digits)");
      if (!fieldText(data.registeredOfficeAddress)) missing.push("Registered office address");
      break;
    }
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
    case "authorized-rep": {
      if (!data.authorizationLetter) missing.push("Authorization document");
      const reps = data.representatives?.length ? data.representatives : [EMPTY_REPRESENTATIVE];
      reps.forEach((card, i) => {
        // Representative 1 is required; other cards count only once something is filled in.
        if (i === 0 || !isRepresentativeEmpty(card)) missing.push(...getRepresentativeIssues(card, i));
      });
      if (reps.length > MAX_REPRESENTATIVES) missing.push(`At most ${MAX_REPRESENTATIVES} representatives`);
      break;
    }
    case "org-photos":
      if (!data.logo) missing.push("Official organization logo");
      if (!data.officePhoto) missing.push("Office premises photo");
      // Unknown until the list loads (undefined): only a loaded count of 0 blocks the step.
      if (data.pastActivitiesWithPhoto === 0) missing.push("At least one past activity with a photo");
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
  const fill = (key: "organizationName" | "organizationPhone" | "mobileNumber" | "officialEmail", value: string | null | undefined) =>
    skipped.has(key) || fieldText(form[key]) ? form[key] : fieldText(value);
  // Representative email starts empty so the representative types and verifies their own email.
  // The representative mobile number starts empty so the representative enters their own number.
  // An older draft may hold the account email on a representative (copied from the org email):
  // clear it unless that representative verified it, so they enter their own.
  const accountEmail = fieldText(user.email).toLowerCase();
  const reps = (form.representatives?.length ? [...form.representatives] : [{ ...EMPTY_REPRESENTATIVE }])
    .map(r => accountEmail && !r.emailVerified && fieldText(r.email).toLowerCase() === accountEmail ? { ...r, email: "" } : r);
  return {
    ...form,
    organizationName: fill("organizationName", user.fullName),
    organizationPhone: fill("organizationPhone", user.phone),
    mobileNumber: fill("mobileNumber", user.phone),
    officialEmail: fill("officialEmail", user.email),
    representatives: reps,
  };
}

// ── Per-item corrections ───────────────────────────────────────────────────────

const CORRECTION_FIELD_LABELS: Record<string, string> = {
  organizationName: "Organization name",
  legalStructure: "Legal structure",
  registrationNumber: "Registration number",
  registeredOfficeAddress: "Registered office address",
  organizationPhone: "Organization phone number",
  aboutUs: "About us",
  yearOfEstablishment: "Year of establishment",
  representativeName: "Representative name",
  designation: "Designation",
  mobileNumber: "Mobile number",
  officialEmail: "Official email",
  panNumber: "PAN number",
  authorizationLetter: "Authorization document",
  logo: "Organization logo",
  officePhoto: "Office photo",
};

/** Readable name of a correction item key ("documents.trust-deed" → "Registered Trust Deed"). */
export function correctionFieldLabel(field: string): string {
  if (CORRECTION_FIELD_LABELS[field]) return CORRECTION_FIELD_LABELS[field];
  if (field.startsWith("activityPhotos.")) return `Activity photo ${Number(field.slice(15)) + 1}`;
  if (field.startsWith("documents.")) return documentLabel(field.slice(10));
  const rep = /^representatives\.(\d)\.(\w+)$/.exec(field);
  if (rep) {
    const parts: Record<string, string> = {
      fullName: "full name",
      designation: "designation",
      mobileNumber: "mobile number",
      email: "email",
      panNumber: "PAN",
      idProof: "ID proof",
    };
    return `Representative ${Number(rep[1]) + 1} ${parts[rep[2]] ?? rep[2]}`;
  }
  return field;
}

/** Step 1 fields, including the PAN card and the registration certificate. */
const ORG_DETAILS_FIELDS = [
  "organizationName", "legalStructure", "panNumber", "registrationNumber", "registeredOfficeAddress", "officialEmail", "organizationPhone", "aboutUs", "yearOfEstablishment",
  "documents.pan", "documents.trust-pan", "documents.society-pan", "documents.company-pan",
  "documents.trust-reg-cert", "documents.society-reg-cert", "documents.coi",
];

/** The wizard step that holds a correction item. */
export function correctionFieldStep(field: string): NGOStep {
  if (ORG_DETAILS_FIELDS.includes(field)) return "org-details";
  if (field.startsWith("documents.")) return "legal-documents";
  if (field.startsWith("representatives.")
    || ["representativeName", "designation", "mobileNumber", "authorizationLetter"].includes(field))
    return "authorized-rep";
  return "org-photos";
}

/** The first step (in wizard order) that has a flagged item, or null when nothing is flagged. */
export function firstCorrectionStep(fields: Iterable<string>): NGOStep | null {
  const steps = new Set([...fields].map(correctionFieldStep));
  return NGO_STEPS.find((s) => steps.has(s)) ?? null;
}
