import { useId, type CSSProperties } from "react";

import { LOGO_PATH } from "@/components/LogoSVG";

/**
 * The Diwali CauseKind logo: the brand heart and wordmark with a lit diya beside
 * them and firecrackers going off around the name.
 *
 * <p>Drawn rather than filmed. The supplied clips had their backgrounds keyed out
 * and left halos on every surface; vector art has no background to remove, stays
 * sharp at any density, and the name stays real text that follows the theme.
 *
 * <p>Everything moves by transform and opacity from styles.css, so it runs on the
 * compositor, and reduced motion gets the logo and diya with no fireworks.
 */

const SPARKS = Array.from({ length: 12 }, (_, i) => i * 30);

/** `left` is a share of the logo's width, `top` is px from its top edge. */
const BURSTS = [
  { left: "20%", top: -6, reach: 13, colors: ["#f4a340", "#c2185b"], delay: "0s" },
  { left: "96%", top: -4, reach: 14, colors: ["#c2185b", "#f4a340"], delay: "1.7s" },
  { left: "58%", top: -5, reach: 12, colors: ["#e8912a", "#a31a44"], delay: "3.4s" },
] as const;

function Burst({ left, top, reach, colors, delay }: (typeof BURSTS)[number]) {
  return (
    <span
      className="ck-dlogo-burst pointer-events-none absolute"
      style={{ left, top, "--ck-dlogo-delay": delay, "--ck-dlogo-reach": `${reach}px` } as CSSProperties}
    >
      <span className="ck-dlogo-rocket" style={{ background: colors[0] }} />
      {SPARKS.map((angle, i) => (
        <span
          key={angle}
          className="ck-dlogo-spark"
          style={{ background: colors[i % 2], "--ck-dlogo-angle": `${angle}deg` } as CSSProperties}
        />
      ))}
    </span>
  );
}

export function DiwaliLogo({ className = "" }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <span
      // Decorative: the wrapper already carries aria-label="CauseKind", so
      // announcing it again would say the brand name twice.
      aria-hidden="true"
      className={`relative flex shrink-0 items-center gap-1.5 text-base font-extrabold tracking-tight sm:text-xl ${className}`}
    >
      <svg viewBox="-170 -10 917 790" className="block h-9 w-auto shrink-0 overflow-visible sm:h-10">
        <defs>
          <linearGradient id={`ck-dlogo-heart-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2c66d" />
            <stop offset="55%" stopColor="#d98a2b" />
            <stop offset="100%" stopColor="#a31a44" />
          </linearGradient>
          <linearGradient id={`ck-dlogo-bowl-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8501e" />
            <stop offset="100%" stopColor="#720d2d" />
          </linearGradient>
          <radialGradient id={`ck-dlogo-glow-${uid}`}>
            <stop offset="0%" stopColor="#f4a340" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#f4a340" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* The stroke thickens the mark's fine outline, which thins out at header size. */}
        <path
          d={LOGO_PATH}
          fill={`url(#ck-dlogo-heart-${uid})`}
          fillRule="evenodd"
          stroke={`url(#ck-dlogo-heart-${uid})`}
          strokeWidth="12"
        />

        <circle className="ck-dlogo-glow" cx="20" cy="450" r="240" fill={`url(#ck-dlogo-glow-${uid})`} />
        <g className="ck-dlogo-flame">
          <path d="M20 600C-70 525-34 430 20 290C74 430 110 525 20 600Z" fill="#e8591a" />
          <path d="M20 596C-34 545-14 480 20 390C54 480 74 545 20 596Z" fill="#fbbf24" />
        </g>
        <path
          d="M-165 590C-150 715-65 775 20 775C105 775 190 715 205 590C110 632-70 632-165 590Z"
          fill={`url(#ck-dlogo-bowl-${uid})`}
        />
        <ellipse cx="20" cy="590" rx="185" ry="30" fill="#3a0716" stroke="#f2c66d" strokeWidth="16" />
        <path d="M-85 690C-40 722 80 722 125 690" fill="none" stroke="#f2c66d" strokeWidth="14" strokeLinecap="round" />
      </svg>

      <span className="flex">
        <span className="ck-dlogo-cause text-stone-900 dark:text-stone-100">Cause</span>
        <span className="ck-logo-kind-shimmer">Kind</span>
      </span>

      {BURSTS.map((burst) => (
        <Burst key={burst.left} {...burst} />
      ))}
    </span>
  );
}
