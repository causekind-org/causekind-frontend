"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "framer-motion";

/* ─── The film ─────────────────────────────────────────────────────────────
   A 10-second, 24fps clip (240 frames) exported to still WebPs and scrubbed by
   scroll. We draw stills onto a <canvas> instead of scrubbing a <video> because
   seeking a 45 Mbps 4K MP4 on every scroll tick stutters badly; pre-decoded
   images swap instantly. The frames live in /public/scrolly/desktop.

   Frames are 1-indexed (ffmpeg's frame_%03d), so frame N of 240 is file
   `frame_${String(N).padStart(3,"0")}.webp`. One set only: the whole section
   lives in the homepage's `hidden lg:block` desktop tree, so it never mounts
   below the lg breakpoint and a smaller phone set would be dead weight. */
const FRAME_COUNT = 240;
const framePath = (n: number) =>
  `/scrolly/desktop/frame_${String(n).padStart(3, "0")}.webp`;

/** Six screen-heights of scroll to move through 240 frames — slow enough that
    the scrub reads as motion, not a slideshow. */
const SECTION_VH = 600;

/**
 * How quickly the drawn frame catches up to the scroll position, per animation
 * frame (0–1). The displayed progress eases toward the scroll target by this
 * fraction each frame, so when scrolling stops the film keeps gliding and
 * decelerates to rest instead of snapping — the "slows down, then stops" feel.
 *
 * <p>Lower = more glide/inertia (and more lag behind the cursor); higher = tighter
 * tracking. ~0.15 settles in roughly a quarter-second at 60fps.
 */
const SCRUB_EASE = 0.15;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/* ─── The copy, tied to scroll ─────────────────────────────────────────────
   Each caption owns a window of progress (0→1) and a side of the frame. The
   side follows the empty space in the footage: the donor and box sit left of
   centre early, so the words sit RIGHT; from the "matching" beat on, the action
   and the recipient move to centre/right, so the words move LEFT — which is
   also where the big dark negative space opens up at the end for the brand.

   Windows leave small gaps between them (e.g. 0.15 → 0.18) so one phrase has
   finished fading out before the next begins — the swaps are never abrupt. */
type Side = "left" | "right";
interface Caption {
  key: "p1" | "p2" | "p3" | "p4" | "p5";
  from: number;
  to: number;
  side: Side;
}
const CAPTIONS: Caption[] = [
  { key: "p1", from: 0.0, to: 0.15, side: "right" }, // packing the box
  { key: "p2", from: 0.18, to: 0.32, side: "right" }, // the listing card appears
  { key: "p3", from: 0.35, to: 0.5, side: "left" }, // the matching network
  { key: "p4", from: 0.52, to: 0.64, side: "left" }, // matched nearby
  { key: "p5", from: 0.66, to: 0.78, side: "left" }, // handover / opening
];

/** The brand + CTA block, held on the dark left space of the closing frames. */
const BRAND_FROM = 0.8;

/**
 * How opaque a caption is at overall progress `p`. Fades in over the first
 * slice of its window, holds, fades out over the last slice — so nothing
 * pops in or cuts out.
 */
function captionOpacity(p: number, c: Caption) {
  const fade = 0.035;
  if (p < c.from || p > c.to) return 0;
  return Math.min(1, (p - c.from) / fade, (c.to - p) / fade);
}

/**
 * Item-donation scrollytelling hero.
 *
 * <p>Replaces the former "How it works" dial section. One sticky, edge-to-edge
 * canvas plays the film as you scroll; a text layer above it changes with the
 * phases and always sits in the clearest part of the frame, ending on the brand
 * and a "Donate an Item" call to action.
 *
 * <p><b>Reduced motion / no scrub:</b> users who ask for reduced motion (and the
 * pre-hydration server render) get a single still frame with the brand block and
 * CTA already in place — the message survives, the movement goes.
 */
