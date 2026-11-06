import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DonationOffer, PurchaseView } from "@/lib/api";

/**
 * Buy and hand over in the purchase hub: the donor's yes or no after acceptance,
 * telling us what was bought, and correcting it when our team asks. The API is
 * mocked; the server re-checks every action.
 */

vi.mock("@/features/handover/HandoverMapPinField", () => ({ HandoverMapPinField: () => <div /> }));
vi.mock("@/app/actions/locations", () => ({ detectLocationFromServer: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const api = vi.hoisted(() => ({
  reconfirmOfferAvailability: vi.fn(() => Promise.resolve()),
  withdrawOffer: vi.fn(() => Promise.resolve()),
  recordPurchaseOrder: vi.fn(() => Promise.resolve()),
  uploadFlowBProof: vi.fn(() => Promise.resolve()),
  updatePurchaseDetails: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<object>()), ...api }));

import { PurchaseHub } from "./PurchaseHub";

const offer = (status: string, plan: Partial<NonNullable<DonationOffer["purchaseCommitment"]>> = {}) => ({
  id: 4, status, requestTitle: "5 laptops", doneeName: "Asha", itemDetails: { quantity: 3 },
  purchaseCommitment: { id: 1, itemName: "Laptop", proposedBrand: null, proposedModel: null, estimatedCost: null, purchaseTimeline: "WITHIN_3_DAYS",
    purchaseStatus: "INTENT_DECLARED", intendedStore: null, notes: null, createdAt: "x", fulfilmentMethod: "BUY_AND_HAND_OVER", productUrl: null,
    purchaseDeadline: "2026-11-08T10:00:00", acceptedAt: "2026-10-01T10:00:00", purchaseChannel: "OFFLINE", ...plan },
}) as unknown as DonationOffer;

const details = (p: Partial<NonNullable<PurchaseView["details"]>> = {}): NonNullable<PurchaseView["details"]> => ({
  channel: "OFFLINE", plannedItem: "Laptop", plannedBrand: null, plannedModel: null, estimatedCost: null, productUrl: null, intendedStore: null,
  planNotes: null, purchaseTimeline: "WITHIN_3_DAYS", actualItemName: null, actualBrand: null, actualModel: null, actualPrice: null,
  purchasedQuantity: null, purchasedOn: null, purchaseNotes: null, reviewOutcome: null, reviewedAt: null, ...p,
});
const view = (p: Partial<PurchaseView> = {}): PurchaseView => ({
  offerId: 4, method: "BUY_AND_HAND_OVER", status: "INTENT_DECLARED", readyToBuy: false,
  acceptedAt: "2026-10-01T10:00:00", deadline: "2026-11-08T10:00:00", acceptedQuantity: 3,
  orderedAt: null, orderedQuantity: null, receivedQuantity: null, expectedDeliveryAt: null, trackingUrl: null, trackingReference: null,
  address: null, retailer: null, orderReference: null, evidence: [], extensionRequestedUntil: null, extensionDecidedAt: null,
  issueWindowExpiresAt: null, version: 1, deliveryReportedAt: null, deliveryReminderSentAt: null, deliveryEscalatedAt: null,
  receivedCondition: null, receiptRecordedBySupport: false, issues: [], details: details(), ...p,
});
const photo = () => new File(["x"], "laptop.jpg", { type: "image/jpeg" });

describe("Buy and hand over in the purchase hub", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks the donor whether they can still buy it, and says plainly when no product is planned", async () => {
    render(<PurchaseHub offer={offer("DONOR_RECONFIRMATION_REQUIRED")} role="DONOR" view={view()} onChanged={() => {}} />);
    expect(screen.getByRole("heading", { name: "Can you still purchase this item?" })).toBeTruthy();
    expect(screen.getByText("The exact product details will be updated after purchase.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Yes, I'll buy it/ }));
    await waitFor(() => expect(api.reconfirmOfferAvailability).toHaveBeenCalledWith(4));
  });

  it("never withdraws on one click", async () => {
    render(<PurchaseHub offer={offer("DONOR_RECONFIRMATION_REQUIRED")} role="DONOR" view={view()} onChanged={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /No, I can't buy it anymore/ }));
    expect(api.withdrawOffer).not.toHaveBeenCalled();
    expect(screen.getByText("Are you sure you can no longer fulfil this offer?")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Keep my offer" }));
    expect(api.withdrawOffer).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /No, I can't buy it anymore/ }));
    await userEvent.click(screen.getByRole("button", { name: "Withdraw offer" }));
    await waitFor(() => expect(api.withdrawOffer).toHaveBeenCalledWith(4, expect.any(String)));
  });

  it("shows the recipient the plan with no product approval controls", () => {
    render(<PurchaseHub offer={offer("ADMIN_APPROVED")} role="DONEE" view={view({ readyToBuy: true, status: "READY_TO_BUY" })} onChanged={() => {}} />);
    expect(screen.getByText(/The donor will purchase the item from a physical store/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /approve|reject/i })).toBeNull();
  });

  it("records what was actually bought, then the photo, then the private receipt", async () => {
    render(<PurchaseHub offer={offer("ADMIN_APPROVED")} role="DONOR" view={view({ readyToBuy: true, status: "READY_TO_BUY" })} onChanged={() => {}} />);
    expect(screen.getByRole("heading", { name: "You're committed to purchasing this item" })).toBeTruthy();
    await userEvent.type(screen.getByLabelText(/^Brand/), "Lenovo");
    await userEvent.type(screen.getByLabelText(/^Model/), "IdeaPad Slim 3");
    await userEvent.type(screen.getByLabelText(/^Price you paid/), "95997");
    await userEvent.type(screen.getByLabelText(/^Store or seller/), "Croma, Vasai");
    const bought = screen.getByLabelText(/^Quantity purchased/);
    await userEvent.clear(bought); await userEvent.type(bought, "4");
    // The photo is required.
    expect((screen.getByRole("button", { name: /Confirm purchase & proceed/i }) as HTMLButtonElement).disabled).toBe(true);
    const f = photo();
    await userEvent.upload(screen.getByLabelText(/Photo of the item you bought/), f);
    await userEvent.click(screen.getByLabelText(/I paid for this myself/));
    await userEvent.click(screen.getByRole("button", { name: /Confirm purchase & proceed/i }));
    await waitFor(() => expect(api.recordPurchaseOrder).toHaveBeenCalledWith(4, expect.objectContaining({
      itemName: "Laptop", brand: "Lenovo", model: "IdeaPad Slim 3", actualPrice: 95997, purchasedQuantity: 4, quantity: 3,
      retailer: "Croma, Vasai", prepaid: true,
    })));
    expect(api.uploadFlowBProof).toHaveBeenCalledWith(4, "ITEM_PHOTO", f);
    expect(api.recordPurchaseOrder.mock.invocationCallOrder[0]).toBeLessThan(api.uploadFlowBProof.mock.invocationCallOrder[0]);
  });

  it("caps the donated quantity at what was bought and says the rest goes back", async () => {
    render(<PurchaseHub offer={offer("ADMIN_APPROVED")} role="DONOR" view={view({ readyToBuy: true, status: "READY_TO_BUY" })} onChanged={() => {}} />);
    await userEvent.click(screen.getByLabelText(/has no brand or model/));
    await userEvent.type(screen.getByLabelText(/^Price you paid/), "500");
    const bought = screen.getByLabelText(/^Quantity purchased/);
    await userEvent.clear(bought); await userEvent.type(bought, "2");
    expect(screen.getByRole("alert").textContent).toMatch(/1 to 2/);
    const donated = screen.getByLabelText(/^Quantity donated/);
    await userEvent.clear(donated); await userEvent.type(donated, "2");
    expect(screen.getByText(/The other 1 go back to the request/)).toBeTruthy();
  });

  it("lets the donor correct the purchase when our team asks, without a new photo", async () => {
    render(<PurchaseHub offer={offer("ADMIN_APPROVED")} role="DONOR" onChanged={() => {}}
      view={view({ status: "ORDER_PLACED", orderedAt: "2026-10-02T10:00:00", orderedQuantity: 3, retailer: "Croma",
        proofRejectionReason: "Please add the model number.",
        evidence: [{ id: 1, type: "ITEM_PHOTO", url: "u", uploadedAt: "2026-10-02T10:05:00", screeningAvailable: true, prohibited: false, uploadedByRole: "DONOR" }],
        details: details({ actualItemName: "Laptop", actualBrand: "Lenovo", actualPrice: 95997, purchasedQuantity: 3, purchasedOn: "2026-10-02", reviewOutcome: "INFO_REQUIRED" }) })} />);
    expect(screen.getByText("Please add the model number.")).toBeTruthy();
    await userEvent.type(screen.getByLabelText(/^Model/), "IdeaPad Slim 3");
    await userEvent.click(screen.getByRole("button", { name: /Send the updated details/ }));
    await waitFor(() => expect(api.updatePurchaseDetails).toHaveBeenCalledWith(4, expect.objectContaining({
      model: "IdeaPad Slim 3", quantity: 3, resubmit: true,
    })));
    expect(api.uploadFlowBProof).not.toHaveBeenCalled();
  });
});
