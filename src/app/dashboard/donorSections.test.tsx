import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";

/**
 * The donor dashboard shows one section at a time — Your Offers, Your
 * Inventory, Matches — behind tabs, the same treatment the donee side got.
 * Before this, an offer waiting on the donor sat above a full inventory ledger
 * and a match list, and a donor with no offers saw the section vanish entirely.
 * These pin which tab it opens on, that switching shows only that section, that
 * the choice survives in the URL hash, and that finished matches move into the
 * Matches tab's history with donor-side wording.
 */

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  listings: vi.fn(),
  matches: vi.fn(),
  offers: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "ravi@donor.test", role: "DONOR" }, isLoading: false }),
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
  getMyProfile: mocks.profile,
  getMyItemListings: mocks.listings,
  getMyMatches: mocks.matches,
  getMyDonationOffers: mocks.offers,
  getMyItemRequests: () => Promise.resolve([]),
  getOffersForMyRequests: () => Promise.resolve([]),
}));

const DAY = 24 * 60 * 60 * 1000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

const DONOR = "Ravi Kumar";
const DONOR_ID = 7;

const listing = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id, title: `Listed laptop ${id}`, category: "Electronics", city: "Virar", quantity: 2,
  status, rejectionReason: null, createdAt: iso(5 * DAY), imageUrl: null, ...over,
});

const offer = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id, status, requestId: 1, requestTitle: "Laptops for a computer class", requestCategory: "Electronics",
  requestCity: "Virar", requestQuantity: 10, donorName: DONOR, doneeName: "Asha Devi",
  flowType: "DIRECT_OFFER", createdAt: iso(3 * DAY), closedAt: null, compatibilityIndicator: null,
  itemDetails: { quantity: 6, condition: "Good", pickupCity: "Virar" }, media: [],
  rejectionReason: null, displayRejectionReason: null, ...over,
});

const match = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id, status, listingTitle: `Listed laptop ${id}`, requestTitle: "Laptops for a computer class",
  donorId: DONOR_ID, donorName: DONOR, doneeId: 99, doneeName: "Asha Devi",
  createdAt: iso(10 * DAY), closedAt: null,
  doneeConfirmedAt: null, doneeConfirmedQty: null, allocatedQuantity: null, matchScore: null,
  handoverMethod: null, rejectionReason: null, ...over,
});

beforeEach(() => {
  window.history.replaceState(null, "", "/dashboard");
  mocks.profile.mockResolvedValue({ id: DONOR_ID, fullName: DONOR, role: "DONOR", city: "Virar" });
  mocks.listings.mockResolvedValue([]);
  mocks.matches.mockResolvedValue([]);
  mocks.offers.mockResolvedValue([]);
});

const tab = (name: RegExp) => screen.findByRole("tab", { name });
/** Waits for the tab to be the open one — the default is chosen once data lands. */
const openTab = (name: RegExp) => screen.findByRole("tab", { name, selected: true });

const INVENTORY_BLURB = /Only our matching engine sees these/;
const MATCHES_BLURB = /Verified needs your items can fulfil/;
const OFFERS_BLURB = /Items you offered directly against someone/;

describe("donor dashboard sections", () => {
  it("opens on Your Offers when an offer is waiting on the donor", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.offers.mockResolvedValue([offer(11, "DONOR_RECONFIRMATION_REQUIRED")]);
    render(<DashboardPage />);

    await openTab(/Your Offers/);
    expect(screen.getByText(OFFERS_BLURB)).toBeInTheDocument();
    // Only the open section is on the page.
    expect(screen.queryByText(INVENTORY_BLURB)).toBeNull();
    expect(screen.queryByText(MATCHES_BLURB)).toBeNull();
  });

  it("opens on Your Inventory when nothing is waiting", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.offers.mockResolvedValue([offer(11, "HANDOVER_IN_PROGRESS")]);
    render(<DashboardPage />);

    await openTab(/Your Inventory/);
    expect(screen.getByText("Listed laptop 1")).toBeInTheDocument();
    expect(screen.queryByText(OFFERS_BLURB)).toBeNull();
  });

  it("opens on Your Offers for a donor with offers but nothing listed yet", async () => {
    // An empty inventory ledger would hide the work they already have in play.
    mocks.offers.mockResolvedValue([offer(11, "HANDOVER_IN_PROGRESS")]);
    render(<DashboardPage />);

    await openTab(/Your Offers/);
  });

  it("switching tabs shows only that section and remembers it in the URL", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);
    await userEvent.click(await tab(/Matches/));

    await openTab(/Matches/);
    expect(screen.getByText(MATCHES_BLURB)).toBeInTheDocument();
    expect(screen.queryByText("Listed laptop 1")).toBeNull();
    expect(window.location.hash).toBe("#matches");
  });

  it("opens the section named in the URL hash", async () => {
    window.history.replaceState(null, "", "/dashboard#matches");
    // An offer awaiting the donor does not override the link.
    mocks.offers.mockResolvedValue([offer(11, "DONOR_RECONFIRMATION_REQUIRED")]);
    render(<DashboardPage />);

    await openTab(/Matches/);
    expect(screen.getByText(MATCHES_BLURB)).toBeInTheDocument();
    expect(await tab(/Your Offers/)).toHaveAttribute("aria-selected", "false");
  });

  it("counts only live items on each tab and flags the ones waiting on the donor", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE"), listing(2, "NEEDS_INFORMATION")]);
    mocks.offers.mockResolvedValue([offer(11, "DONOR_RECONFIRMATION_REQUIRED"), offer(12, "WITHDRAWN")]);
    mocks.matches.mockResolvedValue([match(21, "DONOR_REVIEW"), match(22, "COMPLETED")]);
    render(<DashboardPage />);

    const offersTab = await openTab(/Your Offers/);
    expect(within(offersTab).getByText("1")).toBeInTheDocument(); // the withdrawn one is history
    expect(offersTab).toHaveTextContent(/needs your attention/);

    const matchesTab = await tab(/Matches/);
    expect(within(matchesTab).getByText("1")).toBeInTheDocument(); // the completed one is history
    expect(matchesTab).toHaveTextContent(/needs your attention/);

    const itemsTab = await tab(/Your Inventory/);
    expect(within(itemsTab).getByText("2")).toBeInTheDocument();
    expect(itemsTab).toHaveTextContent(/needs your attention/); // a listing needs more information
  });

  it("does not flag a tab when nothing on it is waiting", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([match(21, "PICKUP_SCHEDULED")]);
    render(<DashboardPage />);

    expect(await openTab(/Your Inventory/)).not.toHaveTextContent(/needs your attention/);
    expect(await tab(/Matches/)).not.toHaveTextContent(/needs your attention/);
  });

  it("keeps the offers tab usable when the donor has made no offers", async () => {
    // It used to render nothing at all, which as a tab is a blank panel.
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);
    await userEvent.click(await tab(/Your Offers/));

    await openTab(/Your Offers/);
    expect(screen.getByText(/You haven't offered anything yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse needs/ })).toHaveAttribute("href", "/requests");
  });
});

