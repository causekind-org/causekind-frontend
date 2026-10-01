import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NgoDetailsPage from "./page";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyNgoApplication,
  getNgoDraft,
  resendNgoOtp,
  saveNgoDraft,
  submitNgoApplication,
  verifyNgoOtp,
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
  verifyNgoOtp: vi.fn(),
  resendNgoOtp: vi.fn(),
  uploadNgoDocument: vi.fn(),
  uploadNgoPhoto: vi.fn(),
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
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO_PARTNER" },
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
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO_PARTNER" },
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
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO_PARTNER" },
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
        expect(screen.getAllByText("Application Submitted").length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 8000 }
    );

    expect(screen.getAllByText(/100%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/6 of 6 done/).length).toBeGreaterThanOrEqual(1);

    const returnBtn = screen.getAllByRole("link", { name: /Return to Profile/i })[0];
    expect(returnBtn).toHaveAttribute("href", "/profile");
  }, 15000);

  // ── Reload between submit and OTP ──────────────────────────────────────────

  function signInAsNgo() {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "contact@smilefoundation.org", role: "NGO_PARTNER" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
  }

  const pendingApplication = {
    applicationId: "CK-NGO-2026-PENDING1",
    organizationName: "Smile Foundation",
    status: "PENDING_VERIFICATION",
    submittedAt: "2026-09-12T10:00:00",
    verifiedAt: null,
    updatedAt: null,
    rejectionReason: null,
    needsInformationDetails: null,
  };

  it("reopens the OTP step for an application that was submitted but never verified", async () => {
    signInAsNgo();
    window.scrollTo = vi.fn();
    // Submit deleted the draft, so after a reload the application is all there is.
    vi.mocked(getMyNgoApplication).mockResolvedValue(pendingApplication);
    vi.mocked(getNgoDraft).mockResolvedValue(null);

    render(<NgoDetailsPage />);

    await waitFor(
      () => expect(screen.getByRole("heading", { name: /Verify Official Email/i })).toBeInTheDocument(),
      { timeout: 8000 }
    );
    expect(screen.getByText("CK-NGO-2026-PENDING1")).toBeInTheDocument();
    expect(screen.getByText(/already submitted and is waiting for this code/i)).toBeInTheDocument();
    expect(screen.getAllByText(/5 of 6 done/).length).toBeGreaterThanOrEqual(1);

    // Nothing to go back to: the form steps are closed and there is no Back / Save draft.
    expect(screen.queryByRole("button", { name: /^Back$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save draft/i })).not.toBeInTheDocument();
    for (const stepButton of screen.getAllByRole("button", { name: /Organization Details/i })) {
      expect(stepButton).toBeDisabled();
    }
    fireEvent.click(screen.getAllByRole("button", { name: /Organization Details/i })[0]);
    expect(screen.getByRole("heading", { name: /Verify Official Email/i })).toBeInTheDocument();
  }, 15000);

  it("offers Resend immediately on the restored OTP step and verifies against the restored application", async () => {
    signInAsNgo();
    window.scrollTo = vi.fn();
    vi.mocked(getMyNgoApplication).mockResolvedValue(pendingApplication);
    vi.mocked(getNgoDraft).mockResolvedValue(null);
    vi.mocked(resendNgoOtp).mockResolvedValue({ message: "sent" });
    vi.mocked(verifyNgoOtp).mockResolvedValue({ message: "verified" });
    const user = userEvent.setup();

    render(<NgoDetailsPage />);

    const resend = await screen.findByRole("button", { name: /^Resend code$/i }, { timeout: 8000 });
    expect(resend).toBeEnabled();
    await user.click(resend);
    await waitFor(() => expect(resendNgoOtp).toHaveBeenCalledWith("CK-NGO-2026-PENDING1"));

    await user.type(screen.getByRole("textbox"), "123456");
    await waitFor(() => expect(verifyNgoOtp).toHaveBeenCalledWith("CK-NGO-2026-PENDING1", "123456"));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/profile"));
    expect(submitNgoApplication).not.toHaveBeenCalled();
  }, 20000);
});
