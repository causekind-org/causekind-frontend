import { describe, it, expect } from "vitest";
import { getRequestFulfilment, groupRequestsByFulfilment } from "./requestFulfilment";

const req = (status: string, quantity: number, fulfilledQuantity?: number, id = 1) =>
  ({ id, status, quantity, fulfilledQuantity });

describe("getRequestFulfilment", () => {
  it("reports nothing received for a fresh request", () => {
    expect(getRequestFulfilment(req("PUBLIC_REQUEST", 10, 0))).toEqual({
      requested: 10, fulfilled: 0, remaining: 10, isFullyFulfilled: false, isPartiallyFulfilled: false,
    });
  });

  it("treats a missing counter as nothing received", () => {
    expect(getRequestFulfilment(req("PUBLIC_REQUEST", 4)).fulfilled).toBe(0);
  });

  it("reports a partial delivery with a remaining count that adds up", () => {
    const f = getRequestFulfilment(req("PUBLIC_REQUEST", 10, 3));
    expect(f).toMatchObject({ fulfilled: 3, remaining: 7, isPartiallyFulfilled: true, isFullyFulfilled: false });
  });

  it("ignores a stale backend remainingQuantity", () => {
    const f = getRequestFulfilment({ ...req("PUBLIC_REQUEST", 10, 3), remainingQuantity: 0 } as never);
    expect(f.remaining).toBe(7);
  });

  it("counts a FULFILLED request as fully received even with no delivery counter", () => {
    // The item-listing match flow closes requests without touching the counter.
    expect(getRequestFulfilment(req("FULFILLED", 5, 0))).toMatchObject({
      fulfilled: 5, remaining: 0, isFullyFulfilled: true, isPartiallyFulfilled: false,
    });
    expect(getRequestFulfilment(req("FULLY_FULFILLED", 5)).isFullyFulfilled).toBe(true);
  });

  it("counts a request whose deliveries cover it as fully received before the status catches up", () => {
    expect(getRequestFulfilment(req("PUBLIC_REQUEST", 4, 4)).isFullyFulfilled).toBe(true);
  });

  it("caps over-delivery at the requested quantity", () => {
    expect(getRequestFulfilment(req("PUBLIC_REQUEST", 10, 13))).toMatchObject({ fulfilled: 10, remaining: 0 });
  });

  it("never reports negative quantities", () => {
    expect(getRequestFulfilment(req("PUBLIC_REQUEST", 3, -2))).toMatchObject({ fulfilled: 0, remaining: 3 });
  });
});

describe("groupRequestsByFulfilment", () => {
  it("puts every request in exactly one group", () => {
    const requests = [
      req("DRAFT", 1, 0, 1),
      req("PUBLIC_REQUEST", 10, 0, 2),
      req("PUBLIC_REQUEST", 10, 4, 3),
      req("PUBLIC_REQUEST", 10, 10, 4),
      req("FULFILLED", 2, 0, 5),
      req("CANCELLED", 3, 0, 6),
      req("EXPIRED", 10, 6, 7),
      req("REJECTED", 1, 0, 8),
    ];
    const g = groupRequestsByFulfilment(requests);
    expect(g.pending.map(r => r.id)).toEqual([1, 2]);
    expect(g.partial.map(r => r.id)).toEqual([3]);
    expect(g.fulfilled.map(r => r.id)).toEqual([4, 5]);
    expect(g.closed.map(r => r.id)).toEqual([6, 7, 8]);
  });

  it("keeps a completed request out of Pending even when nothing was counted", () => {
    const g = groupRequestsByFulfilment([req("FULFILLED", 3, 0)]);
    expect(g.pending).toHaveLength(0);
    expect(g.fulfilled).toHaveLength(1);
  });

  it("does not list a withdrawn request as awaiting more", () => {
    const g = groupRequestsByFulfilment([req("CANCELLED", 10, 4)]);
    expect(g.partial).toHaveLength(0);
    expect(g.closed).toHaveLength(1);
  });
});
