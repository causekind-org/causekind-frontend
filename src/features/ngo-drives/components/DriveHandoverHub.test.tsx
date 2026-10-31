import { beforeEach, describe, expect, it, vi } from "vitest";
import { configure, fireEvent, render, screen, waitFor } from "@testing-library/react";

configure({ asyncUtilTimeout: 5000 });

const api = vi.hoisted(() => ({
  generateNgoDriveOfferHandoverOtp: vi.fn(),
  uploadNgoDriveHandoverPhotos: vi.fn(),
  uploadNgoDriveReceiptPhotos: vi.fn(),
  confirmNgoDriveOfferHandoverNgo: vi.fn(),
  scheduleNgoDriveOfferHandover: vi.fn(),
  rescheduleNgoDriveOfferHandover: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<Record<string, unknown>>()), ...api }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (k: string) => k }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { email: "donor@test", role: "DONOR" }, isLoading: false }) }));

import { DriveDonorCodePanel, DriveNgoReceivePanel, DriveHandoverHub } from "./DriveHandoverHub";
import { adaptNgoOffer } from "@/features/handover/adapters";

const offer = (o: Record<string, unknown> = {}) => ({
  id: 11, driveId: 7, status: "HANDOVER_IN_PROGRESS", quantity: 3, driveTitle: "Winter blankets", ngoName: "Hope Trust",
  driveUnit: "PIECES", driveItemName: "Blankets", media: [], handoverPhotos: [], receiptPhotos: [], ...o,
}) as never;

beforeEach(() => vi.clearAllMocks());

describe("drive handover: donor code panel", () => {
  it("shows code first without photo; same code on re-click and can be renewed; shows photo step once confirmed", async () => {
    const onChanged = vi.fn();
    const { rerender } = render(<DriveDonorCodePanel offer={offer()} handover={null} onChanged={onChanged} />);

    // Code first: Show my code button is enabled without needing photos
    const showCodeBtn = screen.getByRole("button", { name: /Show my code/ });
    expect(showCodeBtn).not.toBeDisabled();

    api.generateNgoDriveOfferHandoverOtp.mockResolvedValueOnce({ otp: "123456" });
    fireEvent.click(showCodeBtn);
    expect(await screen.findByTestId("drive-otp")).toHaveTextContent("123456");
    expect(api.generateNgoDriveOfferHandoverOtp).toHaveBeenCalledWith(11);

    // Renew code
    api.generateNgoDriveOfferHandoverOtp.mockResolvedValueOnce({ otp: "654321" });
    fireEvent.click(screen.getByRole("button", { name: /Get a new code/ }));
    await waitFor(() => expect(screen.getByTestId("drive-otp")).toHaveTextContent("654321"));
    expect(api.generateNgoDriveOfferHandoverOtp).toHaveBeenLastCalledWith(11, true);

    // Once code confirmed by NGO, shows photo step
    const confirmedHandover = {
      id: 1, offerId: 11, method: "DROP_OFF", scheduledDateTime: "2030-01-07T10:00:00",
      rescheduleCount: 0, atRisk: false,
      confirmation: { otpVerified: true, ngoConfirmedQty: 3, deliveryOtp: null, otpVerifiedAt: null, donorConfirmedQty: null, donorConfirmedAt: null, ngoConfirmedAt: null },
    } as never;
    rerender(<DriveDonorCodePanel offer={offer()} handover={confirmedHandover} onChanged={onChanged} />);

    expect(screen.getByText(/The NGO confirmed your code/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Take a handover photo/ })).toBeInTheDocument();
  });
});

describe("drive handover: NGO receive panel", () => {
  it("enters code and quantity first without photo; confirms and shows photo step", async () => {
    const onChanged = vi.fn();
    const { rerender, container } = render(<DriveNgoReceivePanel offer={offer()} handover={null} onChanged={onChanged} />);

    const submitBtn = screen.getByRole("button", { name: /Confirm code & quantity/ });
    expect(submitBtn).toBeDisabled();

    // Type 6 digit OTP into InputOTP
    const otpInput = container.querySelector('input[data-input-otp="true"]')!;
    fireEvent.change(otpInput, { target: { value: "123456" } });

    // Quantity defaults to 3 (valid)
    expect(submitBtn).not.toBeDisabled();

    // Quantity over max disables
    fireEvent.change(screen.getByLabelText(/Quantity received/), { target: { value: "4" } });
    expect(submitBtn).toBeDisabled();

    // Valid partial quantity
    fireEvent.change(screen.getByLabelText(/Quantity received/), { target: { value: "2" } });
    expect(screen.getByText("The other 1 will return to still needed.")).toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();

    api.confirmNgoDriveOfferHandoverNgo.mockResolvedValue({});
    fireEvent.click(submitBtn);
    await waitFor(() => expect(api.confirmNgoDriveOfferHandoverNgo).toHaveBeenCalledWith(7, 11, { otp: "123456", quantity: 2 }));

    // Once confirmed, shows receipt photo step
    const confirmedHandover = {
      id: 1, offerId: 11, method: "DROP_OFF", scheduledDateTime: "2030-01-07T10:00:00",
      rescheduleCount: 0, atRisk: false,
      confirmation: { otpVerified: true, ngoConfirmedQty: 2, deliveryOtp: null, otpVerifiedAt: null, donorConfirmedQty: null, donorConfirmedAt: null, ngoConfirmedAt: null },
    } as never;
    rerender(<DriveNgoReceivePanel offer={offer()} handover={confirmedHandover} onChanged={onChanged} />);

    expect(screen.getByText(/Code confirmed \(2 pieces\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Take receipt photo/ })).toBeInTheDocument();
  });
});

