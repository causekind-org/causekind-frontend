import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { PlatformStats } from "@/lib/api";

import { IndependenceCount, UnfurlReveal } from "./IndependenceHero";

/**
 * The 15 August hero pieces.
 *
 * <p>What is worth pinning is what the campaign must never do: claim a figure
 * the platform cannot supply, replay its one-time moment on every navigation, or
 * hide the headline from anyone whose browser did not run the animation.
 */

function stats(over: Partial<PlatformStats> = {}): PlatformStats {
  return {
    activeCampaigns: 0,
    totalDonations: 128,
    uniqueDonors: 44,
    totalRaised: 0,
    topCategory: "Household",
    ...over,
  };
}

/**
 * jsdom has no matchMedia. Supplying one that reports reduced motion makes the
 * figure settle synchronously, so the assertions below are about *what* is shown
 * rather than about racing a 1.1s animation — and it exercises the path a real
 * visitor with the OS setting on actually gets.
 */
function prefersReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  prefersReducedMotion(true);
});

describe("the count card", () => {
  it("shows the handover count and the number of people who gave", () => {
    render(<IndependenceCount stats={stats()} />);

    expect(screen.getByText("128")).toBeTruthy();
    expect(screen.getByText(/44 people gave/)).toBeTruthy();
  });

  // There is deliberately no test that the count-up *animation* lands on the
  // figure. One was written and removed: it passed alone and failed under full
  // suite load, because it depends on requestAnimationFrame keeping pace in
  // jsdom under contention. A test that fails for reasons unrelated to the code
  // teaches people to re-run the suite instead of reading it. The value it
  // settles on is what matters and that is asserted above, synchronously,
  // through the reduced-motion path.

  it("formats large figures the Indian way", () => {
    render(<IndependenceCount stats={stats({ totalDonations: 125000 })} />);
    // 1,25,000 — not 125,000.
    expect(screen.getByText("1,25,000")).toBeTruthy();
  });

  it("names the right Independence Day", () => {
    render(<IndependenceCount stats={stats()} />);
    // Derived from the system clock via independenceDayOrdinal, so this asserts
    // the shape rather than a fixed number that would rot next August.
    expect(screen.getByText(/\d+(st|nd|rd|th) Independence Day/)).toBeTruthy();
  });

  /**
   * A card reading "—" advertises a fact the page cannot supply. Rendering
   * nothing is the honest failure, and the hero simply looks as it does on any
   * other day.
   */
  it("renders nothing at all when the figure is unavailable", () => {
    const { container } = render(<IndependenceCount stats={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing rather than boasting about zero", () => {
    const { container } = render(<IndependenceCount stats={stats({ totalDonations: 0 })} />);
    expect(container.firstChild).toBeNull();
  });

  it("omits the givers line when nobody is counted, keeping the rest", () => {
    render(<IndependenceCount stats={stats({ uniqueDonors: 0 })} />);
    expect(screen.getByText("128")).toBeTruthy();
    expect(screen.queryByText(/people gave/)).toBeNull();
  });
});

describe("the unfurl", () => {
  it("shows its children whether or not the animation runs", () => {
    render(<UnfurlReveal>Making Lives Better</UnfurlReveal>);
    expect(screen.getByText("Making Lives Better")).toBeTruthy();
  });

  /**
   * Once per session. An animation that replays on every client navigation
   * stops being a moment and becomes a tic.
   */
  it("plays once, then not again", () => {
    const first = render(<UnfurlReveal>Headline</UnfurlReveal>);
    expect(first.container.querySelector(".ck-unfurl")).not.toBeNull();
    expect(sessionStorage.getItem("ck_id_unfurl_seen")).toBe("1");
    first.unmount();

    const second = render(<UnfurlReveal>Headline</UnfurlReveal>);
    expect(second.container.querySelector(".ck-unfurl")).toBeNull();
    expect(screen.getByText("Headline")).toBeTruthy();
  });

  /**
   * Blocked storage must not mean the moment replays forever for that visitor —
   * it is the one case where failing to record it is worse than skipping it.
   */
  it("skips the animation when storage is unavailable, and still shows the text", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const { container } = render(<UnfurlReveal>Headline</UnfurlReveal>);
    expect(container.querySelector(".ck-unfurl")).toBeNull();
    expect(screen.getByText("Headline")).toBeTruthy();
  });

  it("keeps separate moments separate", () => {
    render(<UnfurlReveal storageKey="ck_other">A</UnfurlReveal>);
    expect(sessionStorage.getItem("ck_other")).toBe("1");
    expect(sessionStorage.getItem("ck_id_unfurl_seen")).toBeNull();
  });
});
