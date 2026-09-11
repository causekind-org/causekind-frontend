
// Helper to generate ruffled petal path
function getRuffledPetals(cx: number, cy: number, r: number, lobes: number, rBaseRatio: number, phaseOffset = 0) {
  let d = "";
  for (let i = 0; i < lobes; i++) {
    const a1 = ((i + phaseOffset) / lobes) * Math.PI * 2;
    const a2 = ((i + phaseOffset + 0.5) / lobes) * Math.PI * 2;
    const a3 = ((i + phaseOffset + 1) / lobes) * Math.PI * 2;
    const rBase = r * rBaseRatio;
    const rPeak = r;
    const x1 = (cx + Math.cos(a1) * rBase).toFixed(1);
    const y1 = (cy + Math.sin(a1) * rBase).toFixed(1);
    const xMid = (cx + Math.cos(a2) * rPeak).toFixed(1);
    const yMid = (cy + Math.sin(a2) * rPeak).toFixed(1);
    const x2 = (cx + Math.cos(a3) * rBase).toFixed(1);
    const y2 = (cy + Math.sin(a3) * rBase).toFixed(1);
    if (i === 0) d += `M ${x1} ${y1} `;
    d += `Q ${xMid} ${yMid} ${x2} ${y2} `;
  }
  return d + "Z";
}

function MarigoldBlossom({ cx, cy, r, isYellow = false }: { cx: number; cy: number; r: number; isYellow?: boolean }) {
  const outerGrad = isYellow ? "url(#vgYellowGrad)" : "url(#vgOrangeGrad)";
  const midGrad = isYellow ? "url(#vgYellowMidGrad)" : "url(#vgOrangeMidGrad)";
  const inGrad = isYellow ? "url(#vgYellowInnerGrad)" : "url(#vgOrangeInnerGrad)";

  const dOuter = getRuffledPetals(cx, cy, r, 14, 0.82, 0);
  const dMid = getRuffledPetals(cx, cy, r * 0.72, 11, 0.8, 0.25);
  const dIn = getRuffledPetals(cx, cy, r * 0.44, 8, 0.75, 0.5);

  return (
    <g filter="url(#vgGarlandShadow)">
      <circle cx={cx} cy={cy + 1.5} r={(r * 0.92).toFixed(1)} fill="#451a03" opacity="0.32" />
      <path d={dOuter} fill={outerGrad} stroke="#c2410c" strokeWidth="0.5" strokeOpacity="0.4" />
      <path d={dMid} fill={midGrad} stroke="#b45309" strokeWidth="0.4" strokeOpacity="0.5" />
      <path d={dIn} fill={inGrad} />
      <circle cx={cx} cy={cy} r={(r * 0.22).toFixed(1)} fill="#9a3412" />
      <circle cx={cx} cy={cy} r={(r * 0.12).toFixed(1)} fill="#fef08a" />
    </g>
  );
}