describe("which matches are this donor's", () => {
  it("keeps a namesake's match off the donor's tab", async () => {
    // getMyMatches returns both sides' matches and the dashboard splits them.
    // Splitting on donorName put another Ravi Kumar's match here — with a
    // "Confirm Donation" button on it — while this user is only its recipient.
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([
      match(21, "DONOR_REVIEW", { donorId: 404, donorName: DONOR, doneeId: DONOR_ID, doneeName: DONOR }),
    ]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);

    const matchesTab = await tab(/Matches/);
    expect(within(matchesTab).getByText("0")).toBeInTheDocument();
    expect(matchesTab).not.toHaveTextContent(/needs your attention/);

    await userEvent.click(matchesTab);
    await openTab(/Matches/);
    expect(screen.queryByText(/Listed laptop 21/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Confirm Donation/i })).toBeNull();
  });

  it("does not claim a match whose names are all missing", async () => {
    // Two nulls used to compare equal, so a nameless match landed on both tabs.
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.profile.mockResolvedValue({ id: DONOR_ID, fullName: null, role: "DONOR", city: "Virar" });
    mocks.matches.mockResolvedValue([
      match(21, "DONOR_REVIEW", { donorId: 404, donorName: null, doneeId: 405, doneeName: null }),
    ]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);

    expect(within(await tab(/Matches/)).getByText("0")).toBeInTheDocument();
  });

  it("names the item on a direct donation, which has no listing to name", async () => {
    // DONATE_TO_REQUEST matches carry no listing at all, so listingTitle is
    // null and the row used to read "Matched with item:" and then stop.
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([
      match(21, "DONOR_REVIEW", {
        listingTitle: null,
        donorItemDescription: "Two Dell laptops, 8GB RAM, charger included",
      }),
    ]);
    render(<DashboardPage />);
    await userEvent.click(await tab(/Matches/));
    await openTab(/Matches/);

    expect(screen.getByText(/Two Dell laptops, 8GB RAM, charger included/)).toBeInTheDocument();
  });

  it("still shows the donor their own match", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([match(21, "DONOR_REVIEW")]);
    render(<DashboardPage />);

    const matchesTab = await tab(/Matches/);
    expect(within(matchesTab).getByText("1")).toBeInTheDocument();
  });
});

describe("donor match history", () => {
  it("moves finished matches out of the live list into the Matches tab's history", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([
      match(21, "PICKUP_SCHEDULED"),
      match(22, "COMPLETED", { doneeConfirmedQty: 4, doneeConfirmedAt: iso(2 * DAY) }),
      match(23, "DONOR_REJECTED"),
    ]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);
    await userEvent.click(await tab(/Matches/));
    await openTab(/Matches/);

    expect(screen.getByText(/Listed laptop 21/)).toBeInTheDocument();
    expect(screen.queryByText("Listed laptop 22")).toBeNull(); // collapsed until asked for

    await userEvent.click(screen.getByRole("button", { name: /Match history \(2\)/ }));
    expect(screen.getByText("Listed laptop 22")).toBeInTheDocument();
    // Donor-side wording: they delivered it, and the counterpart is the donee.
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText(/4 delivered/)).toHaveTextContent("Asha Devi");
    expect(screen.getByText("You declined")).toBeInTheDocument();
  });

  it("opens the history straight away when there are no live matches", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([match(22, "COMPLETED", { allocatedQuantity: 4 })]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);
    await userEvent.click(await tab(/Matches/));
    await openTab(/Matches/);

    expect(screen.getByRole("button", { name: /Match history \(1\)/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Listed laptop 22")).toBeInTheDocument();
    // The sweeping "nothing to match yet" animation would be a lie here.
    expect(screen.getByText(/No live matches right now/)).toBeInTheDocument();
  });
});
