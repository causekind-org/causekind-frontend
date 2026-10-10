import { describe, expect, it } from "vitest";
import { DONEE_REQUEST_STEPS, LAST_DONEE_STEP, STEP_LABELS, stepNumber } from "./doneeRequestModel";

/** Location moved out of "Need Details" into its own step (2026-10-08). */
describe("Request Support steps", () => {
  it("puts Location second, straight after Need Details", () => {
    expect(DONEE_REQUEST_STEPS).toEqual(["need-details", "location", "household-situation", "review", "declarations"]);
    expect(stepNumber("location")).toBe(2);
    expect(STEP_LABELS.location).toBe("Location");
  });

  it("still ends on Declarations", () => {
    expect(LAST_DONEE_STEP).toBe("declarations");
  });
});
