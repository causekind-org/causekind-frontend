const sharp = require('sharp');
const fs = require('fs');

function generateMarigoldFlower(cx, cy, r, isYellow = false) {
  const outerGrad = isYellow ? 'url(#mgYellowGrad)' : 'url(#mgOrangeGrad)';
  const midGrad = isYellow ? 'url(#mgYellowMidGrad)' : 'url(#mgOrangeMidGrad)';
  const innerGrad = isYellow ? 'url(#mgYellowInnerGrad)' : 'url(#mgOrangeInnerGrad)';

  // Build 12 outer ruffled lobes
  const lobes = 14;
  let dOuter = '';
  for (let i = 0; i < lobes; i++) {
    const a1 = (i / lobes) * Math.PI * 2;
    const a2 = ((i + 0.5) / lobes) * Math.PI * 2;
    const a3 = ((i + 1) / lobes) * Math.PI * 2;
    const rBase = r * 0.82;
    const rPeak = r;
    const x1 = cx + Math.cos(a1) * rBase;
    const y1 = cy + Math.sin(a1) * rBase;
    const xMid = cx + Math.cos(a2) * rPeak;
    const yMid = cy + Math.sin(a2) * rPeak;
    const x2 = cx + Math.cos(a3) * rBase;
    const y2 = cy + Math.sin(a3) * rBase;
    if (i === 0) dOuter += `M ${x1.toFixed(1)} ${y1.toFixed(1)} `;
    dOuter += `Q ${xMid.toFixed(1)} ${yMid.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} `;
  }
  dOuter += 'Z';

  // Middle layer ruffled petals
  const midLobes = 11;
  const rMid = r * 0.72;
  let dMid = '';
  for (let i = 0; i < midLobes; i++) {
    const a1 = ((i + 0.25) / midLobes) * Math.PI * 2;
    const a2 = ((i + 0.75) / midLobes) * Math.PI * 2;
    const a3 = ((i + 1.25) / midLobes) * Math.PI * 2;
    const rBase = rMid * 0.8;
    const rPeak = rMid;
    const x1 = cx + Math.cos(a1) * rBase;
    const y1 = cy + Math.sin(a1) * rBase;
    const xMid = cx + Math.cos(a2) * rPeak;
    const yMid = cy + Math.sin(a2) * rPeak;
    const x2 = cx + Math.cos(a3) * rBase;
    const y2 = cy + Math.sin(a3) * rBase;
    if (i === 0) dMid += `M ${x1.toFixed(1)} ${y1.toFixed(1)} `;
    dMid += `Q ${xMid.toFixed(1)} ${yMid.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} `;
  }
  dMid += 'Z';

  // Inner tight rosette
  const inLobes = 8;
  const rIn = r * 0.44;
  let dIn = '';
  for (let i = 0; i < inLobes; i++) {
    const a1 = ((i + 0.5) / inLobes) * Math.PI * 2;
    const a2 = ((i + 1) / inLobes) * Math.PI * 2;
    const a3 = ((i + 1.5) / inLobes) * Math.PI * 2;
    const rBase = rIn * 0.75;
    const rPeak = rIn;
    const x1 = cx + Math.cos(a1) * rBase;
    const y1 = cy + Math.sin(a1) * rBase;
    const xMid = cx + Math.cos(a2) * rPeak;
    const yMid = cy + Math.sin(a2) * rPeak;
    const x2 = cx + Math.cos(a3) * rBase;
    const y2 = cy + Math.sin(a3) * rBase;
    if (i === 0) dIn += `M ${x1.toFixed(1)} ${y1.toFixed(1)} `;
    dIn += `Q ${xMid.toFixed(1)} ${yMid.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)} `;
  }
  dIn += 'Z';

  return `
    <g class="marigold-blossom" filter="url(#dropShadowSoft)">
      <!-- Base petal shadow circle -->
      <circle cx="${cx}" cy="${cy + 1.5}" r="${r * 0.95}" fill="#7c2d12" opacity="0.35" />
      <!-- Outer ruffled petal ring -->
      <path d="${dOuter}" fill="${outerGrad}" stroke="#c2410c" stroke-width="0.5" stroke-opacity="0.5" />
      <!-- Middle petal ring -->
      <path d="${dMid}" fill="${midGrad}" stroke="#b45309" stroke-width="0.4" stroke-opacity="0.6" />
      <!-- Inner petal ring -->
      <path d="${dIn}" fill="${innerGrad}" />
      <!-- Center core rosette -->
      <circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="#b45309" />
      <circle cx="${cx}" cy="${cy}" r="${r * 0.12}" fill="#fef08a" />
    </g>
  `;
}

