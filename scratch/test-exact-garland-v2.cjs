const sharp = require('sharp');
const fs = require('fs');

function marigoldFlowerSvg(cx, cy, r, isYellow = false) {
  const outerFill = isYellow ? 'url(#refYellowGrad)' : 'url(#refOrangeGrad)';
  const innerFill = isYellow ? '#fef08a' : '#fb923c';
  const stroke = isYellow ? '#b45309' : '#991b1b';
  const midStroke = isYellow ? '#ca8a04' : '#c2410c';

  // 12 scalloped outer petal lobes
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
      <!-- Concentric ruffled rings matching reference -->
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.72).toFixed(1)}" fill="none" stroke="${midStroke}" stroke-width="0.75" stroke-dasharray="3,1.5" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.48).toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="0.6" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.28).toFixed(1)}" fill="${innerFill}" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.14).toFixed(1)}" fill="${stroke}" />
    </g>
  `;
}

function serratedFlankingLeaf(cx, cy, isRight = false) {
  const f = isRight ? 1 : -1;
  // Authentic serrated mango leaf curving down and slightly out
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M 0,0 
               C ${f*4},6 ${f*7},14 ${f*6},20 
               L ${f*8},22 L ${f*6},25 
               L ${f*9},28 L ${f*6},31 
               L ${f*8},34 L ${f*5},38 
               L ${f*6},41 C ${f*3},47 0,50 0,52 
               C ${f*-1},45 ${f*-2},35 0,0 Z"
            fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.65" stroke-linejoin="round" />
      <!-- Central rib & delicate vein cuts -->
      <path d="M 0,2 Q ${f*3},24 0,48" stroke="#86efac" stroke-width="0.6" fill="none" opacity="0.8" />
    </g>
  `;
}

function serratedTerminalLeafCluster(cx, cy, isFour = false) {
  if (!isFour) {
    return `
      <g transform="translate(${cx}, ${cy})">
        <!-- Left serrated leaf -->
        <path d="M 0,0 C -5,8 -8,18 -7,26 L -9,28 L -7,32 L -9,36 L -6,44 C -4,48 0,52 0,54 C -1,46 -2,32 0,0 Z"
              fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.65" />
        <!-- Right serrated leaf -->
        <path d="M 0,0 C 5,8 8,18 7,26 L 9,28 L 7,32 L 9,36 L 6,44 C 4,48 0,52 0,54 C 1,46 2,32 0,0 Z"
              fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.65" />
        <!-- Center straight serrated leaf -->
        <path d="M 0,0 C -2,12 -3,24 -2,32 L -4,34 L -2,38 L -4,42 L 0,58 C 4,42 2,38 4,34 L 2,32 C 3,24 2,12 0,0 Z"
              fill="#22c55e" stroke="#14532d" stroke-width="0.65" />
        <line x1="0" y1="0" x2="0" y2="52" stroke="#14532d" stroke-width="0.6" />
      </g>
    `;
  }

  // 4-leaf cluster for solid flower chains
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M 0,0 C -8,8 -12,18 -10,26 L -13,28 L -10,33 L -12,38 L -8,46 C -5,50 0,54 0,55 C -2,46 -4,32 0,0 Z"
            fill="url(#refLeafGradDark)" stroke="#14532d" stroke-width="0.65" />
      <path d="M 0,0 C -3,10 -4,22 -3,30 L -5,33 L -2,38 L -4,44 L 0,52 C 2,44 0,38 3,33 L 1,30 C 2,22 1,10 0,0 Z"
            fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.65" />
      <path d="M 0,0 C 3,10 4,22 3,30 L 5,33 L 2,38 L 4,44 L 0,52 C -2,44 0,38 -3,33 L -1,30 C -2,22 -1,10 0,0 Z"
            fill="url(#refLeafGrad)" stroke="#14532d" stroke-width="0.65" />
      <path d="M 0,0 C 8,8 12,18 10,26 L 13,28 L 10,33 L 12,38 L 8,46 C 5,50 0,54 0,55 C 2,46 4,32 0,0 Z"
            fill="url(#refLeafGradDark)" stroke="#14532d" stroke-width="0.65" />
    </g>
  `;
}

function strandA(x, startY, stations = 5, r = 9.5) {
  const step = 44;
  const endY = startY + (stations - 1) * step;
  let s = `<!-- Spaced Strand at x=${x} -->\n<g class="strand-spaced">`;
  s += `<line x1="${x}" y1="${startY - 18}" x2="${x}" y2="${endY}" stroke="#14532d" stroke-width="1.8" />`;

  for (let i = 0; i < stations; i++) {
    const cy = startY + i * step;
    if (i < stations - 1) {
      s += serratedFlankingLeaf(x, cy - 4, false);
      s += serratedFlankingLeaf(x, cy - 4, true);
      s += marigoldFlowerSvg(x, cy, r, false);
    } else {
      s += marigoldFlowerSvg(x, cy, r, false);
      s += serratedTerminalLeafCluster(x, cy + r * 0.5, false);
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
  s += serratedTerminalLeafCluster(x, lastCy + r * 0.5, true);
  s += `</g>`;
  return s;
}

function buildExactGarlandSvg(mirrored = false) {
  const w = 180;
  const h = 285;

  let defs = `
    <defs>
      <filter id="garlandDropShadow" x="-20%" y="-15%" width="140%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.8" flood-color="#451a03" flood-opacity="0.25" />
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
        <stop offset="0%" stop-color="#22c55e" />
        <stop offset="40%" stop-color="#16a34a" />
        <stop offset="100%" stop-color="#15803d" />
      </linearGradient>
      <linearGradient id="refLeafGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#16a34a" />
        <stop offset="50%" stop-color="#15803d" />
        <stop offset="100%" stop-color="#14532d" />
      </linearGradient>
    </defs>
  `;

  let strands = '';
  if (!mirrored) {
    // Left side: Strand 1 (longest), Strand 2, Strand 3, Strand 4 (shortest)
    strands += strandA(24, 22, 5, 9.5);
    strands += strandB(68, 14, 12, 9);
    strands += strandA(112, 22, 4, 9.5);
    strands += strandB(156, 14, 8, 9);
  } else {
    // Right side: mirrored!
    strands += strandB(24, 14, 8, 9);
    strands += strandA(68, 22, 4, 9.5);
    strands += strandB(112, 14, 12, 9);
    strands += strandA(156, 22, 5, 9.5);
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
  .toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/exact_garland_preview_v2.png')
  .then(() => sharp(Buffer.from(right)).png().toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/exact_garland_preview_right.png'))
  .then(() => console.log('Both previews rendered!'));
