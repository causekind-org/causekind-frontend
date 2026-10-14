import { describe, expect, it } from "vitest";
import { liveNeedProfileMissing, profileFieldsMissing, progressOf } from "./needProfileDocs";

/** Mirrors DoneeProfileService.missing() (causekind-backend) — same edge cases. */
describe("live readiness", () => {
  const full = { householdSize: 3, dependents: 0, age: 40, housingType: "RENTED", monthlyIncome: 0, incomeSource: "none", reasonCannotBuy: "Lost my job" };

  it("a fully filled form has no field items missing (0 dependents and 0 income count)", () => {
    expect(profileFieldsMissing(full)).toEqual([]);
  });

  it("applies the backend's minimums and treats whitespace as blank", () => {
    expect(profileFieldsMissing({ ...full, householdSize: 0, age: 0, dependents: -1, incomeSource: "  ", monthlyIncome: null }))
      .toEqual(["People in home", "Dependents", "Age", "Monthly household income", "Income source"]);
  });

  it("keeps the server's account and document items, in the server's order", () => {
    const server = ["Phone number", "People in home", "GOVT_ID_ANY"];
    expect(liveNeedProfileMissing(full, server)).toEqual(["Phone number", "GOVT_ID_ANY"]);
    expect(progressOf(liveNeedProfileMissing(full, server))).toEqual({ total: 13, done: 11, pct: 85 });
  });
});
