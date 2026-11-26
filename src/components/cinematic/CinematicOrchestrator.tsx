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

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { refreshScrollTrigger } from "@/lib/gsapLoader";
import { getLenis } from "@/components/SmoothScroll";
import { SkipFilmButton } from "@/components/cinematic/SkipFilmButton";
import styles from "@/sections/landing/cinematic/cinematic.module.css";

const COLLAPSED_STORAGE_KEY = "ck:landing-film:collapsed";
// Runs as the server HTML is parsed, before the tracks below can add their
// height. Restoring only in an effect is too late for native scroll restoration.
const RESTORE_COLLAPSED_SCRIPT = `try{if(sessionStorage.getItem("${COLLAPSED_STORAGE_KEY}")==="1"){document.currentScript.parentElement.style.display="none"}}catch{}`;

/** Chapter 1's first frame: the title card on the cream stage. */
function Chapter1Poster() {
  return (
    <section
      className={`${styles.stage} ${styles.ch1}`}
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
          style={{ fontFamily: 'Impact, "Arial Narrow", sans-serif' }}
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
  const chapter1Ref = useRef<HTMLDivElement>(null);
  const chapter2Ref = useRef<HTMLDivElement>(null);
  const [readyChapters, setReadyChapters] = useState({ first: false, second: false });
  // Nav visibility is owned here, in one place. Both the ScrollTrigger and Skip
  // go through setNav, so the event and this flag never disagree.
  const navHidden = useRef(false);
  const setNav = useCallback((next: boolean) => {
    if (next === navHidden.current) return;
    navHidden.current = next;
    window.dispatchEvent(new CustomEvent("ck:immersive-nav", { detail: next }));
  }, []);
  const [active, setActive] = useState(false);
  // Once the reader is fully past the film (or skipped it), the film is taken
  // out of the page — scroll compensated so nothing on screen moves — and the
  // hero sits directly above the next section, as if there were no film.
  // Back at the very top it is put back, so scrolling down plays it again.
  // A reader still mid-film never triggers this and scrolls through it as usual.
  const collapsed = useRef(false);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    try {
      if (sessionStorage.getItem(COLLAPSED_STORAGE_KEY) === "1") {
        root.style.display = "none";
        collapsed.current = true;
      }
    } catch { /* Storage can be unavailable; keep the normal film behavior. */ }
  }, []);
  // Keep the full server-rendered tracks and posters for scroll restoration,
  // but download and initialise each chapter only near its own track.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setReadyChapters({ first: true, second: true });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || collapsed.current) continue;
        const first = entry.target === chapter1Ref.current;
        setReadyChapters((ready) => first
          ? { ...ready, first: true }
          : { ...ready, second: true });
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "600px 0px" });
    const observe = () => {
      if (chapter1Ref.current) observer.observe(chapter1Ref.current);
      if (chapter2Ref.current) observer.observe(chapter2Ref.current);
    };
    // The first track sits underneath the hero, so it intersects immediately.
    // Wait for scrolling on a fresh top-of-page visit instead of compiling the
    // film during the hero's initial load. Restored scroll positions load now.
    const onFirstScroll = () => {
      if (window.scrollY <= 0) return;
      observe();
      window.removeEventListener("scroll", onFirstScroll);
    };
    if (window.scrollY > 0) observe();
    else window.addEventListener("scroll", onFirstScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onFirstScroll);
    };
  }, []);

  const collapse = useCallback(() => {
    const root = rootRef.current;
    const cell = root?.closest<HTMLElement>(".ck-hero-film") ?? root;
    if (!root || !cell || collapsed.current) return;
    // Pin what follows the film to the same spot on screen. Measured after the
    // collapse, so a browser's own scroll anchoring (Chrome) isn't counted twice.
    const before = cell.getBoundingClientRect().bottom;
    const html = document.documentElement;
    // Stops an iOS momentum scroll, which would otherwise override the jump.
    html.style.overflow = "hidden";
    root.style.display = "none";
    collapsed.current = true;
    try { sessionStorage.setItem(COLLAPSED_STORAGE_KEY, "1"); } catch { /* Optional persistence. */ }
    const targetY = Math.max(0, window.scrollY + (cell.getBoundingClientRect().bottom - before));
    const lenis = getLenis();
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(targetY, { immediate: true, force: true });
    } else window.scrollTo({ top: targetY, behavior: "instant" });
    requestAnimationFrame(() => { html.style.overflow = ""; });
    refreshScrollTrigger();
    setNav(false);
    setActive(false);
  }, [setNav]);

  useEffect(() => {
    let previousY = window.scrollY;
    const onScroll = () => {
      const root = rootRef.current;
      const reachedTop = previousY > 0 && window.scrollY <= 0;
      previousY = window.scrollY;
      // Ignore an initial zero offset while the browser is still restoring.
      if (!collapsed.current || !root || !reachedTop) return;
      root.style.display = "";
      collapsed.current = false;
      try { sessionStorage.removeItem(COLLAPSED_STORAGE_KEY); } catch { /* Optional persistence. */ }
      getLenis()?.resize();
      refreshScrollTrigger();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide the nav while the story plays. Starts once the hero's bottom edge has
  // passed the top of the screen (or, with no hero, when the film reaches the
  // top) and ends when the last stage lets go — the film's bottom meeting the
  // viewport's is exactly where Chapter 2 stops sticking.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lead = leadInRef?.current;
    // Nav hide/show reads live positions on every scroll frame instead of a
    // ScrollTrigger: its cached start/end went stale whenever the hero or the
    // lazy chapters changed height, and the header then stayed stuck (or never
    // came back). Same window as before: hero bottom within 24px of the top
    // (or film top at the top) until the film's bottom meets the viewport's.
    let frame = 0;
    const check = () => {
      frame = 0;
      if (collapsed.current) return;
      const r = root.getBoundingClientRect();
      // The same live measurement can retire a completed film. Do not load
      // GSAP at startup just to watch this one edge; chapters load it on demand.
      if (r.height > 0 && r.bottom <= 0) { collapse(); return; }
      const started = lead ? lead.getBoundingClientRect().bottom <= 24 : r.top <= 0;
      const on = started && r.bottom > window.innerHeight;
      setNav(on);
      setActive(on);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    check();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      setNav(false);
      setActive(false);
    };
  }, [leadInRef, setNav, collapse]);

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
    refreshScrollTrigger();
    // Normally the jump makes the trigger inactive and onToggle restores the
    // nav; this covers a trigger that never fired (chapters still loading).
    setNav(false);
    setActive(false);
    collapse();
    dest.focus({ preventScroll: true });
  }, [destinationRef, setNav, collapse]);

  return (
    // The pre-paint script may add display:none before hydration.
    <div ref={rootRef} className="ck-cinematic relative w-full" suppressHydrationWarning>
      {/* Runs from the server HTML before paint. On a client render React 19
          warns about (and never runs) script tags, so the client copy is
          marked inert text — the server-rendered one has already done its job. */}
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: RESTORE_COLLAPSED_SCRIPT }}
      />
      {/* Without JavaScript the chapters never load: collapse the tracks so
          the page is not screens of an unchanging stand-in. */}
      <noscript>
        <style>{`.ck-film-track{height:auto!important}.ck-film-poster-2{display:none}`}</style>
      </noscript>
      <div ref={chapter1Ref} className={`${styles.track} ${styles.track1} ck-film-track`}>
        {readyChapters.first ? <Chapter1 leadInRef={leadInRef} /> : <Chapter1Poster />}
      </div>
      <div ref={chapter2Ref} className={`${styles.track} ${styles.track2} ck-film-track`}>
        {readyChapters.second ? <Chapter2 /> : <Chapter2Poster />}
      </div>
      {/* Portalled: the film's stages use transforms, which would trap a
          position:fixed child inside them. */}
      {active && destinationRef && createPortal(<SkipFilmButton onSkip={skip} />, document.body)}
    </div>
  );
}
