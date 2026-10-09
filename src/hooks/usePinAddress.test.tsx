import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePinAddress } from "./usePinAddress";

const actions = vi.hoisted(() => ({
  detect: vi.fn(),
  resolve: vi.fn(async () => ({ stateIso: "MH", cityValue: "Mumbai" })),
}));
vi.mock("@/app/actions/locations", () => ({
  detectLocationFromServer: actions.detect,
  geocodeAddressFromServer: vi.fn(),
  resolveLocationFromGPS: actions.resolve,
}));

/**
 * A pin lookup reports what it found and, separately, when it found nothing,
 * so the forms can clear an address that described the previous spot.
 */
describe("usePinAddress lookup", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it("leaves out what it could not find (here: locality and PIN)", async () => {
    actions.detect.mockResolvedValue({ ok: true, address: { country_code: "in", state: "Maharashtra", city: "Mumbai" } });
    const { result } = renderHook(() => usePinAddress());
    const onFound = vi.fn();
    const onNotFound = vi.fn();
    act(() => result.current.lookup(19.07, 72.87, onFound, onNotFound));
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(onFound).toHaveBeenCalledWith(expect.objectContaining({ countryIso: "IN", stateIso: "MH", city: "Mumbai", locality: undefined, pincode: undefined }));
    expect(onNotFound).not.toHaveBeenCalled();
  });

  it("calls onNotFound when nothing is at the spot", async () => {
    actions.detect.mockResolvedValue({ ok: false, reason: "no-address" });
    const { result } = renderHook(() => usePinAddress());
    const onFound = vi.fn();
    const onNotFound = vi.fn();
    act(() => result.current.lookup(0, 0, onFound, onNotFound));
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(onNotFound).toHaveBeenCalledTimes(1);
    expect(onFound).not.toHaveBeenCalled();
  });

  it("calls onNotFound when the lookup itself fails", async () => {
    actions.detect.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => usePinAddress());
    const onNotFound = vi.fn();
    act(() => result.current.lookup(1, 1, () => {}, onNotFound));
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(onNotFound).toHaveBeenCalledTimes(1);
  });
});
