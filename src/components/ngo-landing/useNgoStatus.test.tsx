import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useNgoStatus } from "./useNgoStatus";

const api = vi.hoisted(() => ({
  getMyNgoApplication: vi.fn(),
  getNgoDraft: vi.fn(),
  getNgoOverview: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 7, email: "ngo@test", role: "NGO_PARTNER", fullName: "Hope" }, isLoading: false }),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), ...api }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  api.getMyNgoApplication.mockResolvedValue({ status: "APPROVED", organizationName: "Hope" });
  api.getNgoDraft.mockResolvedValue(null);
  api.getNgoOverview.mockResolvedValue({});
});

describe("useNgoStatus loading", () => {
  it("loads once on mount, and switching tabs back right away does not reload", async () => {
    const { result } = renderHook(() => useNgoStatus());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.getMyNgoApplication).toHaveBeenCalledTimes(1);
    expect(api.getNgoOverview).toHaveBeenCalledTimes(1);

    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(api.getMyNgoApplication).toHaveBeenCalledTimes(1);
  });

  it("a slow background refresh keeps the NGO verified on screen, with the friendly message", async () => {
    const { result } = renderHook(() => useNgoStatus());
    await waitFor(() => expect(result.current.isVerified).toBe(true));
    const { ApiError, SLOW_REQUEST_MESSAGE } = await import("@/lib/api");
    api.getMyNgoApplication.mockRejectedValueOnce(new ApiError(0, SLOW_REQUEST_MESSAGE, { code: "SLOW_REQUEST" }));
    act(() => { window.dispatchEvent(new Event("ngo-activity-updated")); });
    await waitFor(() => expect(result.current.error).toBe(SLOW_REQUEST_MESSAGE));
    expect(result.current.isVerified).toBe(true);
  });
});
