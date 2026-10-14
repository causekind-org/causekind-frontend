import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NgoRequestCreationPage from "./page";

const mockReplace = vi.fn();
const mockUseNgoStatus = vi.fn();
const mockUseAuth = vi.fn();
let mockSearch = "";
const mockGetNgoDriveDetail = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("@/components/ngo-landing/useNgoStatus", () => ({
  useNgoStatus: () => mockUseNgoStatus(),
}));
vi.mock("@/lib/api", () => {
  class ApiError extends Error {
    status: number; data?: unknown;
    constructor(status: number, message: string, data?: unknown) { super(message); this.status = status; this.data = data; }
  }
  return {
    ApiError,
    getMyNgoApplication: vi.fn().mockResolvedValue(null),
    createNgoDrive: vi.fn(),
    updateNgoDrive: vi.fn(),
    getNgoDriveDetail: (...args: unknown[]) => mockGetNgoDriveDetail(...args),
    uploadNgoDriveReferencePhoto: vi.fn(),
  };
});
vi.mock("@/lib/toast", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

function status(overrides: Record<string, unknown>) {
  return {
    isVerified: false, isPhotosDue: false, lockReason: "", photosDueRequestName: "",
    isLoading: false, error: null, refresh: vi.fn(), canStartDrive: true, driveLockReason: "", ...overrides,
  };
}

describe("/ngo/drives/new status gate", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockUseNgoStatus.mockReset();
    mockGetNgoDriveDetail.mockReset();
    mockSearch = "";
    mockUseAuth.mockReturnValue({ user: { id: 7, email: "ngo@example.test", role: "NGO_PARTNER" }, isLoading: false });
  });

  it("keeps a verified NGO on the form after the status finishes loading", () => {
    mockUseNgoStatus.mockReturnValue(status({ isLoading: true }));
    const { rerender } = render(<NgoRequestCreationPage />);
    expect(mockReplace).not.toHaveBeenCalled();

    mockUseNgoStatus.mockReturnValue(status({ isVerified: true }));
    rerender(<NgoRequestCreationPage />);
    expect(screen.getByText("What kind of drive?")).toBeInTheDocument();

    // A later refresh (window focus, live update) reports loading again: stay put.
    mockUseNgoStatus.mockReturnValue(status({ isLoading: true }));
    rerender(<NgoRequestCreationPage />);
    expect(screen.getByText("What kind of drive?")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("shows an error with Try again instead of redirecting when the status request fails", () => {
    const refresh = vi.fn();
    mockUseNgoStatus.mockReturnValue(status({ error: "Network error", refresh }));
    render(<NgoRequestCreationPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects an NGO confirmed as not verified", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockUseNgoStatus.mockReturnValue(status({ isVerified: false }));
    render(<NgoRequestCreationPage />);

    expect(mockReplace).toHaveBeenCalledWith("/dashboard/ngo");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[NGO REDIRECT] reason:"));
    warn.mockRestore();
  });

  it("sends a logged-out visitor to login and back", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    mockUseNgoStatus.mockReturnValue(status({}));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<NgoRequestCreationPage />);
    expect(mockReplace).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/ngo/drives/new")}`);
  });

  it("opens a drive sent back for changes pre-filled, even while photos are due", async () => {
    mockSearch = "edit=42";
    mockUseNgoStatus.mockReturnValue(status({ isVerified: true, isPhotosDue: true }));
    mockGetNgoDriveDetail.mockResolvedValue({
      id: 42, status: "CHANGES_REQUESTED", title: "Winter blankets for the shelter", category: "Household",
      itemName: "Blankets", quantityNeeded: 40, unit: "PIECES", itemCondition: "NEW_ONLY",
      description: "x".repeat(40), urgency: "NORMAL", beneficiaryGroup: "Elderly", beneficiaryCount: 30,
      neededBy: "2030-01-01", availableDays: "MON,TUE", availableFrom: "10:00:00", availableTo: "17:00:00",
      contactName: "Rep", contactPhone: "9999999999",
    });
    render(<NgoRequestCreationPage />);
    await waitFor(() => expect(screen.getByDisplayValue("Winter blankets for the shelter")).toBeInTheDocument());
    expect(mockGetNgoDriveDetail).toHaveBeenCalledWith(42);
    expect(screen.queryByText("Handover photos due")).not.toBeInTheDocument();
  });
});
