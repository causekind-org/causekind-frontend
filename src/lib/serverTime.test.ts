import { describe, expect, it } from "vitest";
import { parseServerDate } from "./serverTime";

describe("parseServerDate", () => {
  it("reads a zone-less backend stamp as UTC (14:18 IST was showing as 08:48)", () => {
    expect(parseServerDate("2026-10-12T08:48:10.123")?.toISOString()).toBe("2026-10-12T08:48:10.123Z");
  });

  it("leaves stamps that carry a zone alone", () => {
    expect(parseServerDate("2026-10-12T14:18:00+05:30")?.toISOString()).toBe("2026-10-12T08:48:00.000Z");
    expect(parseServerDate("2026-10-12T08:48:00Z")?.toISOString()).toBe("2026-10-12T08:48:00.000Z");
  });

  it("returns null for nothing or garbage", () => {
    expect(parseServerDate(null)).toBeNull();
    expect(parseServerDate("not a date")).toBeNull();
  });
});
