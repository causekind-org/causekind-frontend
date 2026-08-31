/**
 * Mirror of the backend's `RejectionReasons.isMeaningful` (Java).
 *
 * This exists so an admin gets told *before* submitting, not after a 400. It
 * **mirrors** the server rule; it never replaces it — the server validates every
 * reject independently, because a disabled button is a courtesy, not a control.
 *
 * If you change the rule here, change `causekind-backend/.../validation/RejectionReasons.java`
 * in the same commit. Both are covered by tests that use the same example strings.
 */

export const MAX_REASON_LENGTH = 2000;
const MIN_ALPHANUMERIC = 5;

export const REASON_HINT =
  "Please provide a meaningful reason so the donor understands what needs correction.";

export const NO_REASON_FALLBACK = "No detailed reason was provided.";

/** Whether this reason carries enough information to be worth showing someone. */
export function isMeaningfulReason(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_REASON_LENGTH) return false;

  // Unicode-aware so a reason written in Devanagari counts its own letters
  // rather than being rejected as punctuation.
  const alphanumeric = trimmed.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  if (alphanumeric < MIN_ALPHANUMERIC) return false;

  // At least one word made of letters — without this, "12345" clears the count
  // above while still telling the donor nothing.
  return trimmed.split(/\s+/).some((word) => /\p{L}/u.test(word));
}

/**
 * The reason as a user should see it. Prefer the server's `displayRejectionReason`
 * where it is available; this is for the places that only have the raw value.
 */
export function displayReason(raw: string | null | undefined): string {
  return isMeaningfulReason(raw) ? raw!.trim() : NO_REASON_FALLBACK;
}

/**
 * Readable copy for a snake_case missing-info flag.
 *
 * <p>A listing sent back for more information carries its reasons as the
 * backend's `missingFlags` — a `|`-joined list mixing internal flags with
 * whatever sentence the adjudicator wrote. It was rendered straight into
 * "Admin note:", so a donor read
 * `at_least_two_photos|At least two photos of the water bottle…` — an internal
 * identifier and a pipe, presented as if it were a message written for them.
 *
 * <p>Unknown flags are returned as-is with underscores relaxed to spaces rather
 * than dropped: a flag this build has not seen is still information, and hiding
 * it would leave the donor with a blank note. Free-text entries — anything with
 * a space already — pass through untouched, because those are sentences, not
 * codes.
 */
const MISSING_FLAG_COPY: Record<string, string> = {
  at_least_two_photos: "At least two clear photos of the item.",
  approximate_age: "Roughly how old the item is.",
  known_defects: "Any known defects, or a note saying there are none.",
  working_status: "Whether the item is in working order.",
  city: "The city the item can be collected from.",
  pincode: "The PIN or postal code for collection.",
  description: "A fuller description of the item.",
  title: "A clearer title for the item.",
  category: "The item's category.",
  quantity: "How many of the item you are offering.",
};

export function describeMissingFlag(entry: string): string {
  const trimmed = entry.trim();
  if (!trimmed) return "";
  // A sentence, not a code. The adjudicator writes these, and they are already
  // addressed to the donor.
  if (/\s/.test(trimmed)) return trimmed;
  return MISSING_FLAG_COPY[trimmed] ?? trimmed.replace(/_/g, " ");
}

/**
 * Splits a `missingFlags` value into the lines a donor should read.
 *
 * <p>Returns an empty array when there is nothing meaningful, so a caller can
 * fall back rather than render an empty list.
 */
export function missingInfoLines(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map(describeMissingFlag)
    .filter(line => line.length > 0);
}
