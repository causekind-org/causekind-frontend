import { describe, expect, it } from "vitest";

import {
  INDEPENDENCE_DAY_CAMPAIGN,
  isIndependenceDayCampaignActive,
} from "./independence-day";

describe("isIndependenceDayCampaignActive", () => {
  it("shows the campaign during the default 10–17 August IST window", () => {
    expect(
      isIndependenceDayCampaignActive(
        new Date("2026-08-15T06:00:00.000Z"),
        undefined,
      ),
    ).toBe(true);
  });

  it("stays hidden before and after the automatic window", () => {
    expect(
      isIndependenceDayCampaignActive(
        new Date("2026-08-09T18:29:59.999Z"),
        undefined,
      ),
    ).toBe(false);
    expect(
      isIndependenceDayCampaignActive(
        INDEPENDENCE_DAY_CAMPAIGN.endsAt,
        undefined,
      ),
    ).toBe(false);
  });

  it("honours an immediate manual on or off override", () => {
    const outsideWindow = new Date("2026-07-01T00:00:00.000Z");

    expect(isIndependenceDayCampaignActive(outsideWindow, "on")).toBe(true);
    expect(isIndependenceDayCampaignActive(new Date(), "off")).toBe(false);
  });
});
