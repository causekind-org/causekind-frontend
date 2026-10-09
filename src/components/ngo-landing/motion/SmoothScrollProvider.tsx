"use client";

import React, { useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useReducedMotion } from "framer-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Do not initialize if reduced motion is preferred
    if (prefersReducedMotion) return;

    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Sync GSAP ticker with Lenis
    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);

    // Pause Lenis when dialogs/modals open (detected by data-lenis-prevent or Radix pointers)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-state") {
          const el = mutation.target as HTMLElement;
          if (el.getAttribute("data-state") === "open" && el.closest('[role="dialog"], [role="menu"]')) {
            lenis.stop();
          } else {
            // Need a more robust check for all open dialogs, but this is a starting point
            // Radix usually adds `pointer-events: none` to the body when a modal is open.
          }
        }
      });
    });

    const bodyObserver = new MutationObserver(() => {
      if (document.body.style.pointerEvents === "none") {
        lenis.stop();
      } else {
        lenis.start();
      }
    });

    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    // Cleanup
    return () => {
      lenis.destroy();
      gsap.ticker.remove(updateLenis);
      bodyObserver.disconnect();
      observer.disconnect();
      lenisRef.current = null;
    };
  }, [prefersReducedMotion]);

  return <>{children}</>;
}
