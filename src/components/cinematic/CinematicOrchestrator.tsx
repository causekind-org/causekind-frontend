"use client";

/**
 * CinematicOrchestrator — the landing page's film.
 *
 * Each chapter is its own pinned, scroll-scrubbed stage. They are stacked with
 * nothing between them on purpose: Chapter 1 ends with the bag diving out
 * through the bottom edge on a glowing line, and Chapter 2's stage begins with
 * that same line entering through its top edge at the same x (both compute it
 * from `measureStage().seamX`), on the same night background. Put anything
 * between the two and the line visibly breaks.
 *
 * On the home page it is mounted *under* the hero (`HeroFilm`), which passes
 * the hero as `leadInRef`: the hero slides off the pinned Chapter 1 stage and
 * the film starts once it has gone.
 *
 * While the film owns the screen — from the hero leaving until Chapter 2's
 * stage unpins — it asks the nav chrome to hide (`ck:immersive-nav`; the
 * header and the mobile dock listen), and gives it back either side.
 */

import { useEffect, useRef, type RefObject } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Chapter1TheUnusedThing } from "@/sections/landing/Chapter1TheUnusedThing";
import { Chapter2TheEcosystem } from "@/sections/landing/Chapter2TheEcosystem";

export function CinematicOrchestrator({
  leadInRef,
}: {
  leadInRef?: RefObject<HTMLElement | null>;
} = {}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // The film mounts after hydration and adds two pins' worth of scroll, so
  // every trigger further down the page has to re-measure once it is in.
  //
  // `sort()` first: ScrollTrigger refreshes in creation order, and the
  // sections below were created before the film. Unsorted, they were measured
  // before the film's pin spacers existed and kept start positions from a page
  // without the film — ~13,000px too early.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Hide the nav while the story plays. Starts once the hero's bottom edge has
  // passed the top of the screen (or, with no hero, when the stage reaches the
  // top) and ends when the last pinned stage lets go — the container's bottom
  // meeting the viewport's is exactly Chapter 2's unpin.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let hidden = false;
    const set = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      window.dispatchEvent(new CustomEvent("ck:immersive-nav", { detail: next }));
    };
    const lead = leadInRef?.current;
    const st = ScrollTrigger.create({
      trigger: lead ?? root,
      start: lead ? "bottom top+=24" : "top top",
      endTrigger: root,
      end: "bottom bottom",
      // Measured last: its end is the film container's bottom, which only
      // settles once both chapters' pin spacers exist. Without this,
      // `ScrollTrigger.sort()` refreshes it (early start) before Chapter 2's
      // pin and the nav came back halfway through the film.
      refreshPriority: -1,
      onToggle: (self) => set(self.isActive),
    });
    return () => {
      st.kill();
      set(false);
    };
  }, [leadInRef]);

  return (
    <div ref={rootRef} className="ck-cinematic relative w-full">
      <Chapter1TheUnusedThing leadInRef={leadInRef} />
      <Chapter2TheEcosystem />
    </div>
  );
}
