import { describe, expect, it } from "vitest";
import type { PurchaseView } from "@/lib/api";
import { purchaseNextAction, purchaseStage } from "./purchaseModel";
import { serializePurchaseCommitment, isSafeWebLink } from "@/features/donation-offer-wizard/offerSerializer";
import { emptyOfferModel, firstIncompleteOfferStep, declarationGroupsFor } from "@/features/donation-offer-wizard/offerModel";
import { validateOfferStep } from "@/features/donation-offer-wizard/offerSchema";

const base: PurchaseView = {
  offerId: 1, method: "DIRECT_DELIVERY", status: "INTENT_DECLARED", readyToBuy: false,
  acceptedAt: null, deadline: null, acceptedQuantity: 2, orderedAt: null, orderedQuantity: null,
  receivedQuantity: null, expectedDeliveryAt: null, trackingUrl: null, trackingReference: null,
  address: null, retailer: null, orderReference: null, evidence: [],
  extensionRequestedUntil: null, extensionDecidedAt: null, issueWindowExpiresAt: null, version: 0,
};
const v = (p: Partial<PurchaseView>): PurchaseView => ({ ...base, ...p });

describe("purchaseStage", () => {
  it("never tells a donor to buy before acceptance", () => {
    const stage = purchaseStage(base, "PENDING_DONEE_REVIEW");
    expect(stage).toBe("AWAITING_ACCEPTANCE");
    expect(purchaseNextAction(stage, "DONOR", base)).toMatch(/don't buy/i);
  });

  it("waits for the recipient's address on direct delivery", () => {
    expect(purchaseStage(v({ acceptedAt: "2026-10-15T10:00:00" }), "DONOR_RECONFIRMATION_REQUIRED")).toBe("AWAITING_ADDRESS");
  });

  it("waits for approval when accepted with address but not approved", () => {
    const view = v({ acceptedAt: "x", address: { address: "a", contactName: "n", contactPhone: "p", latitude: null, longitude: null, consentVersion: "purchase-delivery-v1", consentedAt: "x" } });
    expect(purchaseStage(view, "PENDING_ADMIN_APPROVAL")).toBe("AWAITING_APPROVAL");
  });

  it("uses the server's readyToBuy as the only buy signal", () => {
    expect(purchaseStage(v({ acceptedAt: "x", readyToBuy: true }), "ADMIN_APPROVED")).toBe("READY_TO_BUY");
  });

  it("physical purchase needs an item photo, then review, then handover", () => {
    const bought = v({ method: "BUY_AND_HAND_OVER", acceptedAt: "x", orderedAt: "x", status: "ORDER_PLACED" });
    expect(purchaseStage(bought, "ADMIN_APPROVED")).toBe("AWAITING_ITEM_PHOTO");
    const photo = { ...bought, evidence: [{ id: 1, type: "ITEM_PHOTO" as const, url: "u", uploadedAt: "x", screeningAvailable: true, prohibited: false }] };
    expect(purchaseStage(photo, "ADMIN_APPROVED")).toBe("AWAITING_PROOF_REVIEW");
    expect(purchaseStage({ ...photo, status: "READY_FOR_HANDOVER" }, "ADMIN_APPROVED")).toBe("READY_FOR_HANDOVER");
  });

  it("a retailer 'delivered' report is still in transit until the donee confirms", () => {
    expect(purchaseStage(v({ acceptedAt: "x", orderedAt: "x", status: "AWAITING_RECEIPT" }), "ADMIN_APPROVED")).toBe("IN_TRANSIT");
  });

  it("legacy commitments without a method never unlock actions", () => {
    expect(purchaseStage(v({ method: null, readyToBuy: true }), "ADMIN_APPROVED")).toBe("LEGACY");
  });

  it("issues and closures win over progress", () => {
    expect(purchaseStage(v({ acceptedAt: "x", orderedAt: "x", status: "ISSUE_RAISED" }), "ISSUE_RAISED")).toBe("ISSUE_OPEN");
    expect(purchaseStage(v({ status: "EXPIRED" }), "WITHDRAWN")).toBe("CLOSED");
  });
});

describe("purchase wizard model", () => {
  it("sends no commitment until both method and timeline are chosen", () => {
    expect(serializePurchaseCommitment({ ...emptyOfferModel, purchaseTimeline: "WITHIN_7_DAYS" }, "Chair")).toBeNull();
    const body = serializePurchaseCommitment({ ...emptyOfferModel, purchaseTimeline: "WITHIN_7_DAYS", fulfilmentMethod: "DIRECT_DELIVERY" }, "Chair");
    expect(body).toMatchObject({ itemName: "Chair", fulfilmentMethod: "DIRECT_DELIVERY", purchaseTimeline: "WITHIN_7_DAYS" });
  });

  it("holds back unsafe product links", () => {
    expect(isSafeWebLink("javascript:alert(1)")).toBe(false);
    expect(isSafeWebLink("https://shop.example/item")).toBe(true);
    const body = serializePurchaseCommitment({ ...emptyOfferModel, purchaseTimeline: "WITHIN_3_DAYS", fulfilmentMethod: "BUY_AND_HAND_OVER", productUrl: "javascript:x" }, "Chair");
    expect(body?.productUrl).toBeUndefined();
  });

  it("requires a method on the plan step and resumes there without one", () => {
    const m = { ...emptyOfferModel, purchaseTimeline: "WITHIN_7_DAYS" };
    expect(validateOfferStep("purchasePlan", m, "WILL_PURCHASE").fulfilmentMethod).toBeTruthy();
    expect(firstIncompleteOfferStep(m, "WILL_PURCHASE")).toBe("purchasePlan");
  });

  it("direct-delivery declarations never promise an item photo", () => {
    const text = declarationGroupsFor("WILL_PURCHASE", "DIRECT_DELIVERY").flatMap(g => [...g.items]).join(" ");
    expect(text).not.toMatch(/photo/i);
    expect(text).toMatch(/prepaid/i);
  });
});
