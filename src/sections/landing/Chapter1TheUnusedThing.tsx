"use client";

/**
 * Chapter 1 — "One small thing can become a big thing."
 *
 * The opening scene of the landing page's film, directly below the hero. One
 * pinned stage, one scrubbed timeline; scroll is the playhead.
 *
 *   0–16   The apartment assembles. Each piece is sketched in glowing ink,
 *          then floods with colour: horizon, walls, window and city, curtains,
 *          the shelf slides in, the sofa drops, a book lands on the table, the
 *          lamp switches on, the box skids in and the bag drops onto it.
 *   16–34  The camera pushes in. The door opens; she steps out, notices the
 *          bag, and a thought inks itself above her: "I don't use this anymore."
 *   34–48  The bag hops into her hands. The room darkens around a spotlight.
 *   48–64  The bag rises to camera. Its outline is traced in light, its seams
 *          are sewn in light, a sheen crosses it. "YOU DON'T NEED IT." rises
 *          word by word behind it while the room falls away to black.
 *   64–84  "BUT SOMEONE MIGHT." slams in and takes over; the first line
 *          becomes a ghost outline behind it. Only the bag remains.
 *   84–100 It winds back, then launches: shockwave, shake, motion blur. It
 *          shoots right, arcs over and dives out through the bottom edge,
 *          dragging a glowing line that Chapter 2 picks up at the same pixel.
 *
 * <p><b>Layers.</b> Three stacked views share one viewBox (see `rig.ts`): the
 * room SVG, the HTML headline, then a top SVG holding the bag. The bag is the
 * only thing that must be in front of the headline, so it is the only thing
 * that lives up there — its screen position is derived every frame from the
 * room camera, which is how it can sit on a box inside the room below.
 *
 * <p><b>Reduced motion</b> gets a still: the room, her holding the bag, and
 * both lines of copy. No pin, no scrub.
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import { CustomWiggle } from "gsap/CustomWiggle";

import styles from "./cinematic/cinematic.module.css";
import { RoomDefs, RoomScene } from "./cinematic/RoomScene";
import { BAG, GIVER, GIVER_HOLDING } from "./cinematic/cutouts";
import { P } from "./cinematic/palette";
import {
  VB_H,
  VB_W,
  cameraTransform,
  clamp,
  lerp,
  measureStage,
  setT,
  toScreen,
  type Stage,
} from "./cinematic/rig";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, CustomEase, CustomWiggle);
// A phone's address bar showing/hiding resizes the viewport on every scroll
// direction change; re-measuring every pinned trigger each time is visible jank.
ScrollTrigger.config({ ignoreMobileResize: true });

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ── Placement, in room units ─────────────────────────────────────────────────

const FLOOR_Y = 800;
const GIVER_X = 1345;
const FIGURE_H = 430;

const GS = FIGURE_H / GIVER.height;
const GIVER_T = { x: GIVER_X - GIVER.feet.x * GS, y: FLOOR_Y - GIVER.feet.y * GS, s: GS };
const HS = FIGURE_H / GIVER_HOLDING.height;
const HOLD_T = {
  x: GIVER_X - GIVER_HOLDING.feet.x * HS,
  y: FLOOR_Y - GIVER_HOLDING.feet.y * HS,
  s: HS,
};

const BODY_H = BAG.body.y1 - BAG.body.y0;
const REST_S = 122 / BODY_H;
/** On the box: body bottom settles just into the box's top face (y 607). */
const BAG_REST = { x: 1160, y: 609 - (BAG.body.y1 - BAG.body.cy) * REST_S, s: REST_S };
/** In her hands: exactly over the drawn backpack in the holding pose. */
const HB = GIVER_HOLDING.heldBody;
const BAG_HELD = {
  x: HOLD_T.x + ((HB.x0 + HB.x1) / 2) * HS,
  y: HOLD_T.y + ((HB.y0 + HB.y1) / 2) * HS,
  s: ((HB.y1 - HB.y0) * HS) / BODY_H,
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const place = (t: { x: number; y: number; s: number }) =>
  `translate(${r1(t.x)} ${r1(t.y)}) scale(${t.s.toFixed(4)})`;

// Thought cloud, above-left of her head.
const CLOUD = { cx: 1142, cy: 322, rx: 134, ry: 28 };
const PUFFS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  return {
    x: r1(CLOUD.cx + Math.cos(a) * CLOUD.rx),
    y: r1(CLOUD.cy + Math.sin(a) * CLOUD.ry),
    r: 29 + ((i * 7) % 3) * 5,
  };
});
const THOUGHT = ["“I", "don’t", "use", "this", "anymore.”"];

// Dust kicked up when the bag leaves the box.
const DUST = Array.from({ length: 14 }, (_, i) => {
  const a = Math.PI + (i / 13) * Math.PI;
  const d = 40 + ((i * 29) % 50);
  return { dx: r1(Math.cos(a) * d * 1.6), dy: r1(Math.sin(a) * d * 0.7), r: 3 + ((i * 13) % 5) };
});

const LINE_1 = ["You", "don’t", "need", "it."];
const LINE_2 = ["But", "someone", "might."];

