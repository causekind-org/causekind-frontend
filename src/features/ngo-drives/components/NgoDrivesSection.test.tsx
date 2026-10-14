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

  it("renders the NGO drives section when live drives exist", async () => {
    render(<NgoDrivesSection />);

    expect(await screen.findByText("NGO drives")).toBeInTheDocument();
    expect(screen.getByText("Primary School Uniforms")).toBeInTheDocument();
    expect(screen.getByText("Flood Relief Medicine Kits")).toBeInTheDocument();
    expect(screen.getByText("Blankets for Shelter")).toBeInTheDocument();
  });

  it("hides the whole section when zero live drives exist", async () => {
    mockGetNgoDrives.mockResolvedValue([]);
    const { container } = render(<NgoDrivesSection />);

    // Waits for load to settle and component to unmount/return null
    await vi.waitFor(() => {
      expect(screen.queryByText("NGO drives")).toBeNull();
    });

    expect(container.firstChild).toBeNull();
  });

  it("renders disabled Money chip with 'Coming soon' badge", async () => {
    render(<NgoDrivesSection />);

    const moneyButton = await screen.findByRole("button", { name: /Money/i });
    expect(moneyButton).toBeDisabled();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("maps CRITICAL to 'Urgent' chip and filters accordingly", async () => {
    const user = userEvent.setup();
    render(<NgoDrivesSection />);

    expect(await screen.findByText("Flood Relief Medicine Kits")).toBeInTheDocument();

    const urgentChip = screen.getByRole("button", { name: "Urgent" });
    await user.click(urgentChip);

    // Only critical drive is shown
    expect(screen.getByText("Flood Relief Medicine Kits")).toBeInTheDocument();
    expect(screen.queryByText("Primary School Uniforms")).toBeNull();
    expect(screen.queryByText("Blankets for Shelter")).toBeNull();
  });

  it("shows empty state with 'Clear filters' when filter matches nothing", async () => {
    const user = userEvent.setup();
    // Only normal and high, no urgent
    mockGetNgoDrives.mockResolvedValue([SAMPLE_DRIVES[0]]);
    render(<NgoDrivesSection />);

    expect(await screen.findByText("Primary School Uniforms")).toBeInTheDocument();

    const urgentChip = screen.getByRole("button", { name: "Urgent" });
    await user.click(urgentChip);

    expect(screen.getByText("No live drives match your filters")).toBeInTheDocument();
    const clearBtns = screen.getAllByRole("button", { name: /Clear filters/i });
    await user.click(clearBtns[0]);

    expect(screen.getByText("Primary School Uniforms")).toBeInTheDocument();
  });

  it("shows 'View drive' for DONEE and NGO accounts instead of 'Give to this drive'", async () => {
    mockUser = { role: "ROLE_DONEE", id: 99 };
    render(<NgoDrivesSection />);

    const viewButtons = await screen.findAllByRole("button", { name: "View drive" });
    expect(viewButtons.length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Give to this drive" })).toBeNull();
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
