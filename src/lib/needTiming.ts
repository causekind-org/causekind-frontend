/**
 * How long a need has been waiting, and which needs have waited longest.
 *
 * <p><b>Why this module exists separately.</b> These three helpers were written
 * for the Raksha Bandhan campaign and lived in `raksha-bandhan.ts`. Nothing
 * about them is seasonal — they answer "how long has this person been waiting",
 * which is the most honest fact the public need board carries and the one the
 * landing page's narrative is built on. Leaving them in a campaign module meant
 * retiring the campaign would have taken the homepage's spine with it.
 *
 * <p>`raksha-bandhan.ts` re-exports these so its own callers are untouched.
 */

import type { PublicItemRequest } from "./api";

/**
 * Whole days between `createdAt` and now.
 *
 * <p>Counted in whole UTC days rather than by local calendar date. The
 * alternative — differencing local dates — makes the answer depend on the
 * viewer's timezone, so the same request would read "12 days" in Mumbai and
 * "11 days" in London. The number is a duration, not a date, so it must not
 * move with where it is read.
 *
 * <p>Returns null for a missing or unparseable timestamp. Callers render
 * nothing rather than "NaN days" or a confident "0 days" — the second is worse,
 * because it looks like an answer.
 */
export function daysWaiting(createdAt: string | null | undefined, now = new Date()): number | null {
  if (!createdAt) return null;

  const created = new Date(createdAt);
  const ms = created.getTime();
  if (Number.isNaN(ms)) return null;

  // A clock skew or a future-dated row must not produce a negative age.
  const elapsed = Math.max(0, now.getTime() - ms);
  return Math.floor(elapsed / 86_400_000);
}

/** Human phrasing for a wait, so "1 days" never reaches a screen. */
export function waitingLabel(days: number): string {
  if (days <= 0) return "waiting since today";
  if (days === 1) return "waiting 1 day";
  return `waiting ${days} days`;
}

/**
 * The needs that have waited longest with nobody behind them, oldest first.
 *
 * <p><b>Everything on the public board is already unclaimed</b>, which is what
 * makes this honest rather than a guess. Under the need-first architecture a
 * request is matched privately first and only reaches `PUBLIC_REQUEST` status —
 * the sole status the public endpoint returns — once that failed. So "on the
 * public board" and "nobody has taken this" are the same fact, and no extra
 * field or endpoint is needed to establish it.
 *
 * <p>The backend serves this list newest-first. Reversing it is the entire
 * point: the newest need is the one least in need of a champion, and it is the
 * one every existing surface already shows first.
 *
 * <p>Rows without a usable `createdAt` are dropped rather than sorted to one
 * end. Their wait cannot be stated, and this list exists to state it.
 */
export function longestWaiting(
  requests: readonly PublicItemRequest[] | null | undefined,
  limit?: number,
  now = new Date(),
): PublicItemRequest[] {
  if (!requests?.length) return [];

  const dated = requests.filter(r => daysWaiting(r.createdAt, now) !== null);

  const oldestFirst = [...dated].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return typeof limit === "number" ? oldestFirst.slice(0, limit) : oldestFirst;
}
