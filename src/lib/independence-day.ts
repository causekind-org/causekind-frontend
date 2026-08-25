export type IndependenceDayCampaignOverride = "on" | "off" | undefined;

/**
 * Temporary presentation controls for Causekind's 15 August campaign.
 *
 * Set NEXT_PUBLIC_INDEPENDENCE_DAY_CAMPAIGN to `on` to force the campaign on,
 * `off` to turn it off immediately, or leave it unset to use the date window.
 * The default date window is expressed in UTC to match midnight-to-midnight IST.
 */
export const INDEPENDENCE_DAY_CAMPAIGN = {
  override: process.env
    .NEXT_PUBLIC_INDEPENDENCE_DAY_CAMPAIGN as IndependenceDayCampaignOverride,
  startsAt: new Date("2026-08-09T18:30:00.000Z"),
  endsAt: new Date("2026-08-17T18:30:00.000Z"),
  label: "Independence Day",
  title: "Freedom to give. Dignity to receive.",
  description:
    "Choose a verified local need and make a practical difference for someone nearby.",
  ctaLabel: "Browse verified needs",
  ctaHref: "/requests",
} as const;

export function isIndependenceDayCampaignActive(
  now = new Date(),
  override = INDEPENDENCE_DAY_CAMPAIGN.override,
): boolean {
  if (override === "on") return true;
  if (override === "off") return false;

  return (
    now.getTime() >= INDEPENDENCE_DAY_CAMPAIGN.startsAt.getTime() &&
    now.getTime() < INDEPENDENCE_DAY_CAMPAIGN.endsAt.getTime()
  );
}

/**
 * Which Independence Day this one is — 2026 is the **80th**.
 *
 * <p>Counted, not hardcoded, so the number does not quietly go stale the year
 * after someone forgets. 15 August 1947 was the *first*, so the ordinal is
 * `year - 1946` rather than the more tempting `year - 1947`, which gives the
 * number of years elapsed and is one short. India's own usage follows the
 * former: 2023 was the 77th.
 *
 * <p>Uses IST, because the date that matters is the Indian one. A visitor in
 * another timezone still sees the same number as everyone else.
 */
export function independenceDayOrdinal(now = new Date()): number {
  const istYear = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric" }).format(now),
  );
  return istYear - 1946;
}

/**
 * Ordinal suffix for display — 80th, 81st, 82nd, 83rd.
 *
 * <p>The 11–13 carve-out is the one everybody gets wrong: 11th, 12th and 13th
 * do not follow the 1/2/3 rule their last digit suggests.
 */
export function ordinalSuffix(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
