import { describe, expect, it } from "vitest";
import { emptyOfferModel, firstIncompleteOfferStep, type OfferModel } from "./offerModel";
import { validateOfferStep, validateOfferAll } from "./offerSchema";
import { serializePurchaseCommitment } from "./offerSerializer";

/** Buy and hand over: an online purchase names its listing up front; a shop purchase need not. */
const plan = (p: Partial<OfferModel>): OfferModel => ({
  ...emptyOfferModel, fulfilmentMethod: "BUY_AND_HAND_OVER", purchaseTimeline: "WITHIN_3_DAYS", quantity: "3", ...p,
});

describe("purchase plan rules", () => {
  it("asks a hand-over donor where they'll buy", () => {
    expect(validateOfferStep("purchasePlan", plan({}), "WILL_PURCHASE").purchaseChannel).toBeTruthy();
  });

  it("lets a shop purchase go out with no product details", () => {
    const m = plan({ purchaseChannel: "OFFLINE" });
    expect(validateOfferStep("purchasePlan", m, "WILL_PURCHASE")).toEqual({});
    expect(firstIncompleteOfferStep(m, "WILL_PURCHASE")).not.toBe("purchasePlan");
  });

  it("still checks a link or cost a shop purchase does give", () => {
    const errors = validateOfferStep("purchasePlan", plan({ purchaseChannel: "OFFLINE", productUrl: "not a link", estimatedCost: "-5" }), "WILL_PURCHASE");
    expect(errors.productUrl).toBeTruthy();
    expect(errors.estimatedCost).toBeTruthy();
  });

  it("requires the listing for an online purchase", () => {
    const errors = validateOfferStep("purchasePlan", plan({ purchaseChannel: "ONLINE" }), "WILL_PURCHASE");
    for (const f of ["productUrl", "proposedBrand", "proposedModel", "estimatedCost", "intendedStore"]) expect(errors[f]).toBeTruthy();
    expect(validateOfferStep("purchasePlan", plan({
      purchaseChannel: "ONLINE", productUrl: "https://www.amazon.in/dp/B0TEST", proposedBrand: "HP", proposedModel: "Chromebook 14",
      estimatedCost: "22500", intendedStore: "Amazon",
    }), "WILL_PURCHASE")).toEqual({});
  });

  it("keeps direct delivery's listing required and never sends it a channel", () => {
    const m = plan({ fulfilmentMethod: "DIRECT_DELIVERY", purchaseChannel: "OFFLINE" });
    expect(validateOfferStep("purchasePlan", m, "WILL_PURCHASE").productUrl).toBeTruthy();
    expect(serializePurchaseCommitment(m, "Laptops")?.purchaseChannel).toBeUndefined();
    expect(serializePurchaseCommitment(plan({ purchaseChannel: "OFFLINE" }), "Laptops")?.purchaseChannel).toBe("OFFLINE");
  });

  it("does not require location or pickup city for direct delivery", () => {
    const m = plan({
      fulfilmentMethod: "DIRECT_DELIVERY",
      productUrl: "https://www.amazon.in/dp/B0TEST",
      declarationsConfirmed: true,
      latitude: null,
      longitude: null,
      pickupCity: "",
    });
    const errors = validateOfferAll(m, "WILL_PURCHASE");
    expect(errors.latitude).toBeUndefined();
    expect(errors.pickupCity).toBeUndefined();
  });

  it("still requires location and pickup city for buy and hand over", () => {
    const m = plan({
      fulfilmentMethod: "BUY_AND_HAND_OVER",
      purchaseChannel: "OFFLINE",
      declarationsConfirmed: true,
      latitude: null,
      longitude: null,
      pickupCity: "",
    });
    const errors = validateOfferAll(m, "WILL_PURCHASE");
    expect(errors.latitude).toBeTruthy();
    expect(errors.pickupCity).toBeTruthy();
  });
});
