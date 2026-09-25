"use client";

/**
 * Chapter 2 — "It finds its person."
 *
 * Picks up the glowing line Chapter 1 dragged out through its bottom edge — at
 * the same x (`seamX`), on the same night background — and follows it:
 *
 *   entry  While the section scrolls up into place, the line keeps drawing
 *          down from the top edge, a comet head leading it.
 *   0–22   The line traces a phone's outline and becomes its frame. The same
 *          bag drops into the listing photo; fields fill; "List item" is
 *          pressed and turns into "Listed ✓".
 *   23–47  The camera pulls back. The phone shrinks into a glowing pin and a
 *          night map of the neighbourhood draws itself out from it. Radar
 *          pulses, a 10 km ring, needs popping up nearby; a sweep passes and
 *          everything dims except the one that asked for a school bag.
 *   47–56  A route lights up along the streets and the bag rides it.
 *   55–84  The camera dives into the pin and it opens into a window on the
 *          student it was for. The bag lands on her back, straps draw over
 *          her shoulders, she lights up; marigold petals; Verified.
 *   84–100 The window swells to fill the screen: "The item finds its person."
 *
 * <p>Copy is the product's own (list with a photo and condition; a verified
 * person within 10 km who asked for exactly this; handed over in person and
 * confirmed with a one-time code). Pins, the student and the map are
 * illustration — no name, count or distance on screen is presented as data.
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

import styles from "./cinematic/cinematic.module.css";
import { BAG } from "./cinematic/cutouts";
import { P } from "./cinematic/palette";
import { STUDENT_PETALS, Student } from "./cinematic/Student";
import {
  VB_H,
  VB_W,
  cameraTransform,
  clamp,
  lerp,
  measureStage,
  setT,
  type Stage,
} from "./cinematic/rig";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ── The neighbourhood, in world units, around the hub at (800, 470) ──────────

const HUB = { x: 800, y: 470 };
const MATCH = { x: 1140, y: 800 };
const RING_R = 540;
const XS = [-500, -170, 170, 480, 800, 1140, 1460, 1780, 2100];
const YS = [-560, -220, 130, 470, 800, 1130, 1460];

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Streets grow outward from the hub's two avenues. */
const STREETS = [
  ...XS.flatMap((x) => [
    { d: `M ${x} ${HUB.y} V -900`, major: x === HUB.x, dist: Math.abs(x - HUB.x) },
    { d: `M ${x} ${HUB.y} V 1800`, major: x === HUB.x, dist: Math.abs(x - HUB.x) },
  ]),
  ...YS.flatMap((y) => [
    { d: `M ${HUB.x} ${y} H -800`, major: y === HUB.y, dist: Math.abs(y - HUB.y) },
    { d: `M ${HUB.x} ${y} H 2400`, major: y === HUB.y, dist: Math.abs(y - HUB.y) },
  ]),
].sort((a, b) => a.dist - b.dist);

const BLOCKS = (() => {
  const rnd = seeded(11);
  const out: { x: number; y: number; w: number; h: number; park: boolean }[] = [];
  for (let i = 0; i < XS.length - 1; i++) {
    for (let j = 0; j < YS.length - 1; j++) {
      const x0 = XS[i] + 18;
      const x1 = XS[i + 1] - 18;
      const y0 = YS[j] + 18;
      const y1 = YS[j + 1] - 18;
      if (rnd() < 0.12) {
        out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, park: true });
        continue;
      }
      const n = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) {
        const w = 40 + rnd() * ((x1 - x0) / 3);
        const h = 34 + rnd() * ((y1 - y0) / 3.2);
        const x = x0 + rnd() * Math.max(1, x1 - x0 - w);
        const y = y0 + rnd() * Math.max(1, y1 - y0 - h);
        out.push({
          x: Math.round(x),
          y: Math.round(y),
          w: Math.round(w),
          h: Math.round(h),
          park: false,
        });
      }
    }
  }
  return out;
})();

const PINS = [
  { x: 560, y: 250, label: "Notebooks" },
  { x: 1060, y: 262, label: "Winter jacket" },
  { x: 470, y: 640, label: "Cricket bat" },
  { x: 880, y: 108, label: "Water bottle" },
  { x: 650, y: 880, label: "Raincoat" },
  { x: 1262, y: 470, label: "Geometry box" },
  { x: 330, y: 360, label: "Shoes" },
];
const FAR_PINS = [
  { x: -150, y: 300 },
  { x: 1850, y: 640 },
  { x: 300, y: 1250 },
  { x: 1500, y: -260 },
  { x: 1700, y: 1180 },
];

const ROUTE = `M ${HUB.x} ${HUB.y} V ${MATCH.y - 34} Q ${HUB.x} ${MATCH.y} ${HUB.x + 34} ${MATCH.y} H ${MATCH.x}`;

const r1 = (n: number) => Math.round(n * 10) / 10;
const labelW = (s: string) => 34 + s.length * 13;

