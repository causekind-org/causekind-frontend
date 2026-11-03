import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { SahasCampaignCard, SahasCampaignDetail } from "@/lib/api";

/**
 * Sahas campaigns, phase D1. Worth defending: the hub separates open, upcoming and closed
 * campaigns and tells a failed load apart from an empty one; the campaign page shows items as
 * needed/pledged/received and only offers "Give items" while the campaign is open; the
 * spotlight renders nothing rather than an empty frame.
 */

vi.mock("@/lib/features", () => ({ FEATURES: { sahas: true } }));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (k: string) => k }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: "kits" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  notFound: () => { throw new Error("NOT_FOUND"); },
}));
vi.mock("@/components/AppLink", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/components/skeletons", () => ({ PageSkeleton: () => <div>loading</div> }));

const live = vi.fn();
const detail = vi.fn();
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, sahasCampaigns: { live: () => live(), detail: (s: string) => detail(s), item: vi.fn() } };
});

import SahasHubPage from "@/app/[locale]/sahas/page";
import SahasCampaignPage from "@/app/[locale]/sahas/[slug]/page";
import { SahasSpotlight } from "@/components/home/SahasSpotlight";

const card = (over: Partial<SahasCampaignCard>): SahasCampaignCard => ({
  slug: "kits", title: "School kits", summary: "Bags", city: "Virar", state: "MH", imageUrl: null, coverAltText: null,
  collectsItems: true, collectsMoney: false, targetAmount: null, amountRaised: null, startDate: null,
  endDate: "2026-12-01", phase: "OPEN", featured: false, ...over,
});

const detailOf = (phase: SahasCampaignCard["phase"]): SahasCampaignDetail => ({
  card: card({ phase }), description: "Story", category: "Education", updatedAt: "2026-11-03T00:00:00",
  items: [{ driveId: 7, itemName: "School bag", unit: "piece", itemCondition: "New only", details: null, quantityNeeded: 100,
    quantityPledged: 30, quantityReceived: 20, quantityLeft: 50, handoverMode: "DROP_OFF", dropOffAddress: "Station Road",
    availableDays: null, pickupRadiusKm: null, locationCity: "Virar" }],
});

beforeEach(() => { live.mockReset(); detail.mockReset(); });

describe("Sahas hub", () => {
  it("lists open campaigns under Active and closed ones under Completed", async () => {
    live.mockResolvedValue([card({ slug: "a", title: "Open one" }), card({ slug: "b", title: "Done one", phase: "CLOSED" })]);
    render(<SahasHubPage />);
    expect(await screen.findByText("Open one")).toBeTruthy();
    expect(screen.queryByText("Done one")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Completed/ }));
    expect(screen.getByText("Done one")).toBeTruthy();
  });

  it("shows a retry, not an empty list, when loading fails", async () => {
    live.mockRejectedValue(new Error("offline"));
    render(<SahasHubPage />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("No active campaigns")).toBeNull();
  });
});

describe("Sahas campaign page", () => {
  it("shows needed, pledged and received and links each open item to its give page", async () => {
    detail.mockResolvedValue(detailOf("OPEN"));
    render(<SahasCampaignPage />);
    const link = await screen.findByRole("link", { name: "School bag" });
    expect(link.getAttribute("href")).toBe("/sahas/kits/give/7");
    expect(screen.getByText("50 left")).toBeTruthy();
  });

  it("offers no give action while paused", async () => {
    detail.mockResolvedValue(detailOf("PAUSED"));
    render(<SahasCampaignPage />);
    await screen.findByText(/This campaign is paused/);
    expect(screen.queryByRole("link", { name: "Give items" })).toBeNull();
  });
});

describe("Sahas spotlight", () => {
  it("renders nothing when no campaign is open", async () => {
    live.mockResolvedValue([card({ phase: "CLOSED" })]);
    const { container } = render(<SahasSpotlight />);
    await waitFor(() => expect(live).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });
});
