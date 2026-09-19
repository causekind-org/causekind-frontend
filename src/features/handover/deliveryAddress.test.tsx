import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HandoverNextAction } from "./HandoverNextAction";
import { HandoverDeliveryPanel, type DeliveryAddressActions } from "./HandoverDeliveryAddress";
import { deliveryAddressState, nextStepCopy, type HandoverDelivery, type HandoverViewModel } from "./model";

/**
 * The courier delivery address in the Handover Hub: the donor asks, the recipient
 * answers — by hand or from their profile — and the donor sees where to send it.
 * While it's missing it replaces the confirmation step, since nothing can ship.
 */

// The map pin loads Google Maps; not what's under test here.
vi.mock("./HandoverMapPinField", () => ({ HandoverMapPinField: () => <div data-testid="map-pin" /> }));

const noDelivery: HandoverDelivery = {
  needed: true, address: null, latitude: null, longitude: null,
  contactName: null, contactPhone: null, requestedAt: null, submittedAt: null,
};

function vm(role: "DONOR" | "DONEE", delivery: Partial<HandoverDelivery> = {}): HandoverViewModel {
  return {
    flow: "OFFER", id: 7, role, state: "ready_to_handover", rawStatus: "HANDOVER_IN_PROGRESS",
    title: "School bags", imageUrl: null, transactionCode: "CK-00007",
    counterpart: { name: role === "DONOR" ? "Asha" : "Ravi", phone: null }, donorAllowsDoneeCall: false,
    schedule: {
      method: "COURIER", methodLabel: "Courier", scheduledAt: new Date().toISOString(), address: "Andheri",
      latitude: null, longitude: null, notes: null, rescheduleCount: 0, maxReschedules: 2, atRisk: false,
    },
    confirmation: {
      donorConfirmedAt: null, donorConfirmedQty: null, doneeConfirmedAt: null,
      doneeConfirmedQty: null, conditionRating: null, partlyConfirmed: false,
    },
    methodOptions: [], certificateCode: null, certificateHref: null, closed: false,
    offeredQuantity: 5, delivery: { ...noDelivery, ...delivery },
  };
}

function actions(over: Partial<DeliveryAddressActions> = {}): DeliveryAddressActions {
  return {
    request: vi.fn().mockResolvedValue(undefined),
    submit: vi.fn().mockResolvedValue(undefined),
    suggest: vi.fn().mockResolvedValue({
      address: "Flat 4, Sai Krupa, Virar, 401303", latitude: 19.46, longitude: 72.8,
      contactName: "Asha Devi", contactPhone: "9876543210",
    }),
    ...over,
  };
}

function nextAction(v: HandoverViewModel, a: DeliveryAddressActions) {
  return render(
    <HandoverNextAction vm={v} otp={null} onSchedule={vi.fn()} onGenerateOtp={vi.fn()}
      onDonorConfirm={vi.fn()} onDoneeConfirm={vi.fn()} onChanged={vi.fn()} deliveryActions={a} />,
  );
}

describe("delivery address state", () => {
  it("reads awaiting, requested, provided and recheck from the timestamps", () => {
    expect(deliveryAddressState(vm("DONOR"))).toBe("awaiting");
    expect(deliveryAddressState(vm("DONOR", { requestedAt: "2026-09-19T10:00:00Z" }))).toBe("requested");
    expect(deliveryAddressState(vm("DONOR", {
      address: "Flat 4, Station Road", submittedAt: "2026-09-19T11:00:00Z", requestedAt: "2026-09-19T10:00:00Z",
    }))).toBe("provided");
    expect(deliveryAddressState(vm("DONOR", {
      address: "Flat 4, Station Road", submittedAt: "2026-09-19T11:00:00Z", requestedAt: "2026-09-19T12:00:00Z",
    }))).toBe("recheck");
    expect(deliveryAddressState(vm("DONOR", { needed: false }))).toBe("not_needed");
  });
});

describe("donor", () => {
  it("is asked to request the address instead of confirming the handover", async () => {
    const a = actions();
    nextAction(vm("DONOR"), a);
    expect(screen.getByText("Ask for the delivery address")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /I handed it over/ })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /Request delivery address/ }));
    expect(a.request).toHaveBeenCalled();
    expect(await screen.findByText(/they've been notified/)).toBeInTheDocument();
  });

  it("sees where to send it once the recipient has answered", () => {
    render(<HandoverDeliveryPanel vm={vm("DONOR", {
      address: "Flat 4, Sai Krupa, Station Road, Virar 401303", latitude: 19.46, longitude: 72.8,
      contactName: "Asha Devi", contactPhone: "98765 43210",
      requestedAt: "2026-09-19T10:00:00Z", submittedAt: "2026-09-19T11:00:00Z",
    })} actions={actions()} />);
    expect(screen.getByText("Deliver to")).toBeInTheDocument();
    expect(screen.getByText("Flat 4, Sai Krupa, Station Road, Virar 401303")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "98765 43210" })).toHaveAttribute("href", "tel:9876543210");
    expect(screen.getByRole("link", { name: /Open in Google Maps/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ask them to check it/ })).toBeInTheDocument();
  });
});

describe("recipient", () => {
  it("fills the form from their profile and sends it", async () => {
    const a = actions();
    nextAction(vm("DONEE", { requestedAt: "2026-09-19T10:00:00Z" }), a);
    expect(screen.getByText("The donor needs your delivery address")).toBeInTheDocument();

    const send = screen.getByRole("button", { name: /Send to donor/ });
    expect(send).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Use my profile details/ }));
    expect(await screen.findByDisplayValue("Flat 4, Sai Krupa, Virar, 401303")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Asha Devi")).toBeInTheDocument();

    await userEvent.click(send);
    expect(a.submit).toHaveBeenCalledWith({
      address: "Flat 4, Sai Krupa, Virar, 401303", contactName: "Asha Devi",
      contactPhone: "9876543210", latitude: 19.46, longitude: 72.8,
    });
  });

  it("can type it by hand, and a short phone number isn't accepted", async () => {
    const a = actions();
    nextAction(vm("DONEE"), a);
    await userEvent.type(screen.getByLabelText(/Name for the courier/), "Asha");
    await userEvent.type(screen.getByLabelText(/Phone number/), "12345");
    await userEvent.type(screen.getByLabelText(/Full delivery address/), "Room 2, Gandhi Chawl, Virar East 401305");
    expect(screen.getByText("Enter 10 to 15 digits.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send to donor/ })).toBeDisabled();
  });

  it("can add the address before the donor asks", () => {
    expect(nextStepCopy(vm("DONEE")).title).toBe("Add your delivery address");
  });
});

it("nothing is shown when the method doesn't ship the item", () => {
  const { container } = render(<HandoverDeliveryPanel vm={vm("DONEE", { needed: false })} actions={actions()} />);
  expect(container).toBeEmptyDOMElement();
});
