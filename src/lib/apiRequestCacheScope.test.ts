import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Spec for the request cache being browser-only.
 *
 * <p>`src/lib/api.ts` keeps its GET cache and in-flight map as module-level
 * `Map`s. In the browser that is one user and one session, and the 3s window
 * usefully collapses render cascades. On the Next server the same module-level
 * Map is process-global — shared by every concurrent visitor — while the key is
 * the path alone and every request carries `credentials: "include"`.
 *
 * <p>So identity determines the response but forms no part of the key. A single
 * server-side call to a user-scoped path would let one visitor's response be
 * served to the next out of memory, with no backend request to notice.
 *
 * <p>This test exists because that regression would look completely innocuous in
 * review: it needs no change to api.ts at all, only a new server-side caller
 * somewhere else in the app.
 *
 * <p>`window` is stubbed to undefined rather than running the file under the
 * node environment, because `vitest.setup.ts` stubs browser APIs unconditionally
 * and throws without a DOM. Stubbing the one global the guard actually reads
 * tests the same property without reshaping setup for 43 other suites.
 */
describe("api request cache scope", () => {
  const ORIGINAL_FETCH = globalThis.fetch;

  function jsonResponse(body: unknown) {
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      text: async () => JSON.stringify(body),
      json: async () => body,
    } as unknown as Response;
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it("does not serve a second server-side GET from cache", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.stubGlobal("window", undefined);
    expect(typeof window).toBe("undefined"); // guards the guard

    const { getPublicItemRequests } = await import("./api");

    await getPublicItemRequests();
    await getPublicItemRequests();

    // Two calls, two round trips. If this ever reads 1, the process-global cache
    // is live on the server and a user-scoped endpoint would leak across
    // visitors.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("still caches in the browser, where the cache is correct and wanted", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    expect(typeof window).not.toBe("undefined"); // jsdom, the browser case

    const { getPublicItemRequests } = await import("./api");

    await getPublicItemRequests();
    await getPublicItemRequests();

    // The other half of the contract: disabling the cache everywhere would be a
    // silent performance regression, so assert it survives where it belongs.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
