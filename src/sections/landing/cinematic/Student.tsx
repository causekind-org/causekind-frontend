import { BAG } from "./cutouts";
import { P } from "./palette";

/**
 * The student at the other end of the route — the person the bag was for.
 *
 * <p>Replaces the cropped illustration of a girl that sat in the corner of the
 * old listing image. She is drawn to fit a circular portal of radius 200
 * centred on (0, 0), so the chapter can open her world out of a map pin and
 * scale it to any screen with one transform.
 *
 * <p>Two expressions, swapped by the chapter: `st-wonder` (looking up at the
 * bag arriving) and `st-happy` (once it is on her back). The bag she ends up
 * wearing is the same illustration the whole film follows, drawn behind her,
 * with straps (`st-strap`) that draw over her shoulders as it lands.
 *
 * <p>Illustrative, not a real recipient: no name, no age, no place.
 */
const PETALS = Array.from({ length: 20 }, (_, i) => {
  const a = (i / 20) * Math.PI * 2 + (i % 2) * 0.2;
  const d = 120 + ((i * 37) % 70);
  return {
    dx: Math.round(Math.cos(a) * d),
    dy: Math.round(Math.sin(a) * d - 30),
    r: (i * 53) % 360,
    c: i % 3 === 0 ? P.marigoldYellow : i % 3 === 1 ? P.marigold : P.marigoldDeep,
  };
});

export const STUDENT_PETALS = PETALS;

function Braid({ side }: { side: 1 | -1 }) {
  const segs = Array.from({ length: 6 }, (_, i) => ({ x: side * (60 + i * 3.2), y: 8 + i * 19 }));
  const end = segs[segs.length - 1];
  return (
    <g>
      {segs.map((s, i) => (
        <ellipse
          key={i}
          cx={s.x}
          cy={s.y}
          rx="13"
          ry="15"
          fill={i % 2 ? P.hair : P.hairShine}
          transform={`rotate(${side * (i % 2 ? 18 : -18)} ${s.x} ${s.y})`}
        />
      ))}
      {/* Red ribbon bow. */}
      <g transform={`translate(${end.x} ${end.y + 20})`}>
        <ellipse cx={-11} cy="0" rx="12" ry="7" fill="#d8342c" transform="rotate(-24)" />
        <ellipse cx={11} cy="0" rx="12" ry="7" fill="#d8342c" transform="rotate(24)" />
        <path d="M -3 4 L -9 24 L -2 20 Z M 3 4 L 9 24 L 2 20 Z" fill="#b8241e" />
        <circle r="5" fill="#b8241e" />
      </g>
    </g>
  );
}

