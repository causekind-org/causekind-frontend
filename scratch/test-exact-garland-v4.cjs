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

// Single serrated mango leaf pointing downwards and outwards with pointed tip
function singleSerratedLeaf(cx, cy, isRight = false) {
  const f = isRight ? 1 : -1;
  return `
    <path d="M ${cx},${cy} 
             C ${cx + f*4},${cy+4} ${cx + f*10},${cy+10} ${cx + f*12},${cy+18} 
             L ${cx + f*15},${cy+21} L ${cx + f*12},${cy+24} 
             L ${cx + f*16},${cy+28} L ${cx + f*13},${cy+32} 
             L ${cx + f*16},${cy+36} L ${cx + f*11},${cy+42} 
             C ${cx + f*10},${cy+48} ${cx + f*6},${cy+52} ${cx + f*5},${cy+56} 
             C ${cx + f*3},${cy+48} ${cx + f*1},${cy+38} ${cx + f*2},${cy+26} 
             C ${cx + f*2},${cy+16} ${cx + f*1},${cy+6} ${cx},${cy} Z"
          fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.75" stroke-linejoin="round" />
    <path d="M ${cx},${cy+2} Q ${cx + f*7},${cy+26} ${cx + f*5},${cy+52}" stroke="#86efac" stroke-width="0.65" fill="none" opacity="0.8" />
  `;
}

function flankingLeaves(cx, cy) {
  return `<g class="flanking-leaves">${singleSerratedLeaf(cx, cy, false)}${singleSerratedLeaf(cx, cy, true)}</g>`;
}

function tasselThreeLeaves(cx, cy) {
  return `
    <g class="tassel-3" filter="url(#garlandDropShadow)">
      <!-- Left leaf -->
      <path d="M ${cx},${cy} C ${cx-5},${cy+8} ${cx-12},${cy+18} ${cx-13},${cy+28} L ${cx-16},${cy+32} L ${cx-12},${cy+36} L ${cx-15},${cy+42} C ${cx-13},${cy+50} ${cx-9},${cy+56} ${cx-8},${cy+62} C ${cx-6},${cy+50} ${cx-3},${cy+36} ${cx},${cy} Z"
            fill="url(#refLeafGradDark)" stroke="#14532d" stroke-width="0.7" />
      <!-- Right leaf -->
      <path d="M ${cx},${cy} C ${cx+5},${cy+8} ${cx+12},${cy+18} ${cx+13},${cy+28} L ${cx+16},${cy+32} L ${cx+12},${cy+36} L ${cx+15},${cy+42} C ${cx+13},${cy+50} ${cx+9},${cy+56} ${cx+8},${cy+62} C ${cx+6},${cy+50} ${cx+3},${cy+36} ${cx},${cy} Z"
            fill="url(#refLeafGradDark)" stroke="#14532d" stroke-width="0.7" />
      <!-- Center leaf -->
      <path d="M ${cx},${cy} C ${cx-3},${cy+12} ${cx-4},${cy+24} ${cx-3},${cy+36} L ${cx-6},${cy+40} L ${cx-3},${cy+46} L ${cx-5},${cy+52} C ${cx-3},${cy+58} ${cx},${cy+64} ${cx},${cy+68} C ${cx},${cy+64} ${cx+3},${cy+58} ${cx+5},${cy+52} L ${cx+3},${cy+46} L ${cx+6},${cy+40} L ${cx+3},${cy+36} C ${cx+4},${cy+24} ${cx+3},${cy+12} ${cx},${cy} Z"
            fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.75" />
      <line x1="${cx}" y1="${cy+2}" x2="${cx}" y2="${cy+64}" stroke="#14532d" stroke-width="0.7" />
    </g>
  `;
}

