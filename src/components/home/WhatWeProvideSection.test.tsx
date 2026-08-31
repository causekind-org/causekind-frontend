import { describe, it, expect } from "vitest";
import { dockFactors } from "./WhatWeProvideSection";

/**
 * The dock windows, at their boundaries.
 *
 * These are tested and the rest of the section is not, deliberately. Everything
 * else here is visible the instant you look at the panel — a wrong colour or a
 * parcel in the wrong place announces itself. These numbers do not: get a
 * window slightly wrong and the merge still *happens*, it just seams, and a
 * seam reads as "fine" until someone stares at it. So they get the test.
 *
 * Scroll is not simulated. jsdom has no layout, so getBoundingClientRect is all
 * zeroes and a scroll-driven test here would assert on nothing. The function is
 * pure; test the function.
 */
describe("dockFactors", () => {
  const DOCK_SPAN = 0.12;

  it("holds the parcel fully inside the donor at rest", () => {
    const { donorDock, doneeDock, docked } = dockFactors(0);
    expect(donorDock).toBe(1);
    expect(doneeDock).toBe(0);
    expect(docked).toBe(1);
  });

  it("has the parcel fully clear of the donor once the dock span is travelled", () => {
    const { donorDock, docked } = dockFactors(DOCK_SPAN);
    expect(donorDock).toBe(0);
    expect(docked).toBe(0);
  });

  it("leaves both ends clear across the whole middle of the belt", () => {
    for (const travel of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const { donorDock, doneeDock, docked } = dockFactors(travel);
      expect(donorDock).toBe(0);
      expect(doneeDock).toBe(0);
      expect(docked).toBe(0);
    }
  });

  it("starts the donee merge exactly one dock span from the end, not before", () => {
    expect(dockFactors(1 - DOCK_SPAN).doneeDock).toBe(0);
    expect(dockFactors(1 - DOCK_SPAN + 0.001).doneeDock).toBeGreaterThan(0);
  });

  it("absorbs the parcel fully into the donee at the end of the belt", () => {
    const { donorDock, doneeDock, docked } = dockFactors(1);
    expect(donorDock).toBe(0);
    expect(doneeDock).toBe(1);
    expect(docked).toBe(1);
  });

  it("never lets both ends claim the parcel at once", () => {
    for (let travel = 0; travel <= 1; travel += 0.01) {
      const { donorDock, doneeDock } = dockFactors(travel);
      expect(Math.min(donorDock, doneeDock)).toBe(0);
    }
  });

  it("stays clamped outside the belt, so overscroll cannot invert anything", () => {
    for (const travel of [-0.5, -0.01, 1.01, 2]) {
      const { donorDock, doneeDock, docked } = dockFactors(travel);
      for (const v of [donorDock, doneeDock, docked]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
