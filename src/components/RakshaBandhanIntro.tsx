"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  RAKSHA_BANDHAN_INTRO_BACKDROP,
  RAKSHA_BANDHAN_INTRO_FADE_MS,
  RAKSHA_BANDHAN_INTRO_REVEAL_LEAD_S,
  RAKSHA_BANDHAN_INTRO_REVEAL_MS,
  isRakshaBandhanIntroDay,
  isRakshaBandhanIntroForced,
  pickRakshaBandhanIntroSource,
} from "@/lib/raksha-bandhan";

/**
 * If the video has not begun playing within this long, give up and show the
 * site. Covers blocked autoplay, a missing file, and a connection too slow to
 * be worth waiting on.
 */
const START_WATCHDOG_MS = 6000;

/**
 * Whether the intro has already run during THIS page load.
 *
 * <p>Deliberately a module variable and not `sessionStorage`. The distinction
 * is the whole behaviour:
 *
 *   - A refresh (or a fresh tab, or a link straight to the homepage) tears the
 *     JavaScript module down and rebuilds it, so this is `false` again and the
 *     intro plays. Refreshing always replays it.
 *   - A client-side navigation away and back — Home to About to Home — keeps
 *     the module alive, so this stays `true` and the intro does not re-run in
 *     the middle of someone browsing.
 *
 * `sessionStorage` cannot express that: it survives refreshes, which is
 * precisely what we do not want here.
 */
let playedThisPageLoad = false;

/**
 * `revealing` is the happy path: a rectangle opens across the screen over the
 * closing seconds of the video. `fading` is the escape hatch used by Skip and
 * by every failure — there a quick fade is right, because the point is to get
 * out of the way, not to perform.
 */
type Phase = "playing" | "revealing" | "fading" | "done";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * <p>The distinction matters here: the decision to hide the overlay for a
 * visitor who has already seen it must happen BEFORE the browser paints, or
 * they get a one-frame flash of the overlay on every return to the homepage.
 * `useLayoutEffect` runs synchronously after DOM mutation and before paint;
 * `useEffect` does not. React warns when `useLayoutEffect` runs during SSR, so
 * it is swapped for the no-op-on-server variant there.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * RakshaBandhanIntro — a full-screen video that plays once, on 28 August 2026.
 *
 * WHAT THIS IS AND IS NOT.
 * It is a decorative overlay on top of the real homepage, which renders
 * underneath exactly as it always does. It is deliberately NOT a route, a
 * redirect, or a server-side swap of the page: the homepage's markup, metadata
 * and structured data stay intact and crawlable, and the site is already
 * painted and interactive by the time the overlay clears.
 *
 * IT MUST NEVER BLOCK THE SITE.
 * Every path out of the overlay leads to the same place. It clears when the
 * video ends, when Skip is pressed, when Escape is pressed, when the video
 * errors, when autoplay is refused, and when nothing has started playing
 * within {@link START_WATCHDOG_MS}. Scroll is restored in all of those cases
 * and on unmount, from a saved value rather than by assuming it was `""`.
 *
 * <p>Outside 28 August 2026 IST this renders `null` and, critically, never
 * mounts the `<video>` — so the 13 MB file is not requested, preloaded, or
 * paid for on any other day.
 */
