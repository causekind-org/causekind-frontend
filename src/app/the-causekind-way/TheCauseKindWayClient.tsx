"use client";

import React, { useEffect } from "react";
import { SmoothScroll } from "@/components/SmoothScroll";
import { CauseKindWayHero } from "@/components/causekind-way/CauseKindWayHero";
import { ManifestoSection } from "@/components/causekind-way/ManifestoSection";
import { ProblemSolutionSection } from "@/components/home/ProblemSolutionSection";
import { SupportJourneySection } from "@/components/home/SupportJourneySection";
import { WayFinalCtaSection } from "@/components/causekind-way/WayFinalCtaSection";
import { WayVerticalRoad } from "@/components/causekind-way/WayVerticalRoad";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function TheCauseKindWayClient() {
  useEffect(() => {
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
  }, []);

  return (
    <div className="relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] text-stone-900 dark:text-stone-100 min-h-[100svh] overflow-x-clip transition-colors duration-300">
      <SmoothScroll />

      {/* Vertical Road connecting all sections along the left milestone gutter */}
      <WayVerticalRoad />

      {/* 1. Hero */}
      <CauseKindWayHero />

      {/* 2. Why We Exist / Manifesto */}
      <ManifestoSection />

      {/* 3. The Problem We Solve */}
      <ProblemSolutionSection />

      {/* 4. Where Your Support Goes */}
      <SupportJourneySection />

      {/* 5. Final CTA */}
      <WayFinalCtaSection />
    </div>
  );
}
