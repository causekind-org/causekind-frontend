import { describe, it, expect } from "vitest";
import { formatIST, formatISTDate } from "./formatIST";

describe("formatIST", () => {
  it("formats a UTC ISO-8601 string to IST with correct time and IST suffix", () => {
    // 2026-10-22T04:51:00Z -> +05:30 -> 10:21 am IST
    const result = formatIST("2026-10-22T04:51:00Z");
    expect(result).toBe("22 Oct 2026, 10:21 am IST");
  });

  it("formats a timestamp with existing +05:30 offset correctly", () => {
    const result = formatIST("2026-10-22T10:21:00+05:30");
    expect(result).toBe("22 Oct 2026, 10:21 am IST");
  });

  it("formats ISO string without timezone as UTC by default", () => {
    const result = formatIST("2026-10-22T04:51:00");
    expect(result).toBe("22 Oct 2026, 10:21 am IST");
  });

  it("formats calendar-only date (YYYY-MM-DD) without time or day-shifting", () => {
    expect(formatIST("2026-10-22")).toBe("22 Oct 2026");
    expect(formatIST("2026-01-01")).toBe("1 Jan 2026");
    expect(formatIST("2026-12-31")).toBe("31 Dec 2026");
  });

  it("handles null, undefined, empty string gracefully", () => {
    expect(formatIST(null)).toBe("");
    expect(formatIST(undefined)).toBe("");
    expect(formatIST("")).toBe("");
  });

  it("handles Date objects", () => {
    const d = new Date("2026-10-22T04:51:00Z");
    expect(formatIST(d)).toBe("22 Oct 2026, 10:21 am IST");
  });
});

describe("formatISTDate", () => {
  it("formats date-only strings without shifting", () => {
    expect(formatISTDate("2026-10-22")).toBe("22 Oct 2026");
  });

  it("formats UTC timestamps to IST date", () => {
    // 2026-10-21T20:00:00Z in UTC is 2026-10-22T01:30:00 IST
    expect(formatISTDate("2026-10-21T20:00:00Z")).toContain("2026");
  });
});

describe("formatIST on NGO fields", () => {
  it("formats application.submittedAt correctly in IST", () => {
    expect(formatIST("2026-10-22T04:30:00Z")).toBe("22 Oct 2026, 10:00 am IST");
  });

  it("formats application.verifiedAt correctly in IST", () => {
    expect(formatIST("2026-10-22T05:00:00Z")).toBe("22 Oct 2026, 10:30 am IST");
  });

  it("formats application.updatedAt correctly in IST", () => {
    expect(formatIST("2026-10-22T06:15:00Z")).toBe("22 Oct 2026, 11:45 am IST");
  });

  it("formats journey event at timestamp correctly in IST", () => {
    expect(formatIST("2026-10-22T07:00:00Z")).toBe("22 Oct 2026, 12:30 pm IST");
  });

  it("formats activity.createdAt correctly in IST", () => {
    expect(formatIST("2026-10-22T08:00:00Z")).toBe("22 Oct 2026, 1:30 pm IST");
  });

  it("formats activity.activityDate (date-only) without shifting day", () => {
    expect(formatIST("2026-10-22")).toBe("22 Oct 2026");
  });

  it("formats handover.scheduledDateTime correctly in IST", () => {
    expect(formatIST("2026-10-22T10:00:00Z")).toBe("22 Oct 2026, 3:30 pm IST");
  });

  it("formats handover confirmation.donorConfirmedAt correctly in IST", () => {
    expect(formatIST("2026-10-22T11:00:00Z")).toBe("22 Oct 2026, 4:30 pm IST");
  });

  it("formats handover confirmation.ngoConfirmedAt correctly in IST", () => {
    expect(formatIST("2026-10-22T11:05:00Z")).toBe("22 Oct 2026, 4:35 pm IST");
  });

  it("formats drive approval reviewedAt correctly in IST", () => {
    expect(formatIST("2026-10-22T12:00:00Z")).toBe("22 Oct 2026, 5:30 pm IST");
  });

  it("formats drive liveAt correctly in IST", () => {
    expect(formatIST("2026-10-22T12:01:00Z")).toBe("22 Oct 2026, 5:31 pm IST");
  });
});
