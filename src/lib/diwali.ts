export type DiwaliCampaignOverride = "on" | "off" | undefined;

/**
 * Temporary presentation controls for Causekind's Diwali home page.
 *
 * <p>The theme runs until the end of 12 November 2026 (IST), whatever the
 * visitor's own timezone: 13 Nov 00:00 IST is 12 Nov 18:30Z. It ends on its own,
 * with no deploy needed. Everything festive on the home page — the hero, logo,
 * seams, lanterns, mandala and the page colours — hangs off this one check. The
 * fundraisers row after the hero is permanent and only loses its festive dress.
 *
 * <p>Set NEXT_PUBLIC_DIWALI_CAMPAIGN=off to end it early. Nothing can keep it on
 * after the window has closed.
 */
export const DIWALI_CAMPAIGN = {
  override: process.env.NEXT_PUBLIC_DIWALI_CAMPAIGN as DiwaliCampaignOverride,
  endsAt: new Date("2026-11-12T18:30:00.000Z"), // 13 Nov 2026 00:00 IST (exclusive)
} as const;

export function isDiwaliCampaignActive(
  now = new Date(),
  override = DIWALI_CAMPAIGN.override,
): boolean {
  // Nothing keeps it on once the window has closed — not even the env.
  if (now.getTime() >= DIWALI_CAMPAIGN.endsAt.getTime()) return false;
  return override !== "off";
}
