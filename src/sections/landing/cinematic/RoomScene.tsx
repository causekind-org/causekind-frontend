import type { ReactNode } from "react";
import { P } from "./palette";

/**
 * The apartment — a hand-built SVG living room, drawn in room space
 * (x 0–1600, y 0–900; the back wall meets the floor at y 692).
 *
 * <p><b>How it assembles.</b> Every piece of furniture is wrapped in {@link Obj},
 * which renders the same artwork twice: a `paint` layer, and an `ink` layer the
 * stylesheet strips down to a thin glowing orange outline. The chapter draws
 * the ink on (DrawSVG), then floods the paint in underneath it, so each object
 * arrives as a sketch that fills itself with colour. One drawing, two looks —
 * nothing is traced by hand twice.
 *
 * <p>Elements marked `no-ink` (tiny decoration: book-spine titles, city
 * windows, marigolds) are hidden from the ink layer so the sketch reads as
 * furniture rather than noise.
 *
 * <p>All `url(#…)` references point at {@link RoomDefs}, never at defs inside an
 * `Obj` — the ink copy would otherwise duplicate every id.
 */

/** Paint + ink pair for one assembling object. */
function Obj({
  name,
  children,
  className = "",
}: {
  name: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <g className={`r-obj r-${name} ${className}`}>
      <g className="paint">{children}</g>
      <g className="ink" aria-hidden="true">
        {children}
      </g>
    </g>
  );
}

// ── Deterministic "random" so server and client render identical markup ──────
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const BOOK_COLORS = [
  P.terracotta,
  P.mustard,
  P.teal,
  "#6b8f71",
  "#8c3b2e",
  "#efe0c2",
  "#3d4a6b",
  P.rani,
  "#a0522d",
  "#d9b36a",
];

function BookRow({ x0, x1, base, seed }: { x0: number; x1: number; base: number; seed: number }) {
  const rnd = seeded(seed);
  const books: ReactNode[] = [];
  let x = x0;
  let i = 0;
  while (x < x1 - 14) {
    const w = 11 + Math.round(rnd() * 10);
    const h = 56 + Math.round(rnd() * 26);
    const c = BOOK_COLORS[Math.floor(rnd() * BOOK_COLORS.length)];
    const lean = x + w > x1 - 20 && rnd() > 0.35;
    books.push(
      <g key={i} className="r-spine" transform={lean ? `rotate(-14 ${x + w} ${base})` : undefined}>
        <rect x={x} y={base - h} width={w} height={h} rx="1.5" fill={c} />
        <rect
          className="no-ink"
          x={x + 2}
          y={base - h + 8}
          width={w - 4}
          height="2.4"
          fill="#fff"
          opacity="0.45"
        />
        <rect
          className="no-ink"
          x={x + 2}
          y={base - 14}
          width={w - 4}
          height="2.4"
          fill="#000"
          opacity="0.18"
        />
      </g>,
    );
    x += w + (rnd() > 0.85 ? 6 : 1);
    i++;
    if (lean) break;
  }
  return <>{books}</>;
}

export function RoomDefs() {
  return (
    <defs>
      <linearGradient id="rm-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={P.wallWarm} />
        <stop offset="1" stopColor={P.wall} />
      </linearGradient>
      <linearGradient id="rm-floor" x1="0" y1="692" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#c98550" />
        <stop offset="1" stopColor={P.floorDeep} />
      </linearGradient>
      <linearGradient id="rm-sky" x1="0" y1="156" x2="0" y2="464" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#f6b98f" />
        <stop offset="0.55" stopColor={P.sky2} />
        <stop offset="1" stopColor={P.sky1} />
      </linearGradient>
      <radialGradient id="rm-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff4d6" stopOpacity="1" />
        <stop offset="0.45" stopColor="#ffe0a6" stopOpacity="0.8" />
        <stop offset="1" stopColor="#ffd08a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="rm-lamp-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffe3a8" stopOpacity="0.85" />
        <stop offset="0.4" stopColor="#ffcf86" stopOpacity="0.35" />
        <stop offset="1" stopColor="#ffcf86" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="rm-cone" x1="0" y1="336" x2="0" y2="712" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="rm-beam" x1="0" y1="464" x2="0" y2="900" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fff3d1" stopOpacity="0.2" />
        <stop offset="1" stopColor="#fff3d1" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="rm-window-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffd9a8" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffd9a8" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="rm-shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f3d49b" />
        <stop offset="0.5" stopColor="#fbe7bf" />
        <stop offset="1" stopColor="#e9c483" />
      </linearGradient>
      <linearGradient id="rm-glass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
        <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
      </linearGradient>
      <clipPath id="rm-glass-clip">
        <rect x="566" y="156" width="308" height="308" />
      </clipPath>
      <pattern id="rm-buti" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.7" fill={P.mustardLight} opacity="0.9" />
        <circle cx="12" cy="12" r="1.3" fill={P.cream} opacity="0.75" />
      </pattern>
    </defs>
  );
}

