import { describe, it, expect } from "vitest";
import { isGanpatiActive, GANPATI_START, GANPATI_END } from "./isGanpatiActive";

describe("isGanpatiActive", () => {
  it("returns false before 12th September 2026 IST", () => {
    // 9 Sept 2026 12:00 IST
    const beforeDate = new Date("2026-09-09T06:30:00.000Z");
    expect(isGanpatiActive(beforeDate)).toBe(false);

    // 11 Sept 2026 23:59:59 IST (18:29:59Z)
    const justBefore = new Date("2026-09-11T18:29:59.000Z");
    expect(isGanpatiActive(justBefore)).toBe(false);
  });

  it("returns true on 12th September 2026 00:00:00 IST (exact start)", () => {
    expect(isGanpatiActive(GANPATI_START)).toBe(true);
  });

  it("returns true during the 14-day festival window (e.g. 19 Sept 2026)", () => {
    // 19 Sept 2026 14:00 IST
    const midFestival = new Date("2026-09-19T08:30:00.000Z");
    expect(isGanpatiActive(midFestival)).toBe(true);
  });

  it("returns true at the very end of 25th September 2026 IST", () => {
    expect(isGanpatiActive(GANPATI_END)).toBe(true);
  });

  it("returns false after 25th September 2026 23:59:59 IST", () => {
    // 26 Sept 2026 00:00:01 IST
    const afterDate = new Date("2026-09-25T18:30:01.000Z");
    expect(isGanpatiActive(afterDate)).toBe(false);

    // 1 Oct 2026
    const laterDate = new Date("2026-10-01T00:00:00.000Z");
    expect(isGanpatiActive(laterDate)).toBe(false);
  });

  it("honors override = 'on' even outside date window", () => {
    const today = new Date("2026-09-10T00:00:00.000Z");
    expect(isGanpatiActive(today, "on")).toBe(true);
  });

  it("honors override = 'off' even during date window", () => {
    const midFestival = new Date("2026-09-19T00:00:00.000Z");
    expect(isGanpatiActive(midFestival, "off")).toBe(false);
  });
});
