import { getLenis } from "@/components/SmoothScroll";

/**
 * Scrolls the page to the top (mobile bottom bar, handoffs/Mobile Tab Scroll-to-Top Plan.md).
 *
 * Smooth when less than one screen down, instant from one screen on — a smooth
 * scroll up the home page would replay the landing film backwards. Reduced
 * motion is always instant. Goes through Lenis when it is running (a narrow
 * window driven by a mouse shows the bottom bar *and* runs Lenis), native
 * scroll otherwise. Focus moves to <main> straight away; `preventScroll` keeps
 * that from interrupting the scroll, so there's nothing to wait for.
 */
export function scrollToTop(): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const instant = reduced || window.scrollY >= window.innerHeight;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(0, { immediate: instant, force: true });
  else window.scrollTo({ top: 0, behavior: instant ? "instant" : "smooth" });
  document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
}
