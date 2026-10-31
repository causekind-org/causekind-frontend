import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DRIVES_LOAD_TIMEOUT_MS, NgoDrivesSection } from "./NgoDrivesSection";
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
    expect(await screen.findByText("NGO DRIVES")).toBeInTheDocument();
    expect(screen.getByText(/Drives by/i)).toBeInTheDocument();
    expect(screen.getByText(/verified NGOs/i)).toBeInTheDocument();
    expect(screen.getByText("NGOs across India list the exact items they need. Pick a drive and give.")).toBeInTheDocument();

    // Trust card
    expect(screen.getByText("Every NGO is verified")).toBeInTheDocument();
    expect(screen.getByText(/registration, address and contact person/i)).toBeInTheDocument();

    // Drive cards
    expect(screen.getByText("Primary School Uniforms")).toBeInTheDocument();
    expect(screen.getByText("Flood Relief Medicine Kits")).toBeInTheDocument();
    expect(screen.getByText("Blankets for Shelter")).toBeInTheDocument();

    // Bottom banner
    expect(screen.getByText("Want to see every drive?")).toBeInTheDocument();
    const seeAllLink = screen.getByRole("link", { name: /SEE ALL DRIVES/i });
    expect(seeAllLink).toHaveAttribute("href", "/requests?type=ngos");
  });

  it("0 live drives: mirrors the Live board's empty state, with chips and banner kept", async () => {
    mockGetNgoDrives.mockResolvedValue([]);
    render(<NgoDrivesSection />);
    const empty = await screen.findByTestId("ngo-drives-empty");
    expect(empty).toHaveTextContent("No open drives in All right now");
    expect(empty).toHaveTextContent("Check back soon: verified NGOs add new drives regularly.");
    expect(empty.className).toContain("border-dashed");
    expect(empty.querySelector("svg")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /Browse donee needs/ })).toBeNull();
    expect(screen.getByRole("heading", { name: /Drives by/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All Categories/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Education/ })).toBeDisabled();
    expect(screen.getByText("Want to see every drive?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /SEE ALL DRIVES/ })).toHaveAttribute("href", "/requests?type=ngos");
  });

  describe("below 768px", () => {
    const realMatchMedia = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = ((q: string) => ({ matches: q.includes("max-width: 767px"), media: q, addEventListener() {}, removeEventListener() {} })) as never;
    });
    afterEach(() => { window.matchMedia = realMatchMedia; });

    it("shows one card with chips, dots, arrows, swipe and the more link", async () => {
      render(<NgoDrivesSection />);
      await screen.findByRole("button", { name: "Next drive" });
      expect(screen.getAllByTestId(/^ngo-drive-card-/)).toHaveLength(1);
      expect(screen.getByRole("group", { name: /Filter NGO drives/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Previous drive" })).toBeDisabled();
      expect(screen.getAllByRole("button", { name: /^Drive \d$/ })).toHaveLength(3);
      expect(screen.getByRole("link", { name: /2 more open drives/ })).toHaveAttribute("href", "/requests?type=ngos");
      expect(screen.getByText("Want to help an NGO?")).toBeInTheDocument();
      expect(screen.getByText("Documents and registration checked before a drive goes live")).toBeInTheDocument();

      const first = screen.getByTestId(/^ngo-drive-card-/).getAttribute("data-testid");
      fireEvent.click(screen.getByRole("button", { name: "Next drive" }));
      expect(screen.getByTestId(/^ngo-drive-card-/).getAttribute("data-testid")).not.toBe(first);
      const region = screen.getByRole("region", { name: "Active NGO drives" });
      fireEvent.touchStart(region, { touches: [{ clientX: 200 }] });
      fireEvent.touchEnd(region, { changedTouches: [{ clientX: 300 }] });
      expect(screen.getByTestId(/^ngo-drive-card-/).getAttribute("data-testid")).toBe(first);
    });
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

  it("guest (no auth) loads the cards, each with the locked login button", async () => {
    mockUser = null;
    render(<NgoDrivesSection />);
    const links = await screen.findAllByRole("link", { name: /Log in to give to this drive/i });
    expect(links.map((l) => l.getAttribute("href")).sort()).toEqual(["/login?next=/drives/1", "/login?next=/drives/2", "/login?next=/drives/3"]);
  });

  it("a donor sees Give to this drive", async () => {
    mockUser = { role: "ROLE_DONOR", id: 501 };
    render(<NgoDrivesSection />);
    const gives = await screen.findAllByRole("link", { name: /Give to this drive/i });
    expect(gives.length).toBeGreaterThan(0);
    gives.forEach((l) => expect(l.getAttribute("href")).toMatch(/^\/drives\/\d+$/));
    expect(screen.queryByRole("link", { name: /Log in to give/i })).toBeNull();
  });

  it("an NGO sees View drive", async () => {
    mockUser = { role: "NGO_PARTNER", id: 6 };
    render(<NgoDrivesSection />);
    expect(await screen.findAllByRole("link", { name: /^View drive$/i })).toHaveLength(3);
    expect(screen.queryByText("Give to this drive")).toBeNull();
  });

  it("remount after an aborted first request loads the cards", async () => {
    let abort: (e: unknown) => void = () => {};
    mockGetNgoDrives.mockReturnValueOnce(new Promise((_, rej) => { abort = rej; }));
    const first = render(<NgoDrivesSection />);
    first.unmount();
    abort(new DOMException("aborted", "AbortError"));
    render(<NgoDrivesSection />);
    expect(await screen.findByText("Primary School Uniforms")).toBeInTheDocument();
    expect(screen.queryByTestId("ngo-drives-error")).toBeNull();
  });

  it("a failed call shows Retry, and Retry loads the cards", async () => {
    mockGetNgoDrives.mockRejectedValueOnce(new Error("down"));
    render(<NgoDrivesSection />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Primary School Uniforms")).toBeInTheDocument();
    expect(screen.queryByTestId("ngo-drives-error")).toBeNull();
  });

  it("a call that never answers gives way to Retry after the timeout", async () => {
    vi.useFakeTimers();
    try {
      mockGetNgoDrives.mockReturnValueOnce(new Promise(() => {}));
      render(<NgoDrivesSection />);
      await act(async () => { vi.advanceTimersByTime(DRIVES_LOAD_TIMEOUT_MS); });
      expect(screen.getByTestId("ngo-drives-error")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows no days-left line and hides donorCount when 0", async () => {
    render(<NgoDrivesSection />);

    expect(await screen.findByText("Flood Relief Medicine Kits")).toBeInTheDocument();

    // Check donorCount: Drive 1 has 4 donors, Drive 2 has 1 donor, Drive 3 has 0 (hidden)
    expect(screen.getByText("Donors so far: 4")).toBeInTheDocument();
    expect(screen.getByText("Donors so far: 1")).toBeInTheDocument();
    expect(screen.getByText("Be the first donor")).toBeInTheDocument();
    expect(screen.queryByText("Donors so far: 0")).toBeNull();

    // Cards no longer show the days-left line.
    expect(screen.queryByText("Ends today")).toBeNull();
  });
});