// Cheap shaping for the exit flip.
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function Chapter1TheUnusedThing() {
  const rootRef = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const one = <T extends Element>(sel: string) => root.querySelector(sel) as T | null;

      const cam = one<SVGGElement>(".c1-cam");
      const camTop = one<SVGGElement>(".c1-cam-top");
      const bag = one<SVGGElement>(".c1-bag");
      const shadow = one<SVGEllipseElement>(".c1-bag-shadow");
      const aura = one<SVGGElement>(".c1-aura");
      const spot = one<SVGRadialGradientElement>("#c1-spot");
      const mblur = one<SVGFEGaussianBlurElement>("#c1-mblur-fe");
      const exitPaths = Array.from(root.querySelectorAll<SVGPathElement>(".c1-trail-path"));
      const exitRef = exitPaths[0];
      const sparks = Array.from(root.querySelectorAll<SVGCircleElement>(".c1-spark"));
      const tc = one<HTMLElement>(".c1-timecode");

      let st: Stage = measureStage(root);
      let exitLen = 0;
      /** Motion blur is an SVG filter re-run every frame — desktop with a mouse only. */
      let heavyFx = false;
      const roomSvg = one<SVGSVGElement>(".c1-room-svg");

      /*
       * Everything that is derived rather than tweened. GSAP moves numbers on
       * this object; `apply` turns them into transforms once per frame.
       */
      const R = {
        cam: 0,
        drop: 1,
        squash: 0,
        hold: 0,
        float: 0,
        fyN: 0,
        fs: 1,
        pull: 0,
        idle: 0,
        exit: 0,
        blur: 0,
        shadow: 0,
        spot: 0,
      };

      const floatScale = () => {
        const visiblePx = (st.visH - st.top) * st.k;
        // Height-led on landscape, width-led on a phone (the body is ~1.27× taller than wide).
        const bodyPx = Math.min(visiblePx * 0.42, st.visW * st.k * 0.56 * 1.27, 340);
        return bodyPx / st.k / BODY_H;
      };
      const frame = (fw: number) => Math.min(st.visW / fw, (st.visH - st.top) / (fw * 0.6));
      const lineY = () => -(st.visH - st.top) * 0.19;

      /*
       * Camera keyframes, recomputed from the live stage every frame. The
       * timeline only tweens `R.cam` from one index to the next, so a resize
       * mid-film re-frames the shot instead of replaying stale numbers.
       */
      const camKeys = () => {
        const p = st.portrait;
        const k3 = frame(p ? 420 : 620);
        return [
          { s: p ? frame(1250) : frame(1600) * 0.98, x: p ? 900 : 800, y: 470 },
          { s: frame(p ? 520 : 840), x: p ? 1235 : 1215, y: p ? 470 : 480 },
          { s: frame(p ? 470 : 740), x: p ? 1196 : 1225, y: 452 },
          { s: k3, x: p ? 1270 : 1265, y: 500 },
          { s: k3 * 1.35, x: p ? 1270 : 1265, y: 500 },
        ];
      };
      const camNow = () => {
        const K = camKeys();
        const i = Math.min(K.length - 2, Math.max(0, Math.floor(R.cam)));
        const t = clamp(R.cam - i, 0, 1);
        return {
          s: lerp(K[i].s, K[i + 1].s, t),
          x: lerp(K[i].x, K[i + 1].x, t),
          y: lerp(K[i].y, K[i + 1].y, t),
        };
      };

      /** The exit path: right, over, and down through the bottom at seamX. */
      const buildExit = () => {
        const sx = st.cx;
        const sy = st.cy + lineY();
        const h = st.visH - st.top;
        const rx = st.x0 + st.visW * 0.9;
        const seam = st.seamX;
        const bottom = st.y0 + st.visH;
        const d =
          `M ${r1(sx)} ${r1(sy)} ` +
          `C ${r1(sx + (rx - sx) * 0.35)} ${r1(sy - h * 0.34)} ${r1(rx)} ${r1(sy - h * 0.3)} ${r1(rx)} ${r1(sy + h * 0.02)} ` +
          `C ${r1(rx)} ${r1(sy + h * 0.24)} ${r1(seam)} ${r1(sy + h * 0.14)} ${r1(seam)} ${r1(sy + h * 0.4)} ` +
          `L ${r1(seam)} ${r1(bottom + 700)}`;
        exitPaths.forEach((p) => p.setAttribute("d", d));
        exitLen = exitRef?.getTotalLength?.() ?? 0;
        exitPaths.forEach((p) => {
          if (p.classList.contains("c1-trail-pulse")) return;
          p.style.strokeDasharray = `${exitLen} ${exitLen + 10}`;
        });
      };

      const measure = () => {
        st = measureStage(root);
        heavyFx = !st.portrait && window.matchMedia("(pointer: fine)").matches;
        root.style.setProperty("--hdr", `${st.headerPx}px`);
        buildExit();
        const shock = root.querySelector(".c1-shock");
        shock?.setAttribute("cx", `${r1(st.cx)}`);
        shock?.setAttribute("cy", `${r1(st.cy + lineY())}`);
        pulse?.invalidate();
        const ly = st.cy + lineY();
        root.querySelectorAll(".c1-speed line").forEach((l, i) => {
          const dy = (i - 2.5) * 34;
          l.setAttribute("x1", `${r1(st.cx - 520 + (i % 3) * 70)}`);
          l.setAttribute("x2", `${r1(st.cx - 90 - (i % 2) * 40)}`);
          l.setAttribute("y1", `${r1(ly + dy)}`);
          l.setAttribute("y2", `${r1(ly + dy)}`);
        });
      };
      let pulse: gsap.core.Tween | null = null;

      let clock = 0;
      const apply = () => {
        const C = camNow();
        const camT = cameraTransform(st, C.s, C.x, C.y);
        setT(cam, camT);
        setT(camTop, camT);

        // Where the bag is in the room…
        const wx = lerp(BAG_REST.x, BAG_HELD.x, R.hold);
        const wy =
          lerp(BAG_REST.y - R.drop * 460, BAG_HELD.y, R.hold) - Math.sin(Math.PI * R.hold) * 95;
        const ws = lerp(BAG_REST.s, BAG_HELD.s, R.hold);
        const onScreen = toScreen(st, C.s, C.x, C.y, { x: wx, y: wy });

        // …blended toward its floating mark in front of the camera.
        const bob = Math.sin(clock * 1.7) * 7 * R.idle;
        const sway = Math.sin(clock * 1.1) * 2.4 * R.idle;
        let sx = lerp(onScreen.x, st.cx - R.pull * 70, R.float);
        let sy = lerp(onScreen.y, st.cy + lineY() * R.fyN + bob, R.float);
        let sc = lerp(ws * C.s, floatScale() * R.fs, R.float);
        let rot = sway - R.pull * 9 + Math.sin(Math.PI * R.hold) * -14;
        let kx = 1 + R.squash * 0.14 - R.pull * 0.1;
        let ky = 1 - R.squash * 0.16 + R.pull * 0.08;

        // …then flung along the exit path.
        if (R.exit > 0 && exitLen > 0 && exitRef) {
          const at = exitLen * R.exit;
          const p = exitRef.getPointAtLength(at);
          const p2 = exitRef.getPointAtLength(Math.min(exitLen, at + 6));
          const vx = p2.x - p.x;
          const vy = p2.y - p.y;
          const ang = (Math.atan2(vy, vx) * 180) / Math.PI;
          const k = smooth(0, 0.08, R.exit);
          sx = lerp(sx, p.x, k);
          sy = lerp(sy, p.y, k);
          sc *= lerp(1, 0.42, smooth(0, 0.7, R.exit));
          rot = lerp(rot, ang * 0.3 + 360 * smooth(0.18, 0.62, R.exit), k);
          kx *= 1 + R.blur * 0.25;
          ky *= 1 - R.blur * 0.12;
          if (mblur && heavyFx) {
            const n = Math.hypot(vx, vy) || 1;
            mblur.setAttribute(
              "stdDeviation",
              `${r1((Math.abs(vx) / n) * 14 * R.blur)} ${r1((Math.abs(vy) / n) * 14 * R.blur)}`,
            );
          }
          exitPaths.forEach((path) => {
            if (!path.classList.contains("c1-trail-pulse"))
              path.style.strokeDashoffset = `${exitLen - at}`;
          });
          sparks.forEach((s, i) => {
            const back = at - (i + 1) * exitLen * 0.011;
            if (back <= 0 || R.exit >= 0.999) {
              s.setAttribute("opacity", "0");
              return;
            }
            const sp = exitRef.getPointAtLength(back);
            const jitter = Math.sin(clock * 9 + i * 2.3) * (4 + i);
            s.setAttribute("cx", `${r1(sp.x + jitter)}`);
            s.setAttribute("cy", `${r1(sp.y - jitter * 0.6)}`);
            s.setAttribute("opacity", `${r1((1 - i / sparks.length) * 0.95)}`);
          });
        } else {
          exitPaths.forEach((path) => {
            if (!path.classList.contains("c1-trail-pulse"))
              path.style.strokeDashoffset = `${exitLen}`;
          });
          sparks.forEach((s) => s.setAttribute("opacity", "0"));
        }
        if (bag) {
          if (heavyFx && R.blur > 0.02) bag.setAttribute("filter", "url(#c1-mblur)");
          else bag.removeAttribute("filter");
        }

        setT(
          bag,
          `translate(${r1(sx)} ${r1(sy)}) rotate(${r1(rot)}) scale(${(sc * kx).toFixed(4)} ${(sc * ky).toFixed(4)})`,
        );
        setT(aura, `translate(${r1(sx)} ${r1(sy)}) scale(${(sc * (1 + R.pull * 0.3)).toFixed(4)})`);

        if (shadow) {
          const lift = 1 - bob / 40;
          shadow.setAttribute("cx", `${r1(sx)}`);
          shadow.setAttribute("cy", `${r1(sy + (BAG.body.y1 - BAG.body.cy + 70) * sc)}`);
          shadow.setAttribute("rx", `${r1(150 * sc * lift)}`);
          shadow.setAttribute("ry", `${r1(22 * sc * lift)}`);
          shadow.setAttribute("opacity", `${r1(R.shadow * (1 - R.exit * 4))}`);
        }
        if (spot) {
          spot.setAttribute("cx", `${r1(sx)}`);
          spot.setAttribute("cy", `${r1(sy)}`);
          spot.setAttribute("r", `${r1(Math.max(160, 560 * sc))}`);
        }
      };

      // ── Initial state ──────────────────────────────────────────────────────
      const hideObjects = () => {
        gsap.set(q(".r-obj > .paint, .r-obj > .ink"), { autoAlpha: 0 });
        gsap.set(
          q(".r-shell, .r-books .r-spine, .r-toran, .r-clothes .r-cloth, .r-beam, .r-mote"),
          { opacity: 0 },
        );
        gsap.set(q(".r-horizon"), { drawSVG: "50% 50%", opacity: 1 });
        gsap.set(q(".c1-giver-wrap"), { opacity: 0, x: 150 });
        gsap.set(q(".c1-giver-lean"), { scale: 0.9, svgOrigin: `${GIVER_X} ${FLOOR_Y}` });
        gsap.set(q(".c1-giver-hold, .c1-hands, .c1-bubble, .c1-notice, .c1-dust"), { opacity: 0 });
        gsap.set(q(".c1-bag"), { opacity: 0 });
        gsap.set(
          q(
            ".c1-spot-rect, .c1-black, .c1-aura, .c1-trail, .c1-speed, .c1-shock, .c1-bag-halo, .c1-glint",
          ),
          { opacity: 0 },
        );
        gsap.set(q(".c1-scan"), { drawSVG: "0%", opacity: 1 });
        gsap.set(q(".c1-seam-reveal"), { drawSVG: "0%" });
        gsap.set(q(".c1-seam-head"), { drawSVG: "0% 0%", opacity: 0 });
        gsap.set(q(".c1-sheen"), { x: -260 });
        gsap.set(q(".c1-w1"), { yPercent: 115, rotate: 6 });
        gsap.set(q(".c1-w2"), { opacity: 0, scale: 2.6, filter: "blur(22px)" });
        gsap.set(q(".c1-l1"), { "--ghost": "rgba(251,241,221,0)", color: "#f3e6cf" });
        gsap.set(q(".c1-sub"), { opacity: 0, y: 14 });
        gsap.set(q(".c1-hud-scene-b"), { opacity: 0 });
      };

      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (mctx) => {
          const { reduce } = mctx.conditions as { reduce: boolean };
          measure();

          // ── Reduced motion: a still frame, no pin ────────────────────────
          if (reduce) {
            Object.assign(R, { cam: 2, drop: 0, hold: 1 });
            gsap.set(q(".c1-giver-stand, .c1-title, .r-horizon"), { opacity: 0 });
            gsap.set(q(".c1-giver-hold, .c1-hands, .c1-bubble, .c1-bag"), { opacity: 1 });
            gsap.set(q(".c1-copy"), { justifyContent: "flex-end", paddingBottom: "8vh" });
            gsap.set(q(".c1-copy-bg"), { opacity: 1 });
            gsap.set(q(".c1-l1, .c1-l2"), {
              position: "relative",
              top: "auto",
              fontSize: "clamp(2rem, 5.2vw, 4.6rem)",
            });
            gsap.set(q(".c1-l1"), { color: "#f3e6cf" });
            gsap.set(q(".c1-scan"), { opacity: 0 });
            gsap.set(q(".c1-seams"), { opacity: 0.35 });
            apply();
            return;
          }

          hideObjects();
          const portrait = st.portrait;
          const lite = portrait || window.matchMedia("(pointer: coarse)").matches;

          // Title card reveal as the section scrolls up under the hero.
          gsap.fromTo(
            q(".c1-t-w"),
            { yPercent: 110 },
            {
              yPercent: 0,
              stagger: 0.08,
              ease: "power3.out",
              scrollTrigger: { trigger: root, start: "top 85%", end: "top 25%", scrub: 0.6 },
            },
          );

          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            onUpdate: apply,
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: portrait ? "+=560%" : "+=720%",
              pin: true,
              scrub: 0.9,
              anticipatePin: 1,
            },
          });

          apply();

          // ── Helpers ──────────────────────────────────────────────────────
          const drawables = (scope: Element) =>
            Array.from(
              scope.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon"),
            ).filter((el) => !el.closest("defs,mask,clipPath,.no-ink"));
          /** Sketch an object in ink, then flood its paint in under the lines. */
          const sketch = (name: string, at: number, dur = 2.4) => {
            q(`.r-${name}`).forEach((obj) => {
              const ink = obj.querySelector(":scope > .ink");
              const paint = obj.querySelector(":scope > .paint");
              if (!ink || !paint) return;
              // Phones: no ink pass. It doubles the room's shapes and redraws
              // hundreds of outlines per frame — the costliest part of the film
              // on a phone CPU. Objects simply fade in there.
              if (lite) {
                ink.remove();
                tl.to(paint, { autoAlpha: 1, duration: dur * 0.5, ease: "power1.out" }, at + dur * 0.2);
                return;
              }
              tl.set(ink, { autoAlpha: 1 }, at);
              tl.fromTo(
                drawables(ink),
                { drawSVG: "0%" },
                {
                  drawSVG: "100%",
                  duration: dur * 0.6,
                  stagger: { amount: dur * 0.25 },
                  ease: "power1.inOut",
                },
                at,
              );
              tl.to(
                paint,
                { autoAlpha: 1, duration: dur * 0.35, ease: "power1.out" },
                at + dur * 0.55,
              );
              tl.to(ink, { autoAlpha: 0, duration: dur * 0.3 }, at + dur * 0.85);
            });
          };

          // ── 0–4: title out, horizon in ───────────────────────────────────
          tl.to(
            q(".c1-t-m"),
            {
              yPercent: -40,
              opacity: 0,
              filter: "blur(8px)",
              stagger: 0.12,
              duration: 1.6,
              ease: "power3.in",
            },
            0,
          );
          tl.to(q(".c1-t-eyebrow"), { opacity: 0, y: -20, duration: 1.2 }, 0.4);
          tl.to(q(".r-horizon"), { drawSVG: "0% 100%", duration: 2.6, ease: "power3.out" }, 0.6);
          tl.to(q(".r-shell"), { opacity: 1, duration: 2.4, ease: "none" }, 2);
          tl.fromTo(
            q(".r-seam"),
            { drawSVG: "0%" },
            { drawSVG: "100%", duration: 2.2, stagger: { amount: 1, from: "center" } },
            2.4,
          );
          tl.to(q(".r-horizon"), { opacity: 0, duration: 1.2 }, 4.2);
          tl.to(q(".c1-hud"), { opacity: 1, duration: 1 }, 1);

          // ── 3–16: the room assembles ─────────────────────────────────────
          sketch("window", 3.4);
          tl.from(q(".r-city-far"), { y: 90, duration: 2, ease: "power3.out" }, 4.4);
          tl.from(q(".r-city-near"), { y: 80, duration: 2, ease: "power3.out" }, 4.8);
          tl.from(
            q(".r-sun, .r-sun-disc"),
            { y: 60, scale: 0.6, svgOrigin: "716 398", duration: 2.4, ease: "power2.out" },
            4.8,
          );
          sketch("rod", 4.4, 1.6);
          sketch("curtain-l", 4.6);
          sketch("curtain-r", 4.8);
          tl.from(
            q(".r-curtain-l, .r-curtain-r"),
            { scaleY: 0, svgOrigin: "720 124", duration: 2.2, ease: "power3.out" },
            4.6,
          );

          sketch("fan", 5.6, 2);
          sketch("shelf", 5.6, 2.8);
          tl.from(q(".r-shelf"), { x: -560, duration: 2.4, ease: "back.out(1.3)" }, 5.4);
          tl.to(
            q(".r-books .r-spine"),
            { opacity: 1, duration: 0.3, stagger: { amount: 1.8 } },
            7.9,
          );
          tl.from(
            q(".r-books .r-spine"),
            { y: -40, duration: 0.7, stagger: { amount: 1.8 }, ease: "bounce.out" },
            7.9,
          );
          sketch("shelf-top", 8, 2);

          sketch("sofa", 7, 2.8);
          tl.from(q(".r-sofa"), { y: -520, duration: 1.6, ease: "power3.in" }, 7);
          tl.fromTo(
            q(".r-sofa"),
            { scaleY: 0.86, scaleX: 1.05, svgOrigin: "650 716" },
            {
              scaleY: 1,
              scaleX: 1,
              svgOrigin: "650 716",
              duration: 1.2,
              ease: "elastic.out(1, 0.45)",
            },
            8.6,
          );
          sketch("pillow-a", 9.4, 1.6);
          sketch("pillow-b", 9.7, 1.6);
          tl.from(
            q(".r-pillow-a, .r-pillow-b"),
            { scale: 0, svgOrigin: "650 580", duration: 1.2, stagger: 0.3, ease: "back.out(2.2)" },
            9.4,
          );
          tl.to(q(".r-clothes .r-cloth"), { opacity: 1, duration: 0.2, stagger: 0.4 }, 10.2);
          tl.from(
            q(".r-clothes .r-cloth"),
            { y: -260, duration: 0.8, stagger: 0.4, ease: "bounce.out" },
            10.2,
          );

          sketch("lamp", 8, 3);
          tl.from(q(".r-lamp"), { y: -300, duration: 1.6, ease: "bounce.out" }, 8.4);
          // The lamp comes on — with a flicker.
          tl.to(
            q(".r-lamp-bulb, .r-lamp-cone, .r-lamp-pool, .r-lamp-wallglow"),
            { keyframes: { opacity: [0, 1, 0.15, 0.9, 0.3, 1] }, duration: 1.4, ease: "none" },
            12.4,
          );

          sketch("rug", 9, 2);
          tl.from(
            q(".r-rug"),
            { scaleX: 0, svgOrigin: "448 792", duration: 1.8, ease: "power3.out" },
            9,
          );
          sketch("table", 9.6, 2.2);
          tl.from(q(".r-table"), { y: 260, duration: 1.6, ease: "power3.out" }, 9.6);
          sketch("laptop", 11, 1.8);
          tl.from(
            q(".r-laptop-lid"),
            { scaleY: 0, svgOrigin: "638 708", duration: 1.2, ease: "back.out(1.6)" },
            11.2,
          );
          // A book lands on the table.
          sketch("book", 11.6, 1.4);
          tl.from(
            q(".r-book"),
            { y: -620, rotation: -50, svgOrigin: "746 708", duration: 1.4, ease: "bounce.out" },
            11.4,
          );
          sketch("chai", 12.4, 1.4);
          tl.from(
            q(".r-chai"),
            { scaleY: 0, svgOrigin: "813 716", duration: 0.8, ease: "back.out(2)" },
            12.4,
          );

          sketch("clock", 10.4, 2);
          tl.from(
            q(".r-clock"),
            { rotation: 30, svgOrigin: "1000 150", duration: 1.8, ease: "elastic.out(1, 0.35)" },
            10.4,
          );
          sketch("warli", 10.8, 2);
          tl.from(
            q(".r-warli"),
            { rotation: -22, svgOrigin: "1144 146", duration: 1.8, ease: "elastic.out(1, 0.35)" },
            10.8,
          );
          sketch("door", 11, 2.4);
          tl.to(q(".r-toran"), { opacity: 1, duration: 0.2 }, 12);
          tl.from(
            q(".r-toran .r-marigold"),
            {
              scale: 0,
              transformOrigin: "50% 50%",
              duration: 0.6,
              stagger: { amount: 1.4, from: "center" },
              ease: "back.out(3)",
            },
            12,
          );
          tl.from(q(".r-toran-string"), { drawSVG: "50% 50%", duration: 1.2 }, 12);
          sketch("chappals", 12.6, 1.2);

          sketch("box", 13, 2.4);
          tl.from(
            q(".r-box"),
            { x: 620, rotation: 10, svgOrigin: "1160 770", duration: 1.8, ease: "power3.out" },
            12.8,
          );

          // The bag drops onto the box.
          tl.set(q(".c1-bag"), { opacity: 1 }, 15);
          tl.fromTo(R, { drop: 1 }, { drop: 0, duration: 1.1, ease: "power3.in" }, 15);
          tl.to(R, { keyframes: { squash: [1, -0.4, 0] }, duration: 1, ease: "none" }, 16.1);
          tl.to(q(".c1-scan"), { drawSVG: "100%", duration: 1.6, ease: "power2.inOut" }, 15.6);
          tl.to(q(".c1-scan"), { opacity: 0, duration: 0.8 }, 17.4);

          // Window light and dust in it.
          tl.to(q(".r-beam"), { opacity: 1, duration: 2 }, 14);
          tl.to(q(".r-mote"), { opacity: 0.9, duration: 1.2, stagger: 0.1 }, 14.6);
          tl.to(q(".c1-sub"), { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, 7);
          tl.to(q(".c1-sub"), { opacity: 0, y: -10, duration: 1 }, 16);

          // Clock hands turn with the whole film.
          tl.fromTo(
            q(".r-clock-min"),
            { rotation: 0 },
            { rotation: 720, svgOrigin: "1000 192", duration: 100, ease: "none" },
            0,
          );
          tl.fromTo(
            q(".r-clock-hr"),
            { rotation: 150 },
            { rotation: 210, svgOrigin: "1000 192", duration: 100, ease: "none" },
            0,
          );

          // ── 16–34: camera in; she comes through the door ───────────────
          tl.to(R, { cam: 1, duration: 7, ease: "power2.inOut" }, 16);

          tl.to(
            q(".r-door-leaf"),
            { scaleX: 0.12, svgOrigin: "1554 474", duration: 1.6, ease: "power2.out" },
            17.4,
          );
          tl.to(q(".r-door-spill"), { opacity: 0.55, duration: 1.4 }, 17.6);
          tl.to(q(".c1-giver-wrap"), { opacity: 1, duration: 0.8 }, 18.4);
          tl.to(q(".c1-giver-wrap"), { x: 0, duration: 4, ease: "power1.inOut" }, 18.4);
          tl.to(
            q(".c1-giver-lean"),
            { scale: 1, svgOrigin: `${GIVER_X} ${FLOOR_Y}`, duration: 3.2, ease: "power2.out" },
            18.4,
          );
          tl.to(
            q(".c1-giver-bob"),
            { keyframes: { y: [0, -12, 0, -12, 0, -10, 0] }, duration: 4, ease: "none" },
            18.4,
          );
          tl.to(
            q(".r-door-leaf"),
            { scaleX: 1, svgOrigin: "1554 474", duration: 1.6, ease: "power2.inOut" },
            22.4,
          );
          tl.to(q(".r-door-spill"), { opacity: 0, duration: 1.2 }, 22.6);

          // She notices it.
          tl.to(q(".c1-notice"), { opacity: 1, duration: 0.2 }, 23);
          tl.fromTo(
            q(".c1-notice path"),
            { drawSVG: "0% 0%" },
            { drawSVG: "0% 100%", duration: 0.8, stagger: 0.12, ease: "power3.out" },
            23,
          );
          tl.to(
            q(".c1-notice path"),
            { drawSVG: "100% 100%", duration: 0.8, stagger: 0.12, ease: "power3.in" },
            24.4,
          );
          // A retracted round-capped stroke still paints a dot — hide the group once it's done.
          tl.to(q(".c1-notice"), { opacity: 0, duration: 0.3 }, 25.4);
          tl.to(
            q(".c1-glint"),
            {
              keyframes: { opacity: [0, 1, 0], scale: [0.2, 1.3, 0.2], rotation: [0, 90, 180] },
              transformOrigin: "50% 50%",
              duration: 1.6,
              ease: "none",
            },
            23.4,
          );
          tl.to(q(".c1-scan"), { opacity: 1, duration: 0.1 }, 23.4);
          tl.fromTo(
            q(".c1-scan"),
            { drawSVG: "0% 0%" },
            { drawSVG: "0% 100%", duration: 1.2, ease: "power2.inOut" },
            23.4,
          );
          tl.to(q(".c1-scan"), { drawSVG: "100% 100%", duration: 1.2, ease: "power2.inOut" }, 24.6);
          tl.to(R, { cam: 2, duration: 6, ease: "power1.inOut" }, 23);

          // The thought.
          tl.to(q(".c1-bubble"), { opacity: 1, duration: 0.1 }, 24.4);
          tl.from(
            q(".c1-bdot"),
            {
              scale: 0,
              transformOrigin: "50% 50%",
              duration: 0.7,
              stagger: 0.35,
              ease: "back.out(3)",
            },
            24.4,
          );
          tl.fromTo(
            q(".c1-cloud-line circle"),
            { drawSVG: "0%" },
            { drawSVG: "100%", duration: 1.6, stagger: { amount: 0.8 }, ease: "power1.inOut" },
            25.4,
          );
          tl.from(q(".c1-cloud-fill"), { opacity: 0, duration: 1 }, 26.6);
          tl.from(
            q(".c1-cloud"),
            {
              scale: 0.7,
              svgOrigin: `${CLOUD.cx} ${CLOUD.cy}`,
              duration: 1.6,
              ease: "back.out(1.8)",
            },
            25.4,
          );
          tl.fromTo(
            q(".c1-thought-w"),
            { fillOpacity: 0 },
            { fillOpacity: 1, duration: 0.5, stagger: 0.55, ease: "none" },
            27.4,
          );

          // ── 34–48: pick-up ───────────────────────────────────────────────
          tl.to(
            q(".c1-cloud"),
            { scale: 1.2, svgOrigin: `${CLOUD.cx} ${CLOUD.cy}`, duration: 0.6, ease: "power2.in" },
            33.6,
          );
          tl.to(q(".c1-bubble"), { opacity: 0, duration: 0.6 }, 33.8);
          tl.to(R, { cam: 3, duration: 6, ease: "power2.inOut" }, 34);
          tl.to(
            q(".c1-giver-lean"),
            {
              rotation: -4,
              svgOrigin: `${GIVER_X} ${FLOOR_Y}`,
              duration: 1.4,
              ease: "power2.inOut",
            },
            34.6,
          );
          tl.to(R, { hold: 1, duration: 2.6, ease: "power2.inOut" }, 36);
          tl.set(q(".c1-dust"), { opacity: 1 }, 36);
          DUST.forEach((d, i) => {
            tl.fromTo(
              q(".c1-dust circle")[i],
              { attr: { cx: 1160, cy: 604, r: 0 }, opacity: 0.8 },
              {
                attr: { cx: 1160 + d.dx, cy: 604 + d.dy, r: d.r * 2.4 },
                opacity: 0,
                duration: 1.6,
                ease: "power2.out",
                immediateRender: false,
              },
              36.1 + (i % 4) * 0.08,
            );
          });
          // The swap to the holding pose happens inside the flash.
          tl.to(
            q(".c1-flash"),
            { keyframes: { opacity: [0, 0.9, 0] }, duration: 1, ease: "none" },
            37.9,
          );
          tl.to(
            q(".c1-giver-lean"),
            { rotation: 0, svgOrigin: `${GIVER_X} ${FLOOR_Y}`, duration: 0.6 },
            37.6,
          );
          tl.to(q(".c1-giver-stand"), { opacity: 0, duration: 0.4 }, 38.3);
          tl.to(q(".c1-giver-hold, .c1-hands"), { opacity: 1, duration: 0.4 }, 38.3);

          // The world dims around the bag.
          tl.to(q(".c1-spot-rect"), { opacity: 0.85, duration: 6, ease: "power1.inOut" }, 40);
          tl.to(q(".r-beam, .r-mote"), { opacity: 0, duration: 3 }, 40);
          tl.to(q(".c1-vignette"), { opacity: 1, duration: 6 }, 40);
          tl.to(q(".c1-hud-scene-a"), { opacity: 0, duration: 0.6 }, 47);
          tl.to(q(".c1-hud-scene-b"), { opacity: 1, duration: 0.6 }, 47.6);

          // ── 48–64: it comes to camera ───────────────────────────────────
          tl.to(q(".c1-giver-hold, .c1-hands"), { opacity: 0, duration: 1.4 }, 47.6);
          tl.to(R, { float: 1, duration: 8, ease: "power3.inOut" }, 47.8);
          tl.to(R, { cam: 4, duration: 12, ease: "power1.in" }, 48);
          tl.to(R, { idle: 1, shadow: 0.55, duration: 4 }, 52);
          tl.to(q(".c1-aura"), { opacity: 1, duration: 5 }, 49);
          tl.to(q(".c1-rays"), { rotation: 40, svgOrigin: "0 0", duration: 50, ease: "none" }, 49);
          tl.to(q(".c1-black"), { opacity: 1, duration: 12, ease: "power1.in" }, 50);
          // Fully covered from here on: skip its hundreds of shapes every frame.
          if (roomSvg) tl.set(roomSvg, { autoAlpha: 0 }, 62.2);
          tl.to(q(".c1-bag-halo"), { opacity: 0.9, duration: 3 }, 52);
          tl.set(q(".c1-scan"), { drawSVG: "0% 0%", opacity: 1 }, 52);
          tl.to(q(".c1-scan"), { drawSVG: "0% 100%", duration: 4, ease: "power2.inOut" }, 52.2);
          tl.to(q(".c1-seam-head"), { opacity: 1, duration: 0.2 }, 54);
          tl.to(
            q(".c1-seam-reveal"),
            { drawSVG: "100%", duration: 5, stagger: 0.4, ease: "power1.inOut" },
            54,
          );
          tl.fromTo(
            q(".c1-seam-head"),
            { drawSVG: "0% 5%" },
            { drawSVG: "95% 100%", duration: 5, stagger: 0.4, ease: "power1.inOut" },
            54,
          );
          tl.to(q(".c1-seam-head"), { opacity: 0, duration: 0.6 }, 60.6);
          tl.to(q(".c1-seams"), { opacity: 0.35, duration: 3 }, 61);
          tl.to(q(".c1-sheen"), { x: 620, duration: 3.4, ease: "power2.inOut" }, 57);

          // "YOU DON'T NEED IT." — each word rises out of its own mask.
          tl.to(
            q(".c1-w1"),
            { yPercent: 0, rotate: 0, duration: 1.8, stagger: 0.9, ease: "expo.out" },
            56,
          );
          tl.fromTo(
            q(".c1-l1"),
            { letterSpacing: "0.2em" },
            { letterSpacing: "0.01em", duration: 6, ease: "power3.out" },
            56,
          );

          // ── 64–84: "BUT SOMEONE MIGHT." takes over ───────────────────────
          tl.to(
            q(".c1-l1"),
            {
              scale: 1.18,
              opacity: 0.55,
              color: "rgba(243,230,207,0)",
              "--ghost": "rgba(251,241,221,0.5)",
              duration: 4,
              ease: "power2.inOut",
            },
            65,
          );
          tl.to(R, { fyN: 1, fs: 0.7, duration: 4, ease: "power2.inOut" }, 65);
          q(".c1-w2").forEach((w, i) => {
            const at = 67 + i * 2.2;
            tl.to(
              w,
              { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.3, ease: "expo.out" },
              at,
            );
            tl.fromTo(
              q(".c1-impact")[i],
              { scale: 0.2, opacity: 0.9 },
              { scale: 2.6, opacity: 0, duration: 1.6, ease: "power2.out", immediateRender: false },
              at + 0.3,
            );
          });
          tl.to(
            q(".c1-shake"),
            { x: 7, duration: 0.8, ease: "wiggle({wiggles:7, type:easeOut})" },
            71.6,
          );
          tl.to(q(".c1-sheen"), { x: -260, duration: 0.01 }, 75);
          tl.to(q(".c1-sheen"), { x: 620, duration: 3.4, ease: "power2.inOut" }, 77);

          // ── 84–100: launch ───────────────────────────────────────────────
          tl.to(R, { pull: 1, idle: 0.3, duration: 2, ease: "power2.inOut" }, 84);
          tl.to(R, { pull: 0, duration: 0.3, ease: "power4.in" }, 86);
          tl.set(q(".c1-trail"), { opacity: 1 }, 86);
          tl.to(R, { exit: 1, duration: 9, ease: "power2.inOut" }, 86.1);
          tl.to(R, { keyframes: { blur: [0, 1, 1, 0.6, 0] }, duration: 9, ease: "none" }, 86.1);
          tl.to(R, { shadow: 0, idle: 0, duration: 1 }, 86.1);
          tl.fromTo(
            q(".c1-shock"),
            { attr: { r: 10 }, opacity: 1, strokeWidth: 16 },
            {
              attr: { r: 520 },
              opacity: 0,
              strokeWidth: 1,
              duration: 3,
              ease: "power2.out",
              immediateRender: false,
            },
            86.2,
          );
          tl.to(
            q(".c1-shake"),
            { x: 16, y: 6, duration: 2.4, ease: "wiggle({wiggles:10, type:easeOut})" },
            86.2,
          );
          tl.set(q(".c1-speed"), { opacity: 1 }, 86.2);
          tl.fromTo(
            q(".c1-speed line"),
            { drawSVG: "100% 100%" },
            { drawSVG: "0% 100%", duration: 1, stagger: 0.12, ease: "power3.out" },
            86.3,
          );
          tl.to(
            q(".c1-speed line"),
            { drawSVG: "0% 0%", duration: 1.2, stagger: 0.12, ease: "power3.in" },
            87.6,
          );
          tl.to(q(".c1-speed"), { opacity: 0, duration: 0.3 }, 89.6);
          tl.to(
            q(".c1-l2 .c1-w2"),
            {
              x: "40vw",
              skewX: -30,
              opacity: 0,
              filter: "blur(16px)",
              duration: 3,
              stagger: 0.25,
              ease: "power3.in",
            },
            86.8,
          );
          tl.to(
            q(".c1-l1"),
            { x: "30vw", opacity: 0, filter: "blur(10px)", duration: 3, ease: "power3.in" },
            86.6,
          );
          tl.to(q(".c1-aura"), { opacity: 0, duration: 2 }, 87);
          tl.to(q(".c1-trail-pulse"), { opacity: 1, duration: 1 }, 95);
          tl.to(q(".c1-hud-cut"), { opacity: 1, duration: 0.5 }, 96);
          tl.set({}, {}, 100);

          // A light that keeps running down the finished line.
          pulse = gsap.fromTo(
            q(".c1-trail-pulse"),
            { drawSVG: "0% 4%" },
            {
              drawSVG: "96% 100%",
              duration: 2.2,
              ease: "power1.in",
              repeat: -1,
              repeatDelay: 0.4,
              paused: true,
            },
          );

          // Continuous life while the stage is on screen: idle float, sparks,
          // the fan, steam and motes. The scrubbed timeline owns everything
          // else; this only reads its numbers.
          const loops = [
            gsap.to(q(".r-fan-spin"), {
              rotation: 360,
              svgOrigin: "0 0",
              duration: 1.1,
              repeat: -1,
              ease: "none",
              paused: true,
            }),
            gsap.to(q(".r-steam-a, .r-steam-b"), {
              y: -18,
              opacity: 0,
              duration: 2.2,
              repeat: -1,
              stagger: 0.8,
              ease: "sine.in",
              paused: true,
            }),
            gsap.to(q(".r-mote"), {
              y: "random(-40, -10)",
              x: "random(-14, 14)",
              duration: "random(3, 5)",
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
              paused: true,
            }),
            gsap.to(q(".r-birds"), {
              x: 40,
              y: -8,
              duration: 7,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
              paused: true,
            }),
            gsap.to(q(".c1-rays-spin"), {
              rotation: 360,
              svgOrigin: "0 0",
              duration: 60,
              repeat: -1,
              ease: "none",
              paused: true,
            }),
            pulse,
          ];
          /*
           * Each loop only plays inside the stretch of the film where it can be
           * seen. The room's loops (fan, steam, motes, birds) used to spin all
           * the way through — every one of them repaints the whole room SVG.
           */
          const windows: [number, number][] = [
            [0, 0.5],
            [0, 0.5],
            [0, 0.5],
            [0, 0.5],
            [0.47, 0.9],
            [0.93, 1],
          ];
          let isActive = false;
          const playing = loops.map(() => false);
          const syncLoops = () => {
            const p = tl.progress();
            loops.forEach((l, i) => {
              const win = windows[i];
              const on = isActive && win && p >= win[0] && p <= win[1];
              if (on === playing[i]) return;
              playing[i] = on;
              if (on) l.play();
              else l.pause();
            });
          };
          const tick = (time: number) => {
            clock = time;
            syncLoops();
            // The scrubbed timeline already applies on every change; the ticker
            // only has to when something moves on its own (idle float, sparks).
            if (R.idle > 0.001 || (R.exit > 0 && R.exit < 1)) apply();
            if (tc) {
              const f = Math.round(tl.progress() * 24 * 24);
              const s = Math.floor(f / 24);
              const txt = `00:00:${String(s).padStart(2, "0")}:${String(f % 24).padStart(2, "0")}`;
              if (tc.textContent !== txt) tc.textContent = txt;
            }
          };
          const active = ScrollTrigger.create({
            trigger: root,
            start: "top bottom",
            end: () =>
              `+=${(tl.scrollTrigger?.end ?? 0) - (tl.scrollTrigger?.start ?? 0) + window.innerHeight * 2}`,
            onToggle: (self) => {
              isActive = self.isActive;
              syncLoops();
              if (self.isActive) gsap.ticker.add(tick);
              else gsap.ticker.remove(tick);
            },
          });

          ScrollTrigger.addEventListener("refreshInit", measure);
          return () => {
            ScrollTrigger.removeEventListener("refreshInit", measure);
            gsap.ticker.remove(tick);
            active.kill();
            loops.forEach((l) => l.kill());
          };
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  const bagImage = <image href={BAG.src} width={BAG.w} height={BAG.h} preserveAspectRatio="none" />;

  return (
    <section
      ref={rootRef}
      aria-labelledby="ck-ch1-title"
      className={`${styles.stage} ${styles.ch1} ck-cine-ch1`}
    >
      <div className="c1-shake absolute inset-0">
        {/* ── Room ───────────────────────────────────────────────────────── */}
        <svg
          className={`c1-room-svg ${styles.svg}`}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <RoomDefs />
          <g className="c1-cam" transform={`translate(0 0)`}>
            <RoomScene />

            {/* Her. Enters from the doorway, then — at the flash — the pose
                with the bag in her hands takes over. */}
            <g className="c1-giver-wrap">
              <ellipse
                cx={GIVER_X}
                cy={FLOOR_Y + 2}
                rx="74"
                ry="11"
                fill="#3a1d0e"
                opacity="0.22"
              />
              <g className="c1-giver-bob">
                <g className="c1-giver-lean">
                  <g className="c1-giver-stand" transform={place(GIVER_T)}>
                    <image href={GIVER.src} width={GIVER.w} height={GIVER.h} />
                  </g>
                  <g className="c1-giver-hold" transform={place(HOLD_T)} opacity="0">
                    <image
                      href={GIVER_HOLDING.src}
                      width={GIVER_HOLDING.w}
                      height={GIVER_HOLDING.h}
                    />
                  </g>
                </g>
              </g>
            </g>

            {/* She notices. */}
            <g
              className="c1-notice"
              fill="none"
              stroke={P.glow}
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0"
            >
              <path d="M 1296 356 L 1276 336" />
              <path d="M 1290 378 L 1264 376" />
              <path d="M 1298 398 L 1276 410" />
            </g>

            {/* The thought. */}
            <g className="c1-bubble" opacity="0">
              <circle
                className="c1-bdot"
                cx="1318"
                cy="376"
                r="4.5"
                fill={P.cream}
                stroke={P.inkSoft}
                strokeWidth="2"
              />
              <circle
                className="c1-bdot"
                cx="1302"
                cy="364"
                r="7"
                fill={P.cream}
                stroke={P.inkSoft}
                strokeWidth="2"
              />
              <circle
                className="c1-bdot"
                cx="1282"
                cy="350"
                r="10"
                fill={P.cream}
                stroke={P.inkSoft}
                strokeWidth="2"
              />
              <g className="c1-cloud">
                <g className="c1-cloud-line" fill="none" stroke={P.inkSoft} strokeWidth="4">
                  {PUFFS.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={p.r} />
                  ))}
                </g>
                <g className="c1-cloud-fill" fill={P.cream}>
                  {PUFFS.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={p.r - 2} />
                  ))}
                  <ellipse cx={CLOUD.cx} cy={CLOUD.cy} rx={CLOUD.rx} ry={CLOUD.ry + 8} />
                </g>
                <text
                  x={CLOUD.cx}
                  y={CLOUD.cy + 9}
                  textAnchor="middle"
                  fontSize="26"
                  fontStyle="italic"
                  fontWeight="600"
                  fill={P.ink}
                  style={{ fontFamily: "var(--font-source-serif-4), Georgia, serif" }}
                >
                  {THOUGHT.map((w, i) => (
                    <tspan key={i} className="c1-thought-w">
                      {i ? ` ${w}` : w}
                    </tspan>
                  ))}
                </text>
              </g>
            </g>

            <g className="c1-dust" fill="#e9d3ad" opacity="0">
              {DUST.map((_, i) => (
                <circle key={i} cx="1160" cy="604" r="0" />
              ))}
            </g>
          </g>
        </svg>
        {/* Screen-space effects live in their own layer: the spotlight and the
            aura follow the floating bag every frame, and in the room's SVG
            that meant repainting the entire room every frame too. */}
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="c1-spot" gradientUnits="userSpaceOnUse" cx="800" cy="450" r="300">
              <stop offset="0" stopColor={P.night} stopOpacity="0" />
              <stop offset="0.35" stopColor={P.night} stopOpacity="0.25" />
              <stop offset="1" stopColor={P.night} stopOpacity="0.96" />
            </radialGradient>
            <radialGradient id="c1-aura-g" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={P.glowHot} stopOpacity="0.55" />
              <stop offset="0.35" stopColor={P.glow} stopOpacity="0.22" />
              <stop offset="1" stopColor={P.glow} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="c1-shadow-g" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#000" stopOpacity="0.85" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="c1-ray-g" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={P.glowHot} stopOpacity="0.16" />
              <stop offset="1" stopColor={P.glowHot} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Screen space: darkness closing in around the bag. */}
          <rect
            className="c1-spot-rect"
            x="-3000"
            y="-3000"
            width="7600"
            height="6900"
            fill="url(#c1-spot)"
            opacity="0"
          />
          <rect
            className="c1-black"
            x="-3000"
            y="-3000"
            width="7600"
            height="6900"
            fill={P.night}
            opacity="0"
          />
          <g className="c1-aura" opacity="0">
            <g className="c1-rays">
              <g className="c1-rays-spin">
                {Array.from({ length: 12 }, (_, i) => (
                  <path
                    key={i}
                    d={`M 0 -8 L ${i % 2 ? 620 : 780} -${i % 2 ? 26 : 40} L ${i % 2 ? 620 : 780} ${i % 2 ? 26 : 40} L 0 8 Z`}
                    fill="url(#c1-ray-g)"
                    transform={`rotate(${(i * 360) / 12 + (i % 3) * 5})`}
                  />
                ))}
              </g>
            </g>
            <circle r="520" fill="url(#c1-aura-g)" />
          </g>
          <ellipse
            className="c1-bag-shadow"
            cx="800"
            cy="700"
            rx="0"
            ry="0"
            fill="url(#c1-shadow-g)"
            opacity="0"
          />
          <rect
            className="c1-flash"
            x="-3000"
            y="-3000"
            width="7600"
            height="6900"
            fill="#fff4dc"
            opacity="0"
          />
        </svg>

        {/* ── Title card ────────────────────────────────────────────────── */}
        <div
          className="c1-title absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{ paddingTop: "var(--hdr, 0px)" }}
        >
          <p
            className={`c1-t-eyebrow ${styles.mono} mb-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-[#b04a15] dark:text-[#ff9a5c]`}
          >
            <span className="h-px w-8 bg-current" />
            Chapter one · The unused thing
            <span className="h-px w-8 bg-current" />
          </p>
          <h2
            id="ck-ch1-title"
            className={`${styles.display} text-[clamp(2.6rem,9vw,8.5rem)] text-stone-900 dark:text-stone-100`}
          >
            <span className={`c1-t-m ${styles.mask}`}>
              <span className={`c1-t-w ${styles.word}`}>One small thing</span>
            </span>
            <br />
            <span className={`c1-t-m ${styles.mask}`}>
              <span className={`c1-t-w ${styles.word} text-[#b04a15] dark:text-[#ff8a4c]`}>
                can become a big thing.
              </span>
            </span>
          </h2>
        </div>

        {/* Subtitle during the build. */}
        <p
          className={`c1-sub ${styles.serif} absolute inset-x-0 bottom-[17vh] mx-auto md:bottom-[7vh] w-fit max-w-[88vw] rounded-full bg-[#1c130d]/80 px-5 py-2 text-center text-[clamp(0.95rem,1.6vw,1.2rem)] italic text-[#fbf1dd]`}
          style={{ opacity: 0 }}
        >
          Every home has one thing it quietly outgrew.
        </p>

        {/* ── The words, behind the bag ─────────────────────────────────── */}
        <div
          className="c1-copy pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
          style={{ paddingTop: "var(--hdr, 0px)" }}
        >
          <div
            className="c1-copy-bg absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#0f0a07] via-[#0f0a07]/70 to-transparent"
            style={{ opacity: 0 }}
          />
          <p
            className={`c1-l1 ${styles.display} absolute left-0 right-0 -translate-y-1/2 text-[clamp(3rem,11.5vw,12.5rem)]`}
            style={{
              WebkitTextStroke: "1.5px var(--ghost, transparent)",
              top: "calc(50% + var(--hdr, 0px) / 2)",
            }}
          >
            {LINE_1.map((w, i) => (
              <span key={i} className={styles.mask}>
                <span className={`c1-w1 ${styles.word}`}>{w}</span>
                {i < LINE_1.length - 1 ? " " : null}
              </span>
            ))}
          </p>
          <p
            className={`c1-l2 ${styles.display} ${styles.glowText} absolute left-0 right-0 translate-y-[-10%] text-[clamp(3.4rem,12.5vw,13.5rem)]`}
            style={{ top: "calc(50% + var(--hdr, 0px) / 2)" }}
          >
            {LINE_2.map((w, i) => (
              <span key={i} className="relative inline-block">
                <span className={`c1-w2 ${styles.word}`}>{w}</span>
                <span
                  className="c1-impact pointer-events-none absolute left-1/2 top-1/2 -ml-[0.5em] -mt-[0.5em] h-[1em] w-[1em] rounded-full border-2 border-[#ff7a2f]"
                  style={{ opacity: 0 }}
                />
                {i < LINE_2.length - 1 ? " " : null}
              </span>
            ))}
          </p>
        </div>

        {/* ── The bag, in front of everything ───────────────────────────── */}
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <clipPath id="c1-bag-clip">
              <path d={BAG.silhouette} />
            </clipPath>
            <clipPath id="c1-hands-clip">
              {GIVER_HOLDING.hands.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </clipPath>
            <mask
              id="c1-seam-mask"
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={BAG.w}
              height={BAG.h}
            >
              {BAG.seams.map((d, i) => (
                <path
                  key={i}
                  className="c1-seam-reveal"
                  d={d}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              ))}
            </mask>
            <linearGradient id="c1-sheen-g" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <filter id="c1-mblur" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur id="c1-mblur-fe" stdDeviation="0 0" />
            </filter>
          </defs>

          {/* The line the bag drags out of the chapter. */}
          <g
            className="c1-trail"
            opacity="0"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Glow as layered wide strokes: a blur filter here re-ran every frame. */}
            <path className="c1-trail-path" stroke={P.glow} strokeWidth="30" opacity="0.1" />
            <path className="c1-trail-path" stroke={P.glow} strokeWidth="16" opacity="0.22" />
            <path className="c1-trail-path" stroke={P.glow} strokeWidth="7" />
            <path className="c1-trail-path" stroke={P.glowCore} strokeWidth="2.4" />
            <path
              className="c1-trail-path c1-trail-pulse"
              stroke="#fff"
              strokeWidth="6"
              opacity="0"
            />
          </g>
          <g className="c1-sparks" fill={P.glowCore}>
            {Array.from({ length: 12 }, (_, i) => (
              <circle key={i} className="c1-spark" r={Math.max(1.4, 6 - i * 0.4)} opacity="0" />
            ))}
          </g>
          <g
            className="c1-speed"
            opacity="0"
            stroke={P.glowHot}
            strokeWidth="3"
            strokeLinecap="round"
          >
            {[-150, -90, -40, 20, 70, 130].map((dy, i) => (
              <line
                key={i}
                x1={300 + (i % 3) * 60}
                y1={420 + dy}
                x2={760 + (i % 2) * 40}
                y2={420 + dy}
              />
            ))}
          </g>

          <g className="c1-bag" transform={place(BAG_REST)} opacity="0">
            <g transform={`translate(${-BAG.body.cx} ${-BAG.body.cy})`}>
              <g
                className="c1-bag-halo"
                fill="none"
                stroke={P.glow}
                strokeLinejoin="round"
                opacity="0"
              >
                <path d={BAG.silhouette} strokeWidth="44" opacity="0.12" />
                <path d={BAG.silhouette} strokeWidth="26" opacity="0.22" />
                <path d={BAG.silhouette} strokeWidth="12" opacity="0.4" />
              </g>
              {bagImage}
              <g clipPath="url(#c1-bag-clip)">
                <rect
                  className="c1-sheen"
                  x="100"
                  y="-40"
                  width="110"
                  height="560"
                  fill="url(#c1-sheen-g)"
                  transform="skewX(-20)"
                />
              </g>
              <g className="c1-seams" mask="url(#c1-seam-mask)">
                {BAG.seams.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={P.glowCore}
                    strokeWidth="3"
                    strokeDasharray="7 6"
                    strokeLinecap="round"
                  />
                ))}
              </g>
              {BAG.seams.map((d, i) => (
                <path
                  key={i}
                  className="c1-seam-head"
                  d={d}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity="0"
                />
              ))}
              <path
                className="c1-scan"
                d={BAG.silhouette}
                fill="none"
                stroke={P.glowHot}
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <g className="c1-glint" transform="translate(372 116)" opacity="0">
                <path d="M 0 -30 L 6 -6 L 30 0 L 6 6 L 0 30 L -6 6 L -30 0 L -6 -6 Z" fill="#fff" />
              </g>
            </g>
          </g>

          {/* Her hands, drawn back over the bag while she holds it. */}
          <g className="c1-cam-top">
            <g className="c1-hands" opacity="0">
              <g transform={place(HOLD_T)}>
                <image
                  href={GIVER_HOLDING.src}
                  width={GIVER_HOLDING.w}
                  height={GIVER_HOLDING.h}
                  clipPath="url(#c1-hands-clip)"
                />
              </g>
            </g>
          </g>

          <circle
            className="c1-shock"
            cx="800"
            cy="450"
            r="10"
            fill="none"
            stroke={P.glowHot}
            strokeWidth="10"
            opacity="0"
          />
        </svg>
      </div>

      {/* ── Film furniture ─────────────────────────────────────────────── */}
      <div className={`c1-vignette ${styles.vignette}`} />
      <div className={styles.grain} aria-hidden="true" />
      <div
        className={`c1-hud ${styles.hud} ${styles.pill} left-4 sm:left-8`}
        style={{ top: "calc(var(--hdr, 0px) + 16px)", opacity: 0 }}
        aria-hidden="true"
      >
        <span className={styles.rec} />
        Scene 01
      </div>
      <div
        className={`c1-hud ${styles.hud} ${styles.pill} bottom-4 left-4 hidden sm:bottom-6 sm:left-8 md:block`}
        style={{ opacity: 0 }}
        aria-hidden="true"
      >
        <span className="c1-hud-scene-a">Int. Apartment — Dusk</span>
        <span className="c1-hud-scene-b absolute left-3">Close on: the bag</span>
      </div>
      <div
        className={`c1-hud ${styles.hud} ${styles.pill} bottom-4 right-4 hidden sm:bottom-6 sm:right-8 md:block`}
        style={{ opacity: 0 }}
        aria-hidden="true"
      >
        <span className="c1-hud-cut mr-4" style={{ opacity: 0 }}>
          Cut to →
        </span>
        TC <span className="c1-timecode">00:00:00:00</span>
      </div>
    </section>
  );
}
