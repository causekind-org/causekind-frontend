"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "framer-motion";
import {
  PackageOpen,
  Smartphone,
  MapPin,
  HeartHandshake,
  HandHeart,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { isGanpatiActive } from "@/lib/isGanpatiActive";
import { RangoliBorderStrip } from "./GanpatiVisuals";

/* ─── The film ─────────────────────────────────────────────────────────────
   A ~10-second, 60fps clip (598 frames) exported to still WebPs and scrubbed by
   scroll. We draw stills onto a <canvas> instead of scrubbing a <video> because
   seeking a 45 Mbps 4K MP4 on every scroll tick stutters badly; pre-decoded
   images swap instantly. The frames live in /public/scrolly/desktop.

   Frames are 1-indexed (ffmpeg's frame_%03d), so frame N of 240 is file
   `frame_${String(N).padStart(3,"0")}.webp`. One set only: the whole section
   lives in the homepage's `hidden lg:block` desktop tree, so it never mounts
   below the lg breakpoint and a smaller phone set would be dead weight. */
const FRAME_COUNT = 598;
const framePath = (n: number) =>
  `/scrolly/desktop/frame_${String(n).padStart(3, "0")}.webp`;

/** Six screen-heights of scroll to move through the frames — slow enough that
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
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0 || 1e-6));
  return t * t * (3 - 2 * t);
};

/* ─── The expand-in intro (adapted from React Bits' ScrollExpand) ───────────
   The first slice of the section's scroll opens the film from a rounded card in
   the middle of the screen to full bleed, with a headline held over it that
   lifts away — THEN the frame-scrub and captions take over. It's woven into the
   same pinned panel and the same eased progress, so it inherits the inertia and
   the scrub keeps running from the frame the card settles on. */
const EXPAND_END = 0.14; // fraction of the section's scroll spent expanding
const START_W = 46; //       resting card width, as % of the viewport
const START_H = 62; //       resting card height, as % of the viewport
const START_RADIUS = 26; //  resting corner radius, px (eases to 0)
const MEDIA_ZOOM = 1.16; //  media zoom at rest, easing back to 1 as it opens

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
  const isGanpati = isGanpatiActive();

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

      // The expand eats the first slice of scroll; the frame-scrub maps to what
      // is left, so the film holds on frame 1 while the card opens, then plays.
      const sp = clamp01((p - EXPAND_END) / (1 - EXPAND_END));
      const idx = Math.min(FRAME_COUNT - 1, Math.round(sp * (FRAME_COUNT - 1)));
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

  // Split the eased scroll into the expand phase and the scrub phase, so both
  // are driven off the same inertia-smoothed `progress`.
  const expand = smoothstep(0, EXPAND_END, progress); // 0 → 1 as the card opens
  const sp = clamp01((progress - EXPAND_END) / (1 - EXPAND_END)); // scrub after
  const brandOpacity = clamp01((sp - BRAND_FROM) / 0.06);

  // The opening card: a centred inset that grows to full bleed, its corners
  // squaring off and its media un-zooming as it opens.
  const cardW = START_W + (100 - START_W) * expand;
  const cardH = START_H + (100 - START_H) * expand;
  const insetX = Math.max(0, (100 - cardW) / 2);
  const insetY = Math.max(0, (100 - cardH) / 2);
  const cardRadius = START_RADIUS * (1 - expand);
  const clip = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${cardRadius}px)`;
  const mediaScale = MEDIA_ZOOM + (1 - MEDIA_ZOOM) * expand;
  // The scroll cue vanishes as soon as the open begins.
  const hintOut = smoothstep(0, 0.28, expand);

  // Viewfinder brackets frame the resting card and fade out as it opens.
  const bracketOpacity = 1 - smoothstep(0, 0.8, expand);
  const corners = [
    { v: "top", h: "left" },
    { v: "top", h: "right" },
    { v: "bottom", h: "left" },
    { v: "bottom", h: "right" },
  ] as const;

  // Timecode: reads the scrub as MM:SS against the ~10s clip. Appears once the
  // film is full bleed and steps aside for the closing brand block.
  const tcCur = Math.min(10, Math.floor(sp * 10));
  const timecode = `00:${String(tcCur).padStart(2, "0")} / 00:10`;
  const tcOpacity = smoothstep(0.6, 1, expand) * (1 - brandOpacity);

  /* ── Reduced-motion / server fallback ────────────────────────────────────
     A single representative still with the brand block and CTA laid over it.
     No sticky, no 600vh, no scrub. */
  if (reduceMotion) {
    return (
      <section id="how" className="relative w-full overflow-hidden bg-[#0e0f10]">
        {isGanpati && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
            <RangoliBorderStrip />
          </div>
        )}
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
        {isGanpati && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
            <RangoliBorderStrip flip />
          </div>
        )}
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
        {/* Top Rangoli decorative border for Ganpati theme */}
        {isGanpati && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
            <RangoliBorderStrip />
          </div>
        )}
        {/* Scoped keyframes for the caption chrome. Kept local (unique ck-scrolly-*
            names) rather than in the global sheet so nothing here can collide with
            it — the same reason the animations in the old dial section were named.

            `.ck-shine` is the orange shine on the headlines: the text is filled by
            a mostly-white gradient carrying a warm band, clipped to the glyphs, and
            the band sweeps across on a loop. A drop-shadow filter (not text-shadow,
            which clipped text ignores) adds the dark legibility halo plus a soft
            terracotta glow. */}
        <style>{`
          @keyframes ck-scrolly-shine {
            0%   { background-position: 130% 0; }
            100% { background-position: -30% 0; }
          }
          @keyframes ck-scrolly-bob {
            0%, 100% { transform: translateY(0); opacity: 0.9; }
            50%      { transform: translateY(6px); opacity: 0.4; }
          }
          @keyframes ck-scrolly-grain {
            0%   { transform: translate(0, 0); }
            20%  { transform: translate(-6%, 3%); }
            40%  { transform: translate(5%, -6%); }
            60%  { transform: translate(-3%, 6%); }
            80%  { transform: translate(6%, 2%); }
            100% { transform: translate(0, 0); }
          }
          @media (prefers-reduced-motion: reduce) {
            .ck-grain { animation: none !important; }
          }
          .ck-shine {
            background: linear-gradient(100deg,
              #fff 0%, #fff 36%, #ffd8a6 45%, #ff8a2b 50%, #ffd8a6 55%, #fff 64%, #fff 100%);
            background-size: 220% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
            animation: ck-scrolly-shine 5.5s linear infinite;
            filter: drop-shadow(0 2px 16px rgba(0,0,0,0.6)) drop-shadow(0 0 34px rgba(176,74,21,0.45));
          }
          @media (prefers-reduced-motion: reduce) {
            .ck-shine { animation: none; }
          }
        `}</style>
        {/* The opening card. clip-path insets the whole media plane to a centred
            rounded rectangle at rest and grows it to full bleed; the canvas is
            mildly zoomed inside and eases back to 1 as it opens. */}
        <div
          className="absolute inset-0"
          style={{ clipPath: clip, WebkitClipPath: clip, willChange: "clip-path" }}
        >
          <canvas
            ref={canvasRef}
            aria-hidden
            className="absolute inset-0 block h-full w-full"
            style={{ transform: `scale(${mediaScale})`, transformOrigin: "center", willChange: "transform" }}
          />
        </div>

        {/* Cinematic vignette — darkens the edges so the frame reads as a lens. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.5) 100%)",
          }}
        />
        {/* Film grain — a faint SVG-noise plane, oversized so its drift never
            reveals an edge, flickering slowly over the whole panel. */}
        <div
          aria-hidden
          className="ck-grain pointer-events-none absolute"
          style={{
            top: "-25%",
            left: "-25%",
            width: "150%",
            height: "150%",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            opacity: 0.08,
            mixBlendMode: "overlay",
            animation: "ck-scrolly-grain 0.7s steps(5) infinite",
          }}
        />

        {/* Viewfinder brackets — camera-style corners on the resting card that
            slide to the screen edges and fade as the frame opens. */}
        {bracketOpacity > 0.01 &&
          corners.map((c) => {
            const isTop = c.v === "top";
            const isLeft = c.h === "left";
            const edge = "2px solid rgba(255,224,198,0.85)";
            const radiusKey = `border${isTop ? "Top" : "Bottom"}${isLeft ? "Left" : "Right"}Radius`;
            return (
              <span
                key={`${c.v}-${c.h}`}
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                  [c.v]: `${insetY}%`,
                  [c.h]: `${insetX}%`,
                  width: "clamp(22px, 2.4vw, 34px)",
                  height: "clamp(22px, 2.4vw, 34px)",
                  margin: "14px",
                  [isTop ? "borderTop" : "borderBottom"]: edge,
                  [isLeft ? "borderLeft" : "borderRight"]: edge,
                  [radiusKey]: "6px",
                  opacity: bracketOpacity,
                  boxShadow: "0 0 12px rgba(176,74,21,0.35)",
                }}
              />
            );
          })}

        {/* Scroll cue under the resting card — gone the moment the open begins. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-7 flex flex-col items-center gap-2"
          style={{ opacity: 1 - hintOut, transform: `translateY(${8 * hintOut}px)` }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
            Scroll
          </span>
          <span
            className="block h-4 w-4 rotate-45 border-b border-r border-white/50"
            style={{ animation: "ck-scrolly-bob 1.8s ease-in-out infinite" }}
          />
        </div>

        {/* Legibility scrims for the captions. Faded in with the expand so they
            never shadow the resting card, then keyed to the scrub side. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(6,7,8,0.72) 0%, rgba(6,7,8,0.28) 28%, rgba(6,7,8,0) 52%)",
            opacity: (sp > 0.32 ? 1 : 0.55) * expand,
            transition: "opacity 0.5s ease",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(270deg, rgba(6,7,8,0.6) 0%, rgba(6,7,8,0.2) 26%, rgba(6,7,8,0) 50%)",
            opacity: (sp < 0.34 ? 1 : 0) * expand,
            transition: "opacity 0.5s ease",
          }}
        />

        {/* Phase captions. Decorative/transient, so hidden from assistive tech —
            the accessible summary is on the <section> and the brand block. Just
            the line itself now, in a sweeping orange shine. */}
        {CAPTIONS.map((c) => {
          const o = captionOpacity(sp, c);
          const slide = (1 - o) * (c.side === "right" ? 24 : -24);
          const alignEnd = c.side === "right";
          return (
            <div
              key={c.key}
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 flex max-w-[min(48ch,46vw)] flex-col justify-center px-6 sm:px-10 lg:px-16 ${
                alignEnd ? "items-end text-right" : "items-start text-left"
              }`}
              style={{
                [c.side]: 0,
                opacity: o,
                transform: `translateX(${slide}px)`,
                transition: "opacity 0.15s linear, transform 0.15s linear",
              }}
            >
              <p
                className="ck-shine"
                style={{
                  fontFamily: "var(--font-source-serif-4), Georgia, serif",
                  fontSize: "clamp(2rem, 1.1rem + 3vw, 4rem)",
                  fontWeight: 600,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
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

        {/* Scroll-progress rail — a thin glowing line along the top edge that
            fills as you move through the whole section. Top, not bottom, so it
            is never lost under the OS taskbar. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px]">
          <div
            className="h-full origin-left"
            style={{
              transform: `scaleX(${progress})`,
              background: "linear-gradient(90deg, #b04a15 0%, #ff8a2b 100%)",
              boxShadow: "0 0 12px rgba(255,138,43,0.6)",
              willChange: "transform",
            }}
          />
        </div>

        {/* Timecode — the film metaphor made literal. Reads the scrub as MM:SS,
            appears once the frame is full bleed, steps aside for the brand. */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-6 left-6 flex items-center gap-2 sm:left-10 lg:left-14"
          style={{ opacity: tcOpacity, transition: "opacity 0.2s linear" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "#ff5a2b", boxShadow: "0 0 8px rgba(255,90,43,0.9)" }}
          />
          <span
            className="text-[12px] font-semibold tabular-nums tracking-[0.14em] text-white/70"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            {timecode}
          </span>
        </div>

        {/* First-load hint, gone once the opening frame paints. */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
              Loading…
            </span>
          </div>
        )}
        {/* Bottom Rangoli decorative border for Ganpati theme */}
        {isGanpati && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
            <RangoliBorderStrip flip />
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
        className="ck-shine"
        style={{
          fontFamily: "var(--font-source-serif-4), Georgia, serif",
          fontSize: "clamp(2rem, 1.2rem + 3vw, 4rem)",
          fontWeight: 600,
          lineHeight: 1.04,
          letterSpacing: "-0.025em",
        }}
      >
        {t("brandLine1")}
        <br />
        {t("brandLine2")}
      </h2>
      <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.18em] text-white/85">
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
