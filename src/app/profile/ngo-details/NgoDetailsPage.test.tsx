import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import NgoDetailsPage from "./page";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyNgoApplication,
  getNgoDraft,
  saveNgoDraft,
  submitNgoApplication,
} from "@/lib/api";

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

vi.mock("@/lib/api", () => ({
  getMyNgoApplication: vi.fn(),
  getNgoDraft: vi.fn(),
  saveNgoDraft: vi.fn(),
  submitNgoApplication: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("NgoDetailsPage (/profile/ngo-details)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders sidebar with readiness progress, 6 step navigation, and Still Needed checklist", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue({
      organizationName: "Smile Foundation",
      legalStructure: "TRUST",
      registrationNumber: "",
      registeredOfficeAddress: "",
      yearOfEstablishment: 2010,
      currentStep: "org-details",
      status: "DRAFT",
    } as any);

    render(<NgoDetailsPage />);

    await waitFor(
      () => {
        expect(screen.getAllByText("Your readiness").length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 8000 }
    );

    // Sidebar: Back to profile link
    const backToProfile = screen.getAllByRole("link", { name: /Back to profile/i })[0];
    expect(backToProfile).toHaveAttribute("href", "/profile");

    // All 6 steps present in nav
    expect(screen.getAllByRole("button", { name: /Organization Details/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Legal Documents/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Authorized Representative/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Organization Photos/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Review & Submit/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: /Email Verification/i }).length).toBeGreaterThanOrEqual(1);

    // Still Needed checklist shows incomplete items for Step 1
    expect(screen.getAllByText(/Still needed/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Registration Number/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Registered Office Address/i).length).toBeGreaterThanOrEqual(1);
  }, 15000);

  it("navigates to step when step item in sidebar is clicked", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
    vi.mocked(getNgoDraft).mockResolvedValue(null);

    render(<NgoDetailsPage />);

    await waitFor(
      () => {
        expect(screen.getAllByRole("button", { name: /Legal Documents/i }).length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 8000 }
    );

    // Click on Legal Documents in sidebar
    fireEvent.click(screen.getAllByRole("button", { name: /Legal Documents/i })[0]);

    // Should now render Legal Documents step form
    await waitFor(() => {
      expect(screen.getAllByText(/Step 2 of 6/i).length).toBeGreaterThanOrEqual(1);
    });
  }, 15000);

  it("shows already submitted state if application is UNDER_REVIEW and has button returning to /profile", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    localStorage.setItem(
      "ngo-demo-application-101",
      JSON.stringify({
        applicationId: "CK-NGO-ALREADY-SUBMITTED",
        organizationName: "Smile Foundation",
        status: "UNDER_REVIEW",
        submittedAt: "2026-09-12T10:00:00",
      })
    );

    vi.mocked(getMyNgoApplication).mockResolvedValue({
      applicationId: "CK-NGO-ALREADY-SUBMITTED",
      organizationName: "Smile Foundation",
      status: "UNDER_REVIEW",
      submittedAt: "2026-09-12T10:00:00",
      verifiedAt: null,
      updatedAt: null,
      rejectionReason: null,
      needsInformationDetails: null,
    });

    render(<NgoDetailsPage />);

    await waitFor(
      () => {
        expect(screen.getAllByText("Application submitted").length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 8000 }
    );

    expect(screen.getAllByText(/100%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/6 of 6 done/).length).toBeGreaterThanOrEqual(1);

    const returnBtn = screen.getAllByRole("link", { name: /Return to Profile/i })[0];
    expect(returnBtn).toHaveAttribute("href", "/profile");
  }, 15000);
});
