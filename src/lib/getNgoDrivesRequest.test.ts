import { afterEach, describe, expect, it, vi } from "vitest";
import { getNgoDrives, markAllNotificationsRead } from "./api";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("getNgoDrives", () => {
  it("is not restarted by a write that happens while it is in flight", async () => {
    let answer: (r: Response) => void = () => {};
    const fetchMock = vi.fn((url: string) => (String(url).includes("/api/v1/drives")
      ? new Promise<Response>((res) => { answer = res; })
      : Promise.resolve(json({ updated: 0 }))));
    vi.stubGlobal("fetch", fetchMock);

    const drives = getNgoDrives();
    await markAllNotificationsRead();
    answer(json([{ id: 1 }]));

    await expect(drives).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes("/api/v1/drives"))).toHaveLength(1);
  });
});
