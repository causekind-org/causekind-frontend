import { describe, expect, it } from "vitest";
import {
  filterInventory, filterRequests, inventoryBucket, inventoryFilterOptions,
  requestBucket, requestFilterOptions,
} from "./dashboardFilters";

const listing = (id: number, status: string) => ({ id, status });
const request = (id: number, status: string, quantity = 10, fulfilledQuantity = 0) =>
  ({ id, status, quantity, fulfilledQuantity });

describe("inventory filters", () => {
  const listings = [
    listing(1, "DRAFT"),
    listing(2, "AI_SCREENING"),
    listing(3, "ELIGIBLE_FOR_MATCHING"),
    listing(4, "AVAILABLE"),          // has a live match below
    listing(5, "SOFT_RESERVED"),
    listing(6, "PAUSED"),
    listing(7, "FULFILLED"),
    listing(8, "WITHDRAWN"),
  ];
  const liveMatches = new Set([4]);

  it("puts every listing in exactly one bucket", () => {
    const opts = inventoryFilterOptions(listings, liveMatches);
    const counts = Object.fromEntries(opts.map(o => [o.key, o.count]));
    expect(counts).toEqual({
      all: 7, drafts: 1, review: 1, listed: 1, matched: 2, paused: 1, completed: 1, closed: 1,
    });
    const bucketed = opts.filter(o => o.key !== "all").reduce((n, o) => n + o.count, 0);
    expect(bucketed).toBe(listings.length);
  });

  it("treats a live listing with a matched need as matched, not listed", () => {
    expect(inventoryBucket(listing(4, "AVAILABLE"), true)).toBe("matched");
    expect(inventoryBucket(listing(4, "AVAILABLE"), false)).toBe("listed");
  });

  it("keeps finished items out of All, like the ledger does", () => {
    expect(filterInventory(listings, "all", liveMatches).map(l => l.id)).not.toContain(7);
    expect(filterInventory(listings, "completed", liveMatches).map(l => l.id)).toEqual([7]);
  });
});

describe("request filters", () => {
  it("buckets by fulfilment first, then status", () => {
    expect(requestBucket(request(1, "DRAFT"))).toBe("drafts");
    expect(requestBucket(request(2, "PENDING_VERIFICATION"))).toBe("review");
    expect(requestBucket(request(3, "PUBLIC_REQUEST"))).toBe("open");
    expect(requestBucket(request(3, "PUBLIC_REQUEST"), true)).toBe("matched");
    expect(requestBucket(request(4, "POTENTIAL_MATCH_FOUND"))).toBe("matched");
    expect(requestBucket(request(5, "PUBLIC_REQUEST", 10, 4))).toBe("partial");
    expect(requestBucket(request(6, "PUBLIC_REQUEST", 10, 10))).toBe("completed");
    expect(requestBucket(request(7, "FULFILLED", 10, 0))).toBe("completed");
    expect(requestBucket(request(8, "CANCELLED"))).toBe("closed");
  });

  it("counts add up and All excludes completed", () => {
    const reqs = [request(1, "DRAFT"), request(2, "PUBLIC_REQUEST"), request(3, "FULFILLED")];
    const opts = requestFilterOptions(reqs);
    expect(opts.find(o => o.key === "all")?.count).toBe(2);
    expect(filterRequests(reqs, "completed").map(r => r.id)).toEqual([3]);
  });
});
