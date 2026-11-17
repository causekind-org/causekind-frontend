import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("./fonts", () => ({ galleryFonts: "" }));

const { SupportGallery } = await import("./SupportGallery");

class OnScreenObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  disconnect() {}
  unobserve() {}
}

describe("SupportGallery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders without the retired Diwali mandala", () => {
    vi.stubGlobal("IntersectionObserver", OnScreenObserver);
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
    window.matchMedia = globalThis.matchMedia;
    const { container } = render(<SupportGallery />);
    expect(container.querySelector("#where-support-goes")).not.toBeNull();
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector('img[src*="mandala"]')).toBeNull();
  });
});
