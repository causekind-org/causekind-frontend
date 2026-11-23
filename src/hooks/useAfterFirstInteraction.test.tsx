import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { INTERACTION_EVENTS, useAfterFirstInteraction } from "./useAfterFirstInteraction";

describe("useAfterFirstInteraction", () => {
  it("stays false while the visitor has not interacted, even after load", () => {
    const { result } = renderHook(() => useAfterFirstInteraction());
    act(() => {
      window.dispatchEvent(new Event("load"));
    });
    expect(result.current).toBe(false);
  });

  for (const type of INTERACTION_EVENTS) {
    it(`turns true on the first ${type}`, () => {
      const { result } = renderHook(() => useAfterFirstInteraction());
      act(() => {
        window.dispatchEvent(new Event(type));
      });
      expect(result.current).toBe(true);
    });
  }
});
