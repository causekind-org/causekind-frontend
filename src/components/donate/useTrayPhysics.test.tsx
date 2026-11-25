import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useTrayPhysics } from "./DonateChoice";

let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  frames = new Map();
  let nextId = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => {
    frames.set(++nextId, callback); return nextId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
});
afterEach(() => vi.restoreAllMocks());
function advanceFrame() {
  const entry = frames.entries().next().value;
  if (!entry) return;
  frames.delete(entry[0]);
  act(() => entry[1](performance.now()));
}

it("leaves the initial paint free of physics layout measurements", () => {
  const sheet = document.createElement("div");
  const measure = vi.spyOn(sheet, "getBoundingClientRect");
  renderHook(() => useTrayPhysics(sheet));
  expect(measure).not.toHaveBeenCalled();
  advanceFrame();
  expect(measure).not.toHaveBeenCalled();
  advanceFrame();
  expect(measure).toHaveBeenCalledOnce();
});

it("starts immediately when the user drags before the opening handoff", () => {
  const sheet = document.createElement("div");
  const measure = vi.spyOn(sheet, "getBoundingClientRect");
  renderHook(() => useTrayPhysics(sheet));
  act(() => sheet.dispatchEvent(new Event("pointerdown")));
  expect(measure).toHaveBeenCalledOnce();
  expect(frames.size).toBe(1);
});

it("cancels pending opening work when the sheet closes immediately", () => {
  const sheet = document.createElement("div");
  const { unmount } = renderHook(() => useTrayPhysics(sheet));
  expect(frames.size).toBe(1);
  unmount();
  expect(frames.size).toBe(0);
});
