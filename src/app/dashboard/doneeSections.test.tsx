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
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getMatchCancellationOptions: () => Promise.resolve({ allowed: false, outcome: "NONE", actionLabel: null }),
  getOfferCancellationOptions: () => Promise.resolve({ allowed: false, outcome: "NONE", actionLabel: null }),
  getMyProfile: mocks.profile,
  getMyItemRequests: mocks.requests,
  getMyMatches: mocks.matches,
  getOffersForMyRequests: mocks.incomingOffers,
  getMyItemListings: () => Promise.resolve([]),
  getMyDonationOffers: () => Promise.resolve([]),
  // The dashboard also loads offers to NGO drives since the drive feature.
  getMyNgoDriveOffers: () => Promise.resolve([]),
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

/*
 * Tabs since 2026-10-07: Your Requests (requests not yet in a live flow, plus
 * matches waiting on the donee's yes/no) · Matches (accepted matches and live
 * offers) · History (finished offers and matches). History's hash is "offers".
 */
describe("donee dashboard sections", () => {
  it("opens on Matches when an offer is waiting for the donee's review", async () => {
    mocks.incomingOffers.mockResolvedValue([offer(11, "PENDING_DONEE_REVIEW")]);
    render(<DashboardPage />);

    await openTab(/Matches/);
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
    window.history.replaceState(null, "", "/dashboard#offers");
    mocks.incomingOffers.mockResolvedValue([offer(11, "PENDING_DONEE_REVIEW")]);
    render(<DashboardPage />);

    // #offers is History; an offer awaiting review does not override the link.
    await openTab(/History/);
    expect(await tab(/Matches/)).toHaveAttribute("aria-selected", "false");
  });

  it("counts only live items on each tab and flags the ones waiting on the donee", async () => {
    mocks.incomingOffers.mockResolvedValue([offer(11, "PENDING_DONEE_REVIEW"), offer(12, "WITHDRAWN")]);
    mocks.matches.mockResolvedValue([match(21, "AWAITING_DONEE_CONFIRMATION"), match(22, "FULFILLED")]);
    render(<DashboardPage />);

    // The match waiting on the donee's yes/no is answered in Your Requests.
    const requestsTab = await openTab(/Your Requests/);
    expect(requestsTab).toHaveTextContent(/needs your attention/);

    const matchesTab = await tab(/Matches/);
    expect(within(matchesTab).getByText("1")).toBeInTheDocument(); // the live offer
    expect(matchesTab).toHaveTextContent(/needs your attention/);

    const historyTab = await tab(/History/);
    expect(within(historyTab).getByText("2")).toBeInTheDocument(); // withdrawn offer + fulfilled match
    expect(historyTab).not.toHaveTextContent(/needs your attention/);
  });
});

describe("match history", () => {
  it("keeps live matches in Matches and puts finished ones in History", async () => {
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
    expect(screen.queryByText("Listed laptop 22")).toBeNull();

    await userEvent.click(await tab(/History/));
    await openTab(/History/);
    // Received: a row in Donations received, with what came.
    expect(screen.getByText("Listed laptop 22")).toBeInTheDocument();
    expect(screen.getByText(/4 received/)).toBeInTheDocument();
    // Didn't go ahead: collapsed underneath.
    await userEvent.click(screen.getByRole("button", { name: /Match history \(1\)/ }));
    expect(screen.getByText("Donor declined")).toBeInTheDocument();
  });

  it("lists a received match in History straight away", async () => {
    mocks.matches.mockResolvedValue([match(22, "COMPLETED", { allocatedQuantity: 4 })]);
    render(<DashboardPage />);
    await openTab(/Your Requests/);
    await userEvent.click(await tab(/History/));
    await openTab(/History/);

    expect(screen.getByText("Donations received")).toBeInTheDocument();
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

describe("offer history and donations received", () => {
  it("keeps a recent completed donation live in Matches, and lists both in History", async () => {
    mocks.incomingOffers.mockResolvedValue([
      offer(31, "COMPLETED", { closedAt: iso(1 * DAY) }),
      offer(32, "COMPLETED", { closedAt: iso(30 * DAY), donorName: "Meera" }),
    ]);
    render(<DashboardPage />);
    await openTab(/Your Requests/);
    await userEvent.click(await tab(/Matches/));
    await openTab(/Matches/);

    // The recent one keeps its "Report a problem" window on the live list.
    expect(screen.getByRole("link", { name: "Report a problem" })).toBeInTheDocument();

    await userEvent.click(await tab(/History/));
    await openTab(/History/);
    expect(screen.getAllByText("Donor's offer")).toHaveLength(2);
  });

  it("lists match-received donations in Donations received", async () => {
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
    await userEvent.click(await tab(/History/));
    await openTab(/History/);

    expect(screen.getByText("Donations received")).toBeInTheDocument();
    expect(screen.getByText("Listed laptop 8")).toBeInTheDocument();
    expect(screen.getByText("Listed laptop 6")).toBeInTheDocument();
    expect(screen.getAllByText("Matched for you")).toHaveLength(2);
  });
});
