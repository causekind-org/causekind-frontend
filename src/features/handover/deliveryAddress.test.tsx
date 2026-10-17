import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HandoverNextAction } from "./HandoverNextAction";
import { HandoverDeliveryPanel, type DeliveryAddressActions } from "./HandoverDeliveryAddress";
import { HandoverScheduleDialog } from "./HandoverScheduleDialog";
import { HandoverScheduleSummary } from "./HandoverScheduleSummary";
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
      doneeConfirmedQty: null, conditionRating: null, partlyConfirmed: false, otpVerified: false,
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
  it("is shown the delivery address step to request address from recipient", async () => {
    const a = actions();
    nextAction(vm("DONOR"), a);
    expect(screen.getByText("Ask for the delivery address")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /I handed it over/ })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /Request delivery address/ }));
    expect(a.request).toHaveBeenCalled();
    expect(await screen.findByText(/they've been notified/)).toBeInTheDocument();
  });

  it("sees recipient delivery address and can add courier details once populated", async () => {
    const a = actions({ updateCourier: vi.fn().mockResolvedValue(undefined) });
    render(<HandoverDeliveryPanel vm={vm("DONOR", {
      address: "Flat 4, Sai Krupa, Station Road, Virar 401303", latitude: 19.46, longitude: 72.8,
      contactName: "Asha Devi", contactPhone: "98765 43210",
      requestedAt: "2026-09-19T10:00:00Z", submittedAt: "2026-09-19T11:00:00Z",
    })} actions={a} />);
    expect(screen.getByText("Deliver to")).toBeInTheDocument();
    expect(screen.getByText("Flat 4, Sai Krupa, Station Road, Virar 401303")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "98765 43210" })).toHaveAttribute("href", "tel:9876543210");
    expect(screen.getByRole("link", { name: /Open in Google Maps/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ask them to check it/ })).toBeInTheDocument();

    // Donor has the Courier details card to enter courier name and tracking number
    expect(screen.getByText("Courier dispatch details")).toBeInTheDocument();
    const courierInput = screen.getByLabelText(/Courier service name/);
    const trackingInput = screen.getByLabelText(/Courier \/ Tracking number/);
    await userEvent.type(courierInput, "BlueDart Express");
    await userEvent.type(trackingInput, "BD123456789IN");
    await userEvent.click(screen.getByRole("button", { name: /Save courier details/ }));
    expect(a.updateCourier).toHaveBeenCalledWith({
      courierName: "BlueDart Express",
      trackingNumber: "BD123456789IN",
    });
  });
});

describe("recipient", () => {
  it("is asked for delivery address when requested, but NOT asked for courier details", async () => {
    const a = actions();
    nextAction(vm("DONEE", { requestedAt: "2026-09-19T10:00:00Z" }), a);
    expect(screen.getByText("The donor needs your delivery address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send to donor/ })).toBeInTheDocument();

    // Verify recipient form fields
    expect(screen.getByLabelText(/Recipient full name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact phone number/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full delivery address/)).toBeInTheDocument();

    // CRITICAL REQUIREMENT: Donee is NOT asked for courier name or tracking number
    expect(screen.queryByLabelText(/Courier service name/)).toBeNull();
    expect(screen.queryByLabelText(/Courier \/ Tracking number/)).toBeNull();

    // Recipient can autofill using profile details
    await userEvent.click(screen.getByRole("button", { name: /Use my profile details/ }));
    expect(a.suggest).toHaveBeenCalled();
    expect(screen.getByLabelText(/Recipient full name/)).toHaveValue("Asha Devi");
    expect(screen.getByLabelText(/Contact phone number/)).toHaveValue("9876543210");
    expect(screen.getByLabelText(/Full delivery address/)).toHaveValue("Flat 4, Sai Krupa, Virar, 401303");
  });

  it("sees profile delivery address in panel and can edit if needed", async () => {
    const a = actions();
    render(<HandoverDeliveryPanel vm={vm("DONEE", {
      address: "Flat 4, Sai Krupa, Virar, 401303", contactName: "Asha Devi",
      contactPhone: "9876543210", submittedAt: "2026-09-19T10:00:00Z",
    })} actions={a} />);
    expect(screen.getByText("Your delivery address")).toBeInTheDocument();
    expect(screen.getByText("Flat 4, Sai Krupa, Virar, 401303")).toBeInTheDocument();

    const editBtn = screen.getByRole("button", { name: /Edit address/ });
    await userEvent.click(editBtn);

    expect(screen.getByLabelText(/Full delivery address/)).toHaveValue("Flat 4, Sai Krupa, Virar, 401303");
    const send = screen.getByRole("button", { name: /Send to donor/ });
    expect(send).toBeEnabled();
  });

  it("has clear courier copy when address has been provided", () => {
    expect(nextStepCopy(vm("DONEE", {
      address: "Flat 4, Sai Krupa, Virar, 401303",
      submittedAt: "2026-09-19T10:00:00Z",
    })).title).toBe("Confirm what you received");
  });
});

it("nothing is shown when the method doesn't ship the item", () => {
  const { container } = render(<HandoverDeliveryPanel vm={vm("DONEE", { needed: false })} actions={actions()} />);
  expect(container).toBeEmptyDOMElement();
});

describe("courier schedule dialog and summary", () => {
  it("does not show Where field in HandoverScheduleDialog when method is COURIER and allows submission without address/pin", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const donorVm: HandoverViewModel = {
      ...vm("DONOR"),
      methodOptions: [
        { value: "COURIER", label: "Courier", hint: "A courier moves it between you." },
        { value: "IN_PERSON", label: "In person", hint: "You meet and hand it over." },
      ],
      schedule: null,
    };

    render(
      <HandoverScheduleDialog
        vm={donorVm}
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
        isReschedule={false}
      />
    );

    // "Where?" should NOT be rendered
    expect(screen.queryByLabelText(/Where\?/i)).toBeNull();
    expect(screen.getByText("Recipient delivery address")).toBeInTheDocument();
    expect(screen.getByText(/You won't need to specify a meeting location for courier delivery/i)).toBeInTheDocument();

    // Fill "When will you dispatch?"
    const whenInput = screen.getByLabelText(/When will you dispatch\?/i);
    await userEvent.type(whenInput, "2026-10-25T14:30");

    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeEnabled();
    await userEvent.click(saveButton);

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      method: "COURIER",
      address: undefined,
    }));
  });

  it("does not render meeting place Where row in HandoverScheduleSummary when method is COURIER", () => {
    const courierVm: HandoverViewModel = {
      ...vm("DONOR"),
      schedule: {
        method: "COURIER", methodLabel: "Courier", scheduledAt: "2026-10-20T10:00:00Z",
        address: "Some Old Meeting Location", latitude: 19.25, longitude: 72.86,
        notes: null, rescheduleCount: 0, maxReschedules: 2, atRisk: false,
      },
    };

    render(<HandoverScheduleSummary vm={courierVm} />);
    expect(screen.queryByText("Where")).toBeNull();
    expect(screen.queryByText("Some Old Meeting Location")).toBeNull();
  });
});

