"use client";

import { loadGsap } from "@/lib/gsapLoader";
import React, { useEffect } from "react";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ManifestoSection } from "@/components/causekind-way/ManifestoSection";
import { ProblemSolutionSection } from "@/components/home/ProblemSolutionSection";
import { SupportJourneySection } from "@/components/home/SupportJourneySection";
import { WayVerticalRoad } from "@/components/causekind-way/WayVerticalRoad";

export function CauseKindWaySections() {
  useEffect(() => {
    // gsap loads after the browser is idle (lib/gsapLoader), not in the first bundle.
    let cancelled = false;
    let cleanup: void | (() => void);
    loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      cleanup = (() => {
        if (typeof window !== "undefined") {
          gsap.registerPlugin(ScrollTrigger);

          // Refresh ScrollTriggers smoothly when entering or mounting
          const timer = setTimeout(() => {
            ScrollTrigger.refresh();
          }, 500);

          return () => {
            clearTimeout(timer);
            // Clean up any stale ScrollTriggers when leaving this page
            ScrollTrigger.getAll().forEach((st) => {
              if (st.vars.id?.startsWith?.("way-") || st.vars.trigger?.toString().includes("where-support-goes")) {
                st.kill();
              }
            });
          };
        }
      })();
    });
    return () => {
      cancelled = true;
      if (typeof cleanup === "function") cleanup();
    };
  }, []);

  return (
    <div className="relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] text-stone-900 dark:text-stone-100 min-h-[100svh] overflow-x-clip transition-colors duration-300">
      <SmoothScroll />

      {/* Vertical Road connecting all sections along the left milestone gutter */}
      <WayVerticalRoad />

      {/* 1. Why We Exist / Manifesto */}
      <ManifestoSection />

      {/* 2. The Problem We Solve — tablet and desktop only (owner, 26 Nov 2026:
          removed from the phone view). */}
      <div className="hidden md:block">
        <ProblemSolutionSection />
      </div>

      {/* 3. Where Your Support Goes */}
      <SupportJourneySection />
    </div>
  );
}
