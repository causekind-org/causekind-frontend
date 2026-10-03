import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MatchHandoverHubPage from "@/app/matches/[id]/handover/page";
import { resolveHandoverState, resolveRole } from "./model";
import { adaptMatch } from "./adapters";
import type { ItemMatch } from "@/lib/api";

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.scrollTo = vi.fn();
});

const { authState, mockMatch } = vi.hoisted(() => {
  const match: ItemMatch = {
    id: 4,
    matchType: "REQUEST_LISTING",
    listingId: 10,
    listingTitle: "Warm Winter Jacket",
    requestId: 20,
    requestTitle: "Warm Winter Jacket",
    donorId: 1,
    donorName: "John Donor",
    donorEmail: "donor@example.com",
    donorCity: "Mumbai",
    donorLatitude: null,
    donorLongitude: null,
    donorContact: "+91 9876543210",
    doneeId: 2,
    doneeName: "Jane Donee",
    doneeEmail: "donee@example.com",
    doneeCity: "Pune",
    doneeLatitude: null,
    doneeLongitude: null,
    doneeContact: "+91 9876543211",
    status: "BOTH_PARTIES_ACCEPTED",
    handoverMethod: null,
    pickupDateTime: null,
    handoverAddress: null,
    handoverLatitude: null,
    handoverLongitude: null,
    donorAllowsDoneeCall: false,
    donorConfirmedAt: null,
    donorConfirmedQty: null,
    doneeConfirmedAt: null,
    doneeConfirmedQty: null,
    doneeConditionRating: null,
    doneeConditionNotes: null,
    handoverPartlyConfirmed: false,
    logisticsAtRisk: false,
    logisticsRescheduleCount: 0,
    reservationExpiry: null,
    verifiedDeliveryCertificate: null,
    rejectionReason: null,
    matchScore: 0.95,
    scoreCategory: null,
    scoreSpec: null,
    scoreDistanceKm: null,
    scoreDistanceStage: null,
    scoreQuantity: null,
    scoreUrgency: null,
    donorImages: [],
    donorItemDescription: "Gently used warm winter jacket",
    doneeReason: "Need warm clothes for winter",
    createdAt: "2026-09-18T10:00:00Z",
    // Request snapshot
    requestCategory: "CLOTHING",
    requestQuantity: 1,
    requestUrgency: "NORMAL",
    requestCity: "Mumbai",
    requestPincode: null,
    requestDescription: null,
    requestStatus: null,
    requestImageUrl: null,
    requestLatitude: null,
    requestLongitude: null,
    requestCreatedAt: null,
    // Listing snapshot
    listingCategory: null,
    listingSubcategory: null,
    listingQuantity: null,
    listingCondition: null,
    listingCity: null,
    listingPincode: null,
    listingLocality: null,
    listingDescription: null,
    listingStatus: null,
    listingImageUrl: null,
    listingImageUrls: null,
    listingBrand: null,
    listingModel: null,
    listingApproximateAge: null,
    listingWorkingStatus: null,
    listingKnownDefects: null,
    listingAccessoriesIncluded: null,
    listingDimensions: null,
    listingApproximateWeight: null,
    listingLatitude: null,
    listingLongitude: null,
    listingCreatedAt: null,
    // Logistics
    transportArrangedBy: null,
    transportCostBornBy: null,
    expectedDeliveryDate: null,
    packagingResponsibility: null,
    deliveryAddress: null,
    allocatedQuantity: 1,
    fulfilmentNotes: null,
    // Delivery verification
    deliveryOtpVerified: false,
    deliveryVerificationMethod: null,
    deliveryProofUrl: null,
    callMaskingRequested: false,
    closedAt: null,
    hiddenByDonor: false,
    hiddenByDonee: false,
    delivery: null,
  };

  return {
    authState: {
      user: { email: "donor@example.com", role: "DONOR" },
      isLoading: false,
    },
    mockMatch: match,
  };
});

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "4" }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authState.user,
    isLoading: authState.isLoading,
    isRestoring: false,
    setUser: vi.fn(),
    logout: vi.fn(),
    setAuth: vi.fn(),
  }),
}));

