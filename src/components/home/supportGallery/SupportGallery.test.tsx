import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("./fonts", () => ({ galleryFonts: "" }));
// The mandala is Diwali-only (until 13 Nov 2026 00:00 IST); pinned per case.
const diwaliState = vi.hoisted(() => ({ on: true }));
vi.mock("@/lib/diwali", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/diwali")>()),
  isDiwaliCampaignActive: () => diwaliState.on,
}));

const { SupportGallery } = await import("./SupportGallery");

/** Every observed section counts as on screen, so only the gating can stop the video. */
class OnScreenObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  disconnect() {}
  unobserve() {}
}

function setEnvironment({ width, reducedMotion = false, saveData = false }: { width: number; reducedMotion?: boolean; saveData?: boolean }) {
  vi.stubGlobal("IntersectionObserver", OnScreenObserver);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? reducedMotion : width >= 1024,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  window.matchMedia = globalThis.matchMedia;
  Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData } });
}

describe("the mandala video", () => {
  beforeEach(() => {
    diwaliState.on = true;
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mounts on desktop", () => {
    setEnvironment({ width: 1440 });
    const { container } = render(<SupportGallery />);
    expect(container.querySelector("video")).not.toBeNull();
  });

  it.each([
    ["reduced motion", { width: 1440, reducedMotion: true }],
    ["Save-Data", { width: 1440, saveData: true }],
    ["below 1024px", { width: 1023 }],
  ])("stays out with %s, leaving only the poster", (_name, environment) => {
    setEnvironment(environment);
    const { container } = render(<SupportGallery />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector('[aria-hidden] img[src*="diwali-support-mandala-poster"]')).not.toBeNull();
  });

  it("leaves with Diwali, taking the poster too", () => {
    diwaliState.on = false;
    setEnvironment({ width: 1440 });
    const { container } = render(<SupportGallery />);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector('img[src*="diwali-support-mandala"]')).toBeNull();
  });
});
