import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";

/**
 * The donee dashboard shows one section at a time — Offers Received, Your
 * Requests, Matches — behind tabs, instead of one long page where an offer
 * waiting on the donee could sit below everything else. These pin which tab it
 * opens on, that switching shows only that section, that the choice survives in
 * the URL hash, and that finished offers and matches move into each tab's history.
 */

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  requests: vi.fn(),
  matches: vi.fn(),
  incomingOffers: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "asha@donee.test", role: "DONEE" }, isLoading: false }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/MyTasksCard", () => ({ MyTasksCard: () => null }));
vi.mock("@/hooks/useDynamicTranslation", () => ({ TranslatedText: ({ text }: { text: string }) => <>{text}</> }));
vi.mock("@/components/NewRequestLink", () => ({
  NewRequestLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}));
vi.mock("@/lib/api", () => ({
  getMyProfile: mocks.profile,
  getMyItemRequests: mocks.requests,
  getMyMatches: mocks.matches,
  getOffersForMyRequests: mocks.incomingOffers,
  getMyItemListings: () => Promise.resolve([]),
  getMyDonationOffers: () => Promise.resolve([]),
}));

const DAY = 24 * 60 * 60 * 1000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

const request = {
  id: 1, title: "Laptops for a computer class", category: "Electronics", quantity: 10,
  fulfilledQuantity: 4, remainingQuantity: 6, urgency: "NORMAL", city: "Virar", pincode: null,
  description: null, status: "PUBLIC_REQUEST", rejectionReason: null, doneeId: 7, doneeName: "Asha Devi",
  createdAt: iso(20 * DAY), imageUrl: null, pickupRadiusKm: null, latitude: null, longitude: null,
  verificationTier: null, isEmergency: false, emergencyNature: null, incidentDate: null, verificationDueAt: null,
};

const offer = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id, status, requestId: 1, requestTitle: request.title, requestQuantity: 10, donorName: `Donor ${id}`,
  doneeName: "Asha Devi", createdAt: iso(3 * DAY), closedAt: null, compatibilityIndicator: null,
  itemDetails: { quantity: 6, condition: "Good", pickupCity: "Virar" }, media: [],
  rejectionReason: null, displayRejectionReason: null, ...over,
});

const match = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id, status, listingTitle: `Listed laptop ${id}`, requestTitle: request.title,
  donorId: 42, donorName: "Ravi", doneeId: 7, doneeName: "Asha Devi",
  createdAt: iso(10 * DAY), closedAt: null, doneeConfirmedAt: null,
  doneeConfirmedQty: null, allocatedQuantity: null, matchScore: null, handoverMethod: null,
  rejectionReason: null, ...over,
});

beforeEach(() => {
  window.history.replaceState(null, "", "/dashboard");
  // id, not just the name: the dashboard splits donor-side from donee-side
  // matches by user id — see matchSide in page.tsx.
  mocks.profile.mockResolvedValue({ id: 7, fullName: "Asha Devi", role: "DONEE", city: "Virar" });
  mocks.requests.mockResolvedValue([request]);
  mocks.matches.mockResolvedValue([]);
  mocks.incomingOffers.mockResolvedValue([]);
});

const tab = (name: RegExp) => screen.findByRole("tab", { name });
/** Waits for the tab to be the open one — the default is only chosen once offers have loaded. */
const openTab = (name: RegExp) => screen.findByRole("tab", { name, selected: true });

describe("donee dashboard sections", () => {
  it("opens on Offers when an offer is waiting for the donee's review", async () => {
    mocks.incomingOffers.mockResolvedValue([offer(11, "PENDING_DONEE_REVIEW")]);
    render(<DashboardPage />);

    await openTab(/Offers Received/);
    expect(screen.getByRole("button", { name: "Accept Offer" })).toBeInTheDocument();
    // Only the open section is on the page.
    expect(screen.queryByText("Every need travels the same road: posted, verified, matched, received.")).toBeNull();
  });

  it("opens on Your Requests when nothing is waiting", async () => {
    render(<DashboardPage />);

    await openTab(/Your Requests/);
    expect(screen.getByText("4 / 10")).toBeInTheDocument();
    expect(screen.queryByText("Donation Offers Received")).toBeNull();
  });

  it("switching tabs shows only that section and remembers it in the URL", async () => {
    render(<DashboardPage />);
    await openTab(/Your Requests/);
    await userEvent.click(await tab(/Matches/));

    await openTab(/Matches/);
    expect(screen.getByText("Donors whose items matched your requests.")).toBeInTheDocument();
    expect(screen.queryByText("4 / 10")).toBeNull();
    expect(window.location.hash).toBe("#matches");
  });

  it("opens the section named in the URL hash", async () => {
    window.history.replaceState(null, "", "/dashboard#matches");
    mocks.incomingOffers.mockResolvedValue([offer(11, "PENDING_DONEE_REVIEW")]);
    render(<DashboardPage />);

    await openTab(/Matches/);
    // Offers still load — and an offer awaiting review does not override the link.
    await screen.findByText("Donors whose items matched your requests.");
    expect(await tab(/Offers Received/)).toHaveAttribute("aria-selected", "false");
  });

  it("counts only live items on each tab and flags the ones waiting on the donee", async () => {
    mocks.incomingOffers.mockResolvedValue([offer(11, "PENDING_DONEE_REVIEW"), offer(12, "WITHDRAWN")]);
    mocks.matches.mockResolvedValue([match(21, "AWAITING_DONEE_CONFIRMATION"), match(22, "FULFILLED")]);
    render(<DashboardPage />);

    const offersTab = await openTab(/Offers Received/);
    expect(within(offersTab).getByText("1")).toBeInTheDocument();
    expect(offersTab).toHaveTextContent(/needs your attention/);
    const matchesTab = await tab(/Matches/);
    expect(within(matchesTab).getByText("1")).toBeInTheDocument();
    expect(matchesTab).toHaveTextContent(/needs your attention/);
    expect(await tab(/Your Requests/)).not.toHaveTextContent(/needs your attention/);
  });
});

