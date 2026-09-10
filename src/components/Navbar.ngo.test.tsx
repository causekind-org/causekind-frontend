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
    expect(link).toHaveAttribute("href", "/dashboard/ngo/profile");
    expect(screen.queryByText(/Application Under Review/i)).not.toBeInTheDocument();
  });

  it("shows 'Application Under Review' button for submitted NGO application", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 202, email: "submitted@ngo.org", role: "NGO_PARTNER" },
      isLoading: false,
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
    expect(link).toHaveAttribute("href", "/dashboard/ngo/profile");
    expect(screen.queryByRole("button", { name: /Complete Profile/i })).not.toBeInTheDocument();
  });

  it("does NOT show NGO buttons for DONOR user", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 301, email: "donor@example.com", role: "DONOR" },
      isLoading: false,
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
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);

    render(<SiteHeader />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Complete Profile/i })).toBeInTheDocument();
    });

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
});
