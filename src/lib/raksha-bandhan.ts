import type { PublicItemRequest } from "@/lib/api";

export type RakshaBandhanCampaignOverride = "on" | "off" | undefined;

/**
 * Temporary presentation controls for Causekind's Raksha Bandhan campaign.
 *
 * Set NEXT_PUBLIC_RAKSHA_BANDHAN_CAMPAIGN to `on` to force the campaign on,
 * `off` to turn it off immediately, or leave it unset to use the date window.
 * The window is expressed in UTC to match midnight-to-midnight IST: IST is
 * UTC+5:30, so a window that opens at midnight IST opens at 18:30 UTC the day
 * before. Writing it in local dates and converting at read time is the
 * alternative, and it puts a timezone bug one careless `new Date("2026-08-27")`
 * away.
 *
 * Runs 27 August 2026 through the end of 1 September 2026 (IST), bracketing
 * Raksha Bandhan on the 28th rather than starting on it.
 */
export const RAKSHA_BANDHAN_CAMPAIGN = {
  override: process.env
    .NEXT_PUBLIC_RAKSHA_BANDHAN_CAMPAIGN as RakshaBandhanCampaignOverride,
  startsAt: new Date("2026-08-26T18:30:00.000Z"),
  endsAt: new Date("2026-09-01T18:30:00.000Z"),
} as const;

/**
 * Whether the Raksha Bandhan presentation should render.
 *
 * <p>One switch for the whole campaign — the hero thread, the hero's waiting
 * card and the homepage section all call this, so they cannot disagree.
 */
export function isRakshaBandhanCampaignActive(
  now = new Date(),
  override = RAKSHA_BANDHAN_CAMPAIGN.override,
): boolean {
  if (override === "on") return true;
  if (override === "off") return false;

  return (
    now.getTime() >= RAKSHA_BANDHAN_CAMPAIGN.startsAt.getTime() &&
    now.getTime() < RAKSHA_BANDHAN_CAMPAIGN.endsAt.getTime()
  );
}

/**
 * Whole days a need has been waiting, floored, never negative.
 *
 * <p>Counted in whole UTC days rather than by local calendar date. The
 * alternative — differencing local dates — makes the answer depend on the
 * viewer's timezone, so the same request would read "12 days" in Mumbai and
 * "11 days" in London. The number is a duration, not a date, so it should not
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
 * point of the campaign: the newest need is the one least in need of a champion,
 * and it is the one every existing surface already shows first.
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
