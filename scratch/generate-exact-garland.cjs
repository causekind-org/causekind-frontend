const fs = require('fs');

function generateGarlandTsx() {
  return `
/* Reusable SVG Definitions for Garland */
function GarlandDefs() {
  return (
    <defs>
      <filter id="refGarlandDropShadow" x="-25%" y="-15%" width="150%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#451a03" floodOpacity="0.28" />
      </filter>

      {/* Marigold Saffron Orange Gradient */}
      <radialGradient id="refOrangeGrad" cx="38%" cy="36%" r="65%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="22%" stopColor="#fb923c" />
        <stop offset="65%" stopColor="#ea580c" />
        <stop offset="90%" stopColor="#c2410c" />
        <stop offset="100%" stopColor="#991b1b" />
      </radialGradient>

      {/* Marigold Golden Yellow Gradient */}
      <radialGradient id="refYellowGrad" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="25%" stopColor="#fef08a" />
        <stop offset="65%" stopColor="#facc15" />
        <stop offset="90%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>

      {/* Mango Leaf Gradients */}
      <linearGradient id="refLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="35%" stopColor="#22c55e" />
        <stop offset="80%" stopColor="#16a34a" />
        <stop offset="100%" stopColor="#15803d" />
      </linearGradient>
      <linearGradient id="refLeafGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22c55e" />
        <stop offset="45%" stopColor="#16a34a" />
        <stop offset="85%" stopColor="#15803d" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
    </defs>
  );
}

function MarigoldBlossom({ cx, cy, r, isYellow = false }: { cx: number; cy: number; r: number; isYellow?: boolean }) {
  const outerFill = isYellow ? "url(#refYellowGrad)" : "url(#refOrangeGrad)";
  const innerFill = isYellow ? "#fef08a" : "#fb923c";
  const stroke = isYellow ? "#b45309" : "#991b1b";
  const midStroke = isYellow ? "#ca8a04" : "#c2410c";

  const lobes = 14;
  let dOuter = "";
  for (let i = 0; i < lobes; i++) {
    const a1 = (i / lobes) * Math.PI * 2;
    const a2 = ((i + 0.5) / lobes) * Math.PI * 2;
    const a3 = ((i + 1) / lobes) * Math.PI * 2;
    const rBase = r * 0.82;
    const rPeak = r;
    const x1 = (cx + Math.cos(a1) * rBase).toFixed(1);
    const y1 = (cy + Math.sin(a1) * rBase).toFixed(1);
    const xMid = (cx + Math.cos(a2) * rPeak).toFixed(1);
    const yMid = (cy + Math.sin(a2) * rPeak).toFixed(1);
    const x2 = (cx + Math.cos(a3) * rBase).toFixed(1);
    const y2 = (cy + Math.sin(a3) * rBase).toFixed(1);
    if (i === 0) dOuter += \`M \${x1} \${y1} \`;
    dOuter += \`Q \${xMid} \${yMid} \${x2} \${y2} \`;
  }
  dOuter += "Z";

  return (
    <g filter="url(#refGarlandDropShadow)">
      <path d={dOuter} fill={outerFill} stroke={stroke} strokeWidth="0.6" />
      <circle cx={cx} cy={cy} r={(r * 0.72).toFixed(1)} fill="none" stroke={midStroke} strokeWidth="0.75" strokeDasharray="3,1.5" />
      <circle cx={cx} cy={cy} r={(r * 0.48).toFixed(1)} fill="none" stroke={stroke} strokeWidth="0.6" />
      <circle cx={cx} cy={cy} r={(r * 0.28).toFixed(1)} fill={innerFill} />
      <circle cx={cx} cy={cy} r={(r * 0.14).toFixed(1)} fill={stroke} />
    </g>
  );
}

function SerratedFlankingLeaf({ cx, cy, isRight = false }: { cx: number; cy: number; isRight?: boolean }) {
  const f = isRight ? 1 : -1;
  return (
    <g>
      <path
        d={\`M \${cx},\${cy} 
             C \${cx + f * 4},\${cy + 4} \${cx + f * 10},\${cy + 10} \${cx + f * 12},\${cy + 18} 
             L \${cx + f * 15},\${cy + 21} L \${cx + f * 12},\${cy + 24} 
             L \${cx + f * 16},\${cy + 28} L \${cx + f * 13},\${cy + 32} 
             L \${cx + f * 16},\${cy + 36} L \${cx + f * 11},\${cy + 42} 
             C \${cx + f * 10},\${cy + 48} \${cx + f * 6},\${cy + 52} \${cx + f * 5},\${cy + 56} 
             C \${cx + f * 3},\${cy + 48} \${cx + f * 1},\${cy + 38} \${cx + f * 2},\${cy + 26} 
             C \${cx + f * 2},\${cy + 16} \${cx + f * 1},\${cy + 6} \${cx},\${cy} Z\`}
        fill="url(#refLeafGrad)"
        stroke="#14532d"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      <path
        d={\`M \${cx},\${cy + 2} Q \${cx + f * 7},\${cy + 26} \${cx + f * 5},\${cy + 52}\`}
        stroke="#86efac"
        strokeWidth="0.65"
        fill="none"
        opacity="0.8"
      />
    </g>
  );
}

function TasselThreeLeaves({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g filter="url(#refGarlandDropShadow)">
      <path
        d={\`M \${cx},\${cy} C \${cx - 5},\${cy + 8} \${cx - 12},\${cy + 18} \${cx - 13},\${cy + 28} L \${cx - 16},\${cy + 32} L \${cx - 12},\${cy + 36} L \${cx - 15},\${cy + 42} C \${cx - 13},\${cy + 50} \${cx - 9},\${cy + 56} \${cx - 8},\${cy + 62} C \${cx - 6},\${cy + 50} \${cx - 3},\${cy + 36} \${cx},\${cy} Z\`}
        fill="url(#refLeafGradDark)"
        stroke="#14532d"
        strokeWidth="0.7"
      />
      <path
        d={\`M \${cx},\${cy} C \${cx + 5},\${cy + 8} \${cx + 12},\${cy + 18} \${cx + 13},\${cy + 28} L \${cx + 16},\${cy + 32} L \${cx + 12},\${cy + 36} L \${cx + 15},\${cy + 42} C \${cx + 13},\${cy + 50} \${cx + 9},\${cy + 56} \${cx + 8},\${cy + 62} C \${cx + 6},\${cy + 50} \${cx + 3},\${cy + 36} \${cx},\${cy} Z\`}
        fill="url(#refLeafGradDark)"
        stroke="#14532d"
        strokeWidth="0.7"
      />
      <path
        d={\`M \${cx},\${cy} C \${cx - 3},\${cy + 12} \${cx - 4},\${cy + 24} \${cx - 3},\${cy + 36} L \${cx - 6},\${cy + 40} L \${cx - 3},\${cy + 46} L \${cx - 5},\${cy + 52} C \${cx - 3},\${cy + 58} \${cx},\${cy + 64} \${cx},\${cy + 68} C \${cx},\${cy + 64} \${cx + 3},\${cy + 58} \${cx + 5},\${cy + 52} L \${cx + 3},\${cy + 46} L \${cx + 6},\${cy + 40} L \${cx + 3},\${cy + 36} C \${cx + 4},\${cy + 24} \${cx + 3},\${cy + 12} \${cx},\${cy} Z\`}
        fill="url(#refLeafGrad)"
        stroke="#14532d"
        strokeWidth="0.75"
      />
      <line x1={cx} y1={cy + 2} x2={cx} y2={cy + 64} stroke="#14532d" strokeWidth="0.7" />
    </g>
  );
}

function TasselFourLeaves({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g filter="url(#refGarlandDropShadow)">
      <path
        d={\`M \${cx},\${cy} C \${cx - 6},\${cy + 6} \${cx - 14},\${cy + 16} \${cx - 16},\${cy + 26} L \${cx - 19},\${cy + 30} L \${cx - 15},\${cy + 34} L \${cx - 18},\${cy + 40} C \${cx - 15},\${cy + 48} \${cx - 11},\${cy + 54} \${cx - 10},\${cy + 60} C \${cx - 7},\${cy + 48} \${cx - 3},\${cy + 34} \${cx},\${cy} Z\`}
        fill="url(#refLeafGradDark)"
        stroke="#14532d"
        strokeWidth="0.7"
      />
      <path
        d={\`M \${cx},\${cy} C \${cx - 3},\${cy + 8} \${cx - 7},\${cy + 20} \${cx - 6},\${cy + 32} L \${cx - 9},\${cy + 36} L \${cx - 5},\${cy + 42} C \${cx - 4},\${cy + 52} \${cx - 2},\${cy + 60} \${cx - 2},\${cy + 66} C \${cx - 1},\${cy + 52} \${cx},\${cy + 36} \${cx},\${cy} Z\`}
        fill="url(#refLeafGrad)"
        stroke="#14532d"
        strokeWidth="0.7"
      />
      <path
        d={\`M \${cx},\${cy} C \${cx + 3},\${cy + 8} \${cx + 7},\${cy + 20} \${cx + 6},\${cy + 32} L \${cx + 9},\${cy + 36} L \${cx + 5},\${cy + 42} C \${cx + 4},\${cy + 52} \${cx + 2},\${cy + 60} \${cx + 2},\${cy + 66} C \${cx + 1},\${cy + 52} \${cx},\${cy + 36} \${cx},\${cy} Z\`}
        fill="url(#refLeafGrad)"
        stroke="#14532d"
        strokeWidth="0.7"
      />
      <path
        d={\`M \${cx},\${cy} C \${cx + 6},\${cy + 6} \${cx + 14},\${cy + 16} \${cx + 16},\${cy + 26} L \${cx + 19},\${cy + 30} L \${cx + 15},\${cy + 34} L \${cx + 18},\${cy + 40} C \${cx + 15},\${cy + 48} \${cx + 11},\${cy + 54} \${cx + 10},\${cy + 60} C \${cx + 7},\${cy + 48} \${cx + 3},\${cy + 34} \${cx},\${cy} Z\`}
        fill="url(#refLeafGradDark)"
        stroke="#14532d"
        strokeWidth="0.7"
      />
    </g>
  );
}

function SpacedStrand({ x, startY, stations = 5, r = 10 }: { x: number; startY: number; stations?: number; r?: number }) {
  const step = 64;
  const endY = startY + (stations - 1) * step;

  return (
    <g className="ck-toran-leaf-sway" style={{ transformOrigin: \`\${x}px 10px\` }}>
      <line x1={x} y1={startY - 20} x2={x} y2={endY} stroke="#14532d" strokeWidth={2} />
      {Array.from({ length: stations }).map((_, i) => {
        const cy = startY + i * step;
        if (i < stations - 1) {
          return (
            <React.Fragment key={i}>
              <SerratedFlankingLeaf cx={x} cy={cy - 2} isRight={false} />
              <SerratedFlankingLeaf cx={x} cy={cy - 2} isRight={true} />
              <MarigoldBlossom cx={x} cy={cy} r={r} isYellow={false} />
            </React.Fragment>
          );
        }
        return (
          <React.Fragment key={i}>
            <MarigoldBlossom cx={x} cy={cy} r={r} isYellow={false} />
            <TasselThreeLeaves cx={x} cy={cy + r * 0.5} />
          </React.Fragment>
        );
      })}
    </g>
  );
}

function ChainStrand({ x, startY, count = 12, r = 9.5, delay = "0.2s" }: { x: number; startY: number; count?: number; r?: number; delay?: string }) {
  const step = r * 1.56;
  const lastCy = startY + (count - 1) * step;

  return (
    <g className="ck-toran-leaf-sway" style={{ transformOrigin: \`\${x}px 10px\`, animationDelay: delay }}>
      <line x1={x} y1={startY - 16} x2={x} y2={lastCy} stroke="#14532d" strokeWidth={1.8} />
      {Array.from({ length: count }).map((_, i) => {
        const cy = startY + i * step;
        const isYellow = (i % 2 === 0);
        return <MarigoldBlossom key={i} cx={x} cy={cy} r={r} isYellow={isYellow} />;
      })}
      <TasselFourLeaves cx={x} cy={lastCy + r * 0.5} />
    </g>
  );
}

/**
 * Clean, layered VECTOR illustration style garland (SVG-based)
 * Matches the user's reference image exactly:
 * - 4 distinct vertical strands side-by-side with generous, clean horizontal spacing.
 * - Strand 1 (longest): green string with spaced orange marigolds flanked by serrated mango leaves.
 * - Strand 2 (second longest): solid chain of alternating yellow and orange marigolds.
 * - Strand 3 (third longest): spaced orange marigolds flanked by serrated mango leaves.
 * - Strand 4 (shortest): solid chain of alternating yellow and orange marigolds.
 */
export function GanpatiGarlandLeft({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 365" width={215} height={365} fill="none">
      <GarlandDefs />
      {/* 4 Distinct Vertical Strands with generous spacing */}
      <SpacedStrand x={28} startY={26} stations={5} r={10} />
      <ChainStrand x={78} startY={16} count={12} r={9.5} delay="0.25s" />
      <SpacedStrand x={128} startY={26} stations={4} r={10} />
      <ChainStrand x={178} startY={16} count={8} r={9.5} delay="0.5s" />
    </svg>
  );
}

/**
 * Right Corner Garland — Symmetrical / mirrored version of the exact same 4-strand garland design.
 * Positioned in the top-right corner, shifted slightly inward so it sits cleanly next to the bell without colliding.
 */
export function GanpatiGarlandRight({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 215 365" width={215} height={365} fill="none">
      <GarlandDefs />
      {/* 4 Distinct Vertical Strands (mirrored) */}
      <ChainStrand x={36} startY={16} count={8} r={9.5} delay="0.5s" />
      <SpacedStrand x={86} startY={26} stations={4} r={10} />
      <ChainStrand x={136} startY={16} count={12} r={9.5} delay="0.25s" />
      <SpacedStrand x={186} startY={26} stations={5} r={10} />
    </svg>
  );
}

/**
 * GanpatiCornerGarlands — Festive Botanical Garlands
 * Originates from the top corners of the navbar, draping down continuously into the hero section.
 */
export function GanpatiCornerGarlands() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[380px] overflow-visible z-40 select-none"
      aria-hidden="true"
    >
      <GanpatiAnimationStyles />
      {/* Left Corner Garland — 4 distinct vertical strands matching reference image */}
      <div className="hidden md:block absolute top-0 left-1 sm:left-2 lg:left-3 w-[105px] sm:w-[120px] lg:w-[138px]">
        <GanpatiGarlandLeft className="w-full h-auto" />
      </div>

      {/* Right Corner Garland — Symmetrical 4 strands shifted slightly inward from the corner to avoid colliding with the bell */}
      <div className="hidden md:block absolute top-0 right-10 sm:right-12 lg:right-14 w-[105px] sm:w-[120px] lg:w-[138px]">
        <GanpatiGarlandRight className="w-full h-auto" />
      </div>
    </div>
  );
}
`;
}

fs.writeFileSync('scratch/exact_garland_component.tsx', generateGarlandTsx());
console.log('Garland component generated!');
