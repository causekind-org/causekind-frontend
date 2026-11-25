/** Shared by links and imperative router buttons; no speculative route fetches. */
export const NAVIGATION_START_EVENT = "ck:navigation-start";

export function startNavigation(href: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return;
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}
