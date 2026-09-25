"use client";

/**
 * CinematicOrchestrator — the landing page's film, directly below the hero.
 *
 * Each chapter is its own pinned, scroll-scrubbed stage. They are stacked with
 * nothing between them on purpose: Chapter 1 ends with the bag diving out
 * through the bottom edge on a glowing line, and Chapter 2's stage begins with
 * that same line entering through its top edge at the same x (both compute it
 * from `measureStage().seamX`), on the same night background. Put anything
 * between the two and the line visibly breaks.
 */

import { Chapter1TheUnusedThing } from "@/sections/landing/Chapter1TheUnusedThing";
import { Chapter2TheEcosystem } from "@/sections/landing/Chapter2TheEcosystem";

export function CinematicOrchestrator() {
  return (
    <div className="ck-cinematic relative w-full">
      <Chapter1TheUnusedThing />
      <Chapter2TheEcosystem />
    </div>
  );
}
