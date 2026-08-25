import { describe, expect, it } from "vitest";
import { independenceDayOrdinal, ordinalSuffix } from "./independence-day";

/**
 * The ordinal is the one number on the page a visitor could catch us getting
 * wrong, and the off-by-one is genuinely easy to make: 2026 is 79 *years* after
 * 1947 but the **80th** Independence Day, because 1947 itself was the first.
 */
describe("independenceDayOrdinal", () => {
  it("counts 1947 as the first, so 2026 is the eightieth", () => {
    expect(independenceDayOrdinal(new Date("2026-08-15T06:00:00.000Z"))).toBe(80);
  });

  it("agrees with India's own published usage", () => {
    // 2023 was widely marked as the 77th, which is the check that catches a
    // year-minus-1947 mistake rather than confirming our own arithmetic.
    expect(independenceDayOrdinal(new Date("2023-08-15T06:00:00.000Z"))).toBe(77);
    expect(independenceDayOrdinal(new Date("1947-08-15T06:00:00.000Z"))).toBe(1);
  });

  it("advances with the year", () => {
    expect(independenceDayOrdinal(new Date("2027-08-15T06:00:00.000Z"))).toBe(81);
  });

  /**
   * The date that matters is the Indian one. A visitor whose local clock has
   * already rolled into the next year must still see the same number as
   * everyone else — this is the case where a naive getFullYear() diverges.
   */
  it("reads the year in IST, not the viewer's timezone", () => {
    // 31 Dec 2026, 21:00 UTC is already 1 Jan 2027 in Kolkata (UTC+5:30).
    expect(independenceDayOrdinal(new Date("2026-12-31T21:00:00.000Z"))).toBe(81);
    // …and 1 Jan 2027, 00:00 UTC is still 2027 there, so no double-count.
    expect(independenceDayOrdinal(new Date("2027-01-01T00:00:00.000Z"))).toBe(81);
  });
});

describe("ordinalSuffix", () => {
  it("handles the ones that follow the last digit", () => {
    expect(ordinalSuffix(80)).toBe("th");
    expect(ordinalSuffix(81)).toBe("st");
    expect(ordinalSuffix(82)).toBe("nd");
    expect(ordinalSuffix(83)).toBe("rd");
    expect(ordinalSuffix(84)).toBe("th");
  });

  /** The exception everybody gets wrong — 11th, not 11st. */
  it("handles the teens, which do not follow their last digit", () => {
    expect(ordinalSuffix(11)).toBe("th");
    expect(ordinalSuffix(12)).toBe("th");
    expect(ordinalSuffix(13)).toBe("th");
    expect(ordinalSuffix(111)).toBe("th");
  });

  it("still works past a century", () => {
    expect(ordinalSuffix(101)).toBe("st");
    expect(ordinalSuffix(112)).toBe("th");
    expect(ordinalSuffix(121)).toBe("st");
  });
});
