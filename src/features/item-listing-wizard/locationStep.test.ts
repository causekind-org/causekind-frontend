import { describe, expect, it } from "vitest";
import { WIZARD_STEPS, emptyModel, stepCountWord, stepIndex } from "./wizardModel";
import { stepForField, validateStep } from "./wizardSchema";

/** The "Item location" step, restored 2026-10-08 with a map pin. */
describe("List an item: location step", () => {
  it("is step 4 of 5, with review last", () => {
    expect(WIZARD_STEPS).toEqual(["photos", "basics", "condition", "location", "review"]);
    expect(stepIndex("location") + 1).toBe(4);
    expect(stepIndex("review") + 1).toBe(5);
  });

  it("derives the sidebar subtitle from the step count", () => {
    expect(stepCountWord()).toBe("Five");
  });

  it("can never produce a 'Step 0' counter", () => {
    for (const s of WIZARD_STEPS) expect(stepIndex(s)).toBeGreaterThanOrEqual(0);
  });

  it("requires a pin and the address fields", () => {
    const errors = validateStep("location", { ...emptyModel, countryIso: "", latitude: undefined, longitude: undefined });
    expect(errors.latitude).toBe("Drop a pin on the map to continue");
    expect(errors.countryIso).toBeTruthy();
    expect(errors.stateIso).toBeTruthy();
    expect(errors.city).toBeTruthy();
    expect(errors.pincode).toBeTruthy();
    expect(errors.locality).toBeFalsy();
  });

  it("passes with a pin and a complete address", () => {
    const errors = validateStep("location", {
      ...emptyModel, countryIso: "IN", stateIso: "MH", city: "Mumbai", pincode: "400053",
      latitude: 19.1197, longitude: 72.8468,
    });
    expect(errors).toEqual({});
  });

  it("sends a pin error back to the location step", () => {
    expect(stepForField("latitude")).toBe("location");
  });
});
