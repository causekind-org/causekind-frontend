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
