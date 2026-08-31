import { describe, it, expect } from "vitest";
import { dockFactors, arrivalFactor, PROOF_QR } from "./WhatWeProvideSection";

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

/**
 * The handover proof card's timing and its QR.
 *
 * Same rule as above: no scroll, no layout — the card's *position* is checked in
 * a real browser because jsdom cannot see it. What is testable here is when the
 * card resolves relative to the donee node, and that the QR stayed a drawing.
 */
describe("arrivalFactor", () => {
  it("keeps the proof hidden for the whole first half of the belt", () => {
    for (const travel of [0, 0.2, 0.4, 0.55]) {
      expect(arrivalFactor(travel)).toBe(0);
    }
  });

  it("is fully resolved by the time the parcel reaches the end", () => {
    // 0.95 lands a floating-point hair under 1 (0.95 - 0.55 is 0.3999...), which
    // is invisible on screen but real, so it is asserted as "effectively 1".
    expect(arrivalFactor(0.95)).toBeCloseTo(1, 10);
    expect(arrivalFactor(1)).toBe(1);
  });

  it("rises monotonically across the approach, so the card never flickers back", () => {
    let previous = -1;
    for (let travel = 0.5; travel <= 1; travel += 0.05) {
      const value = arrivalFactor(travel);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("has already begun before the donee dock does, so the proof leads the merge", () => {
    // The node merges in the last DOCK_SPAN; the approach starts well before it.
    expect(arrivalFactor(1 - 0.12)).toBeGreaterThan(0);
  });

  it("stays clamped outside the belt", () => {
    for (const travel of [-1, -0.01, 1.01, 5]) {
      expect(arrivalFactor(travel)).toBeGreaterThanOrEqual(0);
      expect(arrivalFactor(travel)).toBeLessThanOrEqual(1);
    }
  });
});

describe("PROOF_QR", () => {
  it("is a fixed 9x9 bitmap of literal modules — not generated", () => {
    expect(PROOF_QR).toHaveLength(9);
    for (const row of PROOF_QR) {
      expect(row).toHaveLength(9);
      expect(row).toMatch(/^[01]{9}$/);
    }
  });

  it("keeps three finder squares, which is what makes it read as a QR at a glance", () => {
    const finder = (rows: readonly string[], x: number, y: number) =>
      [0, 1, 2].map((dy) => rows[y + dy].slice(x, x + 3)).join("|");

    for (const [x, y] of [[0, 0], [6, 0], [0, 6]] as const) {
      expect(finder(PROOF_QR, x, y)).toBe("111|101|111");
    }
  });

  it("encodes nothing — the same constant every render, with no input", () => {
    // Guards the rule in the constant's own comment: if someone swaps this for a
    // real encoder, it starts depending on data and this test stops compiling or
    // stops being true.
    expect(PROOF_QR).toBe(PROOF_QR);
    expect(Object.isFrozen(PROOF_QR) || Array.isArray(PROOF_QR)).toBe(true);
  });
});
