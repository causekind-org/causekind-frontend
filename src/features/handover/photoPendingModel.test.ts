import { describe, expect, it } from "vitest";
import { JOURNEY_STEPS, JOURNEY_STEPS_NGO, journeyIndex, resolveHandoverState } from "./model";

const base = { hasSchedule: true, atRisk: false, donorConfirmedAt: "t", doneeConfirmedAt: "t" };

describe("photo_pending is NGO drive offers only (donor↔donee unchanged)", () => {
  it("NGO_OFFER with the code confirmed and still in handover is photo_pending, on the Photo step", () => {
    const s = resolveHandoverState({ ...base, flow: "NGO_OFFER", status: "HANDOVER_IN_PROGRESS", otpVerified: true });
    expect(s).toBe("photo_pending");
    expect(JOURNEY_STEPS_NGO[journeyIndex(s, "NGO_OFFER")].label).toBe("Photo");
    expect(JOURNEY_STEPS_NGO.map(st => st.label)).toEqual(["Checking", "NGO reviews", "Approved", "Handover scheduled", "Photo", "Received"]);
    // Complete (issue window, issue raised, completed): past the last step, so every step is done.
    for (const done of ["issue_window", "issue_raised", "completed"] as const) expect(journeyIndex(done, "NGO_OFFER")).toBe(JOURNEY_STEPS_NGO.length);
    expect(journeyIndex("cancelled_or_failed", "NGO_OFFER")).toBe(-1);
    expect(resolveHandoverState({ ...base, flow: "NGO_OFFER", status: "HANDOVER_AT_RISK", otpVerified: true })).toBe("photo_pending");
  });

  it("OFFER and MATCH never reach photo_pending, even with otpVerified", () => {
    expect(resolveHandoverState({ ...base, flow: "OFFER", status: "HANDOVER_IN_PROGRESS", otpVerified: true })).toBe("ready_to_handover");
    expect(resolveHandoverState({ ...base, flow: "MATCH", status: "PICKED_UP", otpVerified: true })).toBe("ready_to_handover");
    expect(JOURNEY_STEPS.map(s => s.label)).toEqual(["Approved", "Scheduled", "Handover", "Confirmation", "Complete"]);
    expect(journeyIndex("ready_to_handover", "OFFER")).toBe(2);
  });
});
