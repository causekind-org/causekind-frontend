import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { START_EVENTS, useAfterFirstInteraction } from "./useAfterFirstInteraction";

describe("useAfterFirstInteraction", () => {
  it("stays false while the visitor has not interacted, even after load", () => {
    const { result } = renderHook(() => useAfterFirstInteraction());
    act(() => {
      window.dispatchEvent(new Event("load"));
    });
    expect(result.current).toBe(false);
  });

  for (const type of START_EVENTS) {
    it(`turns true on the first ${type}`, () => {
      const { result } = renderHook(() => useAfterFirstInteraction());
      act(() => {
        window.dispatchEvent(new Event(type));
      });
      expect(result.current).toBe(true);
    });
  }

  // Lighthouse 26 Nov: a scroll or mousemove with no person behind it started
  // the trackers in 2 of 9 runs. Neither may start them on its own.
  for (const type of ["scroll", "mousemove"]) {
    it(`stays false on ${type} alone`, () => {
      const { result } = renderHook(() => useAfterFirstInteraction());
      act(() => {
        window.dispatchEvent(new Event(type));
      });
      expect(result.current).toBe(false);
    });
  }
});