function generateMangoLeaf(x, y, length, angleDeg) {
  const w = length * 0.32;
  return `
    <g transform="translate(${x}, ${y}) rotate(${angleDeg})">
      <!-- Leaf shadow -->
      <path d="M 0,0 C -${w.toFixed(1)},${(length*0.28).toFixed(1)} -${w.toFixed(1)},${(length*0.65).toFixed(1)} 0,${length.toFixed(1)} C ${w.toFixed(1)},${(length*0.65).toFixed(1)} ${w.toFixed(1)},${(length*0.28).toFixed(1)} 0,0 Z"
            fill="#064e3b" opacity="0.25" transform="translate(0, 1.5)" />
      <!-- Left side of leaf (darker emerald gradient) -->
      <path d="M 0,0 C -${w.toFixed(1)},${(length*0.28).toFixed(1)} -${w.toFixed(1)},${(length*0.65).toFixed(1)} 0,${length.toFixed(1)} L 0,0 Z"
            fill="url(#leafDarkGrad)" />
      <!-- Right side of leaf (sunlit vibrant green gradient) -->
      <path d="M 0,0 C ${w.toFixed(1)},${(length*0.28).toFixed(1)} ${w.toFixed(1)},${(length*0.65).toFixed(1)} 0,${length.toFixed(1)} L 0,0 Z"
            fill="url(#leafLightGrad)" />
      <!-- Subtle top gloss highlight -->
      <path d="M 0,${(length*0.08).toFixed(1)} C ${(w*0.5).toFixed(1)},${(length*0.3).toFixed(1)} ${(w*0.4).toFixed(1)},${(length*0.6).toFixed(1)} 0,${(length*0.85).toFixed(1)}"
            stroke="#a7f3d0" stroke-width="0.75" stroke-linecap="round" fill="none" opacity="0.6" />
      <!-- Central vein line -->
      <line x1="0" y1="0" x2="0" y2="${(length*0.95).toFixed(1)}" stroke="#14532d" stroke-width="0.85" opacity="0.85" />
    </g>
  `;
}

function generateLeafBunch(cx, cy, scale = 1, flip = false) {
  const l = 34 * scale;
  return `
    <g class="leaf-bunch">
      ${generateMangoLeaf(cx, cy, l * 0.9, (flip ? 1 : -1) * 38)}
      ${generateMangoLeaf(cx, cy, l * 0.95, (flip ? 1 : -1) * 20)}
      ${generateMangoLeaf(cx, cy, l * 0.95, (flip ? -1 : 1) * 20)}
      ${generateMangoLeaf(cx, cy, l * 0.9, (flip ? -1 : 1) * 38)}
      ${generateMangoLeaf(cx, cy, l * 1.05, 0)}
    </g>
  `;
}

function generateGarlandStrand(x, startY, lengthPattern) {
  // lengthPattern is array of: 'leaves', 'cluster3', 'cluster2', etc.
  let currentY = startY;
  let content = `<!-- Strand at x=${x} -->\n<g class="strand">`;
  
  // Hanging thread
  content += `<line x1="${x}" y1="0" x2="${x}" y2="${startY + 260}" stroke="#b45309" stroke-width="0.75" stroke-dasharray="2,2" opacity="0.4" />`;

  for (const step of lengthPattern) {
    if (step === 'topLeaves') {
      content += generateLeafBunch(x, currentY, 0.95);
      currentY += 28;
    } else if (step === 'leaves') {
      content += generateLeafBunch(x, currentY, 0.85);
      currentY += 26;
    } else if (step === 'marigoldOrange') {
      content += generateMarigoldFlower(x, currentY + 11, 12, false);
      currentY += 21;
    } else if (step === 'marigoldYellow') {
      content += generateMarigoldFlower(x, currentY + 11, 12, true);
      currentY += 21;
    } else if (step === 'cluster3') {
      // 3 vertically stacked marigold blossoms (orange, yellow, orange)
      content += generateMarigoldFlower(x, currentY + 10, 12.5, false);
      content += generateMarigoldFlower(x, currentY + 28, 12.5, true);
      content += generateMarigoldFlower(x, currentY + 46, 12.5, false);
      currentY += 58;
    } else if (step === 'cluster2') {
      content += generateMarigoldFlower(x, currentY + 10, 12, true);
      content += generateMarigoldFlower(x, currentY + 27, 12, false);
      currentY += 38;
    } else if (step === 'tip') {
      // Hanging bottom leaf tip
      content += generateMangoLeaf(x, currentY, 26, 0);
      content += generateMangoLeaf(x, currentY, 22, -18);
      content += generateMangoLeaf(x, currentY, 22, 18);
      currentY += 26;
    }
  }

  content += `</g>`;
  return content;
}

