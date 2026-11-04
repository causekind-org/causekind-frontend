import { describe, expect, it } from "vitest";
import { earliestEndDate, endDateOk } from "./endDate";

const now = Date.UTC(2026, 10, 4, 6);

describe("endDateOk", () => {
  it("needs a date after today", () => {
    expect(earliestEndDate(now)).toBe("2026-11-05");
    expect(endDateOk("2026-11-05", now)).toBe(true);
    expect(endDateOk("2026-11-04", now)).toBe(false);
    expect(endDateOk("2026-10-01", now)).toBe(false);
  });

  it("refuses a blank or non-date answer", () => {
    expect(endDateOk(null, now)).toBe(false);
    expect(endDateOk("", now)).toBe(false);
    expect(endDateOk("urgent", now)).toBe(false);
  });
});
