import { describe, expect, it } from "vitest";

import { hasNavratriPreview, isNavratriCampaignActive } from "./navratri";

// IST is UTC+5:30, so an IST wall-clock time is that time minus 5:30 in UTC.
const ist = (local: string) => new Date(`${local}+05:30`);

describe("isNavratriCampaignActive", () => {
  it("is on from 11 Oct 00:00 IST to 20 Oct 23:59 IST", () => {
    expect(isNavratriCampaignActive(ist("2026-10-11T00:00:00"), undefined)).toBe(true);
    expect(isNavratriCampaignActive(ist("2026-10-15T12:00:00"), undefined)).toBe(true);
    expect(isNavratriCampaignActive(ist("2026-10-20T23:59:00"), undefined)).toBe(true);
    expect(isNavratriCampaignActive(ist("2026-10-20T23:59:59"), undefined)).toBe(true);
  });

  it("is off at 10 Oct 23:59 IST and from 21 Oct 00:00 IST", () => {
    expect(isNavratriCampaignActive(ist("2026-10-10T23:59:00"), undefined)).toBe(false);
    expect(isNavratriCampaignActive(ist("2026-10-10T23:59:59"), undefined)).toBe(false);
    expect(isNavratriCampaignActive(ist("2026-10-21T00:00:00"), undefined)).toBe(false);
  });

  it("does not depend on the visitor's timezone", () => {
    // 11 Oct 00:00 IST is still 10 Oct in New York.
    expect(isNavratriCampaignActive(new Date("2026-10-10T14:30:00-04:00"), undefined)).toBe(true);
  });

  it("can be previewed before the window, but never after it", () => {
    const before = ist("2026-10-05T10:00:00");
    const after = ist("2026-10-21T00:00:00");

    expect(isNavratriCampaignActive(before, undefined, true)).toBe(true);
    expect(isNavratriCampaignActive(before, "on")).toBe(true);
    expect(isNavratriCampaignActive(after, undefined, true)).toBe(false);
    expect(isNavratriCampaignActive(after, "on")).toBe(false);
  });

  it("can be switched off during the window", () => {
    expect(isNavratriCampaignActive(ist("2026-10-15T12:00:00"), "off")).toBe(false);
  });
});

describe("hasNavratriPreview", () => {
  it("recognises ?campaign=navratri only", () => {
    expect(hasNavratriPreview("?campaign=navratri")).toBe(true);
    expect(hasNavratriPreview("?foo=1&campaign=navratri")).toBe(true);
    expect(hasNavratriPreview("?campaign=diwali")).toBe(false);
    expect(hasNavratriPreview("")).toBe(false);
  });
});
