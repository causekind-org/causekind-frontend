import type Lenis from "lenis";

/**
 * The active Lenis instance, or null on touch devices / reduced motion (native
 * scroll). Kept apart from SmoothScroll.tsx so callers that only read it
 * (scrollToTop, used by the site-wide mobile nav) do not pull the lenis library
 * into every page. `import type` is erased at build time.
 */
let activeLenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return activeLenis;
}

export function setLenis(instance: Lenis | null): void {
  activeLenis = instance;
}
