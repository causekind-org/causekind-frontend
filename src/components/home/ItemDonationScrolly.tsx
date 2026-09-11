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
  /** The floating, glowing glyph for this beat — it changes with the sentence. */
  icon: LucideIcon;
  /** Step index shown as a small kicker above the line. */
  step: string;
}
const CAPTIONS: Caption[] = [
  { key: "p1", from: 0.0, to: 0.15, side: "right", icon: PackageOpen, step: "01" }, // packing the box
  { key: "p2", from: 0.18, to: 0.32, side: "right", icon: Smartphone, step: "02" }, // the listing card appears
  { key: "p3", from: 0.35, to: 0.5, side: "left", icon: MapPin, step: "03" }, // the matching network
  { key: "p4", from: 0.52, to: 0.64, side: "left", icon: HeartHandshake, step: "04" }, // matched nearby
  { key: "p5", from: 0.66, to: 0.78, side: "left", icon: HandHeart, step: "05" }, // handover / opening
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
            it — the same reason the animations in the old dial section were named. */}
        <style>{`
          @keyframes ck-scrolly-float {
            from { transform: translateY(0); }
            to   { transform: translateY(-9px); }
          }
          @keyframes ck-scrolly-glow {
            from { box-shadow: 0 0 18px rgba(176,74,21,0.35), inset 0 0 12px rgba(176,74,21,0.14); }
            to   { box-shadow: 0 0 36px rgba(176,74,21,0.62), inset 0 0 18px rgba(176,74,21,0.30); }
          }
          @keyframes ck-scrolly-line {
            from { transform: scaleX(0.2); opacity: 0.4; }
            to   { transform: scaleX(1);   opacity: 1;   }
          }
        `}</style>
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
            the accessible summary is on the <section> and the brand block. Each
            beat carries a glowing, gently-floating icon that changes with the
            sentence, a step kicker, and an accent line — so the copy reads as a
            designed moment, not a plain caption dropped on the video. */}
        {CAPTIONS.map((c) => {
          const o = captionOpacity(progress, c);
          const slide = (1 - o) * (c.side === "right" ? 24 : -24);
          const Icon = c.icon;
          const alignEnd = c.side === "right";
          return (
            <div
              key={c.key}
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 flex max-w-[min(48ch,44vw)] flex-col justify-center gap-4 px-6 sm:px-10 lg:px-16 ${
                alignEnd ? "items-end text-right" : "items-start text-left"
              }`}
              style={{
                [c.side]: 0,
                opacity: o,
                transform: `translateX(${slide}px)`,
                transition: "opacity 0.15s linear, transform 0.15s linear",
              }}
            >
              {/* Floating wrapper (transform) holds the glowing badge (box-shadow)
                  — split across two elements so the two animations don't fight for
                  the same property. */}
              <span
                style={{
                  display: "inline-block",
                  animation: "ck-scrolly-float 3.4s ease-in-out infinite alternate",
                  willChange: "transform",
                }}
              >
                <span
                  className="flex items-center justify-center rounded-2xl backdrop-blur-sm"
                  style={{
                    width: "clamp(48px, 3.4vw, 68px)",
                    height: "clamp(48px, 3.4vw, 68px)",
                    background:
                      "radial-gradient(120% 120% at 30% 20%, rgba(176,74,21,0.42) 0%, rgba(176,74,21,0.14) 55%, rgba(12,12,14,0.35) 100%)",
                    border: "1px solid rgba(255,222,196,0.32)",
                    animation: "ck-scrolly-glow 2.8s ease-in-out infinite alternate",
                  }}
                >
                  <Icon
                    strokeWidth={1.75}
                    style={{ width: "48%", height: "48%", color: "#ffd9bf" }}
                  />
                </span>
              </span>

              <div className={`flex flex-col gap-3 ${alignEnd ? "items-end" : "items-start"}`}>
                <span
                  className="text-[11px] font-extrabold uppercase"
                  style={{ letterSpacing: "0.22em", color: "#e88a4e" }}
                >
                  {c.step} <span style={{ opacity: 0.5 }}>/ 05</span>
                </span>

                <p
                  className="text-white"
                  style={{
                    fontFamily: "var(--font-source-serif-4), Georgia, serif",
                    fontSize: "clamp(1.9rem, 1.1rem + 2.6vw, 3.6rem)",
                    fontWeight: 600,
                    lineHeight: 1.06,
                    letterSpacing: "-0.02em",
                    // A soft terracotta halo under the usual dark legibility shadow.
                    textShadow:
                      "0 2px 24px rgba(0,0,0,0.6), 0 0 42px rgba(176,74,21,0.28)",
                  }}
                >
                  {t(c.key)}
                </p>

                {/* Accent line — grows from the text side, glowing terracotta. */}
                <span
                  style={{
                    height: "3px",
                    width: "clamp(64px, 8vw, 128px)",
                    borderRadius: "999px",
                    transformOrigin: alignEnd ? "right" : "left",
                    background: alignEnd
                      ? "linear-gradient(270deg, #b04a15 0%, rgba(176,74,21,0) 100%)"
                      : "linear-gradient(90deg, #b04a15 0%, rgba(176,74,21,0) 100%)",
                    boxShadow: "0 0 16px rgba(176,74,21,0.5)",
                    animation: "ck-scrolly-line 0.6s ease-out both",
                  }}
                />
              </div>
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
        className="text-white"
        style={{
          fontFamily: "var(--font-source-serif-4), Georgia, serif",
          fontSize: "clamp(2rem, 1.2rem + 3vw, 4rem)",
          fontWeight: 600,
          lineHeight: 1.04,
          letterSpacing: "-0.025em",
          // Same terracotta halo the phase captions carry, so the close matches.
          textShadow: "0 2px 28px rgba(0,0,0,0.6), 0 0 48px rgba(176,74,21,0.3)",
        }}
      >
        {t("brandLine1")}
        <br />
        {t("brandLine2")}
      </h2>
      <p className="mt-4 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.18em] text-white/85">
        <ShieldCheck
          className="shrink-0"
          strokeWidth={2}
          style={{ width: 17, height: 17, color: "#e88a4e" }}
          aria-hidden
        />
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
