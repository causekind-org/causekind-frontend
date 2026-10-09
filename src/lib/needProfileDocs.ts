import type { VerificationDocumentType } from "@/lib/api";

/**
 * The reusable identity documents a donee keeps on their need-profile.
 *
 * Lives here rather than in the need-details page because two surfaces render
 * these labels: the profile editor itself, and the gate modal that tells a donee
 * what is still missing before they can post a need.
 */
export const NEED_PROFILE_DOCS: {type: VerificationDocumentType; label: string; required?: boolean}[] = [
  {type:"GOVT_ID_ANY",label:"Government ID",required:true},
  {type:"RESIDENCE_PROOF",label:"Proof of address",required:true},
  {type:"SELFIE_WITH_ID",label:"A clear photo of yourself",required:true},
  {type:"RATION_CARD",label:"Ration card"}, {type:"VOTER_ID",label:"Voter ID"},
  {type:"BPL_CARD",label:"BPL card"}, {type:"INCOME_CERT",label:"Income certificate"},
  {type:"BANK_PASSBOOK",label:"Bank passbook"},
];

/**
 * `DoneeNeedProfile.missing` carries document type codes, but it can also carry
 * codes for the household detail fields. Anything we have no label for falls
 * back to the raw code rather than being dropped — the donee is better served by
 * an unfamiliar code than by a silently short list.
 */
export function needProfileItemLabel(code: string): string {
  return NEED_PROFILE_DOCS.find(d => d.type === code)?.label ?? code;
}

/**
 * The checklist size the backend actually enforces, mirrored from
 * `DoneeProfileService.missing()`: 3 user fields (name, phone, city) + 7 profile
 * fields (household size, dependents, age, housing type, income, income source,
 * financial situation) + the 3 required documents. If that method changes, this
 * constant has to change with it.
 *
 * It has to be a constant. The earlier version derived the denominator from the
 * missing list itself, so completing a non-document item dropped the total and
 * the numerator alike — `done` never moved, and a donee three items in still saw
 * 0%.
 */
export const NEED_PROFILE_CHECKLIST_TOTAL = 13;

export function progressOf(missing: string[]) {
  const done = Math.max(0, NEED_PROFILE_CHECKLIST_TOTAL - missing.length);
  return {
    total: NEED_PROFILE_CHECKLIST_TOTAL,
    done,
    pct: Math.round((done / NEED_PROFILE_CHECKLIST_TOTAL) * 100),
  };
}

/**
 * The household / financial items of the readiness checklist, in the backend's
 * order. MIRRORS `DoneeProfileService.missing()` in causekind-backend
 * (src/main/java/com/causekind/backend/service/DoneeProfileService.java) —
 * the labels must match its strings exactly, and if a rule changes there it
 * has to change here.
 */
export const PROFILE_FIELD_ITEMS = [
  "People in home", "Dependents", "Age", "Housing type",
  "Monthly household income", "Income source", "Financial situation",
] as const;

/** Name, phone, city: edited on the basic profile, so only the server knows them. */
const ACCOUNT_ITEMS = ["Full name", "Phone number", "City in your basic profile"];

type ProfileFieldValues = {
  householdSize?: number | string | null; dependents?: number | string | null; age?: number | string | null;
  housingType?: string | null; monthlyIncome?: number | string | null;
  incomeSource?: string | null; reasonCannotBuy?: string | null;
};

/** Which profile-field items are still missing for these (unsaved) form values. */
export function profileFieldsMissing(d: ProfileFieldValues): string[] {
  const num = (v: unknown) => (v === null || v === undefined || String(v).trim() === "" ? null : Number(v));
  const blank = (v: unknown) => v === null || v === undefined || String(v).trim() === "";
  const out: string[] = [];
  const household = num(d.householdSize), dependents = num(d.dependents), age = num(d.age), income = num(d.monthlyIncome);
  if (household === null || !(household >= 1)) out.push("People in home");
  if (dependents === null || !(dependents >= 0)) out.push("Dependents");
  if (age === null || !(age >= 1)) out.push("Age");
  if (!d.housingType) out.push("Housing type");
  if (income === null || !Number.isFinite(income) || income < 0) out.push("Monthly household income");
  if (blank(d.incomeSource)) out.push("Income source");
  if (blank(d.reasonCannotBuy)) out.push("Financial situation");
  return out;
}

/**
 * The readiness checklist as it stands right now: the profile fields judged
 * from the live form values, the account items and documents from the server's
 * last answer (documents change only through an upload, which re-fetches it).
 * Same order as the server's list.
 */
export function liveNeedProfileMissing(details: ProfileFieldValues, serverMissing: string[]): string[] {
  const fieldItems: readonly string[] = PROFILE_FIELD_ITEMS;
  return [
    ...serverMissing.filter((m) => ACCOUNT_ITEMS.includes(m)),
    ...profileFieldsMissing(details),
    ...serverMissing.filter((m) => !ACCOUNT_ITEMS.includes(m) && !fieldItems.includes(m)),
  ];
}