export function ItemDonationScrolly() {
  const t = useTranslations("landing.scrolly");
  const reduceMotion = useReducedMotion() ?? false;

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef<boolean[]>([]);
  const progressRef = useRef(0);

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  /* ── Preload the frame set, then drive the canvas ────────────────────────
     One <img> per frame kept in a ref (never in React state — 240 Image
     objects reconciled every render would be absurd), drawn with a "cover" fit
     so the film fills the panel at any aspect ratio. */
  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    imagesRef.current = new Array(FRAME_COUNT);
    loadedRef.current = new Array(FRAME_COUNT).fill(false);
    let loadedCount = 0;
    let raf = 0;
    let disposed = false;

    // Eased scrub: `target` is where the scroll currently is; `rendered` is the
    // frame actually on screen, which chases `target` by SCRUB_EASE each frame.
    // When scrolling stops, `target` holds still and `rendered` keeps closing
    // the gap — decelerating — so the film glides to rest instead of snapping.
    let target = 0;
    let rendered = 0;
    let running = false;

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = framePath(i + 1);
      img.onload = () => {
        loadedRef.current[i] = true;
        loadedCount++;
        // The first frame arriving is enough to paint something and let the
        // scrub begin; the rest stream in behind it.
        if (i === 0 || loadedCount === FRAME_COUNT) {
          if (!disposed) setReady(true);
          draw(rendered);
        }
      };
      imagesRef.current[i] = img;
    }

    /** The nearest loaded frame at or below `idx`, so a not-yet-loaded frame
        shows the last good one instead of flashing blank. */
    function nearestLoaded(idx: number) {
      for (let j = idx; j >= 0; j--) if (loadedRef.current[j]) return imagesRef.current[j];
      for (let j = idx + 1; j < FRAME_COUNT; j++)
        if (loadedRef.current[j]) return imagesRef.current[j];
      return null;
    }

    function draw(p: number) {
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = cv.clientWidth;
      const cssH = cv.clientHeight;
      if (cv.width !== Math.round(cssW * dpr) || cv.height !== Math.round(cssH * dpr)) {
        cv.width = Math.round(cssW * dpr);
        cv.height = Math.round(cssH * dpr);
      }

      const idx = Math.min(FRAME_COUNT - 1, Math.round(p * (FRAME_COUNT - 1)));
      const img = nearestLoaded(idx);
      if (!img) return;

      // "cover": scale to fill, centre-crop the overflow.
      const cw = cv.width;
      const ch = cv.height;
      const ir = img.width / img.height;
      const cr = cw / ch;
      let dw = cw;
      let dh = ch;
      if (ir > cr) dw = ch * ir;
      else dh = cw / ir;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    // Whether the pinned panel currently fills the viewport. While it does, we
    // ask the site header to slide away (it listens for `ck:immersive-nav`), so
    // the film owns the whole screen; the nav returns the moment the section
    // scrolls out of the viewport above or below.
    let immersive = false;
    function setImmersive(active: boolean) {
      if (active === immersive) return;
      immersive = active;
      window.dispatchEvent(new CustomEvent("ck:immersive-nav", { detail: active }));
    }

    /**
     * One animation frame. Reads the live scroll position into `target`, eases
     * `rendered` toward it, paints, and — crucially — keeps requesting frames
     * until the two converge. So a scroll that has already stopped still runs a
     * few more frames, each moving less than the last, which is the deceleration.
     */
    function frame() {
      const el = sectionRef.current;
      if (!el) {
        running = false;
        return;
      }
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable > 0) {
        target = clamp01(-rect.top / scrollable);
        progressRef.current = target;
        setImmersive(rect.top <= 0 && rect.bottom >= window.innerHeight);
      }

      rendered += (target - rendered) * SCRUB_EASE;
      // Snap the last sub-frame sliver so the loop can actually stop.
      if (Math.abs(target - rendered) < 0.0004) rendered = target;

      draw(rendered);
      setProgress(rendered);

      if (rendered !== target) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
      }
    }
    // Any scroll/resize re-arms the loop if it had settled and gone idle.
    function kick() {
      if (running || disposed) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick, { passive: true });
    kick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      // Never leave the header hidden if the section unmounts while pinned.
      setImmersive(false);
    };
  }, [reduceMotion]);

  const brandOpacity = clamp01((progress - BRAND_FROM) / 0.06);

  /* ── Reduced-motion / server fallback ────────────────────────────────────
     A single representative still with the brand block and CTA laid over it.
     No sticky, no 600vh, no scrub. */
  if (reduceMotion) {
    return (
      <section id="how" className="relative w-full overflow-hidden bg-[#0e0f10]">
        <div className="relative aspect-[16/9] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={framePath(FRAME_COUNT)}
            alt={t("a11y")}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
          <BrandBlock t={t} />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="how"
      className="relative w-full bg-[#0e0f10]"
      style={{ height: `${SECTION_VH}vh` }}
      aria-label={t("a11y")}
    >
      {/* Full-bleed. The pinned panel fills the entire viewport, edge to edge,
          no gutter and no corners — and while it is pinned the site header is
          hidden (see the `ck:immersive-nav` dispatch below), so the film really
          does own the whole screen. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#0e0f10]">
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block h-full w-full" />

        {/* Legibility scrims. Left and right darken independently so the words
            stay readable over whatever is behind them — including the bright
            window on the right at the very start. They strengthen as the copy
            moves to that side. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(6,7,8,0.72) 0%, rgba(6,7,8,0.28) 28%, rgba(6,7,8,0) 52%)",
            opacity: progress > 0.32 ? 1 : 0.55,
            transition: "opacity 0.5s ease",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(270deg, rgba(6,7,8,0.6) 0%, rgba(6,7,8,0.2) 26%, rgba(6,7,8,0) 50%)",
            opacity: progress < 0.34 ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Phase captions. Decorative/transient, so hidden from assistive tech —
            the accessible summary is on the <section> and the brand block. */}
        {CAPTIONS.map((c) => {
          const o = captionOpacity(progress, c);
          const slide = (1 - o) * (c.side === "right" ? 24 : -24);
          return (
            <div
              key={c.key}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 flex max-w-[min(46ch,42vw)] flex-col justify-center px-6 sm:px-10 lg:px-16"
              style={{
                [c.side]: 0,
                textAlign: c.side === "right" ? "right" : "left",
                opacity: o,
                transform: `translateX(${slide}px)`,
                transition: "opacity 0.15s linear, transform 0.15s linear",
              }}
            >
              <p
                className="text-white"
                style={{
                  fontFamily: "var(--font-source-serif-4), Georgia, serif",
                  fontSize: "clamp(1.8rem, 1.1rem + 2.4vw, 3.4rem)",
                  fontWeight: 600,
                  lineHeight: 1.08,
                  letterSpacing: "-0.02em",
                  textShadow: "0 2px 24px rgba(0,0,0,0.55)",
                }}
              >
                {t(c.key)}
              </p>
            </div>
          );
        })}

        {/* Brand + CTA, on the dark left space of the closing frames. Real,
            accessible DOM (not aria-hidden): this is the payload of the whole
            section. */}
        <div
          className="absolute inset-y-0 left-0 flex max-w-[min(52ch,48vw)] flex-col justify-center px-6 sm:px-10 lg:px-16"
          style={{
            opacity: brandOpacity,
            transform: `translateX(${(1 - brandOpacity) * -24}px)`,
            transition: "opacity 0.2s linear, transform 0.2s linear",
            pointerEvents: brandOpacity > 0.5 ? "auto" : "none",
          }}
        >
          <BrandBlock t={t} />
        </div>

        {/* First-load hint, gone once the opening frame paints. */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Loading…
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

/** The closing message, reused by the live overlay and the reduced-motion still
    so the two never drift apart. */
function BrandBlock({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="max-w-[52ch]">
      <h2
        className="text-white"
        style={{
          fontFamily: "var(--font-source-serif-4), Georgia, serif",
          fontSize: "clamp(2rem, 1.2rem + 3vw, 4rem)",
          fontWeight: 600,
          lineHeight: 1.04,
          letterSpacing: "-0.025em",
          textShadow: "0 2px 28px rgba(0,0,0,0.6)",
        }}
      >
        {t("brandLine1")}
        <br />
        {t("brandLine2")}
      </h2>
      <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.18em] text-white/80">
        {t("badges")}
      </p>
      <Link
        href="/requests"
        className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-brand-500 px-7 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(176,74,21,0.3)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-brand-600 active:scale-[0.96]"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
