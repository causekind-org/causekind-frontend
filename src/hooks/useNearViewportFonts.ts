"use client";

import { useEffect, type RefObject } from "react";

/** Decorative below-fold fonts should not compete with the first screen. */
export function useNearViewportFonts(ref: RefObject<HTMLElement | null>, classes: string) {
  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const apply = () => section.classList.add(...classes.split(/\s+/).filter(Boolean));
    if (typeof IntersectionObserver === "undefined") { apply(); return; }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      apply();
      observer.disconnect();
    }, { rootMargin: "600px" });
    observer.observe(section);
    return () => observer.disconnect();
  }, [ref, classes]);
}
