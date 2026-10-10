import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { SiteHeader } from "./Navbar";
import { useAuth } from "@/hooks/useAuth";
import { getMyNgoApplication, getMyProfile, getMyMatches } from "@/lib/api";

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api", () => ({
  getMyNgoApplication: vi.fn(),
  getMyProfile: vi.fn().mockResolvedValue(null),
  getMyMatches: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    unreadCount: 0,
    notifications: [],
    markAsRead: vi.fn(),
  }),
}));

vi.mock("@/components/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/components/SpecularButton", () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/StaggeredMenu", () => ({
  default: () => null,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("Navbar - NGO Profile Button States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows 'Complete Profile' button for incomplete NGO profile", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 201, email: "fresh@ngo.org", role: "NGO_PARTNER" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);

    render(<SiteHeader />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Complete Profile/i })).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /Complete Profile/i });
    expect(link).toHaveAttribute("href", "/profile/ngo-details");
    expect(screen.queryByText(/Application Under Review/i)).not.toBeInTheDocument();
  });

  it("shows 'Application Under Review' button for submitted NGO application", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 202, email: "submitted@ngo.org", role: "NGO_PARTNER" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue({
      applicationId: "CK-NGO-2026-SUB1",
      organizationName: "Hope NGO",
      status: "UNDER_REVIEW",
      submittedAt: "2026-09-10T10:00:00",
      verifiedAt: null,
      updatedAt: null,
      rejectionReason: null,
      needsInformationDetails: null,
    });

    render(<SiteHeader />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Application Under Review/i })).toBeInTheDocument();
    });

    const link = screen.getByRole("link", { name: /Application Under Review/i });
    expect(link).toHaveAttribute("href", "/profile/ngo-details");
    expect(screen.queryByRole("button", { name: /Complete Profile/i })).not.toBeInTheDocument();
  });

  it("does NOT show NGO buttons for DONOR user", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 301, email: "donor@example.com", role: "DONOR" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    render(<SiteHeader />);

    expect(screen.queryByRole("button", { name: /Complete Profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Application Under Review/i })).not.toBeInTheDocument();
  });

  it("updates immediately from 'Complete Profile' to 'Application Under Review' when ngo-application-submitted event is dispatched", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 203, email: "submitting@ngo.org", role: "NGO_PARTNER" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);

    render(<SiteHeader />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Complete Profile/i })).toBeInTheDocument();
    });

    vi.mocked(getMyNgoApplication).mockResolvedValue({ applicationId: "CK-NGO-TEST-99", organizationName: "Test NGO", status: "UNDER_REVIEW" } as never);
    // Simulate submission event dispatched when user completes Step 6
    act(() => {
      window.dispatchEvent(
        new CustomEvent("ngo-application-submitted", {
          detail: { applicationId: "CK-NGO-TEST-99", status: "UNDER_REVIEW" },
        })
      );
    });

    // Navbar should immediately switch to "Application Under Review" without page reload
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Application Under Review/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Complete Profile/i })).not.toBeInTheDocument();
  });
  it("labels approved organizations accurately", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 900, email: "approved@example.test", role: "NGO_PARTNER" }, isLoading: false, isRestoring: false, setUser: vi.fn(), logout: vi.fn(), setAuth: vi.fn() });
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "APPROVED", organizationName: "Approved NGO" } as never);
    render(<SiteHeader />);
    expect(await screen.findByRole("link", { name: "NGO Approved" })).toHaveAttribute("href", "/profile/ngo-details");
    expect(screen.queryByText("Application Under Review")).not.toBeInTheDocument();
  });

  it("shows 'NGO Approved' for 2 minutes after the NGO first sees it, then hides it for good", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 901, email: "fresh-approved@example.test", role: "NGO_PARTNER" }, isLoading: false, isRestoring: false, setUser: vi.fn(), logout: vi.fn(), setAuth: vi.fn() });
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "APPROVED", organizationName: "Approved NGO" } as never);
    localStorage.removeItem("ck_ngo_approved_seen_901");
    const before = Date.now();
    const { unmount } = render(<SiteHeader />);
    expect(await screen.findByRole("link", { name: "NGO Approved" })).toBeInTheDocument();
    const firstSeen = Number(localStorage.getItem("ck_ngo_approved_seen_901"));
    expect(firstSeen).toBeGreaterThanOrEqual(before);
    unmount();

    // Seen 2 minutes ago: gone, and it stays gone on later visits.
    localStorage.setItem("ck_ngo_approved_seen_901", String(Date.now() - 2 * 60 * 1000 - 1));
    render(<SiteHeader />);
    await waitFor(() => expect(getMyNgoApplication).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("link", { name: "NGO Approved" })).not.toBeInTheDocument());
    expect(screen.queryByText("NGO Approved")).not.toBeInTheDocument();
  });

  it("hides 'NGO Approved' once the 2 minutes run out while the page is open", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.mocked(useAuth).mockReturnValue({ user: { id: 902, email: "timer-approved@example.test", role: "NGO_PARTNER" }, isLoading: false, isRestoring: false, setUser: vi.fn(), logout: vi.fn(), setAuth: vi.fn() });
      vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "APPROVED", organizationName: "Approved NGO" } as never);
      localStorage.setItem("ck_ngo_approved_seen_902", String(Date.now() - 2 * 60 * 1000 + 1500));
      render(<SiteHeader />);
      expect(await screen.findByRole("link", { name: "NGO Approved" })).toBeInTheDocument();
      await act(async () => { vi.advanceTimersByTime(2000); });
      await waitFor(() => expect(screen.queryByRole("link", { name: "NGO Approved" })).not.toBeInTheDocument());
    } finally {
      vi.useRealTimers();
    }
  });

  it("other application states keep their pill (e.g. Under Review)", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 903, email: "review@example.test", role: "NGO_PARTNER" }, isLoading: false, isRestoring: false, setUser: vi.fn(), logout: vi.fn(), setAuth: vi.fn() });
    vi.mocked(getMyNgoApplication).mockResolvedValue({ status: "UNDER_REVIEW", organizationName: "Review NGO" } as never);
    localStorage.setItem("ck_ngo_approved_seen_903", String(Date.now() - 60 * 60 * 1000));
    render(<SiteHeader />);
    expect(await screen.findByRole("button", { name: /Application Under Review/i })).toBeInTheDocument();
  });

  it("renders 'Drives' pill for NGO_PARTNER, but 'Donate' (nav.donate) for DONOR", async () => {
    // 1. NGO_PARTNER
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 201, email: "fresh@ngo.org", role: "NGO_PARTNER" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);

    const { unmount } = render(<SiteHeader />);

    await waitFor(() => {
      expect(screen.getByText("Drives")).toBeInTheDocument();
    });
    expect(screen.queryByText("nav.donate")).not.toBeInTheDocument();

    const drivesLink = screen.getByText("Drives").closest("a");
    expect(drivesLink).toHaveAttribute("href", "/dashboard/ngo#live-drives");

    unmount();

    // 2. DONOR
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 301, email: "donor@example.com", role: "DONOR" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });

    render(<SiteHeader />);
    await waitFor(() => {
      expect(screen.getByText("nav.donate")).toBeInTheDocument();
    });
    expect(screen.queryByText("Drives")).not.toBeInTheDocument();
    
    const donateLink = screen.getByText("nav.donate").closest("a");
    expect(donateLink).toHaveAttribute("href", "/requests");
  });
});
