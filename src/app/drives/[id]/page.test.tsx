import { render, screen, waitFor } from "@testing-library/react";
import DriveDetailPage from "./page";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the next/navigation hooks
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock API
const mockGetNgoDrive = vi.fn();
const mockGetMyNgoDriveOffers = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    getNgoDrive: (...args: any[]) => mockGetNgoDrive(...args),
    getMyNgoDriveOffers: (...args: any[]) => mockGetMyNgoDriveOffers(...args),
  };
});

describe("DriveDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });
    mockGetMyNgoDriveOffers.mockResolvedValue([]);
  });

  it("renders with a PublicNgoDriveDto-shaped response", async () => {
    // Setup a real-world shaped response that a donor would see
    mockGetNgoDrive.mockResolvedValue({
      id: 1,
      title: "Winter Blankets for Homeless",
      category: "Bedding",
      itemName: "Blankets",
      quantityNeeded: 50,
      unit: "pieces",
      condition: "GENTLY_USED",
      details: "Must be thick",
      description: "We are collecting blankets before winter.",
      urgency: "HIGH",
      beneficiaryGroup: "Homeless people",
      beneficiaryCount: 50,
      neededBy: "2024-11-01",
      availableDays: ["Mon", "Wed"],
      availableFrom: "10:00",
      availableTo: "14:00",
      quantityPledged: 10,
      quantityReceived: 5,
      stillNeeded: 35,
      status: "APPROVED",
      ngoOrganizationName: "Helping Hands NGO",
      ngoCity: "New Delhi",
      verified: true
    });

    render(<DriveDetailPage />);
    
    // Wait for the drive to load and check title
    expect(await screen.findByText("Winter Blankets for Homeless")).toBeInTheDocument();

    // Wait for the drive to load
    await waitFor(() => {
      expect(screen.queryByTestId("page-skeleton")).not.toBeInTheDocument();
    });

    // Check title
    expect(screen.getByText("Winter Blankets for Homeless")).toBeInTheDocument();
    
    // Check NGO name is from ngoOrganizationName (shown in the hero since the redesign)
    expect(screen.getByText("Helping Hands NGO")).toBeInTheDocument();

    // Check Description
    expect(screen.getByText("We are collecting blankets before winter.")).toBeInTheDocument();

    // Check condition rule mapping for GENTLY_USED
    expect(screen.getByText("Gently used items are welcome (clean, working, no major damage).")).toBeInTheDocument();

    // Check available days
    expect(screen.getByText("Mon, Wed, 10:00–14:00")).toBeInTheDocument();
  });
});
