import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HIDDEN_LISTINGS_KEY, getHiddenListingIds } from "./listingActions";

/**
 * Deleting a listing must not lie to the donor.
 *
 * <p>`deleteMyListing` keeps a localStorage list of ids to hide, as a safety
 * rail for listings the server keeps but stops showing. It used to add the id
 * <i>before</i> calling the server and swallow both the DELETE's and the
 * withdraw's errors — so a refused delete still cleared the row, still reported
 * success, and hid the listing in that browser permanently while it sat intact
 * on the server. The donor could no longer see it, edit it, submit it or delete
 * it again, on that device, ever.
 *
 * <p>These pin the rail to the server's answer: hide only when something
 * actually happened, and let a total failure reach the caller.
 */
describe("deleteMyListing", () => {
  const ORIGINAL_FETCH = globalThis.fetch;

  function ok() {
    return {
      ok: true, status: 200,
      headers: { get: () => "application/json" },
      text: async () => "{}",
      json: async () => ({}),
    } as unknown as Response;
  }

  function fails(status: number, message: string) {
    return {
      ok: false, status,
      headers: { get: () => "application/json" },
      text: async () => JSON.stringify({ message }),
      json: async () => ({ message }),
    } as unknown as Response;
  }

  /** Answers each path with the given response; records the calls made. */
  function routeFetch(routes: Array<{ match: RegExp; response: Response }>) {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      calls.push(String(url));
      const hit = routes.find((r) => r.match.test(String(url)));
      if (!hit) throw new Error(`unrouted ${url}`);
      return hit.response;
    });
    vi.stubGlobal("fetch", fetchMock);
    return calls;
  }

  beforeEach(() => {
    vi.resetModules();
    localStorage.removeItem(HIDDEN_LISTINGS_KEY);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = ORIGINAL_FETCH;
    localStorage.removeItem(HIDDEN_LISTINGS_KEY);
  });

  it("hides the listing once the server has deleted it", async () => {
    routeFetch([{ match: /\/api\/v1\/items\/7$/, response: ok() }]);
    const { deleteMyListing } = await import("./api");

    await deleteMyListing(7);

    expect(getHiddenListingIds()).toEqual([7]);
  });

  it("falls back to withdrawing, and hides it only because that worked", async () => {
    const calls = routeFetch([
      { match: /\/api\/v1\/items\/7\/withdraw$/, response: ok() },
      { match: /\/api\/v1\/items\/7$/, response: fails(400, "Only draft, withdrawn, expired, or rejected listings can be deleted") },
    ]);
    const { deleteMyListing } = await import("./api");

    await deleteMyListing(7);

    expect(calls.some((c) => c.endsWith("/withdraw"))).toBe(true);
    expect(getHiddenListingIds()).toEqual([7]);
  });

  it("reports the failure and hides nothing when the server refuses both", async () => {
    routeFetch([
      { match: /\/api\/v1\/items\/7\/withdraw$/, response: fails(400, "Cannot withdraw listing in status: DONATED") },
      { match: /\/api\/v1\/items\/7$/, response: fails(400, "Only draft, withdrawn, expired, or rejected listings can be deleted") },
    ]);
    const { deleteMyListing } = await import("./api");

    // The dashboard shows this message instead of "Listing deleted".
    await expect(deleteMyListing(7)).rejects.toThrow(/can be deleted/);
    // Nothing happened on the server, so nothing may be hidden here — otherwise
    // the listing vanishes from this browser while still existing.
    expect(getHiddenListingIds()).toEqual([]);
  });

  it("does not hide the listing when the network drops mid-delete", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const { deleteMyListing } = await import("./api");

    await expect(deleteMyListing(7)).rejects.toThrow();
    expect(getHiddenListingIds()).toEqual([]);
  });
});