const svgWidth = 140;
const svgHeight = 360;

const fullSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
  <defs>
    <!-- Soft Drop Shadow Filter -->
    <filter id="dropShadowSoft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#7c2d12" flood-opacity="0.32" />
    </filter>

    <!-- Marigold Orange Gradients -->
    <radialGradient id="mgOrangeGrad" cx="40%" cy="38%" r="65%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="25%" stop-color="#fb923c" />
      <stop offset="65%" stop-color="#ea580c" />
      <stop offset="90%" stop-color="#c2410c" />
      <stop offset="100%" stop-color="#9a3412" />
    </radialGradient>
    <radialGradient id="mgOrangeMidGrad" cx="38%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fffbeb" />
      <stop offset="30%" stop-color="#f59e0b" />
      <stop offset="75%" stop-color="#ea580c" />
      <stop offset="100%" stop-color="#b45309" />
    </radialGradient>
    <radialGradient id="mgOrangeInnerGrad" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="60%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#c2410c" />
    </radialGradient>

    <!-- Marigold Yellow Gradients -->
    <radialGradient id="mgYellowGrad" cx="40%" cy="36%" r="65%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="25%" stop-color="#fef08a" />
      <stop offset="60%" stop-color="#facc15" />
      <stop offset="85%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </radialGradient>
    <radialGradient id="mgYellowMidGrad" cx="38%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="35%" stop-color="#fef08a" />
      <stop offset="75%" stop-color="#facc15" />
      <stop offset="100%" stop-color="#eab308" />
    </radialGradient>
    <radialGradient id="mgYellowInnerGrad" cx="45%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="60%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#f59e0b" />
    </radialGradient>

    <!-- Leaf Gradients -->
    <linearGradient id="leafDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#166534" />
      <stop offset="45%" stop-color="#14532d" />
      <stop offset="100%" stop-color="#052e16" />
    </linearGradient>
    <linearGradient id="leafLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ade80" />
      <stop offset="35%" stop-color="#22c55e" />
      <stop offset="80%" stop-color="#16a34a" />
      <stop offset="100%" stop-color="#15803d" />
    </linearGradient>
  </defs>

  <!-- Top Corner Anchor Leaves -->
  <g class="corner-anchor">
    ${generateLeafBunch(24, 6, 1.15)}
    ${generateLeafBunch(60, 6, 1.2)}
    ${generateLeafBunch(98, 6, 1.1)}
    <!-- Horizontal connecting marigold rosettes -->
    ${generateMarigoldFlower(24, 18, 13, false)}
    ${generateMarigoldFlower(60, 18, 13.5, true)}
    ${generateMarigoldFlower(98, 18, 13, false)}
  </g>

  <!-- 3 to 4 Vertical Garland Strands Side by Side -->
  <!-- Strand 1 (Outer left) -->
  ${generateGarlandStrand(22, 28, ['leaves', 'cluster3', 'leaves', 'cluster2', 'tip'])}

  <!-- Strand 2 (Center left - Longest cascade) -->
  ${generateGarlandStrand(54, 28, ['marigoldYellow', 'leaves', 'cluster3', 'leaves', 'cluster3', 'tip'])}

  <!-- Strand 3 (Center right) -->
  ${generateGarlandStrand(86, 28, ['leaves', 'cluster3', 'leaves', 'cluster2', 'tip'])}

  <!-- Strand 4 (Inner right - shorter graceful accent) -->
  ${generateGarlandStrand(116, 28, ['cluster2', 'leaves', 'cluster2', 'tip'])}
</svg>
`;

sharp(Buffer.from(fullSvg))
  .png()
  .toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/test_vector_garland.png')
  .then(() => console.log('Vector garland test rendered!'));