function MangoLeaf({ x, y, length, angleDeg }: { x: number; y: number; length: number; angleDeg: number }) {
  const w = length * 0.32;
  const l = length;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angleDeg})`}>
      <path
        d={`M 0,0 C -${(w).toFixed(1)},${(l * 0.28).toFixed(1)} -${(w).toFixed(1)},${(l * 0.65).toFixed(1)} 0,${(l).toFixed(1)} C ${(w).toFixed(1)},${(l * 0.65).toFixed(1)} ${(w).toFixed(1)},${(l * 0.28).toFixed(1)} 0,0 Z`}
        fill="#052e16"
        opacity="0.22"
        transform="translate(0, 1.2)"
      />
      <path
        d={`M 0,0 C -${(w).toFixed(1)},${(l * 0.28).toFixed(1)} -${(w).toFixed(1)},${(l * 0.65).toFixed(1)} 0,${(l).toFixed(1)} L 0,0 Z`}
        fill="url(#vgLeafDarkGrad)"
      />
      <path
        d={`M 0,0 C ${(w).toFixed(1)},${(l * 0.28).toFixed(1)} ${(w).toFixed(1)},${(l * 0.65).toFixed(1)} 0,${(l).toFixed(1)} L 0,0 Z`}
        fill="url(#vgLeafLightGrad)"
      />
      <path
        d={`M 0,${(l * 0.08).toFixed(1)} C ${(w * 0.5).toFixed(1)},${(l * 0.3).toFixed(1)} ${(w * 0.4).toFixed(1)},${(l * 0.6).toFixed(1)} 0,${(l * 0.85).toFixed(1)}`}
        stroke="#bbf7d0"
        strokeWidth="0.75"
        strokeLinecap="round"
        fill="none"
        opacity="0.65"
      />
      <line x1="0" y1="0" x2="0" y2={(l * 0.95).toFixed(1)} stroke="#14532d" strokeWidth="0.8" opacity="0.8" />
    </g>
  );
}

function MangoLeafBunch({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const l = 32 * scale;
  return (
    <g filter="url(#vgGarlandShadow)">
      <MangoLeaf x={cx} y={cy} length={l * 0.88} angleDeg={-36} />
      <MangoLeaf x={cx} y={cy} length={l * 0.94} angleDeg={-18} />
      <MangoLeaf x={cx} y={cy} length={l * 0.94} angleDeg={18} />
      <MangoLeaf x={cx} y={cy} length={l * 0.88} angleDeg={36} />
      <MangoLeaf x={cx} y={cy} length={l * 1.05} angleDeg={0} />
    </g>
  );
}

function MangoLeafTip({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const l = 25 * scale;
  return (
    <g>
      <MangoLeaf x={cx} y={cy} length={l * 0.85} angleDeg={-20} />
      <MangoLeaf x={cx} y={cy} length={l * 0.85} angleDeg={20} />
      <MangoLeaf x={cx} y={cy} length={l * 1.0} angleDeg={0} />
    </g>
  );
}

function VectorGarlandDefs() {
  return (
    <defs>
      <filter id="vgGarlandShadow" x="-30%" y="-20%" width="160%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#451a03" floodOpacity="0.28" />
      </filter>

      {/* Marigold Rich Saffron Orange */}
      <radialGradient id="vgOrangeGrad" cx="38%" cy="36%" r="65%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="20%" stopColor="#fb923c" />
        <stop offset="60%" stopColor="#ea580c" />
        <stop offset="88%" stopColor="#c2410c" />
        <stop offset="100%" stopColor="#7c2d12" />
      </radialGradient>
      <radialGradient id="vgOrangeMidGrad" cx="36%" cy="34%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="25%" stopColor="#fed7aa" />
        <stop offset="55%" stopColor="#f97316" />
        <stop offset="85%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#9a3412" />
      </radialGradient>
      <radialGradient id="vgOrangeInnerGrad" cx="42%" cy="38%" r="55%">
        <stop offset="0%" stopColor="#fef9c3" />
        <stop offset="45%" stopColor="#fbbf24" />
        <stop offset="85%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#9a3412" />
      </radialGradient>

      {/* Marigold Radiant Golden Yellow */}
      <radialGradient id="vgYellowGrad" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="25%" stopColor="#fef08a" />
        <stop offset="60%" stopColor="#facc15" />
        <stop offset="85%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
      <radialGradient id="vgYellowMidGrad" cx="36%" cy="34%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor="#fef9c3" />
        <stop offset="65%" stopColor="#facc15" />
        <stop offset="90%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </radialGradient>
      <radialGradient id="vgYellowInnerGrad" cx="42%" cy="38%" r="55%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#fef08a" />
        <stop offset="85%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>

      {/* Glossy Mango Leaf Gradients */}
      <linearGradient id="vgLeafDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#166534" />
        <stop offset="50%" stopColor="#14532d" />
        <stop offset="100%" stopColor="#052e16" />
      </linearGradient>
      <linearGradient id="vgLeafLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="30%" stopColor="#22c55e" />
        <stop offset="75%" stopColor="#16a34a" />
        <stop offset="100%" stopColor="#15803d" />
      </linearGradient>
    </defs>
  );
}

/**
 * Clean, layered VECTOR illustration style garland (SVG-based)
 * Alternating marigold flower clusters (stacked vertically) and mango-leaf bunches (fanned green leaf clusters),
 * hanging as individual vertical strands side by side with dimensional gradient fills.
 */
export function GanpatiGarlandLeft({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 330" width="132" height="330" fill="none">
      <VectorGarlandDefs />

      {/* Corner Anchor Header */}
      <g className="corner-header">
        <MangoLeafBunch cx={20} cy={4} scale={1.15} />
        <MangoLeafBunch cx={52} cy={4} scale={1.2} />
        <MangoLeafBunch cx={86} cy={4} scale={1.15} />
        <MangoLeafBunch cx={114} cy={4} scale={1.05} />
        <MarigoldBlossom cx={20} cy={16} r={12} isYellow={false} />
        <MarigoldBlossom cx={52} cy={16} r={12.5} isYellow={true} />
        <MarigoldBlossom cx={86} cy={16} r={12} isYellow={false} />
        <MarigoldBlossom cx={114} cy={16} r={11} isYellow={true} />
      </g>

      {/* Strand 1 (Outer left edge, x=18) */}
      <g className="ck-toran-leaf-sway" style={{ transformOrigin: "18px 24px" }}>
        <MangoLeafBunch cx={18} cy={26} scale={0.85} />
        <MarigoldBlossom cx={18} cy={54} r={11.5} isYellow={true} />
        <MarigoldBlossom cx={18} cy={73} r={11.5} isYellow={false} />
        <MarigoldBlossom cx={18} cy={92} r={11.5} isYellow={true} />
        <MangoLeafBunch cx={18} cy={108} scale={0.8} />
        <MarigoldBlossom cx={18} cy={134} r={11} isYellow={false} />
        <MarigoldBlossom cx={18} cy={152} r={11} isYellow={true} />
        <MangoLeafBunch cx={18} cy={168} scale={0.75} />
        <MarigoldBlossom cx={18} cy={192} r={10.5} isYellow={false} />
        <MarigoldBlossom cx={18} cy={209} r={10.5} isYellow={true} />
        <MangoLeafTip cx={18} cy={224} scale={0.85} />
      </g>

      {/* Strand 2 (Center left, x=48 - Longest cascade) */}
      <g className="ck-toran-leaf-sway" style={{ transformOrigin: "48px 24px", animationDelay: "0.3s" }}>
        <MarigoldBlossom cx={48} cy={36} r={12} isYellow={false} />
        <MangoLeafBunch cx={48} cy={52} scale={0.9} />
        <MarigoldBlossom cx={48} cy={80} r={12} isYellow={true} />
        <MarigoldBlossom cx={48} cy={100} r={12} isYellow={false} />
        <MarigoldBlossom cx={48} cy={120} r={12} isYellow={true} />
        <MangoLeafBunch cx={48} cy={138} scale={0.85} />
        <MarigoldBlossom cx={48} cy={164} r={11.5} isYellow={false} />
        <MarigoldBlossom cx={48} cy={183} r={11.5} isYellow={true} />
        <MarigoldBlossom cx={48} cy={202} r={11.5} isYellow={false} />
        <MangoLeafBunch cx={48} cy={218} scale={0.8} />
        <MarigoldBlossom cx={48} cy={242} r={11} isYellow={true} />
        <MarigoldBlossom cx={48} cy={259} r={11} isYellow={false} />
        <MangoLeafTip cx={48} cy={274} scale={0.95} />
      </g>

      {/* Strand 3 (Center right, x=80) */}
      <g className="ck-toran-leaf-sway" style={{ transformOrigin: "80px 24px", animationDelay: "0.6s" }}>
        <MangoLeafBunch cx={80} cy={28} scale={0.85} />
        <MarigoldBlossom cx={80} cy={56} r={11.5} isYellow={false} />
        <MarigoldBlossom cx={80} cy={75} r={11.5} isYellow={true} />
        <MarigoldBlossom cx={80} cy={94} r={11.5} isYellow={false} />
        <MangoLeafBunch cx={80} cy={110} scale={0.8} />
        <MarigoldBlossom cx={80} cy={136} r={11} isYellow={true} />
        <MarigoldBlossom cx={80} cy={154} r={11} isYellow={false} />
        <MangoLeafBunch cx={80} cy={170} scale={0.75} />
        <MarigoldBlossom cx={80} cy={194} r={10.5} isYellow={true} />
        <MarigoldBlossom cx={80} cy={211} r={10.5} isYellow={false} />
        <MangoLeafTip cx={80} cy={226} scale={0.85} />
      </g>

      {/* Strand 4 (Innermost right, x=110 - graceful short cascade) */}
      <g className="ck-toran-leaf-sway" style={{ transformOrigin: "110px 24px", animationDelay: "0.9s" }}>
        <MarigoldBlossom cx={110} cy={36} r={11} isYellow={true} />
        <MangoLeafBunch cx={110} cy={52} scale={0.78} />
        <MarigoldBlossom cx={110} cy={78} r={11} isYellow={false} />
        <MarigoldBlossom cx={110} cy={96} r={11} isYellow={true} />
        <MangoLeafBunch cx={110} cy={112} scale={0.72} />
        <MarigoldBlossom cx={110} cy={134} r={10.5} isYellow={false} />
        <MarigoldBlossom cx={110} cy={150} r={10.5} isYellow={true} />
        <MangoLeafTip cx={110} cy={164} scale={0.8} />
      </g>
    </svg>
  );
}

/**
 * Right Corner Garland — 3 strands side-by-side, positioned snugly in top-right corner
 * without colliding or overlapping the temple bell.
 */
export function GanpatiGarlandRight({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 260" width="80" height="260" fill="none">
      <VectorGarlandDefs />

      {/* Corner Anchor Header */}
      <g className="corner-header">
        <MangoLeafBunch cx={64} cy={4} scale={1.15} />
        <MangoLeafBunch cx={40} cy={4} scale={1.1} />
        <MangoLeafBunch cx={16} cy={4} scale={0.95} />
        <MarigoldBlossom cx={64} cy={16} r={12} isYellow={false} />
        <MarigoldBlossom cx={40} cy={16} r={12} isYellow={true} />
        <MarigoldBlossom cx={16} cy={16} r={11} isYellow={false} />
      </g>

      {/* Strand 1 (Outermost right edge, x=64) */}
      <g className="ck-toran-leaf-sway" style={{ transformOrigin: "64px 24px" }}>
        <MangoLeafBunch cx={64} cy={26} scale={0.85} />
        <MarigoldBlossom cx={64} cy={54} r={11.5} isYellow={true} />
        <MarigoldBlossom cx={64} cy={73} r={11.5} isYellow={false} />
        <MarigoldBlossom cx={64} cy={92} r={11.5} isYellow={true} />
        <MangoLeafBunch cx={64} cy={108} scale={0.8} />
        <MarigoldBlossom cx={64} cy={134} r={11} isYellow={false} />
        <MarigoldBlossom cx={64} cy={152} r={11} isYellow={true} />
        <MangoLeafBunch cx={64} cy={168} scale={0.75} />
        <MarigoldBlossom cx={64} cy={192} r={10.5} isYellow={false} />
        <MarigoldBlossom cx={64} cy={209} r={10.5} isYellow={true} />
        <MangoLeafTip cx={64} cy={224} scale={0.85} />
      </g>

      {/* Strand 2 (Middle, x=40) */}
      <g className="ck-toran-leaf-sway" style={{ transformOrigin: "40px 24px", animationDelay: "0.35s" }}>
        <MarigoldBlossom cx={40} cy={36} r={11.5} isYellow={false} />
        <MangoLeafBunch cx={40} cy={52} scale={0.85} />
        <MarigoldBlossom cx={40} cy={80} r={11.5} isYellow={true} />
        <MarigoldBlossom cx={40} cy={99} r={11.5} isYellow={false} />
        <MarigoldBlossom cx={40} cy={118} r={11.5} isYellow={true} />
        <MangoLeafBunch cx={40} cy={134} scale={0.8} />
        <MarigoldBlossom cx={40} cy={158} r={11} isYellow={false} />
        <MarigoldBlossom cx={40} cy={176} r={11} isYellow={true} />
        <MangoLeafBunch cx={40} cy={192} scale={0.75} />
        <MarigoldBlossom cx={40} cy={214} r={10.5} isYellow={false} />
        <MangoLeafTip cx={40} cy={228} scale={0.85} />
      </g>

      {/* Strand 3 (Inner, x=16 - shorter accent) */}
      <g className="ck-toran-leaf-sway" style={{ transformOrigin: "16px 24px", animationDelay: "0.7s" }}>
        <MangoLeafBunch cx={16} cy={28} scale={0.75} />
        <MarigoldBlossom cx={16} cy={52} r={11} isYellow={true} />
        <MarigoldBlossom cx={16} cy={70} r={11} isYellow={false} />
        <MangoLeafBunch cx={16} cy={86} scale={0.7} />
        <MarigoldBlossom cx={16} cy={108} r={10.5} isYellow={true} />
        <MarigoldBlossom cx={16} cy={124} r={10.5} isYellow={false} />
        <MangoLeafTip cx={16} cy={138} scale={0.75} />
      </g>
    </svg>
  );
}

/**
 * GanpatiCornerGarlands — Botanical Mango Leaves & Cascading Marigold Garlands
 * Originates from the top corners of the navbar, draping down continuously past the navbar
 * and into the hero section, removing any visible seam/break between navbar and hero.
 */
export function GanpatiCornerGarlands() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-[380px] overflow-visible z-40 select-none"
      aria-hidden="true"
    >
      <GanpatiAnimationStyles />
      {/* Left Corner Garland — 4-strand lush layered vector illustration */}
      <div className="hidden md:block absolute top-0 left-0 w-[84px] sm:w-[98px] lg:w-[118px] drop-shadow-[0_8px_24px_rgba(217,119,6,0.32)]">
        <GanpatiGarlandLeft className="w-full h-auto" />
      </div>

      {/* Right Corner Garland — 3-strand vector illustration positioned snugly at top-right, leaving clear breathing space for the bell */}
      <div className="hidden md:block absolute top-0 right-0 w-[54px] sm:w-[62px] lg:w-[72px] drop-shadow-[0_8px_24px_rgba(217,119,6,0.32)]">
        <GanpatiGarlandRight className="w-full h-auto" />
      </div>
    </div>
  );
}
