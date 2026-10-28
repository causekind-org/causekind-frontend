import { afterEach, describe, expect, it, vi } from "vitest";
import { getNgoOverview, getMyNgoDrives, SLOW_REQUEST_MESSAGE, isSlowRequestError } from "./api";

function timeout() {
  const e = new Error("signal timed out");
  e.name = "TimeoutError";
  return e;
}
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("request: slow or dropped requests", () => {
  it("retries a GET once after a timeout, then succeeds", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(timeout()).mockResolvedValueOnce(ok({ liveDrives: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getNgoOverview()).resolves.toEqual({ liveDrives: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("after a second timeout shows the friendly message, never the raw one", async () => {
    const fetchMock = vi.fn().mockRejectedValue(timeout());
    vi.stubGlobal("fetch", fetchMock);
    const err = await getMyNgoDrives().catch((e: unknown) => e);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(isSlowRequestError(err)).toBe(true);
    expect((err as Error).message).toBe(SLOW_REQUEST_MESSAGE);
    expect((err as Error).message).not.toMatch(/signal timed out/);
  });

  it("a network error (TypeError) is retried the same way", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(ok([]));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getMyNgoDrives()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
