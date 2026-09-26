/**
 * Geometry shared by the cinematic chapters.
 *
 * <p><b>One coordinate space.</b> Every layer of a chapter is an SVG with the
 * same `viewBox="0 0 1600 900"` and `preserveAspectRatio="xMidYMid slice"`, so a
 * point means the same place on screen in every layer. That is what lets the
 * bag live in a layer above the headline while still appearing to sit on a box
 * inside the room below it, and what lets Chapter 1's exit line meet Chapter 2's
 * entry line at the exact same pixel.
 *
 * <p><b>Why the camera is computed rather than tweened as a transform.</b> GSAP
 * tweens plain numbers on a rig object and one function turns them into
 * `transform` attributes each frame. The bag lives in a different layer from
 * the room but has to sit on the box, then in her hands, as the camera moves —
 * deriving its screen position from the same camera numbers is what keeps the
 * two layers locked together, forwards and backwards through a scrub.
 */

export const VB_W = 1600;
export const VB_H = 900;

export type Vec = { x: number; y: number };

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const DEG = Math.PI / 180;

/** Rotate a vector by `deg` degrees (SVG convention: positive is clockwise). */
export function rot(v: Vec, deg: number): Vec {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/**
 * What the slice-fitted viewBox actually shows on this screen.
 *
 * <p>`k` is CSS pixels per viewBox unit. `top` is the part of the stage hidden
 * under the site's fixed header, in viewBox units, so framing can centre on the
 * part of the stage a visitor can actually see.
 */
export type Stage = {
  k: number;
  visW: number;
  visH: number;
  x0: number;
  y0: number;
  /** Viewbox-space centre of the visible area below the header. */
  cx: number;
  cy: number;
  portrait: boolean;
  /** Height hidden under the fixed site header, viewBox units. */
  top: number;
  /** Header height in CSS px. */
  headerPx: number;
  /** Where the connecting line crosses between chapters (viewBox x). */
  seamX: number;
};

export function measureStage(el: Element | null): Stage {
  const w = (el as HTMLElement | null)?.clientWidth || window.innerWidth;
  const h = (el as HTMLElement | null)?.clientHeight || window.innerHeight;
  const k = Math.max(w / VB_W, h / VB_H);
  const visW = w / k;
  const visH = h / k;
  const x0 = (VB_W - visW) / 2;
  const y0 = (VB_H - visH) / 2;
  // The site header is the first <header> in the document and is sticky; its
  // height, not its position, is what covers the top of a pinned stage.
  const header = document.querySelector("header");
  const pinnedHeader = header && /sticky|fixed/.test(getComputedStyle(header).position);
  const headerPx = pinnedHeader ? clamp(header.getBoundingClientRect().height, 0, 120) : 0;
  const top = headerPx / k;
  return {
    k,
    visW,
    visH,
    x0,
    y0,
    cx: VB_W / 2,
    cy: y0 + top + (visH - top) / 2,
    portrait: w / h < 1,
    top,
    headerPx,
    // Right of centre, but always inside the visible width — a phone shows
    // about a quarter of the landscape frame.
    seamX: VB_W / 2 + (visW / 2) * 0.55,
  };
}

/**
 * A 2D camera: show room-space point (x, y) at the visible centre, at zoom s.
 * Returns the transform for a group whose children are in room space.
 */
export function cameraTransform(stage: Stage, s: number, x: number, y: number) {
  return `translate(${stage.cx} ${stage.cy}) scale(${s}) translate(${-x} ${-y})`;
}

/** Map a room-space point through the camera into viewBox (screen) space. */
export function toScreen(stage: Stage, s: number, camX: number, camY: number, p: Vec): Vec {
  return { x: stage.cx + (p.x - camX) * s, y: stage.cy + (p.y - camY) * s };
}

/** Set a transform attribute only when it changed — scrubbing calls this a lot. */
export function setT(el: Element | null | undefined, t: string) {
  if (el && el.getAttribute("transform") !== t) el.setAttribute("transform", t);
}

/**
 * A path sampled once into a lookup table.
 *
 * `getPointAtLength` is a DOM geometry query; the film used to call it several
 * times per frame (the bag on its exit arc, the sparks behind it, the line's
 * head, the bag riding the map route) and each call is a synchronous trip into
 * the SVG engine on the scroll path. Sampling at measure time — every `step`
 * units, a few hundred points — turns each per-frame lookup into two array
 * reads and a lerp. Four units is well under a pixel at any stage scale.
 */
export type PathLUT = { len: number; step: number; xs: Float32Array; ys: Float32Array };

export function samplePath(path: SVGGeometryElement | null | undefined, step = 4): PathLUT {
  const len = path?.getTotalLength?.() ?? 0;
  const n = Math.max(2, Math.ceil(len / step) + 1);
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  if (path && len > 0) {
    for (let i = 0; i < n; i++) {
      const p = path.getPointAtLength(Math.min(len, i * step));
      xs[i] = p.x;
      ys[i] = p.y;
    }
  }
  return { len, step, xs, ys };
}

/** The point `at` units along a sampled path (clamped to its ends). */
export function pointAt(lut: PathLUT, at: number): Vec {
  const f = clamp(at, 0, lut.len) / lut.step;
  const i = Math.min(lut.xs.length - 2, Math.floor(f));
  const t = f - i;
  return {
    x: lut.xs[i] + (lut.xs[i + 1] - lut.xs[i]) * t,
    y: lut.ys[i] + (lut.ys[i + 1] - lut.ys[i]) * t,
  };
}

/**
 * Initialise every tween of a scrubbed timeline ahead of time, in idle slices.
 *
 * GSAP initialises a tween the first time the playhead reaches it, and init
 * reads `getComputedStyle` — a forced style recalculation. A scrubbed film has
 * hundreds of tweens, so scrolling through it the first time paid that cost
 * frame after frame. This walks the playhead to the end in small steps while
 * the reader is still above the stage (each step its own idle callback, so no
 * single long task), then puts it back. It stops for good the moment the
 * stage's own trigger goes active — from then on scrubbing owns the playhead —
 * and only steps while `canStep()` says the stage cannot be seen; otherwise it
 * waits for the next idle slot rather than flash later frames on screen.
 */
export function warmTimeline(
  tl: gsap.core.Timeline,
  isLive: () => boolean,
  canStep: () => boolean,
  steps = 12,
) {
  const ric: (cb: () => void) => number =
    typeof window.requestIdleCallback === "function"
      ? (cb) => window.requestIdleCallback(cb, { timeout: 1500 })
      : (cb) => window.setTimeout(cb, 120);
  const cancel =
    typeof window.cancelIdleCallback === "function" ? window.cancelIdleCallback : window.clearTimeout;
  const home = tl.progress();
  let i = 0;
  let id = 0;
  let done = false;
  const step = () => {
    if (done) return;
    if (isLive()) {
      done = true;
      return;
    }
    if (!canStep()) {
      id = ric(step);
      return;
    }
    i++;
    tl.progress(Math.min(1, i / steps), true);
    if (i < steps) id = ric(step);
    else {
      tl.progress(home, true);
      done = true;
    }
  };
  id = ric(step);
  return () => {
    if (done) return;
    done = true;
    cancel(id);
    if (!isLive()) tl.progress(home, true);
  };
}
