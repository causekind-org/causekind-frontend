"use client";

import { useEffect } from "react";
import { loadGsap } from "@/lib/gsapLoader";

import { getLenis, setLenis } from "@/lib/lenisInstance";
export { getLenis };

export function SmoothScroll() {
  useEffect(() => {
    // A phone browser's address bar shrinking/growing resizes the viewport on
    // every scroll-direction change (2026-10-08, iPhone report: whole sections
    // jumped). Two guards, before any early return so phones get them:
    // 1. GSAP skips its own re-measure on those height-only resizes, app-wide.
    // 2. The cinematic film's scroll length uses --ck-svh, frozen at load and
    //    only re-taken when the width changes (rotation), so a forced
    //    ScrollTrigger.refresh() mid-scroll can't stretch or shrink it.
    // (The ScrollTrigger ignoreMobileResize config now runs in lib/gsapLoader,
    // as soon as gsap loads and before any trigger is created.)
    let lockedWidth = 0;
    const lockViewport = () => {
      if (window.innerWidth === lockedWidth) return;
      lockedWidth = window.innerWidth;
      document.documentElement.style.setProperty("--ck-svh", `${window.innerHeight / 100}px`);
    };
    lockViewport();
    window.addEventListener("resize", lockViewport);
    const unlock = () => window.removeEventListener("resize", lockViewport);

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return unlock;
    // Touch devices: Lenis leaves touch scrolling native anyway, so on a phone it
    // only added a per-frame ticker callback and a second ScrollTrigger.update()
    // per scroll. Wheel smoothing is the whole point, and phones have no wheel.
    if (window.matchMedia("(pointer: coarse)").matches) return unlock;

    // Lenis and gsap load after the browser is idle (lib/gsapLoader): the page
    // scrolls natively until then, then smooth wheel scrolling starts.
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    void Promise.all([loadGsap(), import("lenis")]).then(([{ gsap, ScrollTrigger }, { default: Lenis }]) => {
      if (cancelled) return;
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
      });

      setLenis(lenis);

      // Synchronize Lenis scroll with GSAP ScrollTrigger
      lenis.on("scroll", ScrollTrigger.update);

      const updateTicker = (time: number) => {
        lenis.raf(time * 1000);
      };

      gsap.ticker.add(updateTicker);
      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        gsap.ticker.remove(updateTicker);
        if (getLenis() === lenis) setLenis(null);
        lenis.destroy();
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
      unlock();
    };
  }, []);

  return null;
}
