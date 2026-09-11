const sharp = require('sharp');
const fs = require('fs');

function marigoldFlowerSvg(cx, cy, r, isYellow = false) {
  const outerFill = isYellow ? 'url(#refYellowGrad)' : 'url(#refOrangeGrad)';
  const innerFill = isYellow ? '#fef08a' : '#fb923c';
  const stroke = isYellow ? '#b45309' : '#991b1b';
  const midStroke = isYellow ? '#ca8a04' : '#c2410c';

  const lobes = 14;
  let dOuter = '';
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
    if (i === 0) dOuter += `M ${x1} ${y1} `;
    dOuter += `Q ${xMid} ${yMid} ${x2} ${y2} `;
  }
  dOuter += 'Z';

  return `
    <g class="marigold-blossom" filter="url(#garlandDropShadow)">
      <path d="${dOuter}" fill="${outerFill}" stroke="${stroke}" stroke-width="0.6" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.72).toFixed(1)}" fill="none" stroke="${midStroke}" stroke-width="0.75" stroke-dasharray="3,1.5" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.48).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="0.6" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.28).toFixed(1)}" fill="${innerFill}" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.14).toFixed(1)}" fill="${stroke}" />
    </g>
  `;
}

// Curved outward-flanking leaf exactly like the reference image
function flankingLeafPair(cx, cy) {
  // Left leaf curving outward to the left
  const leftLeaf = `
    <path d="M 0,0 
             C -6,4 -14,12 -14,24 
             L -17,27 L -14,30 
             L -16,34 L -13,38 
             L -15,42 L -11,48 
             C -8,52 -3,54 0,55 
             C -4,46 -6,34 -4,22 
             C -3,14 -1,6 0,0 Z"
          fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.7" stroke-linejoin="round" />
    <path d="M 0,4 Q -10,26 -2,50" stroke="#86efac" stroke-width="0.65" fill="none" opacity="0.8" />
  `;

  // Right leaf curving outward to the right
  const rightLeaf = `
    <path d="M 0,0 
             C 6,4 14,12 14,24 
             L 17,27 L 14,30 
             L 16,34 L 13,38 
             L 15,42 L 11,48 
             C 8,52 3,54 0,55 
             C 4,46 6,34 4,22 
             C 3,14 1,6 0,0 Z"
          fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.7" stroke-linejoin="round" />
    <path d="M 0,4 Q 10,26 2,50" stroke="#86efac" stroke-width="0.65" fill="none" opacity="0.8" />
  `;

  return `<g transform="translate(${cx}, ${cy})">${leftLeaf}${rightLeaf}</g>`;
}

function bottomTasselLeaves(cx, cy) {
  return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Far left leaf -->
      <path d="M 0,0 C -8,10 -15,22 -13,38 C -9,44 -3,48 0,50 C -4,38 -5,22 0,0 Z"
            fill="url(#refLeafGradDark)" stroke="#14532d" stroke-width="0.7" />
      <!-- Center-left leaf -->
      <path d="M 0,0 C -5,12 -8,26 -5,44 C -2,50 0,54 0,56 C -2,42 -3,24 0,0 Z"
            fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.7" />
      <!-- Center-right leaf -->
      <path d="M 0,0 C 5,12 8,26 5,44 C 2,50 0,54 0,56 C 2,42 3,24 0,0 Z"
            fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.7" />
      <!-- Far right leaf -->
      <path d="M 0,0 C 8,10 15,22 13,38 C 9,44 3,48 0,50 C 4,38 5,22 0,0 Z"
            fill="url(#refLeafGradDark)" stroke="#14532d" stroke-width="0.7" />
    </g>
  `;
}

function strandA(x, startY, stations = 5, r = 9.5) {
  const step = 52;
  const endY = startY + (stations - 1) * step;
  let s = `<!-- Spaced Strand at x=${x} -->\n<g class="strand-spaced">`;
  s += `<line x1="${x}" y1="${startY - 18}" x2="${x}" y2="${endY}" stroke="#14532d" stroke-width="2" />`;

  for (let i = 0; i < stations; i++) {
    const cy = startY + i * step;
    if (i < stations - 1) {
      s += flankingLeafPair(x, cy - 2);
      s += marigoldFlowerSvg(x, cy, r, false);
    } else {
      s += marigoldFlowerSvg(x, cy, r, false);
      s += bottomTasselLeaves(x, cy + r * 0.6);
    }
  }
  s += `</g>`;
  return s;
}

function strandB(x, startY, count = 12, r = 9) {
  const step = r * 1.58;
  let s = `<!-- Solid Marigold Chain at x=${x} -->\n<g class="strand-chain">`;
  for (let i = 0; i < count; i++) {
    const cy = startY + i * step;
    const isYellow = (i % 2 === 0);
    s += marigoldFlowerSvg(x, cy, r, isYellow);
  }
  const lastCy = startY + (count - 1) * step;
  s += bottomTasselLeaves(x, lastCy + r * 0.6);
  s += `</g>`;
  return s;
}

function buildExactGarlandSvg(mirrored = false) {
  const w = 210;
  const h = 330;

  let defs = `
    <defs>
      <filter id="garlandDropShadow" x="-20%" y="-15%" width="140%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#451a03" flood-opacity="0.28" />
      </filter>

      <!-- Marigold Orange Gradient -->
      <radialGradient id="refOrangeGrad" cx="38%" cy="36%" r="65%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="22%" stop-color="#fb923c" />
        <stop offset="65%" stop-color="#ea580c" />
        <stop offset="90%" stop-color="#c2410c" />
        <stop offset="100%" stop-color="#991b1b" />
      </radialGradient>

      <!-- Marigold Yellow Gradient -->
      <radialGradient id="refYellowGrad" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="25%" stop-color="#fef08a" />
        <stop offset="65%" stop-color="#facc15" />
        <stop offset="90%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#b45309" />
      </radialGradient>

      <!-- Mango Leaf Gradients -->
      <linearGradient id="refLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4ade80" />
        <stop offset="35%" stop-color="#22c55e" />
        <stop offset="80%" stop-color="#16a34a" />
        <stop offset="100%" stop-color="#15803d" />
      </linearGradient>
      <linearGradient id="refLeafGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#22c55e" />
        <stop offset="45%" stop-color="#16a34a" />
        <stop offset="85%" stop-color="#15803d" />
        <stop offset="100%" stop-color="#14532d" />
      </linearGradient>
    </defs>
  `;

  let strands = '';
  if (!mirrored) {
    // Left side: Strand 1 (longest), Strand 2, Strand 3, Strand 4 (shortest)
    strands += strandA(26, 24, 5, 10.5);
    strands += strandB(76, 16, 12, 10);
    strands += strandA(126, 24, 4, 10.5);
    strands += strandB(176, 16, 8, 10);
  } else {
    // Right side: mirrored!
    strands += strandB(34, 16, 8, 10);
    strands += strandA(84, 24, 4, 10.5);
    strands += strandB(134, 16, 12, 10);
    strands += strandA(184, 24, 5, 10.5);
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none">
      ${defs}
      ${strands}
    </svg>
  `;
}

const left = buildExactGarlandSvg(false);
const right = buildExactGarlandSvg(true);

sharp(Buffer.from(left))
  .png()
  .toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/exact_garland_preview_v3.png')
  .then(() => sharp(Buffer.from(right)).png().toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/exact_garland_preview_right_v3.png'))
  .then(() => console.log('Exact v3 rendered!'));
