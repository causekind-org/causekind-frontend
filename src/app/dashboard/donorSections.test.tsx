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
  getMatchCancellationOptions: () => Promise.resolve({ allowed: false, outcome: "NONE", actionLabel: null }),
  getOfferCancellationOptions: () => Promise.resolve({ allowed: false, outcome: "NONE", actionLabel: null }),
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
const OFFERS_BLURB = /Offers you made to fulfil specific requests/;

/*
 * Tabs since 2026-10-07: Your Inventory (items not yet in a live flow, plus the
 * matches waiting on the donor's yes/no) · Matches (accepted matches and live
 * offers) · History (finished offers and matches). The hash key for History is
 * still "offers".
 */
describe("donor dashboard sections", () => {
  it("opens on Matches when an offer is waiting on the donor", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.offers.mockResolvedValue([offer(11, "DONOR_RECONFIRMATION_REQUIRED")]);
    render(<DashboardPage />);

    await openTab(/Matches/);
    // The live offer is shown inside Matches.
    expect(screen.getByText(OFFERS_BLURB)).toBeInTheDocument();
    expect(screen.getByText(MATCHES_BLURB)).toBeInTheDocument();
    expect(screen.queryByText(INVENTORY_BLURB)).toBeNull();
  });

  it("opens on Your Inventory when nothing is waiting", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.offers.mockResolvedValue([offer(11, "HANDOVER_IN_PROGRESS")]);
    render(<DashboardPage />);

    await openTab(/Your Inventory/);
    expect(screen.getByText("Listed laptop 1")).toBeInTheDocument();
    expect(screen.queryByText(OFFERS_BLURB)).toBeNull();
  });

  it("opens on Matches for a donor with live offers but nothing listed yet", async () => {
    // An empty inventory ledger would hide the work they already have in play.
    mocks.offers.mockResolvedValue([offer(11, "HANDOVER_IN_PROGRESS")]);
    render(<DashboardPage />);

    await openTab(/Matches/);
  });

  it("opens on Your Inventory when a match is waiting on the donor's answer", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([match(21, "DONOR_REVIEW")]);
    render(<DashboardPage />);

    await openTab(/Your Inventory/);
    expect(screen.getByRole("button", { name: /I still have it/i })).toBeInTheDocument();
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
    window.history.replaceState(null, "", "/dashboard#offers");
    // A waiting offer does not override the link; #offers is History.
    mocks.offers.mockResolvedValue([offer(11, "DONOR_RECONFIRMATION_REQUIRED")]);
    render(<DashboardPage />);

    await openTab(/History/);
    expect(await tab(/Matches/)).toHaveAttribute("aria-selected", "false");
  });

  it("counts only live items on each tab and flags the ones waiting on the donor", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE"), listing(2, "NEEDS_INFORMATION")]);
    mocks.offers.mockResolvedValue([offer(11, "DONOR_RECONFIRMATION_REQUIRED"), offer(12, "WITHDRAWN")]);
    mocks.matches.mockResolvedValue([match(21, "DONOR_REVIEW"), match(22, "COMPLETED")]);
    render(<DashboardPage />);

    // The match waiting on the donor is answered in Inventory, so that is where it opens.
    const itemsTab = await openTab(/Your Inventory/);
    expect(within(itemsTab).getByText("2")).toBeInTheDocument();
    expect(itemsTab).toHaveTextContent(/needs your attention/);

    const matchesTab = await tab(/Matches/);
    expect(within(matchesTab).getByText("1")).toBeInTheDocument(); // the live offer
    expect(matchesTab).toHaveTextContent(/needs your attention/);

    const historyTab = await tab(/History/);
    expect(within(historyTab).getByText("2")).toBeInTheDocument(); // withdrawn offer + completed match
    expect(historyTab).not.toHaveTextContent(/needs your attention/);
  });

  it("does not flag a tab when nothing on it is waiting", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([match(21, "PICKUP_SCHEDULED")]);
    render(<DashboardPage />);

    expect(await openTab(/Your Inventory/)).not.toHaveTextContent(/needs your attention/);
    expect(await tab(/Matches/)).not.toHaveTextContent(/needs your attention/);
  });

  it("keeps the History tab usable when there is no history yet", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);
    await userEvent.click(await tab(/History/));

    await openTab(/History/);
    expect(screen.getByText("Donation history")).toBeInTheDocument();
    expect(screen.getByText("No completed donations yet.")).toBeInTheDocument();
  });
});

describe("inventory filters", () => {
  it("filters the inventory by state without reloading, with a count on each chip", async () => {
    mocks.listings.mockResolvedValue([
      listing(1, "DRAFT", { title: "Draft chair" }),
      listing(2, "AVAILABLE", { title: "Live table" }),
      listing(3, "AVAILABLE", { title: "Matched laptop" }),
      listing(4, "FULFILLED", { title: "Done earbuds" }),
    ]);
    // In progress but not waiting on the donor, so the dashboard opens on Inventory.
    mocks.matches.mockResolvedValue([match(21, "PICKUP_SCHEDULED", { listingId: 3 })]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);

    const chips = screen.getByRole("group", { name: "Filter your inventory" });
    expect(within(chips).getByRole("button", { name: "All (3)" })).toHaveAttribute("aria-pressed", "true");
    expect(within(chips).getByRole("button", { name: "Drafts (1)" })).toBeInTheDocument();

    await userEvent.click(within(chips).getByRole("button", { name: "Drafts (1)" }));
    expect(screen.getByText("Draft chair")).toBeInTheDocument();
    expect(screen.queryByText("Live table")).toBeNull();

    // A live listing with a matched need sits under Matched, not Listed.
    await userEvent.click(within(chips).getByRole("button", { name: "Matched (1)" }));
    expect(screen.getByText("Matched laptop")).toBeInTheDocument();
    expect(screen.queryByText("Live table")).toBeNull();

    await userEvent.click(within(chips).getByRole("button", { name: "Listed (1)" }));
    expect(screen.getByText("Live table")).toBeInTheDocument();

    // Finished items are reachable from here, though All leaves them out.
    await userEvent.click(within(chips).getByRole("button", { name: "Completed (1)" }));
    expect(screen.getByText("Done earbuds")).toBeInTheDocument();
  });
});

