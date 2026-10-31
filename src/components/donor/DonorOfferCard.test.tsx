import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DonationOffer } from "@/lib/api";

vi.mock("@/components/OfferJourney", () => ({ OfferJourneyDrawer: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { DonorOfferCard } from "./DonorOfferCard";

/** "Yes, I'll buy it" lives in the purchase hub; the card only points there. */

const base = {
  id: 4, status: "DONOR_RECONFIRMATION_REQUIRED", requestTitle: "School bags", requestCategory: "Education", requestCity: "Pune",
  itemDetails: { quantity: 2 }, media: [],
} as unknown as DonationOffer;

function card(offer: DonationOffer, onReconfirm = vi.fn()) {
  render(<DonorOfferCard offer={offer} statusLabel="Reconfirmation Required" needsYou explanation="" actionHref={null}
    actionLabel="Confirm item is ready" onReconfirm={onReconfirm} noButton={<button>I can&apos;t buy it anymore</button>} />);
  return onReconfirm;
}

describe("DonorOfferCard reconfirmation", () => {
  it("sends a purchase offer to the purchase hub to confirm", () => {
    card({ ...base, flowType: "WILL_PURCHASE",
      purchaseCommitment: { acceptedAt: "2026-10-16T10:00:00", fulfilmentMethod: "DIRECT_DELIVERY", purchaseTimeline: "WITHIN_7_DAYS" } } as unknown as DonationOffer);
    expect(screen.queryByRole("button", { name: /Yes, I'll buy it/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Confirm in purchase hub" }).getAttribute("href")).toBe("/offers/4/purchase");
    expect(screen.getByRole("button", { name: /I can't buy it anymore/ })).toBeTruthy();
  });

  it("still confirms an item the donor already owns on the card", () => {
    card({ ...base, flowType: "ALREADY_OWN" } as DonationOffer);
    expect(screen.getByRole("button", { name: "Yes, still available" })).toBeTruthy();
  });
});
