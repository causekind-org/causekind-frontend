import { describe, expect, it } from "vitest";

import { describeMissingFlag, missingInfoLines } from "./rejectionReason";

/**
 * How a listing sent back for more information reads to the donor.
 *
 * <p>The backend stores those reasons as `missingFlags` — a `|`-joined list that
 * mixes internal snake_case flags with whatever sentence the adjudicator wrote —
 * and the dashboard rendered it straight into "Admin note:". A donor was shown
 *
 * <pre>at_least_two_photos|At least two photos of the water bottle showing the
 * item, cap, and button mechanism</pre>
 *
 * an internal identifier and a pipe character, presented as if it were a message
 * written for them.
 */

describe("splitting the flags", () => {
  it("turns the real example into two readable lines", () => {
    const lines = missingInfoLines(
      "at_least_two_photos|At least two photos of the water bottle showing the item, cap, and button mechanism",
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("At least two clear photos of the item.");
    expect(lines[1]).toContain("water bottle");
    // Neither the raw code nor the separator survives.
    expect(lines.join(" ")).not.toContain("at_least_two_photos");
    expect(lines.join(" ")).not.toContain("|");
  });

  it("returns nothing for an absent or empty value, so a caller can fall back", () => {
    expect(missingInfoLines(null)).toEqual([]);
    expect(missingInfoLines(undefined)).toEqual([]);
    expect(missingInfoLines("")).toEqual([]);
    expect(missingInfoLines("|  |")).toEqual([]);
  });
});

describe("individual entries", () => {
  it.each([
    ["at_least_two_photos", /two clear photos/i],
    ["approximate_age", /how old/i],
    ["known_defects", /defects/i],
    ["working_status", /working order/i],
    ["city", /city/i],
    ["pincode", /PIN or postal/i],
  ])("%s becomes a sentence", (flag, expected) => {
    expect(describeMissingFlag(flag)).toMatch(expected);
  });

  it("passes an adjudicator sentence through untouched", () => {
    // Anything with a space is already prose addressed to the donor.
    const sentence = "A photo showing the cap and button mechanism";
    expect(describeMissingFlag(sentence)).toBe(sentence);
  });

  it("relaxes an unknown flag rather than dropping it", () => {
    // A flag this build has not seen is still information; hiding it would leave
    // the donor with a blank note and no idea what to do.
    expect(describeMissingFlag("some_new_flag")).toBe("some new flag");
  });

  it("never leaks an underscore-cased identifier as-is", () => {
    for (const flag of ["at_least_two_photos", "approximate_age", "some_new_flag"]) {
      expect(describeMissingFlag(flag)).not.toContain("_");
    }
  });
});
