import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDeviceTilt } from "./useDeviceTilt";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("DeviceOrientationEvent", Event);
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function tilt(beta: number, gamma: number) {
  act(() => {
    vi.advanceTimersByTime(40);
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), { beta, gamma }));
  });
}

describe("default-on device tilt", () => {
  it("calibrates the first sample, wakes physics for a tilt and resets on close", () => {
    const { result, rerender } = renderHook(({ active }) => useDeviceTilt(active), { initialProps: { active: true } });
    const wake = vi.fn();
    result.current.wake = wake;
    tilt(40, 0);
    expect(result.current.x).toBe(0);
    tilt(40, 10);
    expect(result.current.x).toBeGreaterThan(0);
    expect(wake).toHaveBeenCalled();
    rerender({ active: false });
    expect(result.current.x).toBe(0);
    tilt(40, 25);
    expect(result.current.x).toBe(0);
  });

  it("keeps the drag fallback when sensors are unavailable", () => {
    vi.stubGlobal("isSecureContext", false);
    const { result } = renderHook(() => useDeviceTilt(true));
    tilt(40, 0); tilt(50, 10);
    expect(result.current.x).toBe(0);
    expect(result.current.y).toBe(0);
  });

  it("suppresses sensor forces for reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const { result } = renderHook(() => useDeviceTilt(true));
    tilt(40, 0); tilt(50, 10);
    expect(result.current.x).toBe(0);
    expect(result.current.y).toBe(0);
  });
});
