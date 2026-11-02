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
  deliveryReportedAt: null, deliveryReminderSentAt: null, deliveryEscalatedAt: null,
  receivedCondition: null, receiptRecordedBySupport: false, issues: [],
};
const v = (p: Partial<PurchaseView>): PurchaseView => ({ ...base, ...p });

describe("purchaseStage", () => {
  const ordered = { acceptedAt: "x", orderedAt: "2026-10-15T10:00:00", orderedQuantity: 2, status: "ORDER_PLACED" as const };
  const proof = { id: 1, type: "DELIVERY_PROOF" as const, url: "u", uploadedAt: "x", screeningAvailable: null, prohibited: null, uploadedByRole: "DONOR" as const };

  it("asks the recipient to confirm once delivery is reported, and acknowledges the donor's proof", () => {
    const view = v({ ...ordered, status: "AWAITING_RECEIPT", deliveryReportedAt: "2026-10-16T10:00:00", evidence: [proof] });
    expect(purchaseStage(view, "ADMIN_APPROVED")).toBe("DELIVERED");
    expect(purchaseNextAction("DELIVERED", "DONOR", view)).toBe("Delivery proof submitted — awaiting recipient confirmation.");
    expect(purchaseNextAction("DELIVERED", "DONEE", view)).toMatch(/confirm what you received/i);
  });

  it("a reported delivery of the remainder wins over the earlier partial receipt", () => {
    const view = v({ ...ordered, status: "AWAITING_RECEIPT", receivedQuantity: 1, deliveryReportedAt: "x" });
    expect(purchaseStage(view, "ADMIN_APPROVED")).toBe("DELIVERED");
    expect(purchaseStage(v({ ...ordered, status: "PARTIALLY_RECEIVED", receivedQuantity: 1 }), "ADMIN_APPROVED")).toBe("PARTIALLY_RECEIVED");
  });

  it("tells both sides when support is reviewing an unanswered delivery", () => {
    const view = v({ ...ordered, deliveryReportedAt: "x", deliveryEscalatedAt: "y", evidence: [proof] });
    expect(purchaseNextAction("DELIVERED", "DONOR", view)).toMatch(/support team is reviewing/i);
    expect(purchaseNextAction("DELIVERED", "DONEE", view)).toMatch(/support team/i);
  });

  it("a delivery report never counts as completion", () => {
    expect(purchaseStage(v({ ...ordered, deliveryReportedAt: "x" }), "ADMIN_APPROVED")).not.toBe("COMPLETED");
  });

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
    const photo = { ...bought, evidence: [{ id: 1, type: "ITEM_PHOTO" as const, url: "u", uploadedAt: "x", screeningAvailable: true, prohibited: false, uploadedByRole: "DONOR" as const }] };
    expect(purchaseStage({ ...photo, status: "PROOF_UPLOADED" }, "ADMIN_APPROVED")).toBe("AWAITING_PROOF_REVIEW");
    expect(purchaseStage({ ...photo, status: "READY_FOR_HANDOVER" }, "ADMIN_APPROVED")).toBe("READY_FOR_HANDOVER");
  });

  it("a rejected item photo asks the donor for a new one, with the reason", () => {
    const rejected = v({ method: "BUY_AND_HAND_OVER", acceptedAt: "x", orderedAt: "x", status: "ORDER_PLACED",
      proofRejectionReason: "The photo is blurry.",
      evidence: [{ id: 1, type: "ITEM_PHOTO", url: "u", uploadedAt: "x", screeningAvailable: true, prohibited: false, uploadedByRole: "DONOR" }] });
    const stage = purchaseStage(rejected, "ADMIN_APPROVED");
    expect(stage).toBe("AWAITING_ITEM_PHOTO");
    expect(purchaseNextAction(stage, "DONOR", rejected)).toContain("The photo is blurry.");
    expect(purchaseNextAction(stage, "DONEE", rejected)).not.toContain("blurry");
  });

  it("in person, the recipient closes the issue window on the handover page", () => {
    const view = v({ method: "BUY_AND_HAND_OVER", acceptedAt: "x", orderedAt: "x", status: "READY_FOR_HANDOVER" });
    expect(purchaseNextAction(purchaseStage(view, "ISSUE_WINDOW_OPEN"), "DONEE", view)).toContain("handover page");
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

  it("requires all item details on the plan step while keeping notes optional", () => {
    const emptyPlan = { ...emptyOfferModel, purchaseTimeline: "WITHIN_7_DAYS", fulfilmentMethod: "DIRECT_DELIVERY" as const };
    const errors = validateOfferStep("purchasePlan", emptyPlan, "WILL_PURCHASE");
    expect(errors.productUrl).toBeTruthy();
    expect(errors.proposedBrand).toBeTruthy();
    expect(errors.proposedModel).toBeTruthy();
    expect(errors.estimatedCost).toBeTruthy();
    expect(errors.intendedStore).toBeTruthy();
    expect(errors.purchaseNotes).toBeUndefined();

    const filledPlan = {
      ...emptyPlan,
      productUrl: "https://amazon.in/example",
      proposedBrand: "Classmate",
      proposedModel: "172 pages",
      estimatedCost: "250",
      intendedStore: "Amazon",
      purchaseNotes: "",
    };
    const validErrors = validateOfferStep("purchasePlan", filledPlan, "WILL_PURCHASE");
    expect(Object.keys(validErrors).length).toBe(0);
    expect(firstIncompleteOfferStep(filledPlan, "WILL_PURCHASE")).not.toBe("purchasePlan");
  });

  it("direct-delivery declarations never promise an item photo", () => {
    const text = declarationGroupsFor("WILL_PURCHASE", "DIRECT_DELIVERY").flatMap(g => [...g.items]).join(" ");
    expect(text).not.toMatch(/photo/i);
    expect(text).toMatch(/prepaid/i);
  });

  it("in ISSUE_WINDOW, requires donor delivery proof before transaction can finish", () => {
    const withoutProof = v({ status: "RECEIPT_CONFIRMED", evidence: [] });
    expect(purchaseNextAction("ISSUE_WINDOW", "DONOR", withoutProof)).toMatch(/upload proof of the delivered item/i);

    const withProof = v({
      status: "RECEIPT_CONFIRMED",
      evidence: [{ id: 9, type: "DELIVERY_PROOF", url: "x", uploadedAt: "x", screeningAvailable: null, prohibited: null, uploadedByRole: "DONOR" }],
    });
    expect(purchaseNextAction("ISSUE_WINDOW", "DONOR", withProof)).toMatch(/delivery proof is on file/i);
  });
});

