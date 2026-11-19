/**
 * gsap + ScrollTrigger, loaded after the browser is idle instead of in the
 * first JS bundle. Sections keep their server HTML and resting layout; their
 * scroll animations start once this resolves.
 *
 * One shared promise, so the libraries download and register once however
 * many sections ask for them.
 */
import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

export type GsapModules = { gsap: typeof GsapType; ScrollTrigger: typeof ScrollTriggerType };

let loaded: GsapModules | null = null;
let loading: Promise<GsapModules> | null = null;
let idleGate: Promise<void> | null = null;

function afterIdle(): Promise<void> {
  if (!idleGate) {
    idleGate = new Promise<void>((resolve) => {
      if (typeof window === "undefined") return resolve();
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(() => resolve(), { timeout: 2000 });
      else setTimeout(resolve, 1200);
    });
  }
  return idleGate;
}

/** Resolves with gsap + ScrollTrigger (registered) once the browser is idle. */
export function loadGsap(): Promise<GsapModules> {
  if (!loading) {
    loading = afterIdle()
      .then(() => Promise.all([import("gsap"), import("gsap/ScrollTrigger")]))
      .then(([g, s]) => {
        g.gsap.registerPlugin(s.ScrollTrigger);
        // App-wide, before any trigger exists: skip re-measuring on the phone
        // address-bar resize (was set in SmoothScroll; see its notes).
        s.ScrollTrigger.config({ ignoreMobileResize: true });
        loaded = { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger };
        return loaded;
      });
  }
  return loading;
}

/** The modules if they have already loaded, else null (never triggers a load). */
export function gsapIfLoaded(): GsapModules | null {
  return loaded;
}

/**
 * ScrollTrigger.refresh() when it exists. Before gsap has loaded there are no
 * triggers to re-measure, so this is a no-op; triggers created after load
 * measure the layout as it is then.
 */
export function refreshScrollTrigger(): void {
  loaded?.ScrollTrigger.refresh();
}

/**
 * True when the element is already on screen. Sections use it when gsap
 * arrives: an element the visitor can already see keeps its final, visible
 * state instead of being hidden and animated back in (no flash).
 */
export function isInViewport(el: Element | null | undefined): boolean {
  if (!el || typeof window === "undefined") return false;
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
}
