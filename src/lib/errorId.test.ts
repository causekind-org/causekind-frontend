import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { getMyNgoApplication, submitNgoApplication } from "@/lib/api";
import { errorIdOf } from "@/lib/errorId";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn(), warning: vi.fn(), success: vi.fn() } }));

const serverError = () => vi.fn(async () => new Response(
  JSON.stringify({ code: "INTERNAL_ERROR", errorId: "abc-123" }),
  { status: 500, headers: { "content-type": "application/json" } },
));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("errorId from a 500", () => {
  it("reaches the caller, without a toast for a page load", async () => {
    vi.stubGlobal("fetch", serverError());
    const error = await getMyNgoApplication().catch((e) => e);
    expect(errorIdOf(error)).toBe("abc-123");
    await new Promise((r) => setTimeout(r, 0));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows a toast with the id and a Copy action for a failed action", async () => {
    vi.stubGlobal("fetch", serverError());
    await submitNgoApplication({} as never).catch(() => {});
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalled());
    const [message, options] = vi.mocked(toast.error).mock.calls[0] as unknown as [string, { action: { label: string } }];
    expect(message).toBe("Error ID: abc-123");
    expect(options.action.label).toBe("Copy");
  });
});
