import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/**
 * jsdom implements neither of these, and both are used by components under
 * test. Defining them here rather than per-file keeps the failure mode
 * consistent: a component that starts using `matchMedia` does not suddenly fail
 * in one suite and pass in another.
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

/**
 * jsdom has no IntersectionObserver at all, so components that construct one
 * throw on mount. This stub exists to let them mount; it does not attempt to
 * simulate intersection.
 *
 * <p>A consequence worth knowing before writing an assertion: framer-motion's
 * `whileInView` elements start at `opacity: 0` and are animated in by the
 * observer, so under jsdom they stay at zero and `toBeVisible()` reports false
 * for content that is perfectly visible in a real browser. Making this stub
 * fire its callback does not fix it — framer does not pick the transition up.
 * Assert on presence, roles and accessibility state instead; computed opacity
 * is not meaningful in this environment.
 */
window.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "";
  thresholds = [];
} as unknown as typeof IntersectionObserver;

/**
 * jsdom ships no SVG geometry engine, so `getTotalLength`/`getPointAtLength`
 * simply do not exist. The landing page's trust-journey path calls both from a
 * requestAnimationFrame loop, which throws asynchronously — outside any test's
 * call stack, so every test still passes while Vitest reports an unhandled
 * error and warns that results may be false positives.
 *
 * <p>Stubbed rather than silenced: the decorative path is not what these suites
 * are testing, but an unhandled error left in the run trains everyone to ignore
 * the one that eventually matters.
 */
if (typeof SVGElement !== "undefined") {
  const proto = SVGElement.prototype as unknown as Record<string, unknown>;
  proto.getTotalLength ??= () => 1000;
  proto.getPointAtLength ??= () => ({ x: 0, y: 0 });
}

/**
 * Geolocation is deliberately a spy that records calls rather than a stub that
 * resolves. Several tests assert that a guest is NEVER prompted for location,
 * and that assertion is only meaningful if a call would have been observable.
 */
Object.defineProperty(navigator, "geolocation", {
  writable: true,
  value: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
});
