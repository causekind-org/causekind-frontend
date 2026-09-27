"use client";

/**
 * CinematicOrchestrator — the landing page's film.
 *
 * Each chapter is a stage that sticks inside its own scroll track, and the
 * tracks' heights are CSS (`.track1` / `.track2` in cinematic.module.css).
 * This component is server-rendered, so the film's full scroll length is in
 * the page from the first paint; only the chapters' code is loaded later
 * (client-only, `next/dynamic`). Until a chapter arrives, its track holds a
 * server-rendered stand-in — Chapter 1's is the opening title card — so a
 * quick early scroll moves through the film instead of past it, and a refresh
 * restores to the section the reader was on.
 *
 * The two tracks are stacked with nothing between them on purpose: Chapter 1
 * ends with the bag diving out through the bottom edge on a glowing line, and
 * Chapter 2's stage begins with that same line entering through its top edge
 * at the same x (both compute it from `measureStage().seamX`), on the same
 * night background. Put anything between the two and the line visibly breaks.
 *
 * On the home page it is mounted *under* the hero (`HeroFilm`), which passes
 * the hero as `leadInRef`: the hero slides off the Chapter 1 stage and the film
 * starts once it has gone. While the film owns the screen it asks the nav
 * chrome to hide (`ck:immersive-nav`; the header and the mobile dock listen).
 */

import { useEffect, useRef, type RefObject } from "react";
import dynamic from "next/dynamic";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "@/sections/landing/cinematic/cinematic.module.css";
import { cineFonts } from "@/sections/landing/cinematic/fonts";

/** Chapter 1's first frame: the title card on the cream stage. */
function Chapter1Poster() {
  return (
    <section
      className={`${styles.stage} ${styles.ch1} ${cineFonts}`}
      style={{ ["--hdr" as string]: "var(--ck-nav-h, 3.5rem)" } as React.CSSProperties}
    >
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: "var(--hdr, 0px)" }}
      >
        <p
          className={`${styles.mono} mb-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] max-md:tracking-[0.2em] text-[#b04a15] dark:text-[#ff9a5c]`}
        >
          <span className="h-px w-8 bg-current max-md:hidden" />
          Chapter one · The unused thing
          <span className="h-px w-8 bg-current max-md:hidden" />
        </p>
        <h2
          className={`${styles.display} text-[clamp(2.6rem,9vw,8.5rem)] max-md:text-[clamp(2.6rem,12.5vw,3.4rem)] text-stone-900 dark:text-stone-100`}
        >
          One small thing
          <br />
          <span className="text-[#b04a15] dark:text-[#ff8a4c]">can become a big thing.</span>
        </h2>
      </div>
    </section>
  );
}

/** Chapter 2's first frame is the night stage the line falls into. */
function Chapter2Poster() {
  return <section className={`${styles.stage} ${styles.ch2} ck-film-poster-2`} aria-hidden />;
}

const Chapter1 = dynamic(
  () => import("@/sections/landing/Chapter1TheUnusedThing").then((m) => m.Chapter1TheUnusedThing),
  { ssr: false, loading: Chapter1Poster },
);
const Chapter2 = dynamic(
  () => import("@/sections/landing/Chapter2TheEcosystem").then((m) => m.Chapter2TheEcosystem),
  { ssr: false, loading: Chapter2Poster },
);

export function CinematicOrchestrator({
  leadInRef,
}: {
  leadInRef?: RefObject<HTMLElement | null>;
} = {}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Hide the nav while the story plays. Starts once the hero's bottom edge has
  // passed the top of the screen (or, with no hero, when the film reaches the
  // top) and ends when the last stage lets go — the film's bottom meeting the
  // viewport's is exactly where Chapter 2 stops sticking.
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
      onToggle: (self) => set(self.isActive),
    });
    return () => {
      st.kill();
      set(false);
    };
  }, [leadInRef]);

  return (
    <div ref={rootRef} className="ck-cinematic relative w-full">
      {/* Without JavaScript the chapters never load: collapse the tracks so
          the page is not screens of an unchanging stand-in. */}
      <noscript>
        <style>{`.ck-film-track{height:auto!important}.ck-film-poster-2{display:none}`}</style>
      </noscript>
      <div className={`${styles.track} ${styles.track1} ck-film-track`}>
        <Chapter1 leadInRef={leadInRef} />
      </div>
      <div className={`${styles.track} ${styles.track2} ck-film-track`}>
        <Chapter2 />
      </div>
    </div>
  );
}
