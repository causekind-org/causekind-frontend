import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import MatchedDonationsClient from "./MatchedDonationsClient";

const mocks = vi.hoisted(() => ({
  listings: vi.fn(),
  matches: vi.fn(),
  push: vi.fn(),
  user: { email: "ravi@donor.test", role: "DONOR" } as { email: string; role: string } | null,
  authLoading: false,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, isLoading: mocks.authLoading }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getMyItemListings: mocks.listings,
  getMyMatches: mocks.matches,
}));

const listing = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id,
  title: `Listing ${id}`,
  category: "Electronics",
  city: "Virar",
  quantity: 1,
  condition: "Good",
  status,
  createdAt: new Date("2026-09-10T10:00:00Z").toISOString(),
  submittedAt: new Date("2026-09-10T10:00:00Z").toISOString(),
  imageUrl: null,
  ...over,
});

const match = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id,
  status,
  listingId: null,
  listingTitle: null,
  completedAt: new Date("2026-09-19T10:00:00Z").toISOString(),
  createdAt: new Date("2026-09-15T10:00:00Z").toISOString(),
  ...over,
});

describe("MatchedDonationsClient (/offers/matched)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { email: "ravi@donor.test", role: "DONOR" };
    mocks.authLoading = false;
    mocks.listings.mockResolvedValue([]);
    mocks.matches.mockResolvedValue([]);
  });

  it("redirects unauthenticated users to /login", async () => {
    mocks.user = null;
    render(<MatchedDonationsClient />);
    expect(mocks.push).toHaveBeenCalledWith("/login");
  });

  it("redirects donee users to /dashboard", async () => {
    mocks.user = { email: "donee@test.org", role: "DONEE" };
    render(<MatchedDonationsClient />);
    expect(mocks.push).toHaveBeenCalledWith("/dashboard");
  });

  it("shows empty state when no items are fulfilled", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    render(<MatchedDonationsClient />);

    expect(await screen.findByText("My Matched Donations")).toBeInTheDocument();
    expect(screen.getByText("Your listed items that were matched and donated.")).toBeInTheDocument();
    expect(screen.getByText("No fulfilled items yet.")).toBeInTheDocument();
  });

  it("renders all fulfilled items with compact card design, dates, and certificate buttons", async () => {
    mocks.listings.mockResolvedValue([
      listing(17, "FULFILLED", { title: "earbuds for study", quantity: 2, condition: "Like New", city: "Virar" }),
      listing(13, "FULFILLED", { title: "earbuds", quantity: 1, condition: "Good", city: "Mumbai" }),
      listing(10, "AVAILABLE", { title: "COOKWARE" }),
    ]);
    mocks.matches.mockResolvedValue([
      match(8, "COMPLETED", { listingId: 17, completedAt: "2026-09-19T16:04:40Z" }),
      match(6, "COMPLETED", { listingId: 13, completedAt: "2026-09-19T13:07:56Z" }),
    ]);

    render(<MatchedDonationsClient />);

    expect(await screen.findByText("My Matched Donations")).toBeInTheDocument();
    expect(screen.getByText("earbuds for study")).toBeInTheDocument();
    expect(screen.getByText("earbuds")).toBeInTheDocument();
    expect(screen.queryByText("COOKWARE")).toBeNull();

    const certLinks = screen.getAllByRole("link", { name: /Certificate/i });
    expect(certLinks).toHaveLength(2);
    expect(certLinks[0]).toHaveAttribute("href", "/certificate?matchId=8");
    expect(certLinks[1]).toHaveAttribute("href", "/certificate?matchId=6");
  });

  it("matches strictly by listingId and leaves Certificate button off if no match found", async () => {
    mocks.listings.mockResolvedValue([
      listing(25, "FULFILLED", { title: "earbuds" }),
    ]);
    // Match has same title "earbuds" but a different listingId
    mocks.matches.mockResolvedValue([
      match(99, "COMPLETED", { listingId: 999, listingTitle: "earbuds" }),
    ]);

    render(<MatchedDonationsClient />);

    expect(await screen.findByText("earbuds")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Certificate/i })).toBeNull();
  });
});
