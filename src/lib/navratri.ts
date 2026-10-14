export type NavratriCampaignOverride = "on" | "off" | undefined;

/**
 * Temporary presentation controls for Causekind's Navratri hero.
 *
 * <p>The window runs 11 October 00:00 to the end of 20 October 2026 (IST),
 * whatever the visitor's own timezone. Expressed in UTC like the Raksha
 * Bandhan campaign: IST is UTC+5:30, so midnight IST is 18:30Z the day before.
 * Both ends arrive on their own, with no deploy needed at either.
 *
 * <p>Set NEXT_PUBLIC_NAVRATRI_CAMPAIGN to `on` / `off` to force it, or open
 * the home page with `?campaign=navratri` to preview it before 11 October.
 * Neither can keep it on after the window has ended.
 */
export const NAVRATRI_CAMPAIGN = {
  override: process.env.NEXT_PUBLIC_NAVRATRI_CAMPAIGN as NavratriCampaignOverride,
  startsAt: new Date("2026-10-10T18:30:00.000Z"), // 11 Oct 2026 00:00 IST
  endsAt: new Date("2026-10-20T18:30:00.000Z"), // 21 Oct 2026 00:00 IST (exclusive)
  previewParam: "campaign",
  previewValue: "navratri",
} as const;

export function isNavratriCampaignActive(
  now = new Date(),
  override = NAVRATRI_CAMPAIGN.override,
  preview = false,
): boolean {
  // Nothing keeps it on once the window has closed — not the env, not a preview.
  if (now.getTime() >= NAVRATRI_CAMPAIGN.endsAt.getTime()) return false;

  if (override === "on") return true;
  if (override === "off") return false;
  if (preview) return true;

  return now.getTime() >= NAVRATRI_CAMPAIGN.startsAt.getTime();
}

/** True when a query string asks for the Navratri preview (`?campaign=navratri`). */
export function hasNavratriPreview(search: string): boolean {
  return (
    new URLSearchParams(search).get(NAVRATRI_CAMPAIGN.previewParam) ===
    NAVRATRI_CAMPAIGN.previewValue
  );
}
