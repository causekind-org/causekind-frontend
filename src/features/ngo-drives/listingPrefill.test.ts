import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  getItemListing: vi.fn(),
  getNgoDriveOffer: vi.fn(),
  updateNgoDriveOfferItem: vi.fn(),
  uploadNgoDriveOfferMedia: vi.fn(),
}));

import * as api from "@/lib/api";
import { listingOfferFields, prefillOfferFromListing, usableListing } from "./listingPrefill";

const listing = (over: Record<string, unknown> = {}) => ({
  id: 7, title: "Winter jackets", category: "Clothing", quantity: 40, condition: "Like New",
  status: "AVAILABLE", donorId: 1, photoUrls: ["https://cdn.example/a.jpg"], ...over,
}) as any;
const drive = { id: 3, quantityNeeded: 50, quantityPledged: 20, quantityReceived: 0, acceptedConditions: ["Unused", "Like New"], status: "LIVE" } as any;
const offer = { id: 99, driveId: 3, status: "DRAFT" } as any;

describe("listing prefill for drive offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, blob: async () => new Blob(["x"], { type: "image/jpeg" }) })));
  });

  it("accepts only the donor's own available listing", () => {
    expect(usableListing(listing(), 1)).not.toBeNull();
    expect(usableListing(listing({ donorId: 2 }), 1)).toBeNull();
    expect(usableListing(listing({ status: "RESERVED" }), 1)).toBeNull();
    expect(usableListing(listing(), undefined)).toBeNull();
  });

  it("caps quantity at still needed and keeps an accepted condition, item and category", () => {
    const f = listingOfferFields(listing(), drive);
    expect(f.quantity).toBe(30);
    expect(f.condition).toBe("Like New");
    expect(f.notesForNgo).toBe("Item: Winter jackets (Clothing)");
    expect(listingOfferFields(listing({ condition: "Worn" }), drive).condition).toBeUndefined();
  });

  it("prefills the draft and copies photos", async () => {
    vi.mocked(api.getItemListing).mockResolvedValue(listing());
    vi.mocked(api.getNgoDriveOffer).mockResolvedValue({ ...offer, quantity: 30 });
    const out = await prefillOfferFromListing(7, 1, drive, offer);
    expect(api.updateNgoDriveOfferItem).toHaveBeenCalledWith(99, expect.objectContaining({ quantity: 30 }));
    expect(api.uploadNgoDriveOfferMedia).toHaveBeenCalledTimes(1);
    expect(out?.quantity).toBe(30);
  });

  it("ignores an invalid or foreign listing", async () => {
    expect(await prefillOfferFromListing(NaN, 1, drive, offer)).toBeNull();
    vi.mocked(api.getItemListing).mockResolvedValue(listing({ donorId: 5 }));
    expect(await prefillOfferFromListing(7, 1, drive, offer)).toBeNull();
    vi.mocked(api.getItemListing).mockRejectedValue(new Error("404"));
    expect(await prefillOfferFromListing(7, 1, drive, offer)).toBeNull();
    expect(api.updateNgoDriveOfferItem).not.toHaveBeenCalled();
  });
});