describe("drive handover: the shared hub", () => {
  it("drop-off only offers no NGO pickup; methods map to the drive API", () => {
    const vm = adaptNgoOffer(offer({ dropOffOnly: true }), null, "d@test", "DONOR")!;
    expect(vm.methodOptions.map(m => m.value)).toEqual(["DONOR_DROP_OFF"]);
    const vm2 = adaptNgoOffer(offer(), { method: "PICKUP", scheduledDateTime: "2030-01-07T10:00:00", rescheduleCount: 0 }, "d@test", "DONOR")!;
    expect(vm2.schedule?.method).toBe("NGO_PICKUP");
  });

  it("renders in NGO green with drive wording, both photo sets and the right back link", () => {
    render(<DriveHandoverHub role="DONOR" userEmail="donor@test" onChanged={vi.fn()}
      offer={offer({ handoverPhotos: ["https://x.test/h.png"], receiptPhotos: ["https://x.test/r.png"] })}
      handover={{ method: "DROP_OFF", scheduledDateTime: "2030-01-07T10:00:00", rescheduleCount: 0 } as never} />);
    expect(document.querySelector("main")).toHaveAttribute("data-ck-role-theme", "ngo");
    expect(document.querySelector("main")?.className).toContain("handover-ngo-drive");
    expect(screen.getAllByRole("heading", { level: 1 })[0]).toHaveTextContent("Winter blankets");
    expect(screen.getByText(/Hope Trust · 3 pieces of Blankets/)).toBeInTheDocument();
    expect(screen.getByTestId("drive-photo-sets")).toHaveTextContent("From you");
    expect(screen.getByTestId("drive-photo-sets")).toHaveTextContent("From the NGO");
    expect(screen.getByTestId("drive-donor-code")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/recipient|donee/i);
  });
});

describe("code confirmed, no photo yet (offer 3's state): the photo step is next on both sides", () => {
  // What the server returns after the NGO confirms the code: both "confirmed at" times are set.
  const confirmed = {
    id: 1, scheduledDateTime: "2026-10-16T19:11:00", method: "PICKUP", atRisk: false,
    confirmation: { otpVerified: true, donorConfirmedAt: "2026-10-19T09:51:39", ngoConfirmedAt: "2026-10-19T09:51:39", donorConfirmedQty: 5, ngoConfirmedQty: 5 },
  } as never;

  for (const role of ["DONOR", "NGO"] as const) {
    it(`${role}: stepper on "Photo", "Take a handover photo" card, no "Nothing needed"`, () => {
      render(<DriveHandoverHub role={role} offer={offer({ quantity: 5 })} handover={confirmed} userEmail={role === "DONOR" ? "donor@test" : "ngo@test"} onChanged={vi.fn()} />);
      expect(screen.getByTestId("handover-photo-step")).toBeInTheDocument();
      expect(screen.getAllByText("Take a handover photo").length).toBeGreaterThan(0);
      expect(screen.queryByText(/Nothing needed from you right now/)).toBeNull();
      expect(screen.queryByRole("button", { name: /Send them a nudge/ })).toBeNull();
      const current = document.querySelector('[aria-current="step"]');
      expect(current?.textContent).toMatch(/Photo/);
    });
  }

  it("the adapter puts it in photo_pending; after completion it is the issue window", () => {
    expect(adaptNgoOffer(offer(), confirmed, "donor@test", "DONOR")?.state).toBe("photo_pending");
    expect(adaptNgoOffer(offer({ status: "ISSUE_WINDOW_OPEN" }), confirmed, "donor@test", "DONOR")?.state).toBe("issue_window");
    expect(adaptNgoOffer(offer(), { ...(confirmed as object), confirmation: { otpVerified: false, donorConfirmedAt: null, ngoConfirmedAt: null } } as never, "donor@test", "DONOR")?.state).toBe("ready_to_handover");
  });
});
