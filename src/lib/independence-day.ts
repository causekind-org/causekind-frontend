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
