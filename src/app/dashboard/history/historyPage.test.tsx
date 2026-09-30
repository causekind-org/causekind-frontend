import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryPage from "./page";

/**
 * The donee's History page: each request's deliveries stacked by donor with what
 * was actually received, adding up to the request's total, and a details view per
 * delivery. The row once showed what was *offered* (25 + 10 + 10) under a total
 * built from what was received (50/50).
 */

const mocks = vi.hoisted(() => ({
  requests: vi.fn(),
  offers: vi.fn(),
  matches: vi.fn(),
  handover: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "asha@donee.test", role: "DONEE" }, isLoading: false }),
}));
vi.mock("@/hooks/useDynamicTranslation", () => ({ TranslatedText: ({ text }: { text: string }) => <>{text}</> }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <span data-testid="photo" data-src={src} aria-label={alt} />,
}));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getMyItemRequests: mocks.requests,
    getOffersForMyRequests: mocks.offers,
    getMyMatches: mocks.matches,
    getHandover: mocks.handover,
  };
});

const request = {
  id: 14, title: "need books for children", category: "Education", quantity: 50,
  fulfilledQuantity: 50, remainingQuantity: 0, urgency: "NORMAL", city: "Virar", pincode: null,
  description: null, status: "FULFILLED", rejectionReason: null, doneeId: 18, doneeName: "Varun Soni",
  createdAt: "2026-09-19T05:00:00Z", imageUrl: null, pickupRadiusKm: null, latitude: null, longitude: null,
  verificationTier: null, isEmergency: false, emergencyNature: null, incidentDate: null, verificationDueAt: null,
};

const offer = (id: number, donorName: string, offered: number, received: number | null, closedAt: string) => ({
  id, status: "COMPLETED", requestId: 14, requestTitle: request.title, requestQuantity: 50,
  donorName, doneeName: "Varun Soni", createdAt: "2026-09-19T06:00:00Z", submittedAt: "2026-09-19T06:05:00Z",
  closedAt, receivedQuantity: received, media: [],
  itemDetails: { quantity: offered, condition: "Good", pickupCity: "Virar", knownDefects: "None" },
  rejectionReason: null, displayRejectionReason: null,
});

beforeEach(() => {
  mocks.requests.mockResolvedValue([request]);
  // Offer #8 is the real case behind the bug: 10 offered, 15 handed over and confirmed.
  mocks.offers.mockResolvedValue([
    offer(7, "TE_IT_62_VARUN SONI", 25, 25, "2026-09-19T07:00:00Z"),
    offer(8, "TE_IT_62_VARUN SONI", 10, 15, "2026-09-19T08:00:00Z"),
    offer(9, "VARUN SONI", 10, 10, "2026-09-19T09:00:00Z"),
  ]);
  mocks.matches.mockResolvedValue([]);
  mocks.handover.mockResolvedValue({
    id: 1, offerId: 8, method: "COURIER", scheduledDateTime: "2026-09-19T07:30:00Z",
    locationAddress: "Virar West", locationLatitude: 19.45, locationLongitude: 72.8,
    transportArrangedBy: "DONOR", transportCostBornBy: "DONOR", rescheduleCount: 0, atRisk: false,
    courierName: "BlueDart", trackingNumber: "BD123", createdAt: "2026-09-19T07:00:00Z",
    confirmation: {
      otpVerified: true, donorConfirmedQty: 15, donorConfirmedAt: "2026-09-19T07:40:00Z",
      doneeConfirmedQty: 15, doneeConfirmedAt: "2026-09-19T07:45:00Z", doneeConditionRating: "AS_DESCRIBED",
    },
  });
});

describe("fulfilment history", () => {
  it("lists each delivery by what was received, so the rows add up to the total", async () => {
    render(<HistoryPage />);
    const rows = await screen.findAllByRole("button", { name: /View details/ });
    expect(rows).toHaveLength(3);
    expect(screen.getByText("+25")).toBeInTheDocument();
    expect(screen.getByText("+15")).toBeInTheDocument();
    expect(screen.getByText("+10")).toBeInTheDocument();
    // The one whose count differs says what was offered.
    expect(screen.getByText(/10 offered/)).toBeInTheDocument();
    // 25 + 15 + 10 = 50, so no mismatch note.
    expect(screen.queryByText(/deliveries on record add up to/)).toBeNull();
  });

  it("opens a delivery's full record: donor, recipient, quantities, timeline and handover", async () => {
    render(<HistoryPage />);
    const buttons = await screen.findAllByRole("button", { name: /View details/ });
    await userEvent.click(buttons[1]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Delivery from TE_IT_62_VARUN SONI")).toBeInTheDocument();
    expect(within(dialog).getByText("Varun Soni (you)")).toBeInTheDocument();
    expect(mocks.handover).toHaveBeenCalledWith(8);
    expect(await within(dialog).findByText("BlueDart · tracking BD123")).toBeInTheDocument();
    expect(within(dialog).getByText("You confirmed receiving it")).toBeInTheDocument();
    expect(within(dialog).getByText("Exactly as described")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Open handover record/ })).toHaveAttribute("href", "/offers/8/handover");
  });

  it("includes deliveries that came through an item match", async () => {
    mocks.offers.mockResolvedValue([offer(7, "Donor A", 25, 25, "2026-09-19T07:00:00Z")]);
    mocks.matches.mockResolvedValue([{
      id: 31, status: "COMPLETED", requestId: 14, requestTitle: request.title, listingTitle: "Story books",
      donorName: "Ravi", doneeName: "Varun Soni", createdAt: "2026-09-19T06:00:00Z", closedAt: null,
      doneeConfirmedAt: "2026-09-19T10:00:00Z", doneeConfirmedQty: 25, allocatedQuantity: 25,
      listingQuantity: 25, requestQuantity: 50, donorImages: [], verifiedDeliveryCertificate: "CK-DEL-9",
    }]);
    render(<HistoryPage />);
    expect(await screen.findByText(/item match/)).toBeInTheDocument();
    expect(screen.getAllByText("+25")).toHaveLength(2);

    await userEvent.click(screen.getAllByRole("button", { name: /View details/ })[1]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("CK-DEL-9")).toBeInTheDocument();
    expect(within(dialog).getByText("Story books")).toBeInTheDocument();
  });

  it("says so when old records don't add up to the request's count", async () => {
    mocks.offers.mockResolvedValue([offer(7, "Donor A", 25, 25, "2026-09-19T07:00:00Z")]);
    render(<HistoryPage />);
    expect(await screen.findByText(/deliveries on record add up to 25/)).toBeInTheDocument();
  });
});
