import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NgoDrivesSection } from "./NgoDrivesSection";
import type { PublicNgoDrive } from "@/lib/api";

const mockGetNgoDrives = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getNgoDrives: () => mockGetNgoDrives(),
  };
});

let mockUser: { role: string; id: number } | null = null;
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, isLoading: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const SAMPLE_DRIVES: PublicNgoDrive[] = [
  {
    id: 1,
    title: "Primary School Uniforms",
    category: "Education",
    urgency: "NORMAL",
    status: "LIVE",
    quantityNeeded: 50,
    quantityReceived: 10,
    quantityPledged: 5,
    unit: "SETS",
    itemName: "School Uniforms",
    beneficiaryCount: 50,
    beneficiaryGroup: "Students",
    ngoOrganizationName: "Pratham Shiksha",
    ngoCity: "Pune",
    referencePhotoUrl: null,
    driveType: "ITEMS",
    donorCount: 4,
    neededBy: new Date(Date.now() + 10 * 86400000).toISOString(),
  },
  {
    id: 2,
    title: "Flood Relief Medicine Kits",
    category: "Medical aid",
    urgency: "CRITICAL",
    status: "LIVE",
    quantityNeeded: 100,
    quantityReceived: 80,
    quantityPledged: 20,
    unit: "KITS",
    itemName: "First Aid Kits",
    beneficiaryCount: 100,
    beneficiaryGroup: "Families",
    ngoOrganizationName: "Seva Foundation",
    ngoCity: "Kolhapur",
    referencePhotoUrl: null,
    driveType: "ITEMS",
    donorCount: 1,
    neededBy: new Date(Date.now() + 2 * 86400000).toISOString(), // 2 days left -> amber
  },
  {
    id: 3,
    title: "Blankets for Shelter",
    category: "Relief",
    urgency: "HIGH",
    status: "LIVE",
    quantityNeeded: 30,
    quantityReceived: 0,
    quantityPledged: 0,
    unit: "PIECES",
    itemName: "Warm Blankets",
    beneficiaryCount: 30,
    beneficiaryGroup: "People",
    ngoOrganizationName: "Shelter Care",
    ngoCity: "Nagpur",
    referencePhotoUrl: null,
    driveType: "ITEMS",
    donorCount: 0, // 0 -> hidden
    neededBy: new Date().toISOString(), // today -> Ends today
  },
];

describe("NgoDrivesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null; // Guest
    mockGetNgoDrives.mockResolvedValue(SAMPLE_DRIVES);
  });

  it("renders the NGO drives section with header, trust card, cards, and bottom banner", async () => {
    render(<NgoDrivesSection />);

    // Header badge & title
    expect(await screen.findByText("VERIFIED INITIATIVES")).toBeInTheDocument();
    expect(screen.getByText(/Real organisations\./i)).toBeInTheDocument();
    expect(screen.getByText(/Real impact\./i)).toBeInTheDocument();

    // Trust card
    expect(screen.getByText("Every NGO is verified")).toBeInTheDocument();
    expect(screen.getByText(/Registration, address and contact person checked/i)).toBeInTheDocument();

    // Drive cards
    expect(screen.getByText("Primary School Uniforms")).toBeInTheDocument();
    expect(screen.getByText("Flood Relief Medicine Kits")).toBeInTheDocument();
    expect(screen.getByText("Blankets for Shelter")).toBeInTheDocument();

    // Bottom banner
    expect(screen.getByText("Want to see every drive?")).toBeInTheDocument();
    const seeAllLink = screen.getByRole("link", { name: /SEE ALL DRIVES/i });
    expect(seeAllLink).toHaveAttribute("href", "/requests?source=ngo");
  });

  it("hides the whole section when zero live drives exist", async () => {
    mockGetNgoDrives.mockResolvedValue([]);
    const { container } = render(<NgoDrivesSection />);

    // Waits for load to settle and component to unmount/return null
    await vi.waitFor(() => {
      expect(screen.queryByText(/Real organisations\./i)).toBeNull();
    });

    expect(container.firstChild).toBeNull();
  });

  it("renders category chips with counts and disables zero-count categories", async () => {
    render(<NgoDrivesSection />);

    // Education has 1 drive -> enabled with count badge
    const eduChip = await screen.findByRole("button", { name: /Education/i });
    expect(eduChip).toBeEnabled();
    expect(eduChip).toHaveTextContent("1");

    // Medical aid has 1 drive -> enabled with count badge
    const medChip = screen.getByRole("button", { name: /Medical aid/i });
    expect(medChip).toBeEnabled();
    expect(medChip).toHaveTextContent("1");

    // Categories with 0 drives are muted and disabled
    const sportsChip = screen.getByRole("button", { name: /^Sports$/i });
    expect(sportsChip).toBeDisabled();
    expect(sportsChip).toHaveAttribute("aria-disabled", "true");
  });

  it("filters cards when a category chip is selected", async () => {
    const user = userEvent.setup();
    render(<NgoDrivesSection />);

    expect(await screen.findByText("Flood Relief Medicine Kits")).toBeInTheDocument();

    const eduChip = screen.getByRole("button", { name: /Education/i });
    await user.click(eduChip);

    // Only education drive is shown
    expect(screen.getByText("Primary School Uniforms")).toBeInTheDocument();
    expect(screen.queryByText("Flood Relief Medicine Kits")).toBeNull();
    expect(screen.queryByText("Blankets for Shelter")).toBeNull();

    // Switch back to All Categories
    const allChip = screen.getByRole("button", { name: /All Categories/i });
    await user.click(allChip);
    expect(screen.getByText("Flood Relief Medicine Kits")).toBeInTheDocument();
    expect(screen.getByText("Primary School Uniforms")).toBeInTheDocument();
  });

  it("shows 'View drive' for DONEE and NGO accounts instead of 'View drive & give'", async () => {
    mockUser = { role: "ROLE_DONEE", id: 99 };
    render(<NgoDrivesSection />);

    const viewLinks = await screen.findAllByRole("link", { name: /^View drive$/i });
    expect(viewLinks.length).toBeGreaterThan(0);
    expect(screen.queryByText("Give to this drive")).toBeNull();
    expect(screen.queryByText("View drive & give")).toBeNull();
  });

  it("shows 'View drive & give' linking to /drives/{id} for guest or donor accounts", async () => {
    mockUser = null; // Guest
    render(<NgoDrivesSection />);

    const defaultLinks = await screen.findAllByRole("link", { name: /View drive & give/i });
    expect(defaultLinks.length).toBe(3);
    const hrefs = defaultLinks.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/drives/1");
    expect(hrefs).toContain("/drives/2");
    expect(hrefs).toContain("/drives/3");
    expect(screen.queryByText("Give to this drive")).toBeNull();
  });

  it("renders amber days left for <= 3 days and hides donorCount when 0", async () => {
    render(<NgoDrivesSection />);

    expect(await screen.findByText("Flood Relief Medicine Kits")).toBeInTheDocument();

    // Check donorCount: Drive 1 has 4 donors, Drive 2 has 1 donor, Drive 3 has 0 (hidden)
    expect(screen.getByText("4 Donors")).toBeInTheDocument();
    expect(screen.getByText("1 Donor")).toBeInTheDocument();
    expect(screen.queryByText("0 Donors")).toBeNull();

    // Drive 3 has Ends today
    expect(screen.getByText("Ends today")).toBeInTheDocument();
  });
});