vi.mock("@/hooks/useEntityUpdates", () => ({
  useEntityUpdates: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    getMatch: vi.fn().mockImplementation(() => Promise.resolve(mockMatch)),
    getMatchCancellationOptions: vi.fn().mockResolvedValue({ allowed: true, outcome: "CANCEL" }),
    saveMatchLogistics: vi.fn().mockResolvedValue(mockMatch),
    generateDeliveryOtp: vi.fn().mockResolvedValue({ otp: "123456" }),
    confirmMatchHandoverDonor: vi.fn().mockResolvedValue(mockMatch),
    confirmMatchHandoverDonee: vi.fn().mockResolvedValue(mockMatch),
    setMatchDoneeCallPermission: vi.fn().mockResolvedValue(mockMatch),
    getMatchChatMessages: vi.fn().mockResolvedValue([]),
    sendMatchChatMessage: vi.fn().mockResolvedValue({}),
  };
});

describe("Handover Hub - Match in BOTH_PARTIES_ACCEPTED (unscheduled) status", () => {
  it("resolves model state to awaiting_schedule for an unscheduled BOTH_PARTIES_ACCEPTED match", () => {
    const state = resolveHandoverState({
      flow: "MATCH",
      status: "BOTH_PARTIES_ACCEPTED",
      hasSchedule: false,
      atRisk: false,
      donorConfirmedAt: null,
      doneeConfirmedAt: null,
    });
    expect(state).toBe("awaiting_schedule");

    const vm = adaptMatch(mockMatch, "donor@example.com");
    expect(vm).not.toBeNull();
    expect(vm?.role).toBe("DONOR");
    expect(vm?.state).toBe("awaiting_schedule");
    expect(vm?.schedule).toBeNull();
  });

  it("normalizes email matching case-insensitively and ignores leading/trailing whitespace", () => {
    expect(resolveRole("  DONOR@example.COM ", "donor@example.com", "donee@example.com")).toBe("DONOR");
    expect(resolveRole("Donee@Example.Com", "donor@example.com", "donee@example.com")).toBe("DONEE");
    expect(resolveRole("outsider@example.com", "donor@example.com", "donee@example.com")).toBeNull();
  });

  it("renders the schedule-handover form and controls for the DONOR, not a 404 or error", async () => {
    authState.user = { email: "donor@example.com", role: "DONOR" };
    authState.isLoading = false;

    render(<MatchHandoverHubPage />);

    // Wait for the handover hub to finish loading
    await waitFor(() => {
      expect(screen.queryByText("We couldn't load this handover")).not.toBeInTheDocument();
      expect(screen.queryByText("This handover isn't yours")).not.toBeInTheDocument();
      expect(screen.getByText("Schedule the handover")).toBeInTheDocument();
    });

    // Verify context header and next step copy
    expect(screen.getByText("Warm Winter Jacket")).toBeInTheDocument();
    expect(screen.getByText(/For Jane Donee/)).toBeInTheDocument();
    expect(screen.getByText(/Pick a time and place that works for both of you/)).toBeInTheDocument();

    // The primary action button "Schedule handover" is present
    const scheduleBtn = screen.getByRole("button", { name: /Schedule handover/i });
    expect(scheduleBtn).toBeInTheDocument();

    // Clicking "Schedule handover" opens the schedule dialog
    const user = userEvent.setup();
    await user.click(scheduleBtn);

    await waitFor(() => {
      // Dialog content renders
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Pick a time and place that works for both of you.")).toBeInTheDocument();
      expect(screen.getByLabelText(/How will it happen/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/When/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });
  });

  it("renders the waiting-for-schedule view for the DONEE, not a 404 or error", async () => {
    authState.user = { email: "donee@example.com", role: "DONEE" };
    authState.isLoading = false;

    render(<MatchHandoverHubPage />);

    // Wait for the handover hub to finish loading
    await waitFor(() => {
      expect(screen.queryByText("We couldn't load this handover")).not.toBeInTheDocument();
      expect(screen.queryByText("This handover isn't yours")).not.toBeInTheDocument();
      expect(screen.getByText("Waiting for a time to be set")).toBeInTheDocument();
    });

    // Verify donee copy
    expect(screen.getByText("Warm Winter Jacket")).toBeInTheDocument();
    expect(screen.getByText(/From John Donor/)).toBeInTheDocument();
    expect(screen.getByText(/The donor picks the date and place/)).toBeInTheDocument();

    // Donee has the "Message the donor" action
    expect(screen.getByRole("button", { name: /Message the donor/i })).toBeInTheDocument();

    // Schedule summary shows clear pre-schedule notice
    expect(screen.getAllByText("The donor hasn't set a time yet. You'll be notified as soon as they do.")[0]).toBeInTheDocument();
  });
});
