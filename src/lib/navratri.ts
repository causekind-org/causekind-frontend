export type NavratriCampaignOverride = "on" | "off" | undefined;

export const NAVRATRI_CAMPAIGN = {
  override: process.env.NEXT_PUBLIC_NAVRATRI_CAMPAIGN as NavratriCampaignOverride,
  startsAt: new Date("2026-10-10T18:30:00.000Z"), // 11 Oct 00:00 IST
  endsAt: new Date("2026-10-20T18:29:59.999Z"),   // 20 Oct 23:59:59 IST
} as const;

export function isNavratriCampaignActive(
  now = new Date(),
  override = NAVRATRI_CAMPAIGN.override
): boolean {
  // Must not stay on after 20 Oct (user requirement)
  if (now.getTime() > NAVRATRI_CAMPAIGN.endsAt.getTime()) {
    return false;
  }

  if (override === "on") return true;
  if (override === "off") return false;

  const isWithinWindow =
    now.getTime() >= NAVRATRI_CAMPAIGN.startsAt.getTime() &&
    now.getTime() <= NAVRATRI_CAMPAIGN.endsAt.getTime();

  if (isWithinWindow) return true;

  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("campaign") === "navratri") {
      return true;
    }
  }

  return false;
}