describe("which matches are this donor's", () => {
  it("keeps a namesake's match off the donor's tab", async () => {
    // getMyMatches returns both sides' matches and the dashboard splits them by id.
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([
      match(21, "DONOR_REVIEW", { donorId: 404, donorName: DONOR, doneeId: DONOR_ID, doneeName: DONOR }),
    ]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);
    // Not this donor's to answer.
    expect(screen.queryByRole("button", { name: /I still have it/i })).toBeNull();

    const matchesTab = await tab(/Matches/);
    expect(within(matchesTab).getByText("0")).toBeInTheDocument();
    expect(matchesTab).not.toHaveTextContent(/needs your attention/);
  });

  it("does not claim a match whose names are all missing", async () => {
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
    // DONATE_TO_REQUEST matches carry no listing, so listingTitle is null; the
    // card waiting on the donor names the item from its description instead.
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([
      match(21, "DONOR_REVIEW", {
        listingTitle: null,
        donorItemDescription: "Two Dell laptops, 8GB RAM, charger included",
      }),
    ]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);

    expect(screen.getAllByText(/Two Dell laptops, 8GB RAM, charger included/).length).toBeGreaterThan(0);
  });

  it("still shows the donor their own accepted match", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([match(21, "PICKUP_SCHEDULED")]);
    render(<DashboardPage />);

    const matchesTab = await tab(/Matches/);
    expect(within(matchesTab).getByText("1")).toBeInTheDocument();
  });
});

describe("donor match history", () => {
  it("keeps live matches in Matches and finished ones in History", async () => {
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
    expect(screen.queryByText("Listed laptop 22")).toBeNull();

    await userEvent.click(await tab(/History/));
    await openTab(/History/);
    expect(screen.getByText("Listed laptop 22")).toBeInTheDocument();
    // Donor-side wording: they delivered it, and the counterpart is the donee.
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText(/4 delivered/)).toHaveTextContent("Asha Devi");
    expect(screen.getByText("You declined")).toBeInTheDocument();
  });

  it("shows the honest empty state in Matches when nothing is live", async () => {
    mocks.listings.mockResolvedValue([listing(1, "AVAILABLE")]);
    mocks.matches.mockResolvedValue([match(22, "COMPLETED", { allocatedQuantity: 4 })]);
    render(<DashboardPage />);
    await openTab(/Your Inventory/);
    await userEvent.click(await tab(/Matches/));
    await openTab(/Matches/);

    // A live listing is being checked, so the scanning state is true here.
    expect(screen.getByText(/Scanning incoming needs/)).toBeInTheDocument();
    expect(screen.queryByText("Listed laptop 22")).toBeNull();
  });
});

describe("donation history & fulfilled inventory", () => {
  it("excludes fulfilled listings from inventory and lists them in Donation history", async () => {
    mocks.listings.mockResolvedValue([
      listing(1, "AVAILABLE"),
      listing(2, "FULFILLED", { title: "Fulfilled Study Earbuds" }),
    ]);
    mocks.matches.mockResolvedValue([
      match(50, "COMPLETED", { listingId: 2, listingTitle: "Fulfilled Study Earbuds" }),
    ]);
    render(<DashboardPage />);

    const itemsTab = await openTab(/Your Inventory/);
    expect(within(itemsTab).getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Listed laptop 1")).toBeInTheDocument();
    expect(screen.queryByText("Fulfilled Study Earbuds")).toBeNull();

    await userEvent.click(await tab(/History/));
    await openTab(/History/);

    expect(screen.getByText("Donation history")).toBeInTheDocument();
    expect(screen.getAllByText("Fulfilled Study Earbuds").length).toBeGreaterThan(0);
    expect(screen.getByText("Matched for you")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Certificate/i })).toHaveAttribute("href", "/certificate?matchId=50");
  });

  it("lists every finished donation, newest first", async () => {
    mocks.listings.mockResolvedValue([
      listing(1, "FULFILLED", { title: "Older Earbuds", createdAt: iso(10 * DAY) }),
      listing(2, "FULFILLED", { title: "Newer Earbuds", createdAt: iso(1 * DAY) }),
    ]);
    mocks.matches.mockResolvedValue([
      match(101, "COMPLETED", { listingId: 1, doneeConfirmedAt: iso(10 * DAY) }),
      match(102, "COMPLETED", { listingId: 2, doneeConfirmedAt: iso(1 * DAY) }),
    ]);
    render(<DashboardPage />);

    await userEvent.click(await tab(/History/));
    await openTab(/History/);

    const newer = screen.getAllByText("Newer Earbuds")[0];
    const older = screen.getAllByText("Older Earbuds")[0];
    expect(newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does NOT match by title if listingId is different or missing", async () => {
    mocks.listings.mockResolvedValue([listing(99, "FULFILLED", { title: "earbuds" })]);
    mocks.matches.mockResolvedValue([match(200, "COMPLETED", { listingId: 88, listingTitle: "earbuds" })]);
    render(<DashboardPage />);

    await userEvent.click(await tab(/History/));
    await openTab(/History/);

    expect(screen.getAllByText("earbuds").length).toBeGreaterThan(0);
    // No certificate for the listing: listingId 99 is not the match's 88.
    expect(screen.queryByRole("link", { name: /Certificate/i })).toBeNull();
  });
});
