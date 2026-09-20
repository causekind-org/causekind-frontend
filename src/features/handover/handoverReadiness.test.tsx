import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { resolveHandoverState, nextStepCopy, type HandoverViewModel } from "./model";
import { HandoverNextAction } from "./HandoverNextAction";

/**
 * "Ready to hand over" must mean what the server means by it.
 *
 * <p>The hub shows "Generate code" and "I handed it over" in the
 * `ready_to_handover` state. The server only accepts either call for the
 * statuses in `ItemMatchService.HANDOVER_CONFIRMABLE_STATUSES` (and the
 * narrower list in its OTP gate); for anything else it answers 400 "OTP can
 * only be generated during handover". The frontend's set had four extra
 * statuses in it — HANDOVER_SCHEDULED, RESCHEDULED, ARRANGEMENT_AGREED and
 * TRANSPORT_DISCUSSION — so a match sitting on one of those offered the donor
 * two buttons that could only fail.
 *
 * <p>The other half is the state they fall into instead. `scheduled` used to
 * tell the donor to "generate the code below" and then render nothing at all,
 * which is how a stale match became a dead end.
 */

const base = {
  flow: "MATCH" as const,
  hasSchedule: true,
  atRisk: false,
  donorConfirmedAt: null,
  doneeConfirmedAt: null,
};

/** Exactly what ItemMatchService accepts for confirm-donor / confirm-donee. */
const SERVER_CONFIRMABLE = [
  "LOGISTICS_CONFIRMED", "PICKUP_SCHEDULED", "PICKED_UP",
  "IN_TRANSIT", "DELIVERY_ATTEMPTED", "DELIVERED_PENDING_CONFIRMATION",
];

/** Real FulfilmentStatus values the server refuses to confirm from. */
const SERVER_REFUSES = [
  "HANDOVER_SCHEDULED", "RESCHEDULED", "ARRANGEMENT_AGREED", "TRANSPORT_DISCUSSION",
  "BOTH_PARTIES_ACCEPTED",
];

describe("ready_to_handover matches the server's confirmable statuses", () => {
  it.each(SERVER_CONFIRMABLE)("%s is ready to hand over", (status) => {
    expect(resolveHandoverState({ ...base, status })).toBe("ready_to_handover");
  });

  it.each(SERVER_REFUSES)("%s is scheduled, not ready — the server would reject a confirmation", (status) => {
    expect(resolveHandoverState({ ...base, status })).toBe("scheduled");
  });

  it("still reads an offer at HANDOVER_IN_PROGRESS as ready", () => {
    expect(resolveHandoverState({ ...base, flow: "OFFER", status: "HANDOVER_IN_PROGRESS" }))
      .toBe("ready_to_handover");
  });
});

// ── The state they land in instead ──────────────────────────────────────────

function vm(over: Partial<HandoverViewModel> = {}): HandoverViewModel {
  return {
    flow: "MATCH", id: 4, role: "DONOR", state: "scheduled", rawStatus: "RESCHEDULED",
    title: "Warm Winter Jacket", imageUrl: null, transactionCode: "CK-M00004",
    counterpart: { name: "Jane Donee", phone: null }, donorAllowsDoneeCall: false,
    schedule: {
      method: "IN_PERSON", methodLabel: "In person", scheduledAt: "2026-09-25T10:00:00Z",
      address: "Somewhere", latitude: null, longitude: null, notes: null,
      rescheduleCount: 0, maxReschedules: 2, atRisk: false,
    },
    confirmation: {
      donorConfirmedAt: null, donorConfirmedQty: null,
      doneeConfirmedAt: null, doneeConfirmedQty: null,
      conditionRating: null, partlyConfirmed: false,
    },
    methodOptions: [], certificateCode: null, certificateHref: null,
    closed: false, completedAt: null, offeredQuantity: 1, delivery: null,
    ...over,
  };
}

function renderAction(model: HandoverViewModel) {
  return render(
    <HandoverNextAction
      vm={model}
      otp={null}
      onSchedule={vi.fn()}
      onGenerateOtp={vi.fn()}
      onDonorConfirm={vi.fn()}
      onDoneeConfirm={vi.fn()}
      onOpenChat={vi.fn()}
      onChanged={vi.fn()}
    />,
  );
}

describe("a scheduled handover is never a dead end", () => {
  it("does not promise the donor a code that isn't on the page", () => {
    const model = vm();
    const { body } = nextStepCopy(model);
    renderAction(model);

    // No code generator is rendered here — the server would refuse one — so the
    // copy must not send the donor looking for it.
    expect(screen.queryByRole("button", { name: /Generate code/i })).toBeNull();
    expect(body).not.toMatch(/generate the code below/i);
  });

  it("gives the donor something to do — the schedule is theirs to settle", () => {
    renderAction(vm());
    expect(screen.getByRole("button", { name: /schedul/i })).toBeInTheDocument();
  });

  it("leaves the donee waiting, with a way to reach the donor", () => {
    renderAction(vm({ role: "DONEE" }));
    expect(screen.getByRole("button", { name: /Ask for another time/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /schedul/i })).toBeNull();
  });
});
