/**
 * Canonical "Request corrections" item keys: the ONE list shared by the admin review form
 * (what it can flag) and the NGO wizard (where each flagged item lives and whether it changed).
 *
 * Keys are exactly what the admin form sends in `items[].field`:
 * - text fields: "organizationName", "panNumber", ... (TEXT_FIELDS for older applications)
 * - representatives: "representatives.<n>.<fullName|designation|mobileNumber|email|panNumber|idProof>"
 * - files: "documents.<docId>", "authorizationLetter", "logo", "officePhoto", "activityPhotos.<n>"
 */
import {
  correctionFieldLabel,
  correctionFieldStep,
  type NGOFormState,
  type NGOStep,
  type UploadedFile,
} from "./ngoRegistrationModel";

/** Older (single representative, no PAN) applications: text fields a reviewer can flag. */
export const LEGACY_TEXT_FIELDS = [
  "organizationName", "legalStructure", "registrationNumber", "registeredOfficeAddress", "yearOfEstablishment",
  "representativeName", "designation", "mobileNumber", "officialEmail",
] as const;
/** Current wizard: step 1 text fields a reviewer can flag. */
export const V2_TEXT_FIELDS = [
  "organizationName", "legalStructure", "panNumber", "registrationNumber", "yearOfEstablishment", "registeredOfficeAddress",
] as const;
/** Per-representative text parts a reviewer can flag. */
export const REPRESENTATIVE_TEXT_FIELDS = ["fullName", "designation", "mobileNumber", "email", "panNumber"] as const;

/** Legacy single-representative keys → the first representative card's part. */
const LEGACY_REP_KEYS: Record<string, string> = {
  representativeName: "fullName", designation: "designation", mobileNumber: "mobileNumber",
};

/** Wizard DOM ids of the text fields (used to scroll/focus the first flagged field). */
const FIELD_IDS: Record<string, string> = {
  organizationName: "ngo-org-name", panNumber: "ngo-pan", registrationNumber: "ngo-reg-no",
  yearOfEstablishment: "ngo-year", registeredOfficeAddress: "ngo-address", officialEmail: "ngo-org-email",
  organizationPhone: "ngo-org-phone", aboutUs: "ngo-about-us",
};
const REP_PART_IDS: Record<string, string> = {
  fullName: "name", designation: "designation", mobileNumber: "mobile", email: "email", panNumber: "pan",
};

export type CorrectionFieldInfo = { key: string; label: string; step: NGOStep; fieldId: string | null; isFile: boolean };

/** Where a flagged item lives in the wizard: its step, readable label and (for text) the input id. */
export function correctionFieldInfo(key: string): CorrectionFieldInfo {
  const rep = /^representatives\.(\d+)\.(\w+)$/.exec(key);
  const legacyRep = LEGACY_REP_KEYS[key];
  let fieldId: string | null = FIELD_IDS[key] ?? null;
  if (rep && REP_PART_IDS[rep[2]]) fieldId = `rep-${rep[1]}-${REP_PART_IDS[rep[2]]}`;
  if (legacyRep) fieldId = `rep-0-${REP_PART_IDS[legacyRep]}`;
  const isFile = key.startsWith("documents.") || key.startsWith("activityPhotos.")
    || ["authorizationLetter", "logo", "officePhoto"].includes(key) || (!!rep && rep[2] === "idProof");
  return { key, label: correctionFieldLabel(key), step: correctionFieldStep(key), fieldId, isFile };
}

const fileId = (f: UploadedFile | null | undefined) =>
  f ? `file:${f.documentId ?? f.photoId ?? f.s3Key ?? f.name ?? ""}` : "";

/** A comparable value of one flagged item in the wizard form ("" when empty). */
export function correctionFieldValue(data: NGOFormState, key: string): string {
  const rep = /^representatives\.(\d+)\.(\w+)$/.exec(key);
  if (rep) {
    const card = data.representatives?.[Number(rep[1])] as unknown as Record<string, unknown> | undefined;
    if (!card) return "";
    const v = card[rep[2]];
    return rep[2] === "idProof" ? fileId(v as UploadedFile | null) : String(v ?? "").trim();
  }
  if (LEGACY_REP_KEYS[key]) {
    const card = data.representatives?.[0] as unknown as Record<string, unknown> | undefined;
    const v = card?.[LEGACY_REP_KEYS[key]] ?? (data as unknown as Record<string, unknown>)[key];
    return String(v ?? "").trim();
  }
  if (key.startsWith("documents.")) return fileId(data.documents?.[key.slice(10)]);
  if (key.startsWith("activityPhotos.")) return fileId(data.activityPhotos?.[Number(key.slice(15))]);
  if (key === "authorizationLetter" || key === "logo" || key === "officePhoto") return fileId(data[key]);
  const v = (data as unknown as Record<string, unknown>)[key];
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v);
}

/** Snapshot of every flagged item's value when the wizard opened (the "before"). */
export function snapshotFlagged(data: NGOFormState, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, correctionFieldValue(data, k)]));
}

