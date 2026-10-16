export const DRIVE_OFFER_AGE_RANGES = [
  { value: "LT_1", label: "Less than 1 year" },
  { value: "Y1_2", label: "1-2 years" },
  { value: "Y2_3", label: "2-3 years" },
  { value: "Y3_5", label: "3-5 years" },
  { value: "GT_5", label: "5+ years" },
] as const;

export type DriveOfferAgeRange = (typeof DRIVE_OFFER_AGE_RANGES)[number]["value"];

const VALID_AGE_SET = new Set<string>(DRIVE_OFFER_AGE_RANGES.map((r) => r.value));

/**
 * Maps a legacy free-text or numeric age into one of the 5 canonical age ranges.
 * If the item is brand new (condition === "Unused"), defaults to "LT_1".
 */
export function mapLegacyAgeToAgeRange(ageStr?: string | null, condition?: string | null): string {
  const cond = (condition ?? "").trim().toLowerCase();
  const isUnused = cond.includes("unused") || cond.includes("brand new") || cond.includes("new with tags") || cond === "new";

  if (isUnused && (!ageStr || !ageStr.trim())) {
    return "LT_1";
  }
  if (!ageStr || !ageStr.trim()) {
    return isUnused ? "LT_1" : "";
  }

  const raw = ageStr.trim();
  if (VALID_AGE_SET.has(raw)) return raw;

  const lower = raw.toLowerCase();
  if (lower.startsWith("0") || lower.includes("less")) {
    return "LT_1";
  }

  // Extract first number if present
  const match = lower.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (lower.includes("month")) {
      if (num < 12) return "LT_1";
      if (num < 24) return "Y1_2";
      if (num < 36) return "Y2_3";
      if (num < 60) return "Y3_5";
      return "GT_5";
    }
    if (num <= 0) return "LT_1";
    if (num === 1) return "Y1_2";
    if (num === 2) return "Y2_3";
    if (num === 3 || num === 4) return "Y3_5";
    return "GT_5";
  }

  if (lower.includes("5+")) return "GT_5";

  if (isUnused) return "LT_1";

  return "LT_1";
}

/** Formats an ageRange code (e.g. "LT_1") into its human label ("Less than 1 year"). */
export function formatAgeRange(value?: string | null): string {
  if (!value) return "";
  const found = DRIVE_OFFER_AGE_RANGES.find((r) => r.value === value);
  return found ? found.label : value;
}