export function Chapter2TheEcosystem() {
  const rootRef = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const one = <T extends Element>(sel: string) => root.querySelector(sel) as T | null;

      const cam = one<SVGGElement>(".c2-cam");
      const lines = Array.from(root.querySelectorAll<SVGPathElement>(".c2-line-path"));
      const lineRef = lines[0];
      const entryMeasure = one<SVGPathElement>(".c2-entry-measure");
      const head = one<SVGGElement>(".c2-head");
      const route = one<SVGPathElement>(".c2-route-ref");
      const token = one<SVGGElement>(".c2-token");
      const tokenSparks = Array.from(root.querySelectorAll<SVGCircleElement>(".c2-tspark"));
      const portalClip = one<SVGCircleElement>(".c2-portal-clip-c");
      const portalRing = one<SVGCircleElement>(".c2-portal-ring");
      const portalContent = one<SVGGElement>(".c2-portal-content");
      const badge = one<SVGGElement>(".c2-verified");
      const tc = one<HTMLElement>(".c2-timecode");

      let st: Stage = measureStage(root);
      let lineLen = 0;
      let f0 = 0;
      let f1 = 0;
      let routeLen = 0;

      const R = { entry: 0, trace: 0, cam: 0, ride: 0, portal: 0 };

      const frame = (fw: number) => Math.min(st.visW / fw, (st.visH - st.top) / (fw * 0.62));
      /** Where on screen the subject sits — right of the captions on desktop. */
      const focus = () =>
        st.portrait
          ? { x: st.cx, y: st.y0 + st.top + (st.visH - st.top) * 0.38 }
          : { x: st.cx + st.visW * 0.14, y: st.cy };
      const aim = (w: { x: number; y: number }, s: number) => {
        const f = focus();
        return { s, x: w.x - (f.x - st.cx) / s, y: w.y - (f.y - st.cy) / s };
      };
      const camKeys = () => {
        const p = st.portrait;
        return [
          { s: 1, x: HUB.x, y: HUB.y },
          aim(HUB, p ? 0.74 : 1),
          aim({ x: HUB.x + 60, y: HUB.y + 90 }, p ? st.visW / 980 : frame(2000)),
          aim(MATCH, p ? 2.2 : frame(560)),
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
      const portalR = () => (st.portrait ? st.visW * 0.42 : (st.visH - st.top) * 0.34);

      const measure = () => {
        st = measureStage(root);
        root.style.setProperty("--hdr", `${st.headerPx}px`);
        const seam = st.seamX;
        const entryD = `M ${r1(seam)} -1400 V 150 Q ${r1(seam)} 240 ${r1(Math.min(seam - 90, 900))} 240`;
        const d =
          `${entryD} H 719 A 34 34 0 0 0 685 274 V 666 A 34 34 0 0 0 719 700 H 881 ` +
          `A 34 34 0 0 0 915 666 V 274 A 34 34 0 0 0 881 240 H 826`;
        lines.forEach((l) => l.setAttribute("d", d));
        entryMeasure?.setAttribute("d", entryD);
        lineLen = lineRef?.getTotalLength?.() ?? 0;
        const entryLen = entryMeasure?.getTotalLength?.() ?? 0;
        // The visible top edge, in world y, while the camera is at rest.
        const topWorld = st.y0 - st.cy + HUB.y;
        f0 = lineLen ? clamp((topWorld + 1400) / lineLen, 0, 1) : 0;
        f1 = lineLen ? entryLen / lineLen : 0;
        lines.forEach((l) => (l.style.strokeDasharray = `${lineLen} ${lineLen + 10}`));
        routeLen = route?.getTotalLength?.() ?? 0;
      };

      let clock = 0;
      const apply = () => {
        const C = camNow();
        setT(cam, cameraTransform(st, C.s, C.x, C.y));

        // The line from Chapter 1: entry, then around the phone.
        const f = R.entry < 1 ? lerp(f0, f1, R.entry) : lerp(f1, 1, R.trace);
        const at = lineLen * f;
        lines.forEach((l) => (l.style.strokeDashoffset = `${r1(lineLen - at)}`));
        if (head && lineRef && lineLen) {
          const p = lineRef.getPointAtLength(at);
          setT(head, `translate(${r1(p.x)} ${r1(p.y)})`);
          head.setAttribute("opacity", R.trace >= 0.999 ? "0" : "1");
        }

        // The bag riding the route.
        if (token && route && routeLen) {
          const L = routeLen * R.ride;
          const p = route.getPointAtLength(L);
          setT(
            token,
            `translate(${r1(p.x)} ${r1(p.y - 30)}) rotate(${r1(Math.sin(clock * 6) * 4 * (R.ride > 0 && R.ride < 1 ? 1 : 0))}) scale(0.26)`,
          );
          tokenSparks.forEach((s, i) => {
            const back = L - (i + 1) * 14;
            if (R.ride <= 0 || R.ride >= 1 || back < 0) {
              s.setAttribute("opacity", "0");
              return;
            }
            const sp = route.getPointAtLength(back);
            const j = Math.sin(clock * 11 + i) * (3 + i * 0.6);
            s.setAttribute("cx", `${r1(sp.x + j)}`);
            s.setAttribute("cy", `${r1(sp.y + j * 0.7)}`);
            s.setAttribute("opacity", `${r1(1 - i / tokenSparks.length)}`);
          });
        }

        // The window onto the student, in screen space.
        const F = focus();
        const Rt = portalR();
        const cover = Math.hypot(st.visW, st.visH) * 0.75;
        const r = R.portal <= 1 ? Rt * R.portal : lerp(Rt, cover, R.portal - 1);
        const grow = R.portal > 1 ? 1 + (R.portal - 1) * 0.3 : 1;
        const cx = R.portal > 1 ? lerp(F.x, st.cx, R.portal - 1) : F.x;
        const cy = R.portal > 1 ? lerp(F.y, st.cy, R.portal - 1) : F.y;
        portalClip?.setAttribute("cx", `${r1(cx)}`);
        portalClip?.setAttribute("cy", `${r1(cy)}`);
        portalClip?.setAttribute("r", `${r1(Math.max(0, r))}`);
        portalRing?.setAttribute("cx", `${r1(cx)}`);
        portalRing?.setAttribute("cy", `${r1(cy)}`);
        portalRing?.setAttribute("r", `${r1(Math.max(0, r))}`);
        setT(
          portalContent,
          `translate(${r1(cx)} ${r1(cy)}) scale(${((Rt / 200) * grow).toFixed(4)})`,
        );
        const bx = st.portrait ? F.x - Rt * 0.78 : F.x + Rt * 0.72;
        setT(
          badge,
          `translate(${r1(bx)} ${r1(F.y - Rt * 0.8)}) scale(${(Rt / (st.portrait ? 170 : 220)).toFixed(4)})`,
        );
      };

      const hideAll = () => {
        gsap.set(
          q(
            ".c2-phone, .c2-hub, .c2-map, .c2-ring-g, .c2-pulse, .c2-sweep, .c2-pin, .c2-far, .c2-route, .c2-token, .c2-portal-ring, .c2-verified, .c2-flood",
          ),
          { opacity: 0 },
        );
        gsap.set(q(".c2-ui"), { opacity: 0, y: 14 });
        gsap.set(q(".c2-listing-bag"), { opacity: 0, y: -120 });
        gsap.set(q(".c2-snap, .c2-btn-done, .c2-btn-burst"), { opacity: 0 });
        gsap.set(q(".c2-check"), { drawSVG: "0%" });
        gsap.set(q(".c2-street"), { drawSVG: "0%" });
        gsap.set(q(".c2-route path"), { drawSVG: "0%" });
        gsap.set(q(".c2-ring"), { drawSVG: "0%" });
        gsap.set(q(".c2-pin-inner"), { scale: 0, svgOrigin: "0 0" });
        gsap.set(q(".c2-v-shield, .c2-v-check"), { drawSVG: "0%" });
        gsap.set(q(".c2-cap"), { opacity: 0 });
        gsap.set(q(".c2-cap .c2-cap-w"), { yPercent: 110 });
        gsap.set(q(".c2-final-w"), { yPercent: 110 });
        gsap.set(q(".c2-final-line"), { scaleY: 0 });
        gsap.set(q(".st-worn-bag"), { opacity: 0, y: -300, scale: 1.3, svgOrigin: "28 150" });
        gsap.set(q(".st-strap"), { drawSVG: "0%" });
        gsap.set(q(".st-happy"), { opacity: 0 });
        gsap.set(q(".st-petal"), { opacity: 0 });
        gsap.set(q(".st-spark"), { opacity: 0 });
        gsap.set(q(".c2-hud-b, .c2-hud-c"), { opacity: 0 });
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

          if (reduce) {
            Object.assign(R, { entry: 1, trace: 1, cam: 2, ride: 1, portal: 1 });
            gsap.set(
              q(
                ".c2-phone, .c2-token, .c2-head, .c2-line, .c2-sweep, .c2-pulse, .st-wonder, .c2-cap-1, .c2-cap-3, .c2-final",
              ),
              { opacity: 0 },
            );
            gsap.set(q(".c2-far"), { opacity: 0.35 });
            gsap.set(q(".st-worn-bag, .st-happy, .c2-cap-2"), { opacity: 1 });
            apply();
            return;
          }

          hideAll();
          const portrait = st.portrait;

          // The line keeps drawing while the section scrolls up to meet it.
          const entry = gsap.to(R, {
            entry: 1,
            ease: "none",
            onUpdate: apply,
            scrollTrigger: { trigger: root, start: "top bottom", end: "top top", scrub: true },
          });

          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            onUpdate: apply,
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: portrait ? "+=520%" : "+=640%",
              pin: true,
              scrub: 0.9,
              anticipatePin: 1,
            },
          });
          apply();

          // ── 0–22: the line becomes a phone; the bag is listed ────────────
          tl.to(R, { trace: 1, duration: 8, ease: "power2.inOut" }, 0.2);
          tl.to(R, { cam: 1, duration: 9 }, 1);
          tl.to(q(".c2-phone"), { opacity: 1, duration: 3 }, 5);
          tl.fromTo(
            q(".c2-screen-glow"),
            { opacity: 0 },
            { opacity: 0.7, duration: 2, immediateRender: false },
            8,
          );
          tl.to(q(".c2-cap-1"), { opacity: 1, duration: 0.4 }, 8);
          tl.to(
            q(".c2-cap-1 .c2-cap-w"),
            { yPercent: 0, duration: 1.4, stagger: 0.25, ease: "expo.out" },
            8,
          );
          tl.to(
            q(".c2-ui-a"),
            { opacity: 1, y: 0, duration: 1.2, stagger: 0.25, ease: "power3.out" },
            9.6,
          );
          tl.to(
            q(".c2-snap"),
            { keyframes: { opacity: [0, 1, 0] }, duration: 0.8, ease: "none" },
            12,
          );
          tl.to(q(".c2-listing-bag"), { opacity: 1, duration: 0.3 }, 12.3);
          tl.to(q(".c2-listing-bag"), { y: 0, duration: 1.6, ease: "bounce.out" }, 12.3);
          tl.to(
            q(".c2-ui-b"),
            { opacity: 1, y: 0, duration: 1.2, stagger: 0.3, ease: "power3.out" },
            14,
          );
          tl.to(
            q(".c2-btn"),
            {
              keyframes: { scale: [1, 0.9, 1.04, 1] },
              svgOrigin: "800 642",
              duration: 1.2,
              ease: "none",
            },
            18.6,
          );
          tl.to(q(".c2-btn-list"), { opacity: 0, duration: 0.3 }, 19.2);
          tl.to(q(".c2-btn-done"), { opacity: 1, duration: 0.3 }, 19.3);
          tl.to(q(".c2-check"), { drawSVG: "100%", duration: 1, ease: "power2.out" }, 19.4);
          tl.fromTo(
            q(".c2-btn-burst"),
            { opacity: 0.9, scale: 0.6, svgOrigin: "800 642" },
            {
              opacity: 0,
              scale: 2.6,
              svgOrigin: "800 642",
              duration: 2,
              ease: "power2.out",
              immediateRender: false,
            },
            19.4,
          );
          tl.to(q(".c2-cap-1"), { opacity: 0, duration: 1.2 }, 21.8);

          // ── 23–47: out to the neighbourhood ─────────────────────────────
          tl.to(q(".c2-hud-a"), { opacity: 0, duration: 0.5 }, 23);
          tl.to(q(".c2-hud-b"), { opacity: 1, duration: 0.5 }, 23.5);
          tl.to(R, { cam: 2, duration: 8, ease: "power3.inOut" }, 23);
          tl.to(
            q(".c2-phone"),
            { scale: 0.14, svgOrigin: `${HUB.x} ${HUB.y}`, duration: 5.5, ease: "power3.in" },
            23,
          );
          tl.to(q(".c2-phone"), { opacity: 0, duration: 1.4 }, 27.4);
          tl.set(q(".c2-phone"), { visibility: "hidden" }, 28.9);
          tl.to(q(".c2-line"), { opacity: 0, duration: 3 }, 24);
          tl.to(q(".c2-hub"), { opacity: 1, duration: 1.2 }, 27.6);
          tl.from(
            q(".c2-hub-core"),
            { scale: 0, svgOrigin: `${HUB.x} ${HUB.y}`, duration: 1.4, ease: "back.out(3)" },
            27.6,
          );
          tl.to(q(".c2-map"), { opacity: 1, duration: 1 }, 24);
          tl.to(
            q(".c2-street"),
            { drawSVG: "100%", duration: 3.4, stagger: { amount: 4 }, ease: "power2.out" },
            24.4,
          );
          tl.from(
            q(".c2-block"),
            { opacity: 0, duration: 1.2, stagger: { amount: 3, from: "random" } },
            26.5,
          );
          tl.from(q(".c2-river"), { opacity: 0, duration: 3 }, 25);

          tl.to(q(".c2-cap-2"), { opacity: 1, duration: 0.4 }, 30);
          tl.to(
            q(".c2-cap-2 .c2-cap-w"),
            { yPercent: 0, duration: 1.4, stagger: 0.25, ease: "expo.out" },
            30,
          );

          q(".c2-pulse").forEach((p, i) => {
            tl.fromTo(
              p,
              { attr: { r: 20 }, opacity: 0.9 },
              {
                attr: { r: RING_R + 30 },
                opacity: 0,
                duration: 4,
                ease: "power1.out",
                immediateRender: false,
              },
              31 + i * 1.6,
            );
          });
          tl.to(q(".c2-ring-g"), { opacity: 1, duration: 0.3 }, 32);
          tl.to(q(".c2-ring"), { drawSVG: "100%", duration: 3, ease: "power2.inOut" }, 32);
          tl.from(
            q(".c2-ring-label"),
            { scale: 0, transformOrigin: "50% 50%", duration: 1, ease: "back.out(2.4)" },
            34.4,
          );

          tl.to(q(".c2-pin"), { opacity: 1, duration: 0.2, stagger: 0.35 }, 35);
          tl.to(
            q(".c2-pin-inner"),
            { scale: 1, svgOrigin: "0 0", duration: 1, stagger: 0.35, ease: "back.out(2.6)" },
            35,
          );
          tl.to(q(".c2-far"), { opacity: 0.35, duration: 1.5, stagger: 0.2 }, 36);
          tl.to(q(".c2-sweep"), { opacity: 1, duration: 0.6 }, 37);
          tl.fromTo(
            q(".c2-sweep-rot"),
            { rotation: -90 },
            { rotation: 270, svgOrigin: `${HUB.x} ${HUB.y}`, duration: 6, ease: "power1.inOut" },
            37,
          );
          tl.to(q(".c2-sweep"), { opacity: 0, duration: 1 }, 42.5);
          tl.to(q(".c2-pin-other"), { opacity: 0.28, duration: 1.5 }, 43.5);
          tl.to(
            q(".c2-pin-match .c2-pin-inner"),
            { scale: 1.5, svgOrigin: "0 0", duration: 1.4, ease: "back.out(3)" },
            44,
          );
          tl.to(
            q(".c2-match-halo"),
            {
              keyframes: { scale: [1, 1.9, 1], opacity: [0.5, 0.1, 0.35] },
              svgOrigin: "0 0",
              duration: 2,
              ease: "none",
            },
            44,
          );

          // ── 47–56: the route, and the bag riding it ─────────────────────
          tl.to(q(".c2-route"), { opacity: 1, duration: 0.2 }, 47);
          tl.to(q(".c2-route path"), { drawSVG: "100%", duration: 5, ease: "power2.inOut" }, 47);
          tl.to(q(".c2-token"), { opacity: 1, duration: 0.6 }, 48);
          tl.fromTo(
            R,
            { ride: 0 },
            { ride: 1, duration: 8, ease: "power2.inOut", immediateRender: false },
            48,
          );
          tl.to(q(".c2-cap-2"), { opacity: 0, duration: 1.2 }, 54);

          // ── 55–84: into the pin; she gets it ────────────────────────────
          tl.to(R, { cam: 3, duration: 7, ease: "power3.inOut" }, 55);
          tl.to(
            q(".c2-map, .c2-far, .c2-pin-other, .c2-ring-g"),
            { opacity: 0.18, duration: 5 },
            56,
          );
          tl.to(q(".c2-pin-match"), { opacity: 0, duration: 1.2 }, 57.6);
          tl.to(q(".c2-hud-b"), { opacity: 0, duration: 0.5 }, 58);
          tl.to(q(".c2-hud-c"), { opacity: 1, duration: 0.5 }, 58.5);
          tl.to(q(".c2-token, .c2-tsparks"), { opacity: 0, duration: 1 }, 58.4);
          tl.fromTo(
            R,
            { portal: 0 },
            { portal: 1, duration: 4.5, ease: "expo.out", immediateRender: false },
            58.6,
          );
          tl.to(q(".c2-portal-ring"), { opacity: 1, duration: 0.6 }, 58.6);

          tl.to(q(".c2-cap-3"), { opacity: 1, duration: 0.4 }, 63);
          tl.to(
            q(".c2-cap-3 .c2-cap-w"),
            { yPercent: 0, duration: 1.4, stagger: 0.25, ease: "expo.out" },
            63,
          );

          tl.to(q(".st-worn-bag"), { opacity: 1, duration: 0.3 }, 63);
          tl.to(
            q(".st-worn-bag"),
            { y: 0, scale: 1, svgOrigin: "28 150", duration: 1.8, ease: "bounce.out" },
            63,
          );
          tl.to(
            q(".st-strap"),
            { drawSVG: "100%", duration: 1.4, stagger: 0.1, ease: "power2.out" },
            64.6,
          );
          tl.to(q(".st-wonder"), { opacity: 0, duration: 0.4 }, 66.2);
          tl.to(q(".st-happy"), { opacity: 1, duration: 0.4 }, 66.2);
          tl.to(
            q(".st-person"),
            { keyframes: { y: [0, -16, 0, -6, 0] }, duration: 1.6, ease: "none" },
            66.2,
          );
          q(".st-petal").forEach((el, i) => {
            const p = STUDENT_PETALS[i];
            tl.fromTo(
              el,
              { opacity: 1, x: 0, y: 0, rotation: 0, svgOrigin: "0 -20" },
              {
                opacity: 0,
                x: p.dx * 1.4,
                y: p.dy * 1.4 + 60,
                rotation: p.r + 200,
                svgOrigin: "0 -20",
                duration: 3,
                ease: "power2.out",
                immediateRender: false,
              },
              66.3 + (i % 5) * 0.08,
            );
          });
          tl.to(
            q(".st-spark"),
            { keyframes: { opacity: [0, 1, 0.7, 1, 0] }, duration: 3, stagger: 0.3, ease: "none" },
            66.6,
          );

          tl.to(q(".c2-verified"), { opacity: 1, duration: 0.3 }, 67);
          tl.to(q(".c2-v-shield"), { drawSVG: "100%", duration: 1.2, ease: "power2.inOut" }, 67);
          tl.to(q(".c2-v-check"), { drawSVG: "100%", duration: 0.8, ease: "power3.out" }, 68);
          tl.from(q(".c2-v-fill"), { opacity: 0, duration: 0.8 }, 68.2);
          tl.from(q(".c2-v-label"), { opacity: 0, x: -12, duration: 0.8 }, 68.6);

          // ── 84–100: it fills the frame ──────────────────────────────────
          tl.to(q(".c2-cap-3, .c2-verified, .c2-cap-bg"), { opacity: 0, duration: 1.4 }, 81);
          tl.to(q(".c2-vignette"), { opacity: 0, duration: 3 }, 85);
          tl.to(R, { portal: 2, duration: 6, ease: "power2.inOut" }, 83);
          tl.to(q(".c2-portal-ring"), { opacity: 0, duration: 3 }, 85);
          tl.to(q(".c2-flood"), { opacity: 1, duration: 3 }, 88);
          // The window covers the whole screen by now: stop painting the map.
          tl.set(q(".c2-cam"), { visibility: "hidden" }, 89.2);
          tl.to(q(".c2-hud"), { opacity: 0, duration: 1.5 }, 87);
          tl.to(
            q(".c2-final-w"),
            { yPercent: 0, duration: 1.6, stagger: 0.2, ease: "expo.out" },
            89.5,
          );
          tl.to(q(".c2-final-line"), { scaleY: 1, duration: 4, ease: "power2.inOut" }, 92);
          tl.set({}, {}, 100);

          const loops = [
            gsap.to(q(".st-rays"), {
              rotation: 360,
              svgOrigin: "0 0",
              duration: 40,
              repeat: -1,
              ease: "none",
              paused: true,
            }),
            gsap.to(q(".c2-hub-ring"), {
              attr: { r: 60 },
              opacity: 0,
              duration: 1.8,
              repeat: -1,
              ease: "power1.out",
              paused: true,
            }),
            gsap.fromTo(
              q(".c2-route-pulse"),
              { drawSVG: "0% 6%" },
              {
                drawSVG: "94% 100%",
                duration: 1.6,
                repeat: -1,
                ease: "power1.inOut",
                paused: true,
              },
            ),
            gsap.to(q(".c2-screen-shine"), {
              x: 260,
              duration: 3.2,
              repeat: -1,
              repeatDelay: 1.4,
              ease: "power2.inOut",
              paused: true,
            }),
          ];
          // Rays, hub ping, route pulse, phone shine — each only while visible.
          // All four live in the map's SVG, so a running loop repaints the map.
          const windows: [number, number][] = [
            [0.58, 0.95],
            [0.27, 0.57],
            [0.51, 0.62],
            [0.08, 0.24],
          ];
          let isActive = false;
          const playing = loops.map(() => false);
          const syncLoops = () => {
            const p = tl.progress();
            loops.forEach((l, i) => {
              const on = isActive && p >= windows[i][0] && p <= windows[i][1];
              if (on === playing[i]) return;
              playing[i] = on;
              if (on) l.play();
              else l.pause();
            });
          };
          const tick = (time: number) => {
            clock = time;
            syncLoops();
            // Scrubbing already applies on change; only the riding bag's
            // sparks move on their own.
            if (R.ride > 0 && R.ride < 1) apply();
            if (tc) {
              const fr = 24 * 24 + Math.round(tl.progress() * 24 * 20);
              const s = Math.floor(fr / 24);
              const txt = `00:00:${String(s).padStart(2, "0")}:${String(fr % 24).padStart(2, "0")}`;
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
            entry.kill();
            loops.forEach((l) => l.kill());
          };
        },
      );
    }, root);

    return () => ctx.revert();
  }, []);

  const caption = (cls: string, eyebrow: string, big: string[], small: string) => (
    <div className={`c2-cap ${cls} absolute left-0 right-0`}>
      <p
        className={`${styles.mono} mb-4 text-[10px] uppercase tracking-[0.3em] text-[#ff9a5c] sm:text-[11px]`}
      >
        {eyebrow}
      </p>
      <p className={`${styles.display} text-[clamp(2.4rem,5.6vw,5.6rem)] text-[#fbf1dd]`}>
        {big.map((w, i) => (
          <span key={i}>
            {i ? <br /> : null}
            <span className={styles.mask}>
              <span
                className={`c2-cap-w ${styles.word} ${i === big.length - 1 ? "text-[#ff8a4c]" : ""}`}
              >
                {w}
              </span>
            </span>
          </span>
        ))}
      </p>
      <p
        className={`${styles.serif} mt-5 max-w-[30ch] text-[clamp(1rem,1.35vw,1.2rem)] leading-relaxed text-[#e9dcc6]/85`}
      >
        {small}
      </p>
    </div>
  );

  return (
    <section
      ref={rootRef}
      aria-labelledby="ck-ch2-title"
      className={`${styles.stage} ${styles.ch2} ck-cine-ch2`}
    >
      <h2 id="ck-ch2-title" className="sr-only">
        CauseKind finds the person who needs it
      </h2>

      <svg
        className={styles.svg}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="c2-head-g" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.3" stopColor={P.glowHot} stopOpacity="0.8" />
            <stop offset="1" stopColor={P.glow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="c2-hub-g" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={P.glowHot} stopOpacity="0.7" />
            <stop offset="1" stopColor={P.glow} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="c2-sweep-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={P.glow} stopOpacity="0" />
            <stop offset="1" stopColor={P.glow} stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="c2-screen-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffaf2" />
            <stop offset="1" stopColor="#f6ead6" />
          </linearGradient>
          <linearGradient id="c2-shine-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="c2-screen-clip">
            <rect x="697" y="252" width="206" height="436" rx="24" />
          </clipPath>
          <clipPath id="c2-portal-clip">
            <circle className="c2-portal-clip-c" cx="800" cy="450" r="0" />
          </clipPath>
        </defs>

        <g className="c2-cam">
          {/* ── The neighbourhood ───────────────────────────────────────── */}
          <g className="c2-map">
            <path
              className="c2-river"
              d="M -900 1010 C 100 860 520 1330 1300 1060 S 2100 900 2500 1190"
              fill="none"
              stroke="#10202b"
              strokeWidth="110"
              strokeLinecap="round"
            />
            <path
              className="c2-river"
              d="M -900 1010 C 100 860 520 1330 1300 1060 S 2100 900 2500 1190"
              fill="none"
              stroke="#16303f"
              strokeWidth="34"
              strokeLinecap="round"
              opacity="0.7"
            />
            {BLOCKS.map((b, i) =>
              b.park ? (
                <g key={i} className="c2-block">
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="18" fill="#132216" />
                  {[0.25, 0.5, 0.75].map((t) => (
                    <circle
                      key={t}
                      cx={b.x + b.w * t}
                      cy={b.y + b.h * (t === 0.5 ? 0.35 : 0.62)}
                      r="14"
                      fill="#1b3320"
                    />
                  ))}
                </g>
              ) : (
                <rect
                  key={i}
                  className="c2-block"
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx="4"
                  fill="#1e150f"
                  stroke="#2c2018"
                  strokeWidth="1.5"
                />
              ),
            )}
            {STREETS.map((s, i) => (
              <path
                key={i}
                className="c2-street"
                d={s.d}
                fill="none"
                stroke={s.major ? "#3b2a1d" : "#2a1e15"}
                strokeWidth={s.major ? 16 : 8}
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* 10 km. */}
          <g className="c2-ring-g">
            <circle
              className="c2-ring"
              cx={HUB.x}
              cy={HUB.y}
              r={RING_R}
              fill="none"
              stroke={P.glow}
              strokeWidth="3"
              strokeDasharray="14 12"
              opacity="0.7"
              transform={`rotate(-90 ${HUB.x} ${HUB.y})`}
            />
            <g className="c2-ring-label" transform={`translate(${HUB.x} ${HUB.y - RING_R})`}>
              <rect x="-62" y="-22" width="124" height="44" rx="22" fill={P.glow} />
              <text
                y="9"
                textAnchor="middle"
                fontSize="24"
                fontWeight="800"
                fill="#1b0f08"
                style={{ fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}
              >
                10 KM
              </text>
            </g>
          </g>
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              className="c2-pulse"
              cx={HUB.x}
              cy={HUB.y}
              r="20"
              fill="none"
              stroke={P.glowHot}
              strokeWidth="4"
            />
          ))}
          <g className="c2-sweep">
            <g className="c2-sweep-rot">
              <path
                d={`M ${HUB.x} ${HUB.y} L ${HUB.x + RING_R} ${HUB.y} A ${RING_R} ${RING_R} 0 0 0 ${r1(HUB.x + RING_R * Math.cos(-0.7))} ${r1(HUB.y + RING_R * Math.sin(-0.7))} Z`}
                fill="url(#c2-sweep-g)"
              />
            </g>
          </g>

          {/* Needs nearby — and a few too far away. */}
          {FAR_PINS.map((p, i) => (
            <g key={i} className="c2-far" transform={`translate(${p.x} ${p.y})`}>
              <circle r="8" fill="#6b5a4c" />
            </g>
          ))}
          {PINS.map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y})`}>
              <g className="c2-pin c2-pin-other">
                <g className="c2-pin-inner">
                  <circle r="22" fill={P.glow} opacity="0.16" />
                  <circle r="9" fill={P.glowHot} />
                  <circle r="9" fill="none" stroke="#fff" strokeWidth="2" />
                  <g transform="translate(0 -30)">
                    <rect
                      x={-labelW(p.label) / 2}
                      y="-34"
                      width={labelW(p.label)}
                      height="36"
                      rx="18"
                      fill="#1f1510"
                      stroke="#5a3a24"
                      strokeWidth="1.5"
                    />
                    <text
                      y="-9"
                      textAnchor="middle"
                      fontSize="21"
                      fontWeight="700"
                      fill="#f3e2c8"
                      style={{ fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}
                    >
                      {p.label}
                    </text>
                  </g>
                </g>
              </g>
            </g>
          ))}

          {/* The route. */}
          <path className="c2-route-ref" d={ROUTE} fill="none" stroke="none" />
          <g className="c2-route" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Layered strokes, not a blur filter: the camera moves every frame. */}
            <path d={ROUTE} stroke={P.glow} strokeWidth="30" opacity="0.1" />
            <path d={ROUTE} stroke={P.glow} strokeWidth="16" opacity="0.22" />
            <path d={ROUTE} stroke={P.glow} strokeWidth="8" />
            <path d={ROUTE} stroke={P.glowCore} strokeWidth="2.6" />
            <path className="c2-route-pulse" d={ROUTE} stroke="#fff" strokeWidth="6" />
          </g>

          <g transform={`translate(${MATCH.x} ${MATCH.y})`}>
            <g className="c2-pin c2-pin-match">
              <g className="c2-pin-inner">
                <circle className="c2-match-halo" r="34" fill={P.glow} opacity="0.5" />
                <circle r="12" fill="#fff" />
                <circle r="12" fill="none" stroke={P.glow} strokeWidth="4" />
                <g transform="translate(0 -36)">
                  <rect x="-118" y="-34" width="236" height="38" rx="19" fill={P.glow} />
                  <text
                    y="-9"
                    textAnchor="middle"
                    fontSize="20"
                    fontWeight="800"
                    fill="#1b0f08"
                    style={{ fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}
                  >
                    Needs a school bag
                  </text>
                </g>
              </g>
            </g>
          </g>

          {/* The line from Chapter 1, and its comet head. */}
          <path className="c2-entry-measure" fill="none" stroke="none" />
          <g className="c2-line" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path className="c2-line-path" stroke={P.glow} strokeWidth="30" opacity="0.1" />
            <path className="c2-line-path" stroke={P.glow} strokeWidth="16" opacity="0.22" />
            <path className="c2-line-path" stroke={P.glow} strokeWidth="7" />
            <path className="c2-line-path" stroke={P.glowCore} strokeWidth="2.4" />
          </g>
          <g className="c2-head">
            <circle r="34" fill="url(#c2-head-g)" />
            <circle r="5" fill="#fff" />
          </g>

          {/* ── The phone ──────────────────────────────────────────────── */}
          <g className="c2-phone">
            <g className="c2-screen-glow" fill="none" stroke={P.glow} opacity="0">
              <rect
                x="669"
                y="224"
                width="262"
                height="492"
                rx="48"
                strokeWidth="28"
                opacity="0.14"
              />
              <rect
                x="677"
                y="232"
                width="246"
                height="476"
                rx="40"
                strokeWidth="14"
                opacity="0.3"
              />
            </g>
            <rect x="685" y="240" width="230" height="460" rx="34" fill="#1a120d" />
            <rect x="697" y="252" width="206" height="436" rx="24" fill="url(#c2-screen-g)" />
            <g clipPath="url(#c2-screen-clip)">
              <g
                className="c2-ui c2-ui-a"
                style={{ fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}
              >
                <text x="716" y="276" fontSize="11" fontWeight="700" fill="#1c130d">
                  9:41
                </text>
                <rect
                  x="862"
                  y="268"
                  width="22"
                  height="9"
                  rx="2.5"
                  fill="none"
                  stroke="#1c130d"
                  strokeWidth="1.5"
                />
              </g>
              <g className="c2-ui c2-ui-a">
                <path
                  d="M 724 304 C 712 296 714 286 721 287 C 724 287.5 725 290 725 291 C 725 290 726 287.5 729 287 C 736 286 738 296 724 304 Z"
                  fill={P.glow}
                />
                <text
                  x="742"
                  y="302"
                  fontSize="14"
                  fontWeight="800"
                  fill="#1c130d"
                  style={{ fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}
                >
                  List an item
                </text>
              </g>
              <g className="c2-ui c2-ui-a">
                <rect x="713" y="318" width="174" height="164" rx="16" fill="#f1e2c7" />
                <g className="c2-listing-bag">
                  <g
                    transform={`translate(800 402) scale(0.36) translate(${-BAG.body.cx} ${-BAG.body.cy})`}
                  >
                    <image href={BAG.src} width={BAG.w} height={BAG.h} />
                  </g>
                </g>
                <rect
                  className="c2-snap"
                  x="713"
                  y="318"
                  width="174"
                  height="164"
                  rx="16"
                  fill="#fff"
                />
              </g>
              <g
                className="c2-ui c2-ui-b"
                style={{ fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}
              >
                <text x="716" y="512" fontSize="16" fontWeight="800" fill="#1c130d">
                  School bag
                </text>
              </g>
              <g
                className="c2-ui c2-ui-b"
                style={{ fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}
              >
                <rect x="716" y="524" width="74" height="24" rx="12" fill="#fde2cc" />
                <text
                  x="753"
                  y="540"
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="700"
                  fill="#9a3a10"
                >
                  Education
                </text>
                <rect x="796" y="524" width="88" height="24" rx="12" fill="#e3efe2" />
                <text
                  x="840"
                  y="540"
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight="700"
                  fill="#2f5d34"
                >
                  Good condition
                </text>
              </g>
              <g className="c2-ui c2-ui-b">
                <rect x="716" y="562" width="168" height="8" rx="4" fill="#e6d8c0" />
                <rect x="716" y="578" width="132" height="8" rx="4" fill="#e6d8c0" />
              </g>
              <g className="c2-ui c2-ui-b">
                <g className="c2-btn">
                  <rect x="713" y="620" width="174" height="44" rx="22" fill={P.glow} />
                  <text
                    className="c2-btn-list"
                    x="800"
                    y="647"
                    textAnchor="middle"
                    fontSize="15"
                    fontWeight="800"
                    fill="#fff"
                    style={{ fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}
                  >
                    List item
                  </text>
                  <g className="c2-btn-done">
                    <text
                      x="810"
                      y="647"
                      textAnchor="middle"
                      fontSize="15"
                      fontWeight="800"
                      fill="#fff"
                      style={{ fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}
                    >
                      Listed
                    </text>
                  </g>
                  <path
                    className="c2-check"
                    d="M 764 642 L 771 649 L 784 634"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <rect
                  className="c2-btn-burst"
                  x="713"
                  y="620"
                  width="174"
                  height="44"
                  rx="22"
                  fill="none"
                  stroke={P.glowHot}
                  strokeWidth="3"
                />
              </g>
              <rect
                className="c2-screen-shine"
                x="560"
                y="240"
                width="90"
                height="480"
                fill="url(#c2-shine-g)"
                transform="skewX(-16)"
              />
            </g>
            <rect x="780" y="258" width="40" height="8" rx="4" fill="#1a120d" />
          </g>

          {/* The phone, reduced to a pin at the centre of the search. */}
          <g className="c2-hub">
            <circle cx={HUB.x} cy={HUB.y} r="90" fill="url(#c2-hub-g)" />
            <circle
              className="c2-hub-ring"
              cx={HUB.x}
              cy={HUB.y}
              r="22"
              fill="none"
              stroke={P.glowHot}
              strokeWidth="3"
            />
            <g className="c2-hub-core">
              <circle cx={HUB.x} cy={HUB.y} r="24" fill="#1a120d" stroke={P.glow} strokeWidth="4" />
              <path
                d={`M ${HUB.x} ${HUB.y + 11} C ${HUB.x - 17} ${HUB.y} ${HUB.x - 13} ${HUB.y - 12} ${HUB.x - 5} ${HUB.y - 11} C ${HUB.x - 2} ${HUB.y - 10.5} ${HUB.x} ${HUB.y - 7} ${HUB.x} ${HUB.y - 6} C ${HUB.x} ${HUB.y - 7} ${HUB.x + 2} ${HUB.y - 10.5} ${HUB.x + 5} ${HUB.y - 11} C ${HUB.x + 13} ${HUB.y - 12} ${HUB.x + 17} ${HUB.y} ${HUB.x} ${HUB.y + 11} Z`}
                fill={P.glow}
              />
            </g>
          </g>

          {/* The bag on its way. */}
          <g className="c2-tsparks" fill={P.glowCore}>
            {Array.from({ length: 10 }, (_, i) => (
              <circle key={i} className="c2-tspark" r={Math.max(1.5, 5 - i * 0.35)} opacity="0" />
            ))}
          </g>
          <g className="c2-token">
            <g transform={`translate(${-BAG.body.cx} ${-BAG.body.cy})`}>
              <path
                d={BAG.silhouette}
                fill="none"
                stroke={P.glow}
                strokeWidth="44"
                opacity="0.18"
              />
              <path
                d={BAG.silhouette}
                fill="none"
                stroke={P.glow}
                strokeWidth="20"
                opacity="0.35"
              />
              <image href={BAG.src} width={BAG.w} height={BAG.h} />
            </g>
          </g>
        </g>

        {/* ── The window onto her world (screen space) ─────────────────── */}
        <g clipPath="url(#c2-portal-clip)">
          <g className="c2-portal-content">
            <Student />
          </g>
        </g>
        <circle
          className="c2-portal-ring"
          cx="800"
          cy="450"
          r="0"
          fill="none"
          stroke={P.glowHot}
          strokeWidth="6"
        />

        <g className="c2-verified">
          <path
            className="c2-v-fill"
            d="M 0 -34 L 28 -24 V 2 C 28 20 14 32 0 38 C -14 32 -28 20 -28 2 V -24 Z"
            fill="#1f7a4d"
          />
          <path
            className="c2-v-shield"
            d="M 0 -34 L 28 -24 V 2 C 28 20 14 32 0 38 C -14 32 -28 20 -28 2 V -24 Z"
            fill="none"
            stroke="#7ee2a8"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            className="c2-v-check"
            d="M -12 2 L -3 11 L 13 -8"
            fill="none"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g className="c2-v-label" transform="translate(40 0)">
            <rect x="0" y="-18" width="118" height="36" rx="18" fill="#1f7a4d" />
            <text
              x="59"
              y="7"
              textAnchor="middle"
              fontSize="17"
              fontWeight="800"
              fill="#fff"
              letterSpacing="1.5"
              style={{ fontFamily: "var(--font-plus-jakarta-sans), sans-serif" }}
            >
              VERIFIED
            </text>
          </g>
        </g>

        <rect
          className="c2-flood"
          x="-3000"
          y="-3000"
          width="7600"
          height="6900"
          style={{ fill: "var(--ch2-end)" }}
          opacity="0"
        />
      </svg>

      {/* ── Captions ──────────────────────────────────────────────────────── */}
      <div
        className="c2-captions pointer-events-none absolute inset-0"
        style={{ paddingTop: "var(--hdr, 0px)" }}
      >
        <div className="c2-cap-bg absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#0f0a07] via-[#0f0a07]/80 to-transparent md:hidden" />
        <div className="c2-cap-bg absolute inset-y-0 left-0 hidden w-[52%] bg-gradient-to-r from-[#0f0a07]/90 via-[#0f0a07]/55 to-transparent md:block" />
        <div
          className="c2-cap-slot absolute inset-x-5 bottom-[15vh] md:inset-x-auto md:bottom-auto md:left-[6vw] md:top-1/2 md:w-[36vw] md:max-w-[560px]"
          style={{ marginTop: "calc(var(--hdr, 0px) / 2)" }}
        >
          <div className="relative w-full">
            {caption(
              "c2-cap-1 bottom-0 md:bottom-auto md:top-0 md:-translate-y-1/2",
              "Chapter two · It finds its person",
              ["List it."],
              "Photograph the thing you already own and say what condition it’s in. That’s the listing.",
            )}
            {caption(
              "c2-cap-2 bottom-0 md:bottom-auto md:top-0 md:-translate-y-1/2",
              "Matching",
              ["Someone", "within 10 km."],
              "A verified person nearby who asked for exactly this.",
            )}
            {caption(
              "c2-cap-3 bottom-0 md:bottom-auto md:top-0 md:-translate-y-1/2",
              "The handover",
              ["Verified.", "In person."],
              "You meet, and a one-time code confirms it actually changed hands.",
            )}
          </div>
        </div>
      </div>

      {/* ── Final line ───────────────────────────────────────────────────── */}
      <div
        className="c2-final pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: "var(--hdr, 0px)" }}
      >
        <p
          className={`${styles.serif} text-[clamp(2.2rem,6vw,5.5rem)] font-semibold italic leading-[1.05] tracking-tight`}
          style={{ color: "var(--ch2-end-ink)" }}
        >
          {["The item", "finds its person."].map((w, i) => (
            <span key={i}>
              {i ? <br /> : null}
              <span className={styles.mask}>
                <span
                  className={`c2-final-w ${styles.word} ${i === 1 ? "text-[#b04a15] dark:text-[#ff8a4c]" : ""}`}
                >
                  {w}
                </span>
              </span>
            </span>
          ))}
        </p>
        <span className="c2-final-line mt-8 block h-[18vh] w-[3px] origin-top rounded-full bg-gradient-to-b from-[#ff7a2f] to-transparent shadow-[0_0_18px_rgba(255,122,47,0.7)]" />
      </div>

      {/* ── Film furniture ───────────────────────────────────────────────── */}
      <div className={`c2-vignette ${styles.vignette}`} style={{ opacity: 1 }} />
      <div className={styles.grain} aria-hidden="true" />
      <div
        className={`c2-hud ${styles.hud} ${styles.pill} left-4 sm:left-8`}
        style={{ top: "calc(var(--hdr, 0px) + 16px)" }}
        aria-hidden="true"
      >
        <span className={styles.rec} />
        Scene 02
      </div>
      <div
        className={`c2-hud ${styles.hud} ${styles.pill} bottom-4 left-4 hidden sm:bottom-6 sm:left-8 md:block`}
        aria-hidden="true"
      >
        <span className="c2-hud-a">Insert: the listing</span>
        <span className="c2-hud-b absolute left-3">Ext. The neighbourhood — night</span>
        <span className="c2-hud-c absolute left-3">Close on: her</span>
      </div>
      <div
        className={`c2-hud ${styles.hud} ${styles.pill} bottom-4 right-4 hidden sm:bottom-6 sm:right-8 md:block`}
        aria-hidden="true"
      >
        TC <span className="c2-timecode">00:00:24:00</span>
      </div>
    </section>
  );
}
