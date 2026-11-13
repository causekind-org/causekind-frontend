import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { SahasCampaignDetail } from "@/lib/api";

/**
 * Sahas donate form. Worth defending: bundles from the admin's amounts list are clickable and
 * the first one is picked for the donor; small amounts stay available; PAN and address are asked
 * only from a donor who wants the 80G receipt.
 */

vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (k: string) => k }));
vi.mock("@/components/AppLink", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/skeletons", () => ({ PageSkeleton: () => <div>loading</div> }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/features/scan-donation/tracking", () => ({ captureUtm: vi.fn(), trackDonationSuccess: vi.fn(), trackInitiateCheckout: vi.fn() }));

const detail = vi.fn();
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, sahasCampaigns: { detail: (s: string) => detail(s) } };
});

import { SahasDonateForm, bundlesOf } from "@/features/sahas/SahasDonateForm";

const campaign = (tiers: { amount: string | null; text: string | null }[] | null): SahasCampaignDetail => ({
  card: {
    slug: "feed-stray-animals", title: "Feed a Stray Animal", summary: null, city: "Vasai West", state: "Maharashtra",
    imageUrl: null, coverAltText: null, collectsItems: false, collectsMoney: true, targetAmount: 10000, amountRaised: 0,
    startDate: null, endDate: "2026-12-15", phase: "OPEN", featured: true, description: null, moneyOpen: true,
  },
  description: null, category: null, updatedAt: "", items: [], updates: [], outcome: null, moneyOpen: true, campaignId: 9,
  page: tiers ? ({ tiers } as SahasCampaignDetail["page"]) : null,
});

const TIERS = [
  { amount: "₹300", text: "Can feed up to 10 stray dogs or cats" },
  { amount: "₹600", text: "Can feed up to 30 stray dogs or cats" },
  { amount: "₹1,500", text: "Can feed up to 50 stray dogs or cats" },
  { amount: "Any amount", text: "Whatever you can give helps" },
];

describe("bundlesOf", () => {
  it("reads rupee amounts and skips rows without a number", () => {
    expect(bundlesOf(campaign(TIERS)).map((b) => b.value)).toEqual([300, 600, 1500]);
    expect(bundlesOf(campaign(null))).toEqual([]);
  });
});

describe("SahasDonateForm", () => {
  beforeEach(() => detail.mockReset());

  it("shows small amounts and bundles, with the first bundle picked", async () => {
    detail.mockResolvedValue(campaign(TIERS));
    render(<SahasDonateForm slug="feed-stray-animals" />);
    const input = await screen.findByLabelText("Enter your amount (₹)");
    expect(input).toHaveProperty("value", "300");
    expect(screen.getByRole("button", { name: "₹10" })).toBeTruthy();
    expect(screen.getByText("Can feed up to 30 stray dogs or cats")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /₹600/ }));
    expect(input).toHaveProperty("value", "600");
    fireEvent.click(screen.getByRole("button", { name: "₹20" }));
    expect(input).toHaveProperty("value", "20");
  });

  it("keeps the old amounts on other campaigns, even with an amounts list", async () => {
    const diwali = campaign(TIERS);
    diwali.card = { ...diwali.card, slug: "diwali-feed-hungry01" };
    detail.mockResolvedValue(diwali);
    render(<SahasDonateForm slug="diwali-feed-hungry01" />);
    expect(await screen.findByLabelText("Amount (₹)")).toHaveProperty("value", "101");
    expect(screen.getByRole("button", { name: "₹251" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "₹10" })).toBeNull();
    expect(screen.queryByText("Can feed up to 10 stray dogs or cats")).toBeNull();
  });

  it("still asks every donor for PAN and address on other campaigns", async () => {
    const diwali = campaign(TIERS);
    diwali.card = { ...diwali.card, slug: "diwali-feed-hungry01" };
    detail.mockResolvedValue(diwali);
    render(<SahasDonateForm slug="diwali-feed-hungry01" />);
    await screen.findByLabelText("Amount (₹)");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Rao" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "asha@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+919876543210" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/PAN and address/)).toBeTruthy();
    expect(screen.getByPlaceholderText("ABCDE1234F")).toBeTruthy();
    expect(screen.getByLabelText("Address")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check your PAN" })).toHaveProperty("disabled", true);
  });

  it("keeps the old amounts when the campaign has no amounts list", async () => {
    detail.mockResolvedValue(campaign(null));
    render(<SahasDonateForm slug="feed-stray-animals" />);
    expect(await screen.findByLabelText("Amount (₹)")).toHaveProperty("value", "101");
    expect(screen.getByRole("button", { name: "₹251" })).toBeTruthy();
  });

  it("asks for PAN and address only after the 80G tick", async () => {
    detail.mockResolvedValue(campaign(TIERS));
    render(<SahasDonateForm slug="feed-stray-animals" />);
    await screen.findByLabelText("Enter your amount (₹)");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Rao" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "asha@example.com" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+919876543210" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    // Without the 80G tick this step is already complete.
    expect(screen.getByRole("button", { name: "Continue" })).toHaveProperty("disabled", false);
    expect(screen.queryByPlaceholderText("ABCDE1234F")).toBeNull();
    expect(screen.queryByLabelText("Address")).toBeNull();
    fireEvent.click(screen.getByLabelText("I want an 80G receipt"));
    expect(screen.getByPlaceholderText("ABCDE1234F")).toBeTruthy();
    expect(screen.getByLabelText("Address")).toBeTruthy();
    expect(screen.getByText("Upload PAN card")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check your PAN" })).toHaveProperty("disabled", true);
  });
});