/** Flagged items the NGO has changed: now filled and different from what it opened with. */
export function changedFlaggedFields(data: NGOFormState, original: Record<string, string>): Set<string> {
  const out = new Set<string>();
  for (const [key, before] of Object.entries(original)) {
    const now = correctionFieldValue(data, key);
    if (now !== "" && now !== before) out.add(key);
  }
  return out;
}

/** Human-readable value for "What you changed" (files show their name). */
export function correctionDisplayValue(data: NGOFormState, key: string): string {
  const raw = correctionFieldValue(data, key);
  if (!raw.startsWith("file:")) return raw;
  const rep = /^representatives\.(\d+)\.idProof$/.exec(key);
  const f: UploadedFile | null | undefined = rep ? data.representatives?.[Number(rep[1])]?.idProof
    : key.startsWith("documents.") ? data.documents?.[key.slice(10)]
    : key.startsWith("activityPhotos.") ? data.activityPhotos?.[Number(key.slice(15))]
    : (data as unknown as Record<string, UploadedFile | null>)[key];
  return f?.name ? `New file: ${f.name}` : "New file uploaded";
}

/** First wizard step that holds a flagged item, in wizard order. */
export { firstCorrectionStep } from "./ngoRegistrationModel";

/** Normalizes a server-reported original value to the form used by correctionFieldValue. */
function normalizeOriginal(key: string, raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "object") {
    const f = raw as UploadedFile;
    return fileId(f);
  }
  const s = String(raw).trim();
  if (!s) return "";
  const typed = /^(?:document|photo):(.+)$/.exec(s);
  if (typed) return `file:${typed[1]}`;
  return correctionFieldInfo(key).isFile && !s.startsWith("file:") ? `file:${s}` : s;
}

/**
 * The ORIGINALLY SUBMITTED value of each flagged item: the server's per-item originals when
 * present (any of the known shapes), else the latest correction round's previousValues,
 * else what the wizard loaded (the saved submission).
 */
export function originalFlaggedValues(
  data: NGOFormState, keys: string[], status: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const out = snapshotFlagged(data, keys);
  const s = status ?? {};
  const history = Array.isArray(s.correctionHistory) ? (s.correctionHistory as { previousValues?: Record<string, unknown> | null }[]) : [];
  const fromHistory = history.length ? history[history.length - 1]?.previousValues ?? null : null;
  const items = Array.isArray(s.correctionItems) ? (s.correctionItems as Record<string, unknown>[]) : [];
  const maps = [s.correctionOriginalValues, s.correctionOriginalFiles, s.flaggedOriginalValues, s.flaggedOriginalFiles, s.originalValues, s.submittedValues, s.flaggedOriginalValues, s.originalSubmittedValues]
    .filter((m): m is Record<string, unknown> => !!m && typeof m === "object");
  for (const key of keys) {
    const item = items.find((i) => i.field === key);
    const fromItem = item && ("originalValue" in item ? item.originalValue : "submittedValue" in item ? item.submittedValue : undefined);
    const fromMap = maps.find((m) => key in m)?.[key];
    const raw = fromItem !== undefined ? fromItem : fromMap !== undefined ? fromMap : fromHistory && key in fromHistory ? fromHistory[key] : undefined;
    if (raw !== undefined) out[key] = normalizeOriginal(key, raw);
  }
  return out;
}

/** Every map of original flagged files the server may send (status first, then the fresh correction draft). */
function originalFiles(...sources: (Record<string, unknown> | null | undefined)[]): Record<string, UploadedFile> {
  const out: Record<string, UploadedFile> = {};
  for (const src of [...sources].reverse()) {
    for (const k of ["flaggedOriginalFiles", "correctionOriginalFiles"]) {
      const m = src?.[k];
      if (m && typeof m === "object") Object.assign(out, m as Record<string, UploadedFile>);
    }
  }
  return out;
}

/**
 * Flagged file slots come back empty (a re-upload is required): put the originally submitted
 * file back in its slot so the NGO sees it with Replace. It is not a fix until replaced.
 */
export function fillFlaggedFileSlots(
  data: NGOFormState, keys: string[], ...sources: (Record<string, unknown> | null | undefined)[]
): NGOFormState {
  const files = originalFiles(...sources);
  let next = data;
  for (const key of keys) {
    const f = files[key];
    if (!f || !correctionFieldInfo(key).isFile || correctionFieldValue(next, key)) continue;
    const file: UploadedFile = { ...f, name: f.name || "Submitted file" };
    const rep = /^representatives\.(\d+)\.idProof$/.exec(key);
    if (rep) {
      const reps = [...next.representatives];
      const i = Number(rep[1]);
      if (reps[i]) { reps[i] = { ...reps[i], idProof: file }; next = { ...next, representatives: reps }; }
    } else if (key.startsWith("documents.")) next = { ...next, documents: { ...next.documents, [key.slice(10)]: file } };
    else if (key.startsWith("activityPhotos.")) {
      const photos = [...next.activityPhotos];
      const i = Number(key.slice(15));
      if (Number.isInteger(i) && i >= 0) { photos[i] = file; next = { ...next, activityPhotos: photos }; }
    } else if (key === "authorizationLetter" || key === "logo" || key === "officePhoto") next = { ...next, [key]: file };
  }
  return next;
}
