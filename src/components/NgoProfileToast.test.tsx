import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { NgoProfileToast } from "./NgoProfileToast";
import { getMyNgoApplication } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/lib/api", () => ({
  getMyNgoApplication: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: null,
    isLoading: false,
    isRestoring: false,
    setUser: vi.fn(),
    logout: vi.fn(),
    setAuth: vi.fn(),
  }),
}));

describe("NgoProfileToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when profile is complete", () => {
    render(<NgoProfileToast isProfileComplete={true} isModalOpen={false} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/Complete your profile/i)).not.toBeInTheDocument();
  });

  it("does not render while welcome modal is open", () => {
    render(<NgoProfileToast isProfileComplete={false} isModalOpen={true} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/Complete your profile/i)).not.toBeInTheDocument();
  });

  it("renders toast immediately after modal is dismissed, stays 5s, disappears, reappears every 15s", () => {
    const { rerender } = render(
      <NgoProfileToast isProfileComplete={false} isModalOpen={true} userId="101" />
    );

    // Modal is open -> no toast
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // Modal is dismissed -> isModalOpen becomes false
    rerender(<NgoProfileToast isProfileComplete={false} isModalOpen={false} userId="101" />);

    // Immediately appears (no delay)
    expect(screen.getByText("Complete your profile")).toBeInTheDocument();
    expect(screen.getByText("Unlock verification and campaigns")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Complete Now/i });
    expect(link).toHaveAttribute("href", "/profile/ngo-details");

    // After 4900ms, it is still visible
    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(screen.getByText("Complete your profile")).toBeInTheDocument();

    // After 5000ms + 380ms exit animation, toast disappears
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // After 14.5s since disappearing, still not reappeared yet
    act(() => {
      vi.advanceTimersByTime(14500);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // At 15s mark (advance 600ms), it reappears!
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText("Complete your profile")).toBeInTheDocument();

    // Stays for 5s, then disappears again
    act(() => {
      vi.advanceTimersByTime(5400);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // If profile becomes complete, loop stops permanently
    rerender(<NgoProfileToast isProfileComplete={true} isModalOpen={false} userId="101" />);
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();
  });

  it("clicking dismiss button hides the toast and restarts the 15s interval", () => {
    render(<NgoProfileToast isProfileComplete={false} isModalOpen={false} userId="102" />);

    expect(screen.getByText("Complete your profile")).toBeInTheDocument();

    const dismissBtn = screen.getByRole("button", { name: /Dismiss/i });
    act(() => {
      dismissBtn.click();
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // After 15 seconds, it reappears
    act(() => {
      vi.advanceTimersByTime(15100);
    });
    expect(screen.getByText("Complete your profile")).toBeInTheDocument();
  });

  it("does NOT render when application status in localStorage is UNDER_REVIEW", () => {
    localStorage.setItem(
      "ngo-demo-application-101",
      JSON.stringify({ status: "UNDER_REVIEW", applicationId: "CK-TEST-1" })
    );

    render(<NgoProfileToast isProfileComplete={false} isModalOpen={false} userId="101" />);

    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(screen.queryByText(/Complete your profile/i)).not.toBeInTheDocument();
  });

  it("does NOT render when application status in localStorage is APPROVED or PENDING_VERIFICATION", () => {
    localStorage.setItem(
      "ngo-application-101",
      JSON.stringify({ status: "APPROVED", applicationId: "CK-TEST-2" })
    );

    render(<NgoProfileToast isProfileComplete={false} isModalOpen={false} userId="101" />);

    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(screen.queryByText(/Complete your profile/i)).not.toBeInTheDocument();
  });

  it("stops appearing immediately and permanently when ngo-application-submitted event fires with UNDER_REVIEW", () => {
    render(<NgoProfileToast isProfileComplete={false} isModalOpen={false} userId="101" />);

    expect(screen.getByText("Complete your profile")).toBeInTheDocument();

    // Dispatch the exact event fired upon Step 6 submission
    act(() => {
      window.dispatchEvent(
        new CustomEvent("ngo-application-submitted", {
          detail: { applicationId: "CK-NGO-TEST", status: "UNDER_REVIEW" },
        })
      );
    });

    // Toast must disappear immediately
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();

    // Advance past the 15s repeat interval — toast must NOT reappear
    act(() => {
      vi.advanceTimersByTime(35000);
    });
    expect(screen.queryByText("Complete your profile")).not.toBeInTheDocument();
  });

  it("does NOT render when backend getMyNgoApplication returns status UNDER_REVIEW", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 205, email: "underreview@ngo.org", role: "NGO_PARTNER" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue({
      applicationId: "CK-NGO-REV",
      organizationName: "Review Org",
      status: "UNDER_REVIEW",
      submittedAt: "2026-09-12T10:00:00",
      verifiedAt: null,
      updatedAt: null,
      rejectionReason: null,
      needsInformationDetails: null,
    });

    render(<NgoProfileToast isProfileComplete={false} isModalOpen={false} />);

    // Wait for the backend check effect to resolve and update state
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.queryByText(/Complete your profile/i)).not.toBeInTheDocument();
  });
});
