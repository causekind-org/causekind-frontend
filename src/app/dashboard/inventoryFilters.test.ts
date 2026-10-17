import { describe, expect, it } from "vitest";
import { INVENTORY_FILTERS, inventoryCounts, inventoryGroupOf, matchesInventoryFilter } from "./inventoryFilters";

describe("inventory filters", () => {
  it("puts every status in exactly one group", () => {
    const seen = new Map<string, string>();
    for (const f of INVENTORY_FILTERS) {
      for (const s of f.statuses) {
        expect(seen.has(s), `${s} is in ${seen.get(s)} and ${f.key}`).toBe(false);
        seen.set(s, f.key);
      }
    }
  });

  it("groups legacy statuses with their current equivalents", () => {
    expect(inventoryGroupOf("AVAILABLE")).toBe("live");
    expect(inventoryGroupOf("ELIGIBLE_FOR_MATCHING")).toBe("live");
    expect(inventoryGroupOf("FULFILLED")).toBe("donated");
    expect(inventoryGroupOf("PENDING_REVIEW")).toBe("review");
  });

  it("counts add up to All, and unknown statuses are not lost", () => {
    const counts = inventoryCounts(["DRAFT", "DRAFT", "AVAILABLE", "MATCHED", "SOMETHING_NEW"]);
    expect(counts.all).toBe(5);
    expect(counts.drafts).toBe(2);
    expect(counts.live).toBe(1);
    expect(counts.matched).toBe(1);
    expect(counts.review).toBe(1);
    const sum = INVENTORY_FILTERS.reduce((n, f) => n + counts[f.key], 0);
    expect(sum).toBe(counts.all);
  });

  it("'all' matches everything", () => {
    expect(matchesInventoryFilter("REJECTED", "all")).toBe(true);
    expect(matchesInventoryFilter("REJECTED", "drafts")).toBe(false);
  });
});
