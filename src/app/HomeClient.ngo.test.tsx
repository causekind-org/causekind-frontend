import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import HomeClient from "./HomeClient";
import { useAuth } from "@/hooks/useAuth";
import { getMyNgoApplication, getCampaigns, getPlatformStats, getRecentActivity, getPublicItemRequests } from "@/lib/api";

const mockReplace = vi.fn();
const mockPush = vi.fn();

// HeroSection pulls Anton from next/font/google, which has no jsdom
// implementation. Same stub heroFrontDoor.test.tsx already uses.
vi.mock("next/font/google", () => ({ Anton: () => ({ style: { fontFamily: "Anton" } }) }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => "/",
}));

vi.mock("@/lib/api", () => ({
  getMyNgoApplication: vi.fn(),
  getCampaigns: vi.fn().mockResolvedValue([]),
  getPlatformStats: vi.fn().mockResolvedValue(null),
  getRecentActivity: vi.fn().mockResolvedValue([]),
  getPublicItemRequests: vi.fn().mockResolvedValue([]),
  getItemRequests: vi.fn().mockResolvedValue([]),
  getMyProfile: vi.fn().mockResolvedValue(null),
}));

// The festive hero and board reach NewRequestLink, which reads the
// need-profile gate from context. .env.local forces the Ganpati skin on
// outside its September window, so this test renders those components and
// threw "must be used inside <NeedProfileGateProvider>" without this stub.
// Same mock the two sibling Ganpati tests already carry.
vi.mock("@/hooks/useNeedProfileGate", () => ({
  useNeedProfileGate: () => ({ requestAccess: async () => true, checking: false }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("HomeClient - NGO Experience (Root URL /)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("shows welcome modal for incomplete NGO profile on root URL, and Maybe Later dismisses it", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 101, email: "fresh@charity.org", role: "NGO_PARTNER" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue(null);

    const { unmount } = render(
      <HomeClient
        initialCampaigns={[]}
        initialStats={null}
        initialActivity={[]}
        initialItemRequests={[]}
      />
    );

    // Shows welcome modal
    await waitFor(
      () => {
        expect(screen.getByText("Complete Your Profile")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    const completeLink = screen.getByRole("link", { name: /Complete Profile Now/i });
    expect(completeLink).toHaveAttribute("href", "/dashboard/ngo/profile");

    // Dismiss with "Maybe later"
    const maybeLaterBtn = screen.getByRole("button", { name: /Maybe later/i });
    fireEvent.click(maybeLaterBtn);

    await waitFor(() => {
      expect(screen.queryByText("Complete Your Profile")).not.toBeInTheDocument();
    });

    unmount();

    // BUG 6: On fresh load/login, the modal must reappear (no sessionStorage suppression)
    render(
      <HomeClient
        initialCampaigns={[]}
        initialStats={null}
        initialActivity={[]}
        initialItemRequests={[]}
      />
    );

    await waitFor(
      () => {
        expect(screen.getByText("Complete Your Profile")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  }, 30000);

  it("submitted NGO sees full landing page (not status card) and no welcome modal", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 102, email: "submitted@charity.org", role: "NGO_PARTNER" },
      isLoading: false,
      isRestoring: false,
      setUser: vi.fn(),
      logout: vi.fn(),
      setAuth: vi.fn(),
    });
    vi.mocked(getMyNgoApplication).mockResolvedValue({
      applicationId: "CK-NGO-2026-SUBMITTED123",
      organizationName: "Submitted Charity Foundation",
      status: "UNDER_REVIEW",
      submittedAt: "2026-09-09T10:00:00",
      verifiedAt: null,
      updatedAt: "2026-09-09T10:00:00",
      rejectionReason: null,
      needsInformationDetails: null,
    });

    render(
      <HomeClient
        initialCampaigns={[]}
        initialStats={null}
        initialActivity={[]}
        initialItemRequests={[]}
      />
    );

    // Status card must NOT be present on the home page body
    await waitFor(() => {
      expect(screen.queryByText("Application Under Review")).not.toBeInTheDocument();
    });

    expect(screen.queryByText(/CK-NGO-2026-SUBMITTED123/)).not.toBeInTheDocument();
    expect(screen.queryByText(/What Happens Next/i)).not.toBeInTheDocument();

    // Welcome modal and complete profile CTA must NOT be present
    expect(screen.queryByText("Complete Your Profile")).not.toBeInTheDocument();
  }, 15000);
});
