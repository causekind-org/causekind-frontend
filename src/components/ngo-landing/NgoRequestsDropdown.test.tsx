import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NgoRequestsDropdown from "./NgoRequestsDropdown";
import * as useNgoStatusModule from "./useNgoStatus";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/ngo",
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("NgoRequestsDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders locked state for unverified NGOs with 3 items", () => {
    vi.spyOn(useNgoStatusModule, "useNgoStatus").mockReturnValue({
      status: "incomplete",
      ngoName: "Helping Hands Trust",
      stepNumber: 2,
      totalSteps: 6,
      nextIncompleteStep: "authorized-rep",
      wizardHref: "/profile/ngo-details?step=authorized-rep",
      activeRequests: 0,
      itemsPledged: 0,
      dropoffsToConfirm: 0,
      photosDue: 0,
      photosDueRequestName: "",
      documents: [],
      isVerified: false,
      isPhotosDue: false,
      canPostRequest: false,
      lockReason: "Available once CauseKind verifies your NGO.",
      hasShownWelcome: true,
      markWelcomeShown: vi.fn(),
      isError: false,
    });

    render(<NgoRequestsDropdown />);

    expect(screen.getByText("Helping Hands Trust")).toBeInTheDocument();
    expect(screen.getByText("Profile Incomplete")).toBeInTheDocument();

    // All 3 items are present
    const postReqBtn = screen.getByRole("button", { name: /start a drive/i });
    const activeReqBtn = screen.getByRole("button", { name: /live drives/i });
    const handoversBtn = screen.getByRole("button", { name: /handovers & photos/i });

    expect(postReqBtn).toHaveAttribute("aria-disabled", "true");
    expect(activeReqBtn).toHaveAttribute("aria-disabled", "true");
    expect(handoversBtn).toHaveAttribute("aria-disabled", "true");

    // Clicking locked item triggers locked toast
    fireEvent.click(postReqBtn);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("renders active links for verified NGOs", () => {
    vi.spyOn(useNgoStatusModule, "useNgoStatus").mockReturnValue({
      status: "verified",
      ngoName: "Goonj Foundation",
      stepNumber: 6,
      totalSteps: 6,
      nextIncompleteStep: null,
      wizardHref: "/profile/ngo-details",
      activeRequests: 3,
      itemsPledged: 12,
      dropoffsToConfirm: 1,
      photosDue: 0,
      photosDueRequestName: "",
      documents: [],
      isVerified: true,
      isPhotosDue: false,
      canPostRequest: true,
      lockReason: "",
      hasShownWelcome: true,
      markWelcomeShown: vi.fn(),
      isError: false,
    });

    render(<NgoRequestsDropdown />);

    expect(screen.getByText("Goonj Foundation")).toBeInTheDocument();
    expect(screen.getByText("Verified NGO Partner")).toBeInTheDocument();

    // Links are active
    const postReqLink = screen.getByRole("link", { name: /start a drive/i });
    const activeReqLink = screen.getByRole("link", { name: /live drives/i });
    const handoversLink = screen.getByRole("link", { name: /handovers & photos/i });

    expect(postReqLink).toHaveAttribute("href", "/ngo/drives/new");
    expect(activeReqLink).toHaveAttribute("href", "/requests");
    expect(handoversLink).toHaveAttribute("href", "/ngo/handovers");
  });
});
