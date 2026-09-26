"use client";

/**
 * HeroFilm — the hero with the landing film hidden underneath it.
 *
 * <p>The hero and the film share one grid cell (`.ck-hero-film` in styles.css),
 * hero on top. At rest the page looks exactly as it does without the film: the
 * hero is the same component, in the same place, and it covers the film's
 * first screen completely. On scroll the hero leaves the way it always has —
 * native scrolling, nothing re-timed — while Chapter 1's stage stays pinned
 * beneath it, so the hero slides off the film rather than the film scrolling
 * up after it. The title card rises as the hero's edge climbs, and the film
 * itself starts once the hero has gone (see `leadInRef` in Chapter 1).
 *
 * <p>The film is loaded client-side only (`ssr: false`): none of its script or
 * SVG sits in front of the hero's first paint, and until it arrives the cell
 * simply holds the hero. Reduced motion stacks the two instead (the film is
 * then a still frame, and one hidden under the hero would never be seen).
 */

import { useRef } from "react";
import dynamic from "next/dynamic";

const CinematicOrchestrator = dynamic(
  () => import("@/components/cinematic/CinematicOrchestrator").then((m) => m.CinematicOrchestrator),
  { ssr: false },
);

export function HeroFilm({ hero }: { hero: React.ReactNode }) {
  const heroRef = useRef<HTMLDivElement>(null);
  return (
    <div className="ck-hero-film">
      <div ref={heroRef} className="ck-hero-film-hero">
        {hero}
      </div>
      <div className="ck-hero-film-stage">
        <CinematicOrchestrator leadInRef={heroRef} />
      </div>
    </div>
  );
}
