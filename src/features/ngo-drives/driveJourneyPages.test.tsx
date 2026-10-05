import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { NgoDriveOfferResponse, NgoDriveOfferHandoverRecordResponse } from "@/lib/api";

/**
 * Page states for the drive journey: the drive handover pages (donor and NGO), the give
 * success screen, the NGO dashboard progress bar and the donor's drive-offer cancel.
 */

const api = vi.hoisted(() => ({
  getNgoDriveOffer: vi.fn(),
  getNgoDriveOfferForNgo: vi.fn(),
  getNgoDriveOfferHandover: vi.fn(),
  scheduleNgoDriveOfferHandover: vi.fn(),
  rescheduleNgoDriveOfferHandover: vi.fn(),
  generateNgoDriveOfferHandoverOtp: vi.fn(),
  uploadNgoDriveReceiptPhotos: vi.fn(),
  confirmNgoDriveOfferHandoverNgo: vi.fn(),
  reportNgoDriveOfferIssue: vi.fn(),
  getNgoDrive: vi.fn(),
  getMyNgoDriveOffers: vi.fn(),
  createNgoDriveOfferDraft: vi.fn(),
}));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), ...api }));
const auth = vi.hoisted(() => ({ user: { email: "donor@x.test", role: "DONOR" } as { email: string; role: string } | null }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: auth.user, isLoading: false }) }));
vi.mock("@/hooks/useEntityUpdates", () => ({ useEntityUpdates: () => {} }));
const nav = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "7", offerId: "11" }), useRouter: () => nav }));
vi.mock("@/lib/toast", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
// The give wizard is replaced by a button that "submits" with a result.
vi.mock("@/features/ngo-drives/components/NgoDriveOfferWizard", () => ({
  NgoDriveOfferWizard: ({ onSubmitted }: { onSubmitted: (o: { quantity: number }) => void }) =>
    <button type="button" onClick={() => onSubmitted({ quantity: 3 })}>Submit offer</button>,
}));

const offer = (status: string, extra: Partial<NgoDriveOfferResponse> = {}) => ({
  id: 11, driveId: 7, status, quantity: 3, donorDisplayName: "Asha", driveTitle: "Winter blankets", ngoName: "Hope Trust",
  driveUnit: "PIECES", driveItemName: "Blankets", driveAvailableDays: ["MON", "TUE", "WED", "THU", "FRI"],
  driveAvailableFrom: "09:00", driveAvailableTo: "18:00", media: [], receiptPhotos: [],
  handoverDetails: { organizationName: "Hope Trust", registeredOfficeAddress: "12 Shanti Nagar, Pune", contactName: "Ananya", contactPhone: "9876543210" },
  ...extra,
}) as unknown as NgoDriveOfferResponse;
const plan = (extra: Partial<NgoDriveOfferHandoverRecordResponse> = {}) => ({
  id: 1, offerId: 11, method: "DROP_OFF", scheduledDateTime: "2030-01-07T10:00:00", locationAddress: null,
  locationLatitude: null, locationLongitude: null, rescheduleCount: 0, atRisk: false, confirmation: null, ...extra,
}) as unknown as NgoDriveOfferHandoverRecordResponse;
async function apiError(status: number, message: string) {
  const { ApiError } = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return new ApiError(status, message);
}

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  auth.user = { email: "donor@x.test", role: "DONOR" };
});

describe("slot rule (mirrors the server)", () => {
  it("refuses past times, days the NGO is closed and hours outside its window", async () => {
    const { slotProblem } = await import("@/features/ngo-drives/components/DriveHandover");
    expect(slotProblem(offer("NGO_ACCEPTED"), "2020-01-06", "10:00")).toMatch(/future/);
    expect(slotProblem(offer("NGO_ACCEPTED"), "2030-01-05", "10:00")).toMatch(/Mon, Tue, Wed, Thu, Fri only/); // a Saturday
    expect(slotProblem(offer("NGO_ACCEPTED"), "2030-01-07", "20:00")).toMatch(/between 09:00 and 18:00/);
    expect(slotProblem(offer("NGO_ACCEPTED"), "2030-01-07", "10:00")).toBeNull();
  });
});