describe("match history", () => {
  it("moves finished matches out of the live list into the Matches tab's history", async () => {
    mocks.matches.mockResolvedValue([
      match(21, "PICKUP_SCHEDULED"),
      match(22, "FULFILLED", { doneeConfirmedQty: 4, doneeConfirmedAt: iso(2 * DAY) }),
      match(23, "DONOR_REJECTED"),
    ]);
    render(<DashboardPage />);
    await openTab(/Your Requests/);
    await userEvent.click(await tab(/Matches/));
    await openTab(/Matches/);

    expect(screen.getByText("Listed laptop 21")).toBeInTheDocument();
    expect(screen.queryByText("Listed laptop 22")).toBeNull(); // collapsed until asked for

    await userEvent.click(screen.getByRole("button", { name: /Match history \(2\)/ }));
    expect(screen.getByText("Listed laptop 22")).toBeInTheDocument();
    expect(screen.getByText("Received")).toBeInTheDocument();
    expect(screen.getByText(/4 received/)).toBeInTheDocument();
    expect(screen.getByText("Donor declined")).toBeInTheDocument();
  });

  it("opens the history straight away when there are no live matches", async () => {
    mocks.matches.mockResolvedValue([match(22, "COMPLETED", { allocatedQuantity: 4 })]);
    render(<DashboardPage />);
    await openTab(/Your Requests/);
    await userEvent.click(await tab(/Matches/));
    await openTab(/Matches/);

    expect(screen.getByRole("button", { name: /Match history \(1\)/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Listed laptop 22")).toBeInTheDocument();
  });
});

describe("your requests", () => {
  it("lists pending and closed requests, excludes fulfilled ones, and shows history link", async () => {
    mocks.requests.mockResolvedValue([
      request,
      { ...request, id: 2, title: "Books for a study centre", quantity: 20, fulfilledQuantity: 20, status: "FULFILLED" },
      // Fully delivered but the status lags behind — still reads as fulfilled.
      { ...request, id: 3, title: "School bags", quantity: 5, fulfilledQuantity: 5, status: "PUBLIC_REQUEST" },
    ]);
    render(<DashboardPage />);
    await openTab(/Your Requests/);

    expect(screen.getByText("Laptops for a computer class")).toBeInTheDocument();
    expect(screen.queryByText("Fulfilled", { selector: "h4" })).toBeNull();
    expect(screen.queryByText("Books for a study centre")).toBeNull();
    expect(screen.queryByText("School bags")).toBeNull();
    expect(screen.getByRole("link", { name: /See who delivered what/ })).toHaveAttribute("href", "/dashboard/history");
  });
});

describe("offer history and matched donations", () => {
  it("keeps a recent completed donation live, and files an older one under history", async () => {
    mocks.incomingOffers.mockResolvedValue([
      offer(31, "COMPLETED", { closedAt: iso(1 * DAY) }),
      offer(32, "COMPLETED", { closedAt: iso(30 * DAY), donorName: "Meera" }),
    ]);
    render(<DashboardPage />);
    await openTab(/Your Requests/);
    await userEvent.click(await tab(/Offers Received/));
    await openTab(/Offers Received/);

    // The recent one keeps its "Report a problem" window on the live list.
    expect(screen.getByRole("link", { name: "Report a problem" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Offer history \(1\)/ }));
    expect(screen.getByText(/6× from Meera/)).toBeInTheDocument();
  });

  it("shows Matched Donations Received panel with match-fulfilled requests", async () => {
    mocks.requests.mockResolvedValue([
      { ...request, id: 22, title: "Earbuds for study", quantity: 1, fulfilledQuantity: 1, status: "FULFILLED" },
      { ...request, id: 20, title: "Books for school", quantity: 2, fulfilledQuantity: 2, status: "FULFILLED" },
    ]);
    mocks.matches.mockResolvedValue([
      match(8, "COMPLETED", { requestId: 22, allocatedQuantity: 1, doneeConfirmedAt: iso(2 * DAY) }),
      match(6, "COMPLETED", { requestId: 20, allocatedQuantity: 2, doneeConfirmedAt: iso(10 * DAY) }),
    ]);
    render(<DashboardPage />);
    await openTab(/Your Requests/);
    await userEvent.click(await tab(/Offers Received/));
    await openTab(/Offers Received/);

    expect(screen.getByText("Matched Donations Received")).toBeInTheDocument();
    expect(screen.getByText("Earbuds for study")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/dashboard/history");
  });
});
