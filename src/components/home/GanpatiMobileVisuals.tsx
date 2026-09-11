"use client";

import React, { useMemo } from "react";

/**
 * GanpatiMobileVisuals — the festive decoration set the phone column uses.
 *
 * <p><b>Why these are separate from `GanpatiVisuals`.</b> That module's art is
 * drawn for a desktop stage: `GanpatiToran` is a 1200-unit span whose leaves
 * are sized to read across a 1440px hero, and at 390px it either scales its
 * detail down to mush or crops. These are drawn at phone proportions — a
 * 390-unit viewBox, fewer and larger motifs, and a sag tuned to a narrow span —
 * so the same festival reads at the width it is actually being seen at.
 *
 * <p><b>Nothing here is random.</b> Every position, delay and duration is a
 * literal in a `useMemo` list, following `DriftingPetals`. A `Math.random()` at
 * render would put a different value in the server HTML than in the client's
 * first paint and hydrate-mismatch the whole tree.
 *
 * <p><b>All of it is inert to the pointer.</b> Each export is decoration laid
 * over real content, so every root carries `pointer-events-none` and
 * `aria-hidden`. A visitor must never be able to tap a leaf instead of a CTA,
 * and a screen reader must never read a garland.
 */

/* ────────────────────────────────────────────────────────────────────────────
   Shared keyframes
   ────────────────────────────────────────────────────────────────────────── */

/**
 * One `<style>` for the whole mobile set, mounted by each component that needs
 * it. Duplicate identical rules are free — the browser dedupes them — and it
 * keeps every export self-contained, so dropping one into a new section never
 * needs a second import.
 *
 * <p>Keyframe names are `ckm-` prefixed so they cannot collide with the
 * `GanpatiAnimationStyles` block, which is mounted on the same page.
 *
 * <p>Everything is disabled under `prefers-reduced-motion: reduce`. A swaying
 * garland and blinking lights are exactly what that setting is for.
 */
function MobileVisualStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
      @keyframes ckmGarlandSway {
        0%, 100% { transform: rotate(-1.1deg); }
        50%      { transform: rotate(1.1deg); }
      }
      @keyframes ckmStrandSway {
        0%, 100% { transform: rotate(-3.2deg); }
        50%      { transform: rotate(3.2deg); }
      }
      @keyframes ckmBulbTwinkle {
        0%, 100% { opacity: 1;    filter: brightness(1.15); }
        50%      { opacity: 0.45; filter: brightness(0.8); }
      }
      @keyframes ckmPetalFall {
        0%   { transform: translate3d(0, -24px, 0) rotate(0deg);     opacity: 0; }
        12%  { opacity: 0.9; }
        50%  { transform: translate3d(14px, 165px, 0) rotate(180deg); opacity: 0.75; }
        85%  { opacity: 0.35; }
        100% { transform: translate3d(-8px, 350px, 0) rotate(355deg); opacity: 0; }
      }
      @keyframes ckmFlameFlicker {
        0%, 100% { transform: scale(1) rotate(0deg);        opacity: 0.95; }
        35%      { transform: scale(1.09, 0.94) rotate(2deg); opacity: 1; }
        70%      { transform: scale(0.95, 1.06) rotate(-2deg); opacity: 0.88; }
      }

      .ckm-garland-sway {
        transform-box: fill-box;
        transform-origin: 50% 0%;
        animation: ckmGarlandSway 6.5s ease-in-out infinite;
        will-change: transform;
      }
      .ckm-strand-sway {
        transform-box: fill-box;
        transform-origin: 50% 0%;
        animation: ckmStrandSway 3.8s ease-in-out infinite;
        will-change: transform;
      }
      .ckm-bulb { animation: ckmBulbTwinkle 2.4s ease-in-out infinite; }
      .ckm-petal {
        position: absolute;
        top: -24px;
        animation-name: ckmPetalFall;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
        will-change: transform, opacity;
      }
      .ckm-flame {
        transform-box: fill-box;
        transform-origin: 50% 100%;
        animation: ckmFlameFlicker 1.7s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .ckm-garland-sway,
        .ckm-strand-sway,
        .ckm-bulb,
        .ckm-petal,
        .ckm-flame {
          animation: none !important;
        }
        .ckm-petal { opacity: 0.5; }
      }
    `,
      }}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Marigold primitive
   ────────────────────────────────────────────────────────────────────────── */

/**
 * A marigold's outline, as a closed path of `lobes` rounded petals.
 *
 * <p>Quadratic lobes rather than circles: a marigold read at 12px is a ruffled
 * disc, and a ring of plain circles reads as a gear at that size. Pure maths on
 * fixed inputs, so it is deterministic and safe either side of hydration.
 */
function ruffledPetalPath(
  cx: number,
  cy: number,
  r: number,
  lobes: number,
  baseRatio: number,
  phase = 0
): string {
  let d = "";
  for (let i = 0; i < lobes; i++) {
    const a1 = ((i + phase) / lobes) * Math.PI * 2;
    const aMid = ((i + phase + 0.5) / lobes) * Math.PI * 2;
    const a2 = ((i + phase + 1) / lobes) * Math.PI * 2;
    const rb = r * baseRatio;
    const x1 = (cx + Math.cos(a1) * rb).toFixed(1);
    const y1 = (cy + Math.sin(a1) * rb).toFixed(1);
    const xm = (cx + Math.cos(aMid) * r).toFixed(1);
    const ym = (cy + Math.sin(aMid) * r).toFixed(1);
    const x2 = (cx + Math.cos(a2) * rb).toFixed(1);
    const y2 = (cy + Math.sin(a2) * rb).toFixed(1);
    if (i === 0) d += `M ${x1} ${y1} `;
    d += `Q ${xm} ${ym} ${x2} ${y2} `;
  }
  return `${d}Z`;
}

/** A single marigold: three nested rings of petals and a seeded centre. */
function Marigold({
  cx,
  cy,
  r,
  tone = "orange",
}: {
  cx: number;
  cy: number;
  r: number;
  tone?: "orange" | "yellow";
}) {
  const outer = tone === "yellow" ? "#fbbf24" : "#f97316";
  const mid = tone === "yellow" ? "#f59e0b" : "#ea580c";
  const inner = tone === "yellow" ? "#fde68a" : "#fb923c";
  const edge = tone === "yellow" ? "#b45309" : "#c2410c";

  return (
    <g>
      <circle cx={cx} cy={cy + r * 0.12} r={r * 0.94} fill="#451a03" opacity="0.22" />
      <path d={ruffledPetalPath(cx, cy, r, 12, 0.8, 0)} fill={outer} stroke={edge} strokeWidth="0.4" strokeOpacity="0.45" />
      <path d={ruffledPetalPath(cx, cy, r * 0.72, 10, 0.78, 0.25)} fill={mid} />
      <path d={ruffledPetalPath(cx, cy, r * 0.44, 8, 0.74, 0.5)} fill={inner} />
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#9a3412" />
      <circle cx={cx} cy={cy} r={r * 0.1} fill="#fef3c7" />
    </g>
  );
}

/** A mango leaf hanging from the cord, drawn point-down. */
function MangoLeaf({
  x,
  y,
  h = 26,
  tilt = 0,
}: {
  x: number;
  y: number;
  h?: number;
  tilt?: number;
}) {
  const w = h * 0.42;
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <path
        d={`M 0 0 C ${-w} ${h * 0.34}, ${-w * 0.72} ${h * 0.84}, 0 ${h} C ${w * 0.72} ${h * 0.84}, ${w} ${h * 0.34}, 0 0 Z`}
        fill="url(#ckmLeafGrad)"
        stroke="#14532d"
        strokeWidth="0.5"
        strokeOpacity="0.5"
      />
      <path d={`M 0 ${h * 0.08} L 0 ${h * 0.9}`} stroke="#166534" strokeWidth="0.7" strokeOpacity="0.65" fill="none" />
    </g>
  );
}

/** Gradients and filters shared by the garland pieces. */
function MobileVisualDefs() {
  return (
    <defs>
      <linearGradient id="ckmLeafGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="55%" stopColor="#15803d" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <linearGradient id="ckmCordGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="ckmWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#78350f" />
        <stop offset="50%" stopColor="#92400e" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
    </defs>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   1. MobileToran — the garland across the top of the phone column
   ────────────────────────────────────────────────────────────────────────── */

/**
 * A mango-leaf and marigold toran strung across the top of the mobile column.
 *
 * <p>The cord is one quadratic curve with a 38-unit sag. At 390 units wide that
 * is a shallow, believable droop; the desktop toran's proportions applied here
 * would either hang flat or dip a third of the way down the first screen.
 *
 * <p>Motifs alternate leaf, flower, leaf so the eye reads a rhythm rather than
 * a row, and the three hanging strands sit off-centre for the same reason —
 * symmetry at this width looks printed rather than strung.
 */
export function MobileToran({ className = "" }: { className?: string }) {
  // y on the cord at a given x, for the quadratic from (0,12) via (195,50) to (390,12).
  const cordY = (x: number) => {
    const t = x / 390;
    return (1 - t) * (1 - t) * 12 + 2 * (1 - t) * t * 50 + t * t * 12;
  };

  const motifs = useMemo(
    () =>
      [
        { x: 22, kind: "leaf" as const, size: 24, tilt: -12 },
        { x: 52, kind: "flower" as const, size: 8.5, tone: "orange" as const },
        { x: 82, kind: "leaf" as const, size: 27, tilt: -6 },
        { x: 114, kind: "flower" as const, size: 9.5, tone: "yellow" as const },
        { x: 148, kind: "leaf" as const, size: 29, tilt: -2 },
        { x: 182, kind: "flower" as const, size: 10, tone: "orange" as const },
        { x: 216, kind: "leaf" as const, size: 29, tilt: 2 },
        { x: 250, kind: "flower" as const, size: 9.5, tone: "yellow" as const },
        { x: 284, kind: "leaf" as const, size: 27, tilt: 6 },
        { x: 314, kind: "flower" as const, size: 8.5, tone: "orange" as const },
        { x: 344, kind: "leaf" as const, size: 24, tilt: 10 },
        { x: 372, kind: "flower" as const, size: 8 as number, tone: "yellow" as const },
      ] as const,
    []
  );

  // Hanging strands: off-centre on purpose, each a different length.
  const strands = useMemo(
    () => [
      { x: 66, len: 34, delay: "0s" },
      { x: 195, len: 52, delay: "0.9s" },
      { x: 326, len: 38, delay: "1.7s" },
    ],
    []
  );

  return (
    <div aria-hidden="true" className={`pointer-events-none select-none ${className}`}>
      <MobileVisualStyles />
      <svg viewBox="0 0 390 118" className="block h-auto w-full" fill="none">
        <MobileVisualDefs />

        <g className="ckm-garland-sway">
          {/* The cord itself, drawn twice: a dark under-stroke for weight and a
              gold over-stroke for the festive thread. */}
          <path d="M 0 12 Q 195 50 390 12" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
          <path d="M 0 12 Q 195 50 390 12" stroke="url(#ckmCordGrad)" strokeWidth="2.2" strokeLinecap="round" />

          {motifs.map((m, i) =>
            m.kind === "leaf" ? (
              <MangoLeaf key={`m${i}`} x={m.x} y={cordY(m.x)} h={m.size} tilt={m.tilt ?? 0} />
            ) : (
              <Marigold key={`m${i}`} cx={m.x} cy={cordY(m.x) + m.size * 0.7} r={m.size} tone={m.tone} />
            )
          )}

          {/* Hanging strands — a thread, two small marigolds and a leaf tip. */}
          {strands.map((s, i) => {
            const top = cordY(s.x);
            return (
              <g key={`s${i}`} className="ckm-strand-sway" style={{ animationDelay: s.delay }}>
                <path
                  d={`M ${s.x} ${top} L ${s.x} ${top + s.len}`}
                  stroke="url(#ckmCordGrad)"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <Marigold cx={s.x} cy={top + s.len * 0.45} r={5.5} tone="yellow" />
                <Marigold cx={s.x} cy={top + s.len * 0.78} r={6.5} tone="orange" />
                <MangoLeaf x={s.x} y={top + s.len * 0.9} h={14} />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   2. FestiveLights — a string of bulbs below the toran
   ────────────────────────────────────────────────────────────────────────── */

/**
 * A string of festival bulbs, hung a little below the toran so the two read as
 * separate strings rather than one thick band.
 *
 * <p>Colours run saffron, marigold, rose, leaf — the four the rest of the skin
 * already uses — and each bulb twinkles on its own offset so the string never
 * pulses as one block.
 */
export function FestiveLights({ className = "" }: { className?: string }) {
  const bulbs = useMemo(
    () => [
      { x: 26, c: "#f97316", d: "0s" },
      { x: 66, c: "#fbbf24", d: "0.35s" },
      { x: 106, c: "#f43f5e", d: "0.7s" },
      { x: 146, c: "#22c55e", d: "1.05s" },
      { x: 186, c: "#f97316", d: "1.4s" },
      { x: 226, c: "#fbbf24", d: "0.5s" },
      { x: 266, c: "#f43f5e", d: "0.9s" },
      { x: 306, c: "#22c55e", d: "1.25s" },
      { x: 346, c: "#f97316", d: "1.6s" },
    ],
    []
  );

  // The wire sags less than the toran's cord — a lighter string hangs tighter.
  const wireY = (x: number) => {
    const t = x / 390;
    return (1 - t) * (1 - t) * 8 + 2 * (1 - t) * t * 34 + t * t * 8;
  };

  return (
    <div aria-hidden="true" className={`pointer-events-none select-none ${className}`}>
      <MobileVisualStyles />
      <svg viewBox="0 0 390 56" className="block h-auto w-full" fill="none">
        <MobileVisualDefs />
        <path d="M 0 8 Q 195 34 390 8" stroke="url(#ckmWireGrad)" strokeWidth="1.4" strokeLinecap="round" />

        {bulbs.map((b, i) => {
          const y = wireY(b.x);
          return (
            <g key={i} className="ckm-bulb" style={{ animationDelay: b.d }}>
              {/* Cap, then glass, then the halo the glass throws. */}
              <rect x={b.x - 2} y={y} width="4" height="3.4" rx="1" fill="#78350f" />
              <circle cx={b.x} cy={y + 9} r="7.5" fill={b.c} opacity="0.28" />
              <ellipse cx={b.x} cy={y + 8} rx="3.6" ry="4.6" fill={b.c} />
              <ellipse cx={b.x - 1.1} cy={y + 6.6} rx="1.1" ry="1.5" fill="#fffbeb" opacity="0.75" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   3. MobileFlowerPetals — marigold petals drifting through the top band
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Marigold petals drifting down through whatever box this is given.
 *
 * <p>Divs rather than SVG: each petal is one element with its own duration and
 * delay, which the compositor can run on the GPU without touching layout. The
 * fall keyframe fades to zero opacity at the end of its travel, so petals
 * dissolve rather than piling up at the bottom edge of the band.
 *
 * <p>Twelve of them, not the desktop hero's twenty-two. A phone column is a
 * third the width, and the same count reads as weather rather than as festival.
 */
export function MobileFlowerPetals({ className = "" }: { className?: string }) {
  const petals = useMemo(
    () => [
      { id: 1, left: "6%", size: 11, delay: "0s", duration: "12s", tone: "#f97316" },
      { id: 2, left: "15%", size: 8, delay: "3.4s", duration: "14s", tone: "#fbbf24" },
      { id: 3, left: "24%", size: 12, delay: "1.6s", duration: "11s", tone: "#ea580c" },
      { id: 4, left: "33%", size: 9, delay: "6.2s", duration: "15s", tone: "#fbbf24" },
      { id: 5, left: "43%", size: 11, delay: "2.4s", duration: "13s", tone: "#f97316" },
      { id: 6, left: "52%", size: 8, delay: "8.1s", duration: "12.5s", tone: "#fb923c" },
      { id: 7, left: "61%", size: 12, delay: "4.7s", duration: "14.5s", tone: "#ea580c" },
      { id: 8, left: "70%", size: 9, delay: "0.8s", duration: "11.5s", tone: "#fbbf24" },
      { id: 9, left: "79%", size: 11, delay: "5.5s", duration: "13.5s", tone: "#f97316" },
      { id: 10, left: "87%", size: 8, delay: "2.9s", duration: "15.5s", tone: "#fb923c" },
      { id: 11, left: "94%", size: 10, delay: "7.3s", duration: "12s", tone: "#ea580c" },
      { id: 12, left: "38%", size: 7, delay: "9.6s", duration: "16s", tone: "#fbbf24" },
    ],
    []
  );

  return (
    <div aria-hidden="true" className={`pointer-events-none select-none overflow-hidden ${className}`}>
      <MobileVisualStyles />
      {petals.map((p) => (
        <span
          key={p.id}
          className="ckm-petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 0.62,
            background: p.tone,
            // A petal, not a dot: long axis horizontal, both ends rounded to a
            // point so rotation reads as tumbling.
            borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
            opacity: 0,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   4. DiyaDecoration — a lit lamp
   ────────────────────────────────────────────────────────────────────────── */

/**
 * A lit clay diya, for pinning into a corner of a festive card or section.
 *
 * <p>The flame is its own group with a bottom-centre transform origin, so the
 * flicker pivots at the wick instead of scaling the whole lamp.
 */
export function DiyaDecoration({ className = "size-10" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`pointer-events-none inline-block select-none ${className}`}>
      <MobileVisualStyles />
      <svg viewBox="0 0 48 46" className="block size-full" fill="none">
        <defs>
          <radialGradient id="ckmFlameGrad" cx="50%" cy="72%" r="62%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="38%" stopColor="#fcd34d" />
            <stop offset="72%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.35" />
          </radialGradient>
          <linearGradient id="ckmClayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="60%" stopColor="#9a3412" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>
        </defs>

        {/* Glow the flame throws onto the lamp and the surface under it. */}
        <ellipse cx="24" cy="20" rx="15" ry="16" fill="#f59e0b" opacity="0.2" />

        <g className="ckm-flame">
          <path
            d="M 24 6 C 28.4 12.5, 30 16.2, 30 20 C 30 24.4, 27.3 27.4, 24 27.4 C 20.7 27.4, 18 24.4, 18 20 C 18 16.2, 19.6 12.5, 24 6 Z"
            fill="url(#ckmFlameGrad)"
          />
          <path
            d="M 24 14.5 C 26 18, 26.6 19.8, 26.6 21.6 C 26.6 23.8, 25.4 25.2, 24 25.2 C 22.6 25.2, 21.4 23.8, 21.4 21.6 C 21.4 19.8, 22 18, 24 14.5 Z"
            fill="#fffbeb"
            opacity="0.85"
          />
        </g>

        {/* Wick, then the bowl. */}
        <rect x="23.2" y="26" width="1.6" height="4" rx="0.8" fill="#57534e" />
        <path
          d="M 7 31 C 7 31, 11 42, 24 42 C 37 42, 41 31, 41 31 C 41 31, 34 34.5, 24 34.5 C 14 34.5, 7 31, 7 31 Z"
          fill="url(#ckmClayGrad)"
        />
        <ellipse cx="24" cy="31.4" rx="17" ry="3.9" fill="#ea580c" opacity="0.9" />
        <ellipse cx="24" cy="31.2" rx="13.5" ry="2.7" fill="#7c2d12" opacity="0.55" />
        {/* A gold rim line, the one detail that keeps it from reading as a bowl. */}
        <path d="M 8.5 31.8 C 12 40.2, 17.6 41, 24 41" stroke="#fcd34d" strokeWidth="0.9" strokeOpacity="0.5" fill="none" />
      </svg>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   5. FestiveSectionDivider — the seam between two sections
   ────────────────────────────────────────────────────────────────────────── */

/**
 * The seam between two festive sections: a gold hairline that fades in from
 * both edges, interrupted by a marigold medallion flanked by two mango leaves.
 *
 * <p>It takes no props and brings no margin. The mobile column is a flex stack
 * with a `gap-11`, so a divider that added its own spacing would open a seam
 * wider than the section joins it is meant to mark.
 */
export function FestiveSectionDivider() {
  return (
    <div aria-hidden="true" className="pointer-events-none flex select-none items-center justify-center">
      <span className="h-px min-w-0 flex-1 bg-gradient-to-r from-transparent via-amber-500/45 to-amber-500/70" />
      <svg viewBox="0 0 92 30" className="mx-2 h-[26px] w-[80px] shrink-0" fill="none">
        <MobileVisualDefs />
        <MangoLeaf x={20} y={5} h={17} tilt={-118} />
        <MangoLeaf x={72} y={5} h={17} tilt={118} />
        <Marigold cx={46} cy={15} r={10.5} tone="orange" />
        <circle cx={31} cy={15} r={2.1} fill="#f59e0b" />
        <circle cx={61} cy={15} r={2.1} fill="#f59e0b" />
      </svg>
      <span className="h-px min-w-0 flex-1 bg-gradient-to-l from-transparent via-amber-500/45 to-amber-500/70" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   6. MangoLeafCorner — a corner flourish
   ────────────────────────────────────────────────────────────────────────── */

/**
 * A small fan of mango leaves with one marigold, for pinning to the corner of a
 * section heading.
 *
 * <p>Drawn to hang from its top-left, so the caller positions it with negative
 * offsets and it reads as tucked behind the corner rather than sitting on it.
 */
export function MangoLeafCorner({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`pointer-events-none inline-block select-none ${className}`}>
      <svg viewBox="0 0 62 58" className="block h-[46px] w-[50px]" fill="none">
        <MobileVisualDefs />
        <MangoLeaf x={13} y={9} h={26} tilt={-40} />
        <MangoLeaf x={16} y={7} h={30} tilt={-8} />
        <MangoLeaf x={19} y={9} h={25} tilt={26} />
        <Marigold cx={16} cy={11} r={8} tone="orange" />
        <Marigold cx={28} cy={19} r={5.2} tone="yellow" />
      </svg>
    </span>
  );
}
