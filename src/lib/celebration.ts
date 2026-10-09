/**
 * "Has this person already seen the celebration for this donation?" (2026-10-08)
 *
 * <p>Keyed per account, not just per offer/match: donor and donee of the same
 * donation each get their own window, even when both sign in on one browser.
 * The old key (`ck_celebrated_OFFER_12`) was shared, so whichever side saw it
 * first silently used up the other side's turn.
 */
export type CelebrationContext = "OFFER" | "MATCH";

/** Offer statuses meaning the item has been handed over and received. */
export const OFFER_DONE = new Set(["ISSUE_WINDOW_OPEN", "COMPLETED"]);
/** Match statuses meaning the same. */
export const MATCH_DONE = new Set(["COMPLETED", "FULFILLED"]);

function key(type: CelebrationContext, id: number, email: string) {
  return `ck_celebrated_${type}_${id}_${email.toLowerCase()}`;
}

/**
 * True exactly once per person and donation: marks it seen and returns true the
 * first time, false afterwards. Never throws (private mode just skips it).
 */
export function claimCelebration(type: CelebrationContext, id: number, email: string | null | undefined): boolean {
  if (!email) return false;
  try {
    const k = key(type, id, email);
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, "1");
    return true;
  } catch {
    return false;
  }
}
