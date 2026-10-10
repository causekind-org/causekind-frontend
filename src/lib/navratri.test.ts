import { describe, expect, it } from "vitest";

import {
  NAVRATRI_CAMPAIGN,
  isNavratriCampaignActive,
} from "./navratri";

describe("isNavratriCampaignActive", () => {
  it("shows the campaign during the 11 Oct – 20 Oct 2026 IST window", () => {
    // 11 Oct 2026 00:00 IST = 2026-10-10T18:30:00.000Z
    expect(isNavratriCampaignActive(new Date("2026-10-10T18:30:00.000Z"), undefined)).toBe(true);
    // 20 Oct 2026 23:59:59 IST = 2026-10-20T18:29:59.000Z
    expect(isNavratriCampaignActive(new Date("2026-10-20T18:29:59.000Z"), undefined)).toBe(true);
  });

  it("is already showing halfway through the window", () => {
    expect(isNavratriCampaignActive(new Date("2026-10-15T12:00:00.000Z"), undefined)).toBe(true);
  });

  it("stays hidden either side of the window", () => {
    // One millisecond before midnight IST on the 11th.
    expect(isNavratriCampaignActive(new Date("2026-10-10T18:29:59.999Z"), undefined)).toBe(false);
    // 21 Oct 2026 00:00 IST = 2026-10-20T18:30:00.000Z
    expect(isNavratriCampaignActive(new Date("2026-10-20T18:30:00.000Z"), undefined)).toBe(false);
  });

  it("honours an immediate manual on or off override, but NOT after 20 Oct", () => {
    const outsideBefore = new Date("2026-10-01T00:00:00.000Z");
    const outsideAfter = new Date("2026-10-25T00:00:00.000Z");

    // Before window, override works
    expect(isNavratriCampaignActive(outsideBefore, "on")).toBe(true);
    // During window, off override works
    expect(isNavratriCampaignActive(new Date("2026-10-15T12:00:00.000Z"), "off")).toBe(false);
    
    // After window, campaign MUST NOT stay on even if override says "on"
    expect(isNavratriCampaignActive(outsideAfter, "on")).toBe(false);
  });
});