export function Student() {
  return (
    <g className="st-root">
      <defs>
        <radialGradient id="st-bg" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#fff7e6" />
          <stop offset="0.7" stopColor="#f8dfb0" />
          <stop offset="1" stopColor="#f3d39c" />
        </radialGradient>
        <linearGradient id="st-shirt" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f7f4ee" />
          <stop offset="1" stopColor="#e6dfd0" />
        </linearGradient>
      </defs>

      {/* Sized for the moment the window swells past its circle to fill the screen. */}
      <rect x="-3000" y="-3000" width="6000" height="6000" fill="#f3d39c" />
      <circle r="200" fill="url(#st-bg)" />
      {/* Sun rays behind her. */}
      <g className="st-rays" opacity="0.5">
        {Array.from({ length: 16 }, (_, i) => (
          <path
            key={i}
            d="M 0 -6 L 260 -22 L 260 22 L 0 6 Z"
            fill="#fff"
            opacity="0.35"
            transform={`rotate(${i * 22.5})`}
          />
        ))}
      </g>
      {/* The same marigold toran as her door in Chapter 1 — a small rhyme. */}
      <g className="st-toran">
        <path d="M -190 -120 Q 0 -40 190 -120" fill="none" stroke="#6a8f3d" strokeWidth="2.5" />
        {Array.from({ length: 15 }, (_, i) => {
          const t = i / 14;
          const x = -190 + 380 * t;
          const y = (1 - t) * (1 - t) * -120 + 2 * (1 - t) * t * -40 + t * t * -120;
          return (
            <circle key={i} cx={x} cy={y + 5} r="8" fill={i % 2 ? P.marigold : P.marigoldYellow} />
          );
        })}
      </g>

      {/* The bag she will be wearing, behind her. */}
      <g className="st-worn-bag" opacity="0">
        <g transform={`translate(28 150) scale(0.9) translate(${-BAG.body.cx} ${-BAG.body.cy})`}>
          <image href={BAG.src} width={BAG.w} height={BAG.h} />
        </g>
      </g>

      <g className="st-person">
        {/* Hair behind the head. */}
        <ellipse cx="0" cy="-40" rx="68" ry="72" fill={P.hair} />
        {/* Shoulders: white shirt, navy pinafore. */}
        <path
          d="M -150 700 L -134 120 Q -128 76 -70 62 L -24 50 L 24 50 L 70 62 Q 128 76 134 120 L 150 700 Z"
          fill="url(#st-shirt)"
        />
        <path d="M -66 118 H 66 L 84 700 H -84 Z" fill="#2e3d6b" />
        <path d="M -84 66 L -60 64 L -54 124 L -72 124 Z" fill="#2e3d6b" />
        <path d="M 84 66 L 60 64 L 54 124 L 72 124 Z" fill="#2e3d6b" />
        <path d="M -30 150 h 22 v 14 q -11 12 -22 0 z" fill={P.marigoldDeep} />
        {/* Neck + collar. */}
        <rect x="-19" y="14" width="38" height="44" rx="8" fill={P.skin} />
        <path d="M -19 34 Q 0 46 19 34 V 44 Q 0 56 -19 44 Z" fill={P.skinShade} opacity="0.6" />
        <path d="M -30 50 L -4 82 L -42 76 Z" fill="#fbf8f2" stroke="#d5cdbd" strokeWidth="2" />
        <path d="M 30 50 L 4 82 L 42 76 Z" fill="#fbf8f2" stroke="#d5cdbd" strokeWidth="2" />

        {/* Straps of the worn bag, drawn over the shoulders on arrival. */}
        <g className="st-straps" fill="none" strokeLinecap="round">
          <path
            className="st-strap"
            d="M -60 60 C -92 64 -100 110 -98 330"
            stroke="#9c4a24"
            strokeWidth="20"
          />
          <path
            className="st-strap"
            d="M 60 60 C 92 64 100 110 98 330"
            stroke="#9c4a24"
            strokeWidth="20"
          />
          <path
            className="st-strap"
            d="M -60 60 C -92 64 -100 110 -98 330"
            stroke="#d8905a"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          <path
            className="st-strap"
            d="M 60 60 C 92 64 100 110 98 330"
            stroke="#d8905a"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
        </g>

        <Braid side={-1} />
        <Braid side={1} />

        {/* Head. */}
        <ellipse cx="-55" cy="-24" rx="10" ry="14" fill={P.skin} />
        <ellipse cx="55" cy="-24" rx="10" ry="14" fill={P.skin} />
        <circle cx="-56" cy="-9" r="3" fill="#e5b33e" />
        <circle cx="56" cy="-9" r="3" fill="#e5b33e" />
        <ellipse cx="0" cy="-30" rx="56" ry="63" fill={P.skin} />
        <ellipse cx="-32" cy="2" rx="11" ry="7" fill="#e0765f" opacity="0.35" />
        <ellipse cx="32" cy="2" rx="11" ry="7" fill="#e0765f" opacity="0.35" />
        <path
          d="M -60 -26 C -64 -88 -26 -106 0 -102 C 26 -106 64 -88 60 -26 C 54 -58 32 -74 5 -72 L 0 -62 L -5 -72 C -32 -74 -54 -58 -60 -26 Z"
          fill={P.hair}
        />
        <path
          d="M -40 -84 C -26 -94 -12 -97 -4 -96"
          fill="none"
          stroke={P.hairShine}
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Brows. */}
        <path
          className="st-brows"
          d="M -33 -46 Q -22 -53 -10 -47 M 33 -46 Q 22 -53 10 -47"
          fill="none"
          stroke={P.hair}
          strokeWidth="3.6"
          strokeLinecap="round"
        />

        {/* Wonder: eyes up at the incoming bag, mouth a small "o". */}
        <g className="st-wonder">
          <ellipse cx="-21" cy="-24" rx="9.5" ry="10.5" fill="#fff" />
          <ellipse cx="21" cy="-24" rx="9.5" ry="10.5" fill="#fff" />
          <circle cx="-22" cy="-27" r="6.6" fill={P.hair} />
          <circle cx="20" cy="-27" r="6.6" fill={P.hair} />
          <circle cx="-24" cy="-30" r="2.2" fill="#fff" />
          <circle cx="18" cy="-30" r="2.2" fill="#fff" />
          <ellipse cx="0" cy="16" rx="5.5" ry="6.5" fill="#6b2a22" />
        </g>
        {/* Happy: crescent eyes, a real smile. */}
        <g className="st-happy" opacity="0">
          <path
            d="M -31 -22 Q -21 -34 -11 -22 M 11 -22 Q 21 -34 31 -22"
            fill="none"
            stroke={P.hair}
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path d="M -22 6 Q 0 38 22 6 Q 0 15 -22 6 Z" fill="#6b2a22" />
          <path d="M -16 8.5 Q 0 15 16 8.5 L 14.5 12.5 Q 0 19 -14.5 12.5 Z" fill="#fff" />
        </g>
        <path
          d="M -2 -12 Q -6 -2 2 0"
          fill="none"
          stroke={P.skinShade}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>

      {/* Sparkles and a burst of marigold petals. */}
      <g className="st-sparks" fill="#fff">
        {[
          [-148, -118, 1],
          [150, -96, 0.8],
          [-160, 70, 0.7],
          [164, 84, 1],
        ].map(([x, y, s], i) => (
          <path
            key={i}
            className="st-spark"
            d="M 0 -18 L 4 -4 L 18 0 L 4 4 L 0 18 L -4 4 L -18 0 L -4 -4 Z"
            transform={`translate(${x} ${y}) scale(${s})`}
            opacity="0"
          />
        ))}
      </g>
      <g className="st-petals">
        {PETALS.map((p, i) => (
          <ellipse
            key={i}
            className="st-petal"
            cx="0"
            cy="-20"
            rx="6"
            ry="10"
            fill={p.c}
            opacity="0"
          />
        ))}
      </g>
    </g>
  );
}
