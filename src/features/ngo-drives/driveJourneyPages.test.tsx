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

describe("give success popup", () => {
  it("after submitting, goes back to the drive page and shows what happens next in a popup", async () => {
    api.getNgoDrive.mockResolvedValue({ id: 7, title: "Winter blankets", unit: "PIECES", status: "LIVE", quantityNeeded: 10,
      quantityReceived: 0, quantityPledged: 0, ngoOrganizationName: "Hope Trust" });
    api.getMyNgoDriveOffers.mockResolvedValue([offer("DRAFT", { driveId: 7 })]);
    sessionStorage.clear();
    const P = (await import("@/app/drives/[id]/give/page")).default;
    const { unmount } = render(<P />);
    fireEvent.click(await screen.findByRole("button", { name: "Submit offer" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/drives/7?offerSent=1"));
    expect(JSON.parse(sessionStorage.getItem("ck-drive-offer-sent-7") ?? "{}")).toMatchObject({ quantity: 3, driveTitle: "Winter blankets" });
    unmount();

    // The drive page shows the same success content as a popup.
    window.history.replaceState(null, "", "/drives/7?offerSent=1");
    const D = (await import("@/app/drives/[id]/page")).default;
    render(<D />);
    const popup = await screen.findByTestId("drive-offer-sent");
    expect(popup).toHaveTextContent("Offer sent");
    expect(popup).toHaveTextContent(/3 pieces reserved for this drive/);
    expect(popup).toHaveTextContent("The NGO accepts or declines");
    expect(screen.getByRole("link", { name: "Track it on your dashboard" })).toHaveAttribute("href", "/dashboard");
    fireEvent.click(screen.getByRole("button", { name: "Back to the drive" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/drives/7"));
    expect(sessionStorage.getItem("ck-drive-offer-sent-7")).toBeNull();
    window.history.replaceState(null, "", "/");
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
