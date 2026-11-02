import { describe, expect, it } from "vitest";

import { isDiwaliCampaignActive } from "./diwali";

// IST is UTC+5:30, so an IST wall-clock time is that time minus 5:30 in UTC.
const ist = (local: string) => new Date(`${local}+05:30`);

describe("isDiwaliCampaignActive", () => {
  it("is on through 12 Nov 23:59:59 IST", () => {
    expect(isDiwaliCampaignActive(ist("2026-11-02T12:00:00"), undefined)).toBe(true);
    expect(isDiwaliCampaignActive(ist("2026-11-12T23:59:00"), undefined)).toBe(true);
    expect(isDiwaliCampaignActive(ist("2026-11-12T23:59:59"), undefined)).toBe(true);
  });

  it("is off from 13 Nov 00:00 IST", () => {
    expect(isDiwaliCampaignActive(ist("2026-11-13T00:00:00"), undefined)).toBe(false);
    expect(isDiwaliCampaignActive(ist("2026-12-01T10:00:00"), undefined)).toBe(false);
  });

  it("does not depend on the visitor's timezone", () => {
    // 13 Nov 00:00 IST is still the afternoon of 12 Nov in New York.
    expect(isDiwaliCampaignActive(new Date("2026-11-12T14:30:00-05:00"), undefined)).toBe(false);
  });

  it("can be switched off early, but never kept on after the window", () => {
    expect(isDiwaliCampaignActive(ist("2026-11-05T10:00:00"), "off")).toBe(false);
    expect(isDiwaliCampaignActive(ist("2026-11-13T00:00:00"), "on")).toBe(false);
  });
});
