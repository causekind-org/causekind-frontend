import { describe, expect, it } from "vitest";
import { isDriveIssueWindowOpen, driveIssueWindowLabel } from "./driveIssueWindow";

describe("drive-offer issue window (backend issueWindowEndsAt)", () => {
  const ends = "2026-10-30T11:00:00Z";
  it("open before issueWindowEndsAt, closed after", () => {
    expect(isDriveIssueWindowOpen(ends, Date.parse("2026-10-30T10:59:59Z"))).toBe(true);
    expect(isDriveIssueWindowOpen(ends, Date.parse("2026-10-30T11:00:00Z"))).toBe(false);
  });
  it("falls back to the old behaviour (open) when the field is absent", () => {
    expect(isDriveIssueWindowOpen(undefined)).toBe(true);
    expect(isDriveIssueWindowOpen(null)).toBe(true);
    expect(driveIssueWindowLabel(null)).toBeNull();
  });
  it("labels the end in IST, with no day count", () => {
    const label = driveIssueWindowLabel(ends)!;
    expect(label).toMatch(/IST|4:30/);
    expect(label).not.toMatch(/7 days/);
  });
});
