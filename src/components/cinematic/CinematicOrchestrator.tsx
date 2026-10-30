"use client";
import { LandingText } from "@/components/LandingTranslation";


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

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getLenis } from "@/components/SmoothScroll";
import { isFilmSkipEligible, markFilmSeen } from "@/lib/filmSeen";
import { SkipFilmButton } from "@/components/cinematic/SkipFilmButton";
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
          <span className="h-px w-8 bg-current max-md:hidden" /><LandingText>
          Chapter one · The unused thing
          </LandingText><span className="h-px w-8 bg-current max-md:hidden" />
        </p>
        <h2
          className={`${styles.display} text-[clamp(2.6rem,9vw,8.5rem)] max-md:text-[clamp(2.6rem,12.5vw,3.4rem)] text-stone-900 dark:text-stone-100`}
        ><LandingText>
          One small thing
          </LandingText><br />
          <span className="text-[#b04a15] dark:text-[#ff8a4c]"><LandingText>can become a big thing.</LandingText></span>
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
  destinationRef,
}: {
  leadInRef?: RefObject<HTMLElement | null>;
  /** Where "Skip intro" lands: the labelled section right after the film. */
  destinationRef?: RefObject<HTMLElement | null>;
} = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Nav visibility is owned here, in one place. Both the ScrollTrigger and Skip
  // go through setNav, so the event and this flag never disagree.
  const navHidden = useRef(false);
  const setNav = useCallback((next: boolean) => {
    if (next === navHidden.current) return;
    navHidden.current = next;
    window.dispatchEvent(new CustomEvent("ck:immersive-nav", { detail: next }));
  }, []);
  const [active, setActive] = useState(false);
  // Per-view snapshot (src/lib/filmSeen.ts), read on the client after mount.
  const [eligible, setEligible] = useState(false);
  useEffect(() => { setEligible(isFilmSkipEligible()); }, []);

  // Hide the nav while the story plays. Starts once the hero's bottom edge has
  // passed the top of the screen (or, with no hero, when the film reaches the
  // top) and ends when the last stage lets go — the film's bottom meeting the
  // viewport's is exactly where Chapter 2 stops sticking.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lead = leadInRef?.current;
    const st = ScrollTrigger.create({
      trigger: lead ?? root,
      start: lead ? "bottom top+=24" : "top top",
      endTrigger: root,
      end: "bottom bottom",
      onToggle: (self) => {
        setNav(self.isActive);
        setActive(self.isActive);
        if (self.isActive) markFilmSeen();
      },
    });
    return () => {
      st.kill();
      setNav(false);
      setActive(false);
    };
  }, [leadInRef, setNav]);

  // Jump past the film to "Who we are". One target, header height subtracted
  // once, used by both scroll paths (no scroll-margin, no Lenis offset).
  const skip = useCallback(() => {
    const dest = destinationRef?.current;
    if (!dest) return;
    const header = document.querySelector("header");
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const targetY = Math.max(0, dest.getBoundingClientRect().top + window.scrollY - headerH);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(targetY, { immediate: true, force: true });
    else window.scrollTo({ top: targetY, behavior: "instant" });
    ScrollTrigger.refresh();
    // Normally the jump makes the trigger inactive and onToggle restores the
    // nav; this covers a trigger that never fired (chapters still loading).
    setNav(false);
    setActive(false);
    dest.focus({ preventScroll: true });
  }, [destinationRef, setNav]);

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
      {/* Portalled: the film's stages use transforms, which would trap a
          position:fixed child inside them. */}
      {eligible && active && destinationRef && createPortal(<SkipFilmButton onSkip={skip} />, document.body)}
    </div>
  );
}