describe("donor drive handover page", () => {
  const Page = async () => (await import("@/app/ngo-drive-offers/[id]/handover/page")).default;

  it("accepted: shows the NGO contact and plans a drop-off with the right method", async () => {
    api.getNgoDriveOffer.mockResolvedValue(offer("NGO_ACCEPTED"));
    api.getNgoDriveOfferHandover.mockResolvedValue(null);
    api.scheduleNgoDriveOfferHandover.mockResolvedValue(plan());
    const P = await Page();
    const { container } = render(<P />);
    expect(await screen.findByText(/NGO contact: Ananya · 9876543210/)).toBeInTheDocument();
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "2030-01-07" } });
    fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: "10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm the plan" }));
    await waitFor(() => expect(api.scheduleNgoDriveOfferHandover).toHaveBeenCalledWith(11, expect.objectContaining({ method: "DROP_OFF", scheduledDateTime: "2030-01-07T10:00:00" })));
  });

  it("an invalid slot is explained and not sent", async () => {
    api.getNgoDriveOffer.mockResolvedValue(offer("NGO_ACCEPTED"));
    api.getNgoDriveOfferHandover.mockResolvedValue(null);
    const P = await Page();
    const { container } = render(<P />);
    await screen.findByRole("button", { name: "Confirm the plan" });
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "2030-01-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm the plan" }));
    expect(await screen.findByText(/receives items on Mon, Tue, Wed, Thu, Fri only/)).toBeInTheDocument();
    expect(api.scheduleNgoDriveOfferHandover).not.toHaveBeenCalled();
  });

  it("handover planned: shows the NGO address and a big code to show the NGO", async () => {
    api.getNgoDriveOffer.mockResolvedValue(offer("HANDOVER_IN_PROGRESS"));
    api.getNgoDriveOfferHandover.mockResolvedValue(plan());
    api.generateNgoDriveOfferHandoverOtp.mockResolvedValue({ otp: "482913" });
    const P = await Page();
    render(<P />);
    expect(await screen.findByText("12 Shanti Nagar, Pune")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change the time \(2 left\)/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show my code" }));
    expect(await screen.findByText("482913")).toBeInTheDocument();
    expect(screen.getByText("Show this code to the NGO")).toBeInTheDocument();
  });

  it("completed: offers the certificate", async () => {
    api.getNgoDriveOffer.mockResolvedValue(offer("COMPLETED"));
    api.getNgoDriveOfferHandover.mockResolvedValue(plan({ confirmation: { otpVerified: true, ngoConfirmedQty: 3 } as never }));
    const P = await Page();
    render(<P />);
    expect(await screen.findByRole("link", { name: "View your certificate" })).toHaveAttribute("href", "/certificate?offerId=11&type=ngo_drive");
  });

  it("declined: shows the NGO's reason", async () => {
    api.getNgoDriveOffer.mockResolvedValue(offer("NGO_DECLINED", { ngoDeclineReason: "New blankets only" }));
    api.getNgoDriveOfferHandover.mockResolvedValue(null);
    const P = await Page();
    render(<P />);
    expect(await screen.findByText("The NGO declined this offer.")).toBeInTheDocument();
    expect(screen.getByText("Reason: New blankets only")).toBeInTheDocument();
  });

  it("a non-404 error shows the message and Retry; a 404 says not found", async () => {
    api.getNgoDriveOffer.mockRejectedValueOnce(await apiError(500, "Something went wrong on our end.")).mockResolvedValueOnce(offer("NGO_ACCEPTED"));
    api.getNgoDriveOfferHandover.mockResolvedValue(null);
    const P = await Page();
    const { unmount } = render(<P />);
    expect(await screen.findByText("Something went wrong on our end.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByRole("button", { name: "Confirm the plan" })).toBeInTheDocument();
    unmount();
    api.getNgoDriveOffer.mockRejectedValueOnce(await apiError(404, "The requested item was not found."));
    render(<P />);
    expect(await screen.findByText("Handover not found")).toBeInTheDocument();
  });
});

describe("NGO drive handover page", () => {
  const Page = async () => (await import("@/app/ngo/drives/[id]/offers/[offerId]/handover/page")).default;
  beforeEach(() => { auth.user = { email: "ngo@x.test", role: "NGO_PARTNER" }; });

  it("waiting for the donor's plan", async () => {
    api.getNgoDriveOfferForNgo.mockResolvedValue(offer("NGO_ACCEPTED"));
    api.getNgoDriveOfferHandover.mockResolvedValue(null);
    const P = await Page();
    render(<P />);
    expect(await screen.findByText(/Waiting for the donor to choose/)).toBeInTheDocument();
  });

  it("receipt photos come first: the code form stays disabled until one is uploaded", async () => {
    api.getNgoDriveOfferForNgo.mockResolvedValue(offer("HANDOVER_IN_PROGRESS"));
    api.getNgoDriveOfferHandover.mockResolvedValue(plan());
    const P = await Page();
    render(<P />);
    expect(await screen.findByText("Upload at least one photo first.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm handover" })).toBeDisabled();
    expect(screen.getByText("The donor drops off at your address")).toBeInTheDocument();
  });

  it("with a receipt photo: confirms with the code and quantity", async () => {
    api.getNgoDriveOfferForNgo.mockResolvedValue(offer("HANDOVER_IN_PROGRESS", { receiptPhotos: ["https://cdn.test/ngo-drive-receipts/11/a.png"] }));
    api.getNgoDriveOfferHandover.mockResolvedValue(plan());
    api.confirmNgoDriveOfferHandoverNgo.mockResolvedValue(plan());
    const P = await Page();
    render(<P />);
    fireEvent.change(await screen.findByLabelText("Donor's code"), { target: { value: "482913" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm handover" }));
    await waitFor(() => expect(api.confirmNgoDriveOfferHandoverNgo).toHaveBeenCalledWith(7, 11, { otp: "482913", quantity: 3 }));
  });

  it("received: the issue window lets the NGO report a problem", async () => {
    api.getNgoDriveOfferForNgo.mockResolvedValue(offer("ISSUE_WINDOW_OPEN"));
    api.getNgoDriveOfferHandover.mockResolvedValue(plan({ confirmation: { otpVerified: true, ngoConfirmedQty: 3 } as never }));
    api.reportNgoDriveOfferIssue.mockResolvedValue({ id: 1 });
    const P = await Page();
    render(<P />);
    fireEvent.click(await screen.findByText("Something wrong? Report an issue"));
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Two blankets were torn." } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    expect(await screen.findByText(/An issue was reported/)).toBeInTheDocument();
  });
});

describe("give success screen", () => {
  it("after submitting, explains what happens next", async () => {
    api.getNgoDrive.mockResolvedValue({ id: 7, title: "Winter blankets", unit: "PIECES", status: "LIVE", quantityNeeded: 10,
      quantityReceived: 0, quantityPledged: 0, ngoOrganizationName: "Hope Trust" });
    api.getMyNgoDriveOffers.mockResolvedValue([offer("DRAFT", { driveId: 7 })]);
    const P = (await import("@/app/drives/[id]/give/page")).default;
    render(<P />);
    fireEvent.click(await screen.findByRole("button", { name: "Submit offer" }));
    expect(await screen.findByText(/3 pieces reserved for this drive/)).toBeInTheDocument();
    expect(screen.getByText("The NGO accepts or declines")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Track it on your dashboard" })).toHaveAttribute("href", "/dashboard");
  });
});

describe("DriveQuantityBar", () => {
  it("shows received, on the way and still needed", async () => {
    const { DriveQuantityBar } = await import("@/features/ngo-drives/components/DriveQuantityBar");
    render(<DriveQuantityBar needed={10} received={6} pledged={3} unit="pieces" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
    expect(screen.getByText("6 pieces")).toBeInTheDocument();
    expect(screen.getByText("3 pieces")).toBeInTheDocument();
    expect(screen.getByText("1 pieces")).toBeInTheDocument();
  });
});