/** Marigold positions along a quadratic scallop, for the toran. */
function scallop(x0: number, x1: number, y: number, sag: number, n: number) {
  const pts: { x: number; y: number }[] = [];
  const cx = (x0 + x1) / 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const yy = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + sag) + t * t * y;
    pts.push({ x, y: yy });
  }
  return pts;
}

export function RoomScene() {
  // Floor seams radiate from a vanishing point above the room.
  const seams = Array.from({ length: 25 }, (_, i) => {
    const x692 = 800 + (i - 12) * 104;
    const f = (1500 + 900) / (692 + 900);
    return `M ${x692} 692 L ${800 + (x692 - 800) * f} 1500`;
  });

  const toranPts = [
    ...scallop(1392, 1482, 252, 34, 7),
    ...scallop(1482, 1572, 252, 34, 7).slice(1),
  ];

  return (
    <g className="r-room">
      {/* ── Shell ──────────────────────────────────────────────────────────── */}
      <g className="r-shell">
        <rect
          className="r-wall"
          x="-3000"
          y="-3000"
          width="7600"
          height="3692"
          fill="url(#rm-wall)"
        />
        <rect className="r-ceiling" x="-3000" y="-3000" width="7600" height="3040" fill="#f8ecd6" />
        <rect className="r-cornice" x="-3000" y="38" width="7600" height="10" fill={P.wallShade} />
        <circle className="r-window-glow" cx="720" cy="320" r="420" fill="url(#rm-window-glow)" />
        <circle
          className="r-lamp-wallglow"
          cx="965"
          cy="300"
          r="330"
          fill="url(#rm-lamp-glow)"
          opacity="0"
        />
        <rect
          className="r-floor"
          x="-3000"
          y="692"
          width="7600"
          height="3000"
          fill="url(#rm-floor)"
        />
        <g className="r-seams" stroke={P.floorLine} strokeWidth="2" opacity="0.55">
          {seams.map((d, i) => (
            <path key={i} className="r-seam" d={d} />
          ))}
        </g>
        <g className="no-ink" fill={P.floorLine} opacity="0.45">
          <rect x="300" y="760" width="3" height="40" transform="skewX(-20)" />
          <rect x="1300" y="820" width="3" height="46" transform="skewX(12)" />
          <rect x="880" y="880" width="3" height="50" />
        </g>
        <rect className="r-skirting" x="-3000" y="676" width="7600" height="16" fill={P.skirting} />
      </g>
      {/* The first stroke of the film: the line where wall meets floor. */}
      <path
        className="r-horizon"
        d="M -400 692 H 2000"
        fill="none"
        stroke={P.glow}
        strokeWidth="2.5"
      />

      {/* ── Ceiling fan ────────────────────────────────────────────────────── */}
      <Obj name="fan">
        <rect x="796" y="-400" width="8" height="458" fill="#8b7866" />
        <ellipse cx="800" cy="62" rx="30" ry="12" fill="#eadfca" stroke="#b8a68c" strokeWidth="2" />
        <g transform="translate(800 70) scale(1 0.17)">
          <g className="r-fan-spin">
            <circle r="200" fill="none" />
            {[0, 120, 240].map((a) => (
              <path
                key={a}
                d="M 0 -16 L 188 -30 Q 206 0 188 30 L 0 16 Z"
                fill="#d8c5a4"
                stroke="#b39c78"
                strokeWidth="3"
                transform={`rotate(${a})`}
              />
            ))}
          </g>
        </g>
        <ellipse cx="800" cy="74" rx="15" ry="7" fill="#cbb896" />
      </Obj>

      {/* ── Window, dusk city beyond ───────────────────────────────────────── */}
      <Obj name="window">
        <rect
          x="548"
          y="138"
          width="344"
          height="344"
          rx="4"
          fill="#f8efe0"
          stroke="#d9c3a0"
          strokeWidth="2"
        />
        <rect x="566" y="156" width="308" height="308" fill="url(#rm-sky)" />
        <circle className="r-sun" cx="716" cy="398" r="96" fill="url(#rm-sun)" />
        <circle className="r-sun-disc" cx="716" cy="398" r="34" fill="#fff1cd" />
        <g clipPath="url(#rm-glass-clip)">
          <g className="r-city">
            <g className="r-city-far" fill={P.city1}>
              <rect x="566" y="352" width="46" height="112" />
              <rect x="614" y="330" width="38" height="134" />
              <rect x="700" y="372" width="54" height="92" />
              <rect x="770" y="322" width="44" height="142" />
              <rect x="820" y="350" width="54" height="114" />
              <rect x="784" y="306" width="14" height="18" rx="4" fill="#9a5b47" />
              <rect x="626" y="316" width="12" height="16" rx="4" fill="#9a5b47" />
            </g>
            <g className="r-city-near" fill={P.city2}>
              <rect x="566" y="404" width="70" height="60" />
              <rect x="650" y="420" width="58" height="44" />
              <rect x="724" y="396" width="64" height="68" />
              <rect x="806" y="412" width="68" height="52" />
              <rect x="740" y="382" width="16" height="16" rx="5" fill="#7d4636" />
            </g>
            <g className="no-ink" fill="#ffe6ae">
              {[
                [576, 414],
                [592, 414],
                [576, 430],
                [608, 430],
                [662, 430],
                [684, 444],
                [736, 408],
                [752, 424],
                [768, 408],
                [736, 440],
                [818, 424],
                [836, 424],
                [852, 440],
                [630, 344],
                [630, 370],
                [784, 336],
                [784, 360],
                [834, 366],
              ].map(([x, y], i) => (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width="7"
                  height="7"
                  rx="1"
                  opacity={0.55 + ((i * 37) % 40) / 100}
                />
              ))}
            </g>
          </g>
        </g>
        <g
          className="r-birds no-ink"
          fill="none"
          stroke="#7d4a3a"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M 616 214 q 6 -6 12 0 q 6 -6 12 0" />
          <path d="M 648 196 q 5 -5 10 0 q 5 -5 10 0" />
          <path d="M 684 226 q 4 -4 8 0 q 4 -4 8 0" />
        </g>
        <rect x="566" y="156" width="308" height="308" fill="url(#rm-glass)" opacity="0.35" />
        {/* Grille — every Indian apartment window has one. */}
        <g stroke="#7a4424" strokeWidth="5" strokeLinecap="round">
          <line x1="643" y1="156" x2="643" y2="464" />
          <line x1="720" y1="156" x2="720" y2="464" />
          <line x1="797" y1="156" x2="797" y2="464" />
          <line x1="566" y1="318" x2="874" y2="318" />
        </g>
        <g stroke="#7a4424" strokeWidth="3" fill="none">
          <path d="M 566 318 Q 604 280 643 318 Q 681 280 720 318 Q 758 280 797 318 Q 835 280 874 318" />
        </g>
        <rect x="536" y="476" width="368" height="16" rx="3" fill={P.woodLight} />
        <rect x="536" y="488" width="368" height="5" fill={P.woodDark} opacity="0.5" />
        {/* Tulsi on the sill. */}
        <path d="M 588 476 L 592 450 H 624 L 628 476 Z" fill={P.terracotta} />
        <g fill={P.leaf}>
          <ellipse cx="600" cy="436" rx="7" ry="13" transform="rotate(-25 600 436)" />
          <ellipse cx="616" cy="434" rx="7" ry="13" transform="rotate(22 616 434)" />
          <ellipse cx="608" cy="424" rx="6" ry="14" />
          <ellipse
            cx="594"
            cy="444"
            rx="5"
            ry="9"
            transform="rotate(-60 594 444)"
            fill={P.leafLight}
          />
        </g>
      </Obj>

      <Obj name="curtain-l">
        <path
          d="M 506 128 H 598 V 606 Q 586 616 574 606 Q 562 616 550 606 Q 538 616 526 606 Q 516 614 506 606 Z"
          fill={P.curtain}
        />
        <g stroke={P.curtainDark} strokeWidth="5" opacity="0.6" fill="none">
          <path d="M 528 132 Q 524 360 530 604" />
          <path d="M 552 132 Q 556 360 550 604" />
          <path d="M 576 132 Q 572 360 576 604" />
        </g>
        <g className="no-ink" fill={P.mustardLight}>
          {Array.from({ length: 10 }, (_, r) =>
            [516, 540, 564, 588].map((x) => (
              <rect
                key={`${r}-${x}`}
                x={x - 3}
                y={150 + r * 44}
                width="6"
                height="6"
                transform={`rotate(45 ${x} ${153 + r * 44})`}
              />
            )),
          )}
        </g>
      </Obj>
      <Obj name="curtain-r">
        <path
          d="M 846 128 H 938 V 606 Q 928 614 918 606 Q 906 616 894 606 Q 882 616 870 606 Q 858 616 846 606 Z"
          fill={P.curtain}
        />
        <g stroke={P.curtainDark} strokeWidth="5" opacity="0.6" fill="none">
          <path d="M 868 132 Q 872 360 866 604" />
          <path d="M 892 132 Q 888 360 894 604" />
          <path d="M 916 132 Q 920 360 916 604" />
        </g>
        <g className="no-ink" fill={P.mustardLight}>
          {Array.from({ length: 10 }, (_, r) =>
            [856, 880, 904, 928].map((x) => (
              <rect
                key={`${r}-${x}`}
                x={x - 3}
                y={150 + r * 44}
                width="6"
                height="6"
                transform={`rotate(45 ${x} ${153 + r * 44})`}
              />
            )),
          )}
        </g>
      </Obj>
      <Obj name="rod">
        <rect x="494" y="118" width="452" height="8" rx="4" fill="#b8863b" />
        <circle cx="494" cy="122" r="9" fill="#9c6f2c" />
        <circle cx="946" cy="122" r="9" fill="#9c6f2c" />
      </Obj>

      {/* ── Wall: clock and a Warli painting ───────────────────────────────── */}
      <Obj name="clock">
        <circle cx="1000" cy="192" r="42" fill={P.wood} />
        <circle cx="1000" cy="192" r="35" fill={P.cream} />
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            className="no-ink"
            x="998.8"
            y="160"
            width="2.4"
            height={i % 3 === 0 ? 8 : 4}
            fill={P.inkSoft}
            transform={`rotate(${i * 30} 1000 192)`}
          />
        ))}
        <g className="r-clock-hr">
          <rect x="998" y="174" width="4" height="20" rx="2" fill={P.ink} />
        </g>
        <g className="r-clock-min">
          <rect x="998.8" y="164" width="2.4" height="30" rx="1.2" fill={P.terracottaDark} />
        </g>
        <circle cx="1000" cy="192" r="3.5" fill={P.ink} />
      </Obj>

      <Obj name="warli">
        <rect x="1068" y="150" width="152" height="124" rx="3" fill={P.woodDark} />
        <rect x="1076" y="158" width="136" height="108" fill="#9e4427" />
        <g
          className="no-ink"
          fill="#f6ead2"
          stroke="#f6ead2"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          {Array.from({ length: 9 }, (_, i) => {
            const a = (i / 9) * Math.PI * 2;
            const x = 1144 + Math.cos(a) * 34;
            const y = 212 + Math.sin(a) * 30;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <circle cy="-9" r="2.6" stroke="none" />
                <path d="M -4 -6 L 4 -6 L 0 0 Z" stroke="none" />
                <path d="M 0 0 L -4 6 L 4 6 Z" stroke="none" />
                <path d="M -4 -5 L -9 -1 M 4 -5 L 9 -1 M -2 6 L -4 11 M 2 6 L 4 11" fill="none" />
              </g>
            );
          })}
          <circle cx="1144" cy="212" r="5" stroke="none" />
          <path d="M 1092 250 L 1100 236 L 1108 250 M 1180 250 L 1188 236 L 1196 250" fill="none" />
        </g>
      </Obj>

      {/* ── Door, with a marigold toran ────────────────────────────────────── */}
      <Obj name="door">
        <rect x="1398" y="244" width="168" height="448" fill={P.woodDark} />
        {/* The hallway behind the door — seen only once it swings open. */}
        <rect x="1410" y="256" width="144" height="436" fill="#3b2517" />
        <path
          className="r-door-spill no-ink"
          d="M 1410 256 H 1554 V 692 H 1410 Z"
          fill="#ffcf8f"
          opacity="0"
        />
        {/* Hinged on the right, so it opens toward the wall. */}
        <g className="r-door-leaf">
          <rect x="1410" y="256" width="144" height="436" fill={P.wood} />
          {[
            [1424, 274, 56, 176],
            [1484, 274, 56, 176],
            [1424, 470, 56, 204],
            [1484, 470, 56, 204],
          ].map(([x, y, w, h], i) => (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height={h}
              rx="3"
              fill={P.woodLight}
              opacity="0.55"
              stroke={P.woodDark}
              strokeWidth="2"
            />
          ))}
          <rect x="1417" y="468" width="10" height="30" rx="4" fill="#c9983f" />
          <circle cx="1422" cy="480" r="4" fill="#8e6424" />
        </g>
      </Obj>
      <g className="r-toran">
        <path
          className="r-toran-string"
          d="M 1392 252 Q 1437 286 1482 252 Q 1527 286 1572 252"
          fill="none"
          stroke="#6a8f3d"
          strokeWidth="2"
        />
        {[1392, 1482, 1572].map((x) => (
          <g key={x} className="r-toran-strand">
            {[0, 1, 2, 3].map((j) => (
              <circle
                key={j}
                className="r-marigold"
                cx={x}
                cy={262 + j * 13}
                r="6.5"
                fill={j % 2 ? P.marigoldYellow : P.marigold}
              />
            ))}
            <path
              className="r-marigold"
              d={`M ${x - 6} 250 Q ${x - 16} 262 ${x - 10} 276 Q ${x - 4} 262 ${x - 6} 250 Z`}
              fill={P.leaf}
            />
            <path
              className="r-marigold"
              d={`M ${x + 6} 250 Q ${x + 16} 262 ${x + 10} 276 Q ${x + 4} 262 ${x + 6} 250 Z`}
              fill={P.leafDark}
            />
          </g>
        ))}
        {toranPts.map((p, i) => (
          <g key={i} className="r-marigold">
            <circle cx={p.x} cy={p.y + 4} r="7.5" fill={i % 2 ? P.marigold : P.marigoldYellow} />
            <circle
              cx={p.x}
              cy={p.y + 4}
              r="7.5"
              fill="none"
              stroke={P.marigoldDeep}
              strokeWidth="1.2"
              strokeDasharray="2.4 1.8"
            />
            <circle cx={p.x} cy={p.y + 4} r="2.2" fill={P.marigoldDeep} />
          </g>
        ))}
      </g>
      {/* Chappals left at the door. */}
      <Obj name="chappals">
        <g transform="translate(1476 712) rotate(-6)">
          <ellipse cx="0" cy="0" rx="17" ry="6" fill="#6b3b22" />
          <path d="M -6 -2 Q 0 -8 6 -2" fill="none" stroke="#c9983f" strokeWidth="2.5" />
        </g>
        <g transform="translate(1512 716) rotate(9)">
          <ellipse cx="0" cy="0" rx="17" ry="6" fill="#6b3b22" />
          <path d="M -6 -2 Q 0 -8 6 -2" fill="none" stroke="#c9983f" strokeWidth="2.5" />
        </g>
      </Obj>

      {/* ── Bookshelf ──────────────────────────────────────────────────────── */}
      <Obj name="shelf">
        <rect x="100" y="226" width="300" height="468" rx="4" fill={P.wood} />
        <rect x="114" y="238" width="272" height="296" fill={P.woodDark} />
        {[326, 426].map((y) => (
          <rect key={y} x="108" y={y} width="284" height="9" fill={P.woodLight} />
        ))}
        <rect x="108" y="526" width="284" height="10" fill={P.woodLight} />
        <rect
          x="116"
          y="544"
          width="130"
          height="138"
          rx="3"
          fill={P.woodLight}
          opacity="0.7"
          stroke={P.woodDark}
          strokeWidth="2"
        />
        <rect
          x="254"
          y="544"
          width="130"
          height="138"
          rx="3"
          fill={P.woodLight}
          opacity="0.7"
          stroke={P.woodDark}
          strokeWidth="2"
        />
        <circle cx="236" cy="612" r="4" fill="#c9983f" />
        <circle cx="264" cy="612" r="4" fill="#c9983f" />
        <rect x="96" y="220" width="308" height="10" rx="3" fill={P.woodLight} />
        <rect x="110" y="690" width="14" height="10" fill={P.woodDark} />
        <rect x="376" y="690" width="14" height="10" fill={P.woodDark} />
      </Obj>
      <g className="r-books">
        <BookRow x0={118} x1={300} base={326} seed={7} />
        <BookRow x0={118} x1={236} base={426} seed={21} />
        <BookRow x0={188} x1={384} base={526} seed={42} />
        {/* A school trophy — the years this bag belonged to. */}
        <g className="r-spine r-trophy">
          <path
            d="M 300 426 H 336 V 418 H 326 V 404 Q 342 400 344 380 H 350 Q 352 370 344 370 H 292 Q 284 370 286 380 H 292 Q 294 400 310 404 V 418 H 300 Z"
            fill="#d9a53a"
          />
          <path d="M 296 374 H 340 Q 338 396 318 400 Q 298 396 296 374 Z" fill="#efc15a" />
        </g>
        {/* Family photo. */}
        <g className="r-spine">
          <rect
            x="126"
            y="462"
            width="50"
            height="62"
            rx="2"
            fill="#f4e6cb"
            stroke={P.woodLight}
            strokeWidth="5"
          />
          <circle className="no-ink" cx="142" cy="486" r="6" fill={P.terracotta} />
          <circle className="no-ink" cx="160" cy="490" r="5" fill={P.teal} />
          <path
            className="no-ink"
            d="M 132 518 Q 142 496 152 518 Z M 150 518 Q 160 500 170 518 Z"
            fill={P.inkSoft}
            opacity="0.6"
          />
        </g>
        {/* A brass diya. */}
        <g className="r-spine">
          <path d="M 322 326 Q 340 338 358 326 Z" fill="#c9983f" />
          <path d="M 340 322 Q 334 312 340 302 Q 346 312 340 322 Z" fill="#ffb13b" />
        </g>
      </g>
      <Obj name="shelf-top">
        <path d="M 132 220 L 138 190 H 178 L 184 220 Z" fill={P.terracotta} />
        <rect x="134" y="186" width="48" height="8" rx="2" fill={P.terracottaDark} />
        <g fill={P.leaf}>
          {[
            [150, 176, -30],
            [166, 172, 20],
            [158, 162, 0],
            [142, 184, -60],
            [178, 184, 50],
          ].map(([x, y, r], i) => (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx="9"
              ry="15"
              transform={`rotate(${r} ${x} ${y})`}
              fill={i % 2 ? P.leafLight : P.leaf}
            />
          ))}
        </g>
        {/* Money plant vine trailing down the side. */}
        <path
          d="M 136 214 C 110 250 124 300 104 340 C 92 368 104 400 98 430"
          fill="none"
          stroke={P.leafDark}
          strokeWidth="2.5"
        />
        {[
          [124, 240],
          [114, 272],
          [118, 304],
          [104, 336],
          [100, 368],
          [102, 400],
        ].map(([x, y], i) => (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx="7"
            ry="10"
            transform={`rotate(${i % 2 ? 40 : -40} ${x} ${y})`}
            fill={i % 2 ? P.leafLight : P.leaf}
          />
        ))}
        <rect x="286" y="206" width="78" height="14" rx="2" fill={P.teal} />
        <rect x="292" y="194" width="66" height="12" rx="2" fill={P.mustard} />
      </Obj>

      {/* ── Floor lamp ─────────────────────────────────────────────────────── */}
      <path
        className="r-lamp-cone"
        d="M 918 336 L 1012 336 L 1090 712 L 840 712 Z"
        fill="url(#rm-cone)"
        opacity="0"
      />
      <ellipse
        className="r-lamp-pool"
        cx="965"
        cy="714"
        rx="130"
        ry="16"
        fill="#ffe2a0"
        opacity="0"
      />
      <Obj name="lamp">
        <ellipse cx="965" cy="712" rx="30" ry="7" fill="#9c6f2c" />
        <rect x="962" y="330" width="6" height="382" rx="3" fill="#b8863b" />
        <path
          d="M 928 272 H 1002 L 1020 338 H 910 Z"
          fill="url(#rm-shade)"
          stroke="#d2a860"
          strokeWidth="2"
        />
        <rect x="910" y="334" width="110" height="5" rx="2" fill="#c89a4e" />
        <circle className="r-lamp-bulb" cx="965" cy="344" r="9" fill="#fff4cf" opacity="0" />
      </Obj>

      {/* ── Sofa ───────────────────────────────────────────────────────────── */}
      <Obj name="sofa">
        <path d="M 430 520 Q 430 500 452 500 H 848 Q 870 500 870 520 V 616 H 430 Z" fill={P.sofa} />
        <path d="M 440 508 H 860" stroke={P.sofaLight} strokeWidth="5" strokeLinecap="round" />
        <g className="no-ink" fill={P.sofaDark}>
          {[500, 580, 660, 740, 820].map((x) => (
            <g key={x}>
              <circle cx={x} cy="540" r="3" />
              <circle cx={x - 40} cy="578" r="3" />
            </g>
          ))}
        </g>
        <rect x="458" y="604" width="384" height="50" rx="12" fill={P.sofaLight} />
        <path d="M 650 606 V 652" stroke={P.sofaDark} strokeWidth="2" />
        <rect x="458" y="648" width="384" height="52" fill={P.sofa} />
        <path d="M 462 654 H 838" stroke={P.sofaDark} strokeWidth="2.5" />
        <path
          d="M 405 572 Q 405 552 428 552 H 442 Q 466 552 466 572 V 700 H 405 Z"
          fill={P.sofaDark}
        />
        <path
          d="M 834 572 Q 834 552 858 552 H 872 Q 895 552 895 572 V 700 H 834 Z"
          fill={P.sofaDark}
        />
        <path
          d="M 410 566 Q 420 558 440 558"
          stroke={P.sofaLight}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 840 566 Q 850 558 870 558"
          stroke={P.sofaLight}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M 414 700 L 418 718 H 428 L 430 700 Z" fill={P.woodDark} />
        <path d="M 870 700 L 872 718 H 882 L 886 700 Z" fill={P.woodDark} />
        {/* Rani-pink dupatta thrown over the arm. */}
        <path
          d="M 432 506 Q 470 520 468 560 Q 466 610 452 668 L 430 664 Q 440 610 436 566 Q 432 530 420 516 Z"
          fill={P.rani}
        />
        <path d="M 452 668 L 430 664" stroke="#f0c04d" strokeWidth="5" />
        <g className="no-ink" stroke="#f0c04d" strokeWidth="1.6">
          <path d="M 434 666 V 678 M 440 667 V 680 M 446 668 V 678" />
        </g>
      </Obj>
      <Obj name="pillow-a">
        <g transform="rotate(-9 516 576)">
          <rect x="478" y="540" width="78" height="72" rx="14" fill={P.terracotta} />
          <rect
            x="484"
            y="546"
            width="66"
            height="60"
            rx="10"
            fill="none"
            stroke={P.mustardLight}
            strokeWidth="2"
            strokeDasharray="3 3"
          />
          <g className="no-ink" transform="translate(517 576)" fill={P.cream}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <ellipse key={a} cx="0" cy="-10" rx="4" ry="8" transform={`rotate(${a})`} />
            ))}
            <circle r="4" fill={P.mustardLight} />
          </g>
        </g>
      </Obj>
      <Obj name="pillow-b">
        <g transform="rotate(8 786 574)">
          <rect x="748" y="540" width="76" height="70" rx="14" fill={P.mustard} />
          <g className="no-ink" stroke={P.cream} strokeWidth="4" opacity="0.8">
            <path d="M 752 560 H 820 M 752 576 H 820 M 752 592 H 820" />
          </g>
        </g>
      </Obj>
      <g className="r-clothes">
        <g className="r-cloth">
          <rect x="712" y="626" width="96" height="22" rx="6" fill="#dfe8f2" />
          <g className="no-ink" stroke="#5a7fb5" strokeWidth="2.4">
            <path d="M 716 632 H 804 M 716 638 H 804 M 716 644 H 804" />
          </g>
        </g>
        <g className="r-cloth">
          <rect x="718" y="606" width="86" height="22" rx="6" fill={P.cream} />
          <path
            d="M 752 606 L 761 616 L 770 606"
            fill="none"
            stroke={P.creamShade}
            strokeWidth="2.5"
          />
        </g>
        <g className="r-cloth">
          <rect x="724" y="588" width="74" height="20" rx="6" fill="#c8413a" />
          <path d="M 752 588 Q 761 598 770 588" fill="none" stroke="#9c2a24" strokeWidth="2.5" />
        </g>
      </g>

      {/* ── Rug + coffee table ─────────────────────────────────────────────── */}
      <Obj name="rug">
        <path d="M 502 740 H 918 L 972 846 H 448 Z" fill="#8a2d21" />
        <path
          d="M 514 748 H 906 L 952 838 H 468 Z"
          fill="none"
          stroke={P.mustard}
          strokeWidth="4"
        />
        <path
          d="M 530 758 H 890 L 928 828 H 492 Z"
          fill="none"
          stroke={P.cream}
          strokeWidth="2"
          strokeDasharray="8 5"
        />
        <path d="M 710 764 L 770 793 L 710 822 L 650 793 Z" fill={P.mustard} />
        <path d="M 710 776 L 744 793 L 710 810 L 676 793 Z" fill={P.cream} />
      </Obj>
      <Obj name="table">
        <path d="M 540 716 H 836 L 832 732 H 544 Z" fill={P.woodLight} />
        <rect x="544" y="730" width="288" height="10" fill={P.wood} />
        <rect x="556" y="738" width="12" height="68" fill={P.woodDark} />
        <rect x="808" y="738" width="12" height="68" fill={P.woodDark} />
        <rect x="552" y="776" width="272" height="8" fill={P.wood} />
        <rect x="592" y="768" width="84" height="8" rx="1" fill="#e9d9b8" />
        <rect x="600" y="762" width="70" height="6" rx="1" fill={P.teal} />
      </Obj>
      <Obj name="laptop">
        <rect x="578" y="706" width="120" height="11" rx="3" fill="#a3a9b0" />
        <rect x="578" y="713" width="120" height="4" fill="#7c828a" />
        <g className="r-laptop-lid">
          <rect
            x="586"
            y="636"
            width="104"
            height="72"
            rx="6"
            fill="#8c939b"
            stroke="#6a7078"
            strokeWidth="2"
          />
          <circle cx="638" cy="670" r="7" fill="#b6bcc3" />
          <circle cx="608" cy="654" r="10" fill={P.glow} />
          <path className="no-ink" d="M 612 646 L 620 650 L 614 656 Z" fill="#fff" opacity="0.8" />
          <rect
            x="656"
            y="684"
            width="22"
            height="12"
            rx="2"
            fill="#6fa36b"
            transform="rotate(-12 667 690)"
          />
          <path className="no-ink" d="M 598 694 L 608 690" stroke="#6a7078" strokeWidth="1.5" />
        </g>
      </Obj>
      <Obj name="book">
        <rect x="704" y="698" width="84" height="5" rx="1.5" fill="#a8302a" />
        <rect x="706" y="703" width="80" height="9" fill="#f4e7cf" />
        <g className="no-ink" stroke="#d9c7a6" strokeWidth="1">
          <path d="M 708 706 H 784 M 708 709 H 784" />
        </g>
        <rect x="704" y="712" width="84" height="5" rx="1.5" fill="#a8302a" />
        <path d="M 770 717 V 730 L 774 726 L 778 730 V 717" fill="#f0c04d" />
      </Obj>
      <Obj name="chai">
        <path
          d="M 800 690 H 826 L 821 716 H 805 Z"
          fill="#fff"
          fillOpacity="0.35"
          stroke="#e8d5bf"
          strokeWidth="1.5"
        />
        <path d="M 801.5 697 H 824.5 L 820.5 715 H 805.5 Z" fill="#a8622e" />
        <g
          className="r-steam no-ink"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.7"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path className="r-steam-a" d="M 808 684 C 802 674 814 668 808 656" />
          <path className="r-steam-b" d="M 818 684 C 824 672 812 666 818 654" />
        </g>
      </Obj>

      {/* ── The box of old things ──────────────────────────────────────────── */}
      <Obj name="box">
        <ellipse cx="1160" cy="772" rx="104" ry="10" fill="#5a2e16" opacity="0.25" />
        <path d="M 1228 618 L 1250 596 V 750 L 1228 770 Z" fill="#a8763f" />
        <rect x="1072" y="618" width="156" height="152" fill="#c9955c" />
        <path d="M 1072 618 L 1094 596 H 1250 L 1228 618 Z" fill="#dcae74" />
        <path d="M 1150 596 L 1172 596 L 1150 618 L 1128 618 Z" fill="#ecd29e" opacity="0.9" />
        <rect x="1139" y="618" width="22" height="36" fill="#ecd29e" opacity="0.9" />
        <text
          className="no-ink"
          x="1086"
          y="712"
          fontFamily="var(--font-nunito), system-ui, sans-serif"
          fontWeight="900"
          fontSize="21"
          fill="#5a3b22"
          transform="rotate(-5 1150 704)"
        >
          OLD THINGS
        </text>
        <path
          className="no-ink"
          d="M 1092 736 H 1200"
          stroke="#5a3b22"
          strokeWidth="2"
          strokeLinecap="round"
          transform="rotate(-5 1150 704)"
        />
        <g className="no-ink" stroke="#5a3b22" strokeWidth="1.6" fill="none">
          <path d="M 1206 746 V 734 M 1202 738 L 1206 734 L 1210 738" />
        </g>
      </Obj>

      {/* ── Light from the window + dust in it ─────────────────────────────── */}
      <path
        className="r-beam"
        d="M 566 464 H 874 L 1210 960 H 820 Z"
        fill="url(#rm-beam)"
        opacity="0"
      />
      <g className="r-motes" fill="#fff6dc">
        {[
          [690, 520, 2.2],
          [742, 560, 1.6],
          [800, 610, 2.6],
          [860, 540, 1.8],
          [906, 660, 2],
          [950, 720, 1.4],
          [720, 640, 1.5],
          [830, 700, 2.2],
          [1000, 780, 1.8],
          [880, 800, 1.3],
          [770, 500, 1.4],
          [940, 600, 2.4],
        ].map(([x, y, r], i) => (
          <circle key={i} className="r-mote" cx={x} cy={y} r={r} opacity="0" />
        ))}
      </g>
    </g>
  );
}
