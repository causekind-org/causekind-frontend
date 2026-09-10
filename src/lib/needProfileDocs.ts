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