export function RakshaBandhanIntro() {
  // Evaluated identically on the server and on the client, so hydration
  // matches and the overlay is in the very first paint — no flash of homepage
  // before it appears.
  const isIntroDay = isRakshaBandhanIntroDay(new Date(), isRakshaBandhanIntroForced());

  const [phase, setPhase] = useState<Phase>(isIntroDay ? "playing" : "done");
  const [videoReady, setVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Guards every exit path so the teardown can never run twice.
  const finishing = useRef(false);

  /** The single way out. Marks the intro seen, fades, then unmounts. */
  const dismiss = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;

    playedThisPageLoad = true;

    if (watchdog.current) clearTimeout(watchdog.current);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setPhase("fading");
    fadeTimer.current = setTimeout(() => setPhase("done"), RAKSHA_BANDHAN_INTRO_FADE_MS);
  }, []);

  /**
   * Open the rectangle. Runs once, at the end of a successful playthrough.
   */
  const beginReveal = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;

    playedThisPageLoad = true;

    if (watchdog.current) clearTimeout(watchdog.current);
    setPhase("revealing");
    revealTimer.current = setTimeout(
      () => setPhase("done"),
      RAKSHA_BANDHAN_INTRO_REVEAL_MS,
    );
  }, []);

  /**
   * Leave immediately, with no fade — for cases where the overlay should never
   * have been shown at all (already seen, reduced motion, wrong day).
   */
  const cancelOutright = useCallback(() => {
    finishing.current = true;
    playedThisPageLoad = true;
    if (watchdog.current) clearTimeout(watchdog.current);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setPhase("done");
  }, []);

  // ── Should this run at all? Decided before the first paint. ───────────────
  useIsomorphicLayoutEffect(() => {
    if (!isIntroDay) return;

    // Re-check the date on the client. The server's HTML is cached by ISR for
    // up to a minute, so around IST midnight the two can briefly disagree; the
    // client is the authority.
    if (!isRakshaBandhanIntroDay(new Date(), isRakshaBandhanIntroForced())) {
      cancelOutright();
      return;
    }

    // A visitor who has asked for reduced motion does not get a nine-second
    // motion sequence. Skipping outright is the option the brief allows and
    // the kinder one — a shortened version is still an unrequested animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cancelOutright();
      return;
    }

    if (playedThisPageLoad) cancelOutright();
  }, [isIntroDay, cancelOutright]);

  // ── Scroll lock, held only while the overlay is actually on screen. ───────
  useEffect(() => {
    if (phase === "done") return;

    // Saved and restored rather than reset to "", so this cannot clobber a
    // lock some other component (a dialog, the mobile menu) already holds.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [phase]);

  // ── Playback, the watchdog, and Escape. ──────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;

    const video = videoRef.current;
    if (!video) return;

    // Pick the encode now that the display is measurable, then start it.
    // Assigning src is what begins the download; nothing is fetched before
    // this point, on this day or any other.
    if (!video.src) {
      video.src = pickRakshaBandhanIntroSource();
      video.load();
    }

    // Always from the beginning, even if the browser restored a position.
    video.currentTime = 0;

    // `play()` rejects when autoplay is refused. That is a normal browser
    // decision, not an error to surface — just leave.
    void video.play().catch(() => dismiss());

    // Nothing playing after this long means blocked, missing or too slow.
    watchdog.current = setTimeout(() => {
      if (video.currentTime === 0 || video.paused) dismiss();
    }, START_WATCHDOG_MS);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (watchdog.current) clearTimeout(watchdog.current);
    };
  }, [phase, dismiss]);

  // Clear the fade timer if we unmount mid-fade.
  useEffect(() => {
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      role="presentation"
      data-testid="rakhi-intro"
      className={`ck-rakhi-intro-root fixed inset-0 flex items-center justify-center${
        phase === "revealing" ? " ck-rakhi-intro-reveal" : ""
      }`}
      style={{
        // A gradient, so `background` — `backgroundColor` cannot hold one.
        background: RAKSHA_BANDHAN_INTRO_BACKDROP,
        // Above everything. The sticky header sits at z-50.
        zIndex: 2147483000,
        // The opacity fade belongs to the Skip and failure paths only. During
        // the reveal the overlay stays fully opaque and is cut away by the
        // rectangle instead — fading it at the same time would wash the last
        // seconds of the animation out to grey.
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${RAKSHA_BANDHAN_INTRO_FADE_MS}ms ease-in-out`,
        // Once the rectangle starts opening the site behind is real and
        // reachable, so stop swallowing clicks through the hole.
        pointerEvents: phase === "revealing" ? "none" : undefined,
      }}
    >
      <video
        ref={videoRef}
        // No `src` here on purpose. The right encode depends on the display
        // and the connection, neither of which the server can know, and
        // rendering a guess would either mismatch on hydration or download the
        // wrong file first. It is assigned in the playback effect instead.
        // muted + playsInline are jointly what make autoplay permissible on
        // iOS Safari and Android Chrome. `muted` is also set imperatively
        // below, because React has historically not reflected it as a property.
        muted
        autoPlay
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        className="ck-rakhi-intro-video h-full w-full"
        style={{
          opacity: videoReady ? 1 : 0,
          transition: "opacity 420ms ease-out",
        }}
        onLoadedMetadata={(event) => {
          // Belt and braces for autoplay policies that check the property
          // rather than the attribute.
          event.currentTarget.muted = true;
        }}
        onCanPlay={() => setVideoReady(true)}
        onTimeUpdate={(event) => {
          const { currentTime, duration } = event.currentTarget;
          // duration is NaN until metadata lands, and Infinity for a stream.
          if (!Number.isFinite(duration) || duration <= 0) return;
          if (duration - currentTime <= RAKSHA_BANDHAN_INTRO_REVEAL_LEAD_S) {
            beginReveal();
          }
        }}
        onEnded={() => {
          // Normally the reveal is already running by now and owns the exit.
          // This is the safety net for a video shorter than the lead time, or
          // a browser that never fired a late enough timeupdate.
          if (!finishing.current) beginReveal();
        }}
        onError={dismiss}
        onStalled={() => {
          // Only give up on a stall if nothing has played yet; a mid-play
          // stall usually recovers on its own.
          if (videoRef.current && videoRef.current.currentTime === 0) dismiss();
        }}
      />

      {phase !== "revealing" && (
      <button
        type="button"
        onClick={dismiss}
        className="group absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/25 bg-black/30 px-5 py-2.5 text-xs font-semibold tracking-[0.08em] text-white/85 backdrop-blur-md transition-[background-color,border-color,color] duration-200 hover:border-white/45 hover:bg-black/45 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:right-6 sm:top-6"
      >
        Skip
        <span className="sr-only"> the Raksha Bandhan introduction</span>
      </button>
      )}

      <style>{`
        /* Sizing lives here rather than in the style prop so that the 100vh
           fallback survives. A style object cannot hold two values for one
           key — the second silently replaces the first — whereas in CSS a
           browser that does not understand dvh simply ignores that line and
           keeps the vh above it. dvh is what tracks the mobile address bar as
           it collapses. */
        .ck-rakhi-intro-root {
          width: 100vw;
          height: 100vh;
          height: 100dvh;
        }

        /* The source is 3840x2160 — 16:9. On a phone held upright, cover would
           crop away most of the frame and with it the animation's text, so the
           fit is chosen from the viewport's own shape:

             wide screens  -> cover, filling edge to edge with a trim of at
                              most a few percent
             everything else -> contain, letterboxed onto the backdrop, which
                              keeps every pixel of the animation visible

           8/5 (1.6) is the threshold because it sits just below the common
           desktop ratios (16:10 and 16:9) and comfortably above every phone
           and portrait tablet. */
        .ck-rakhi-intro-video {
          object-fit: contain;
        }

        @media (min-aspect-ratio: 8/5) {
          .ck-rakhi-intro-video {
            object-fit: cover;
          }
        }

        /* ── The reveal ──────────────────────────────────────────────────────
           A rectangle opens out from the centre and the site shows through it.

           The hole is cut with two mask layers composited so the second is
           subtracted from the first: layer one covers the whole overlay, layer
           two is the growing rectangle, and 'exclude' removes the second from
           the first. Animating the second layer's size is what opens it.

           It leads with width before height, so it reads as a widescreen
           rectangle drawing open rather than a square swelling. 240% at the end
           is past the diagonal, so the last corners clear cleanly. */
        @keyframes ck-rakhi-intro-open {
          0% {
            -webkit-mask-size: 100% 100%, 0% 0%;
            mask-size: 100% 100%, 0% 0%;
          }
          38% {
            -webkit-mask-size: 100% 100%, 62% 20%;
            mask-size: 100% 100%, 62% 20%;
          }
          100% {
            -webkit-mask-size: 100% 100%, 240% 240%;
            mask-size: 100% 100%, 240% 240%;
          }
        }

        .ck-rakhi-intro-reveal {
          -webkit-mask-image: linear-gradient(#000, #000), linear-gradient(#000, #000);
          mask-image: linear-gradient(#000, #000), linear-gradient(#000, #000);
          -webkit-mask-position: center, center;
          mask-position: center, center;
          -webkit-mask-repeat: no-repeat, no-repeat;
          mask-repeat: no-repeat, no-repeat;
          -webkit-mask-size: 100% 100%, 0% 0%;
          mask-size: 100% 100%, 0% 0%;
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: ck-rakhi-intro-open ${RAKSHA_BANDHAN_INTRO_REVEAL_MS}ms
            cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }

        /* Where masks cannot be composited, the overlay would simply sit there
           opaque until it unmounted — an abrupt cut. Fall back to the fade. */
        @supports not ((mask-composite: exclude) or (-webkit-mask-composite: xor)) {
          @keyframes ck-rakhi-intro-open-fallback {
            from { opacity: 1; }
            to   { opacity: 0; }
          }

          .ck-rakhi-intro-reveal {
            -webkit-mask-image: none;
            mask-image: none;
            animation: ck-rakhi-intro-open-fallback ${RAKSHA_BANDHAN_INTRO_REVEAL_MS}ms
              ease-in-out forwards;
          }
        }
      `}</style>
    </div>
  );
}
