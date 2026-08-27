/** Fixed precision, so the server and the browser stringify to the same text. */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * RakhiMotif — the rakhi itself, drawn once and shared.
 *
 * Two rings of petals (twelve outer, eight offset inner), a beaded gold collar,
 * and a centre stone with a highlight. Optional tassels hang from the bottom.
 *
 * <p>`petalRotation` turns only the flower. The tassels stay hanging, because a
 * rakhi whose threads spin with the rosette stops looking like an object with
 * weight and starts looking like a loading spinner.
 *
 * <p>`idPrefix` is required and must be unique per instance: the gradients are
 * referenced by id, and two instances sharing one id would make the second
 * silently adopt the first's fill.
 */
export function RakhiMotif({
  className,
  idPrefix,
  petalRotation = 0,
  withTassels = true,
  x,
  y,
  width,
  height,
}: {
  className?: string;
  idPrefix: string;
  petalRotation?: number;
  withTassels?: boolean;
  /** Set together to nest this inside another SVG's coordinate system. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  const outer = `${idPrefix}-outer`;
  const inner = `${idPrefix}-inner`;
  const stone = `${idPrefix}-stone`;

  return (
    <svg
      className={className}
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={outer} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id={inner} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#9a2c3f" />
        </linearGradient>
        <radialGradient id={stone} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#9a2c3f" />
        </radialGradient>
      </defs>

      {/* Tassels first, so the rosette always paints over where they attach. */}
      {withTassels && (
        <g
          className="ck-rakhi-tassels"
          stroke="#f59e0b"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M20.5 29 L17.6 43" />
          <path d="M24 30 L24 44.5" />
          <path d="M27.5 29 L30.4 43" />
          <circle cx="17.6" cy="44.2" r="1.5" fill="#fde047" stroke="none" />
          <circle cx="24" cy="45.7" r="1.5" fill="#fde047" stroke="none" />
          <circle cx="30.4" cy="44.2" r="1.5" fill="#fde047" stroke="none" />
        </g>
      )}

      <g
        className="ck-rakhi-petals"
        style={{
          transform: `rotate(${round3(petalRotation)}deg)`,
          transformOrigin: "24px 24px",
          // No transition. An eased transform lagged behind the scroll — the
          // flower kept turning after the page had stopped, which read as
          // delay. The rotation is applied the instant it changes.
        }}
      >
        {/* Twelve outer petals. */}
        {Array.from({ length: 12 }, (_, i) => (
          <ellipse
            key={`o${i}`}
            cx="24"
            cy="10.5"
            rx="3"
            ry="7.6"
            fill={`url(#${outer})`}
            transform={`rotate(${i * 30} 24 24)`}
          />
        ))}
        {/* Eight inner petals, offset into the gaps so the flower reads as two
            layers rather than one thick ring. */}
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse
            key={`i${i}`}
            cx="24"
            cy="15.5"
            rx="2.5"
            ry="4.8"
            fill={`url(#${inner})`}
            transform={`rotate(${i * 45 + 22.5} 24 24)`}
          />
        ))}

        {/* Beaded gold collar. */}
        <circle cx="24" cy="24" r="7.6" fill="#fde047" />
        <circle cx="24" cy="24" r="7.6" fill="none" stroke="#b45309" strokeWidth="0.9" />
        {/* The coordinates are rounded before they reach the DOM. Math.cos and
            Math.sin are not required by the spec to be correctly rounded, so
            Node and the browser can disagree in the final bits — the server
            emitted cx="17.851470842750402" where Chrome produced
            "17.8514708427504", and React reported that as a hydration
            mismatch. Three decimals is far finer than a 48-unit viewBox can
            show, and it is identical on both sides. */}
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i * 36 * Math.PI) / 180;
          return (
            <circle
              key={`b${i}`}
              cx={round3(24 + Math.cos(a) * 7.6)}
              cy={round3(24 + Math.sin(a) * 7.6)}
              r="0.95"
              fill="#fffbeb"
            />
          );
        })}

        {/* Centre stone, with the highlight kept off-centre so it reads as a
            curved surface catching light rather than a flat disc. */}
        <circle cx="24" cy="24" r="4.4" fill={`url(#${stone})`} />
        <circle cx="24" cy="24" r="4.4" fill="none" stroke="#7c2d12" strokeWidth="0.7" />
        <ellipse cx="22.4" cy="22.3" rx="1.3" ry="0.9" fill="#fffbeb" opacity="0.85" />
      </g>
    </svg>
  );
}