function tasselFourLeaves(cx, cy) {
  return `
    <g class="tassel-4" filter="url(#garlandDropShadow)">
      <!-- Far Left leaf -->
      <path d="M ${cx},${cy} C ${cx-6},${cy+6} ${cx-14},${cy+16} ${cx-16},${cy+26} L ${cx-19},${cy+30} L ${cx-15},${cy+34} L ${cx-18},${cy+40} C ${cx-15},${cy+48} ${cx-11},${cy+54} ${cx-10},${cy+60} C ${cx-7},${cy+48} ${cx-3},${cy+34} ${cx},${cy} Z"
            fill="url(#refLeafGradDark)" stroke="#14532d" stroke-width="0.7" />
      <!-- Center Left leaf -->
      <path d="M ${cx},${cy} C ${cx-3},${cy+8} ${cx-7},${cy+20} ${cx-6},${cy+32} L ${cx-9},${cy+36} L ${cx-5},${cy+42} C ${cx-4},${cy+52} ${cx-2},${cy+60} ${cx-2},${cy+66} C ${cx-1},${cy+52} ${cx},${cy+36} ${cx},${cy} Z"
            fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.7" />
      <!-- Center Right leaf -->
      <path d="M ${cx},${cy} C ${cx+3},${cy+8} ${cx+7},${cy+20} ${cx+6},${cy+32} L ${cx+9},${cy+36} L ${cx+5},${cy+42} C ${cx+4},${cy+52} ${cx+2},${cy+60} ${cx+2},${cy+66} C ${cx+1},${cy+52} ${cx},${cy+36} ${cx},${cy} Z"
            fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.7" />
      <!-- Far Right leaf -->
      <path d="M ${cx},${cy} C ${cx+6},${cy+6} ${cx+14},${cy+16} ${cx+16},${cy+26} L ${cx+19},${cy+30} L ${cx+15},${cy+34} L ${cx+18},${cy+40} C ${cx+15},${cy+48} ${cx+11},${cy+54} ${cx+10},${cy+60} C ${cx+7},${cy+48} ${cx+3},${cy+34} ${cx},${cy} Z"
            fill="url(#refLeafGradDark)" stroke="#14532d" stroke-width="0.7" />
    </g>
  `;
}

function strandA(x, startY, stations = 5, r = 10) {
  const step = 64; // Plenty of breathing room between stations showing clean green string!
  const endY = startY + (stations - 1) * step;
  let s = `<!-- Spaced Strand at x=${x} -->\n<g class="strand-spaced">`;
  // Dark green vertical string running through entire strand
  s += `<line x1="${x}" y1="${startY - 20}" x2="${x}" y2="${endY}" stroke="#14532d" stroke-width="2" />`;

  for (let i = 0; i < stations; i++) {
    const cy = startY + i * step;
    if (i < stations - 1) {
      s += flankingLeaves(x, cy - 2);
      s += marigoldFlowerSvg(x, cy, r, false);
    } else {
      s += marigoldFlowerSvg(x, cy, r, false);
      s += tasselThreeLeaves(x, cy + r * 0.5);
    }
  }
  s += `</g>`;
  return s;
}

function strandB(x, startY, count = 12, r = 9.5) {
  const step = r * 1.56;
  let s = `<!-- Solid Marigold Chain at x=${x} -->\n<g class="strand-chain">`;
  s += `<line x1="${x}" y1="${startY - 16}" x2="${x}" y2="${startY + (count - 1) * step}" stroke="#14532d" stroke-width="1.8" />`;
  for (let i = 0; i < count; i++) {
    const cy = startY + i * step;
    const isYellow = (i % 2 === 0);
    s += marigoldFlowerSvg(x, cy, r, isYellow);
  }
  const lastCy = startY + (count - 1) * step;
  s += tasselFourLeaves(x, lastCy + r * 0.5);
  s += `</g>`;
  return s;
}

function buildExactGarlandSvg(mirrored = false) {
  const w = 215;
  const h = 365;

  let defs = `
    <defs>
      <filter id="garlandDropShadow" x="-25%" y="-15%" width="150%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#451a03" flood-opacity="0.25" />
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
    // Left side: Strand 1 (longest, 5 stations), Strand 2 (12 flowers), Strand 3 (4 stations), Strand 4 (8 flowers)
    strands += strandA(28, 26, 5, 10);
    strands += strandB(78, 16, 12, 9.5);
    strands += strandA(128, 26, 4, 10);
    strands += strandB(178, 16, 8, 9.5);
  } else {
    // Right side: mirrored!
    strands += strandB(36, 16, 8, 9.5);
    strands += strandA(86, 26, 4, 10);
    strands += strandB(136, 16, 12, 9.5);
    strands += strandA(186, 26, 5, 10);
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
  .toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/exact_garland_preview_v4.png')
  .then(() => sharp(Buffer.from(right)).png().toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/exact_garland_preview_right_v4.png'))
  .then(() => console.log('Exact v4 rendered!'));
