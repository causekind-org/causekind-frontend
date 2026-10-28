import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// Under full-suite load a findBy*/waitFor can need more than RTL's 1 s default.
configure({ asyncUtilTimeout: 8000 });

// NGO signup is off unless NEXT_PUBLIC_NGO_ENABLED is "true" (production shows
// "Coming soon"). The suites exercise the NGO flows, so they run with it on;
// the off state has its own test (register/NgoComingSoon.test.tsx).
process.env.NEXT_PUBLIC_NGO_ENABLED ??= "true";

// jsdom logs "not implemented" for scrolling; nothing under test depends on it.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

/**
 * Components translate their copy with next-intl (2026-10 translation pass). Most suites render them
 * without a NextIntlClientProvider, where useTranslations throws. NO_PROVIDER_FALLBACK: outside a
 * provider, translate from the English catalogue instead, so those suites see the real English copy.
 * Inside a provider (suites that pass their own messages) the real hooks run unchanged.
 */
vi.mock("next-intl", async (importOriginal) => {
  const real = await importOriginal<typeof import("next-intl")>();
  const en = (await import("./messages/en.json")).default as Record<string, unknown>;
  // One translator per namespace: building one walks the whole catalogue, too slow to repeat per render.
  const cache = new Map<string, unknown>();
  const fallback = (namespace?: string) => {
    const key = namespace ?? "";
    let t = cache.get(key);
    if (!t) cache.set(key, (t = real.createTranslator({ locale: "en", messages: en as never, namespace: namespace as never })));
    return t as never;
  };
  return {
    ...real,
    useTranslations: ((namespace?: string) => {
      try {
        return real.useTranslations(namespace as never);
      } catch {
        return fallback(namespace);
      }
    }) as typeof real.useTranslations,
    useLocale: () => {
      try { return real.useLocale(); } catch { return "en"; }
    },
  };
});

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
 * jsdom has no ResizeObserver either. `input-otp` constructs one on mount, so any
 * test rendering the handover code field threw before this existed. Same contract
 * as the stub above: it lets components mount, it does not simulate resizes.
 */
window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

/**
 * `input-otp` also probes `document.elementFromPoint` from a timer, to detect a
 * password manager badge overlapping the field. jsdom has no layout engine and so
 * no such method, and because the call happens on a timeout it surfaces as an
 * uncaught exception after the test body has finished rather than a failed
 * assertion. Returning null means "nothing is overlapping", which is the right
 * answer for a headless environment.
 */
document.elementFromPoint = (() => null) as unknown as typeof document.elementFromPoint;

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

/**
 * next/font/google loaders only run inside Next's compiler; under Vitest every
 * one of them is undefined, so any component that declares a font at module
 * level throws on import. A suite that mocks next/font/google itself still
 * wins over this default.
 */
vi.mock("next/font/google", () => new Proxy({}, {
  has: (_target, name) => typeof name === "string" && name !== "then",
  get: (_target, name) => typeof name === "string" && name !== "then"
    ? () => ({ className: "", variable: `font-${name}`, style: { fontFamily: name } })
    : undefined,
}));
