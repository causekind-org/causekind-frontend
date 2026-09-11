const sharp = require('sharp');
const fs = require('fs');

function marigoldSvg(cx, cy, r, isYellow = false) {
  const baseColor = isYellow ? '#facc15' : '#ea580c';
  const shadowColor = isYellow ? '#ca8a04' : '#b91c1c';
  const highlightColor = isYellow ? '#fef08a' : '#f97316';
  const strokeColor = isYellow ? '#a16207' : '#991b1b';

  // 12 scalloped outer lobes
  const lobes = 12;
  let dOuter = '';
  for (let i = 0; i < lobes; i++) {
    const a1 = (i / lobes) * Math.PI * 2;
    const a2 = ((i + 0.5) / lobes) * Math.PI * 2;
    const a3 = ((i + 1) / lobes) * Math.PI * 2;
    const rBase = r * 0.85;
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

  // Inner swirl rings
  return `
    <g class="marigold">
      <path d="${dOuter}" fill="${baseColor}" stroke="${strokeColor}" stroke-width="0.75" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.75).toFixed(1)}" fill="none" stroke="${shadowColor}" stroke-width="0.85" stroke-dasharray="4,2" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.5).toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="0.75" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.28).toFixed(1)}" fill="${highlightColor}" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.15).toFixed(1)}" fill="${shadowColor}" />
    </g>
  `;
}

function flankingLeaf(cx, cy, isRight = false) {
  // A curved serrated mango leaf pointing downwards and slightly outward
  const flip = isRight ? 1 : -1;
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M 0,0 
               C ${flip * 6},8 ${flip * 12},18 ${flip * 9},32 
               C ${flip * 7},36 ${flip * 3},38 0,42 
               C ${flip * 2},32 ${flip * 3},18 0,0 Z"
            fill="#16a34a" stroke="#14532d" stroke-width="0.75" />
      <!-- Serration / rib lines -->
      <path d="M 0,4 Q ${flip * 4},18 ${flip * 3},36" stroke="#22c55e" stroke-width="0.65" fill="none" />
      <path d="M ${flip * 2},12 L ${flip * 6},10" stroke="#14532d" stroke-width="0.5" />
      <path d="M ${flip * 3},19 L ${flip * 8},18" stroke="#14532d" stroke-width="0.5" />
      <path d="M ${flip * 3},26 L ${flip * 7},26" stroke="#14532d" stroke-width="0.5" />
    </g>
  `;
}

function bottomLeavesCluster(cx, cy, count = 3) {
  if (count === 3) {
    return `
      <g transform="translate(${cx}, ${cy})">
        <!-- Left leaf -->
        <path d="M 0,0 C -6,10 -11,22 -8,36 C -5,26 -2,14 0,0 Z" fill="#15803d" stroke="#14532d" stroke-width="0.6" />
        <!-- Right leaf -->
        <path d="M 0,0 C 6,10 11,22 8,36 C 5,26 2,14 0,0 Z" fill="#15803d" stroke="#14532d" stroke-width="0.6" />
        <!-- Center leaf -->
        <path d="M 0,0 C -3,12 -3,26 0,40 C 3,26 3,12 0,0 Z" fill="#22c55e" stroke="#14532d" stroke-width="0.6" />
        <line x1="0" y1="0" x2="0" y2="38" stroke="#15803d" stroke-width="0.6" />
      </g>
    `;
  }
  // 4 leaves
  return `
    <g transform="translate(${cx}, ${cy})">
      <path d="M 0,0 C -8,10 -13,22 -10,34 C -6,24 -2,12 0,0 Z" fill="#15803d" stroke="#14532d" stroke-width="0.6" />
      <path d="M 0,0 C -4,12 -5,26 -2,38 C 0,26 0,12 0,0 Z" fill="#16a34a" stroke="#14532d" stroke-width="0.6" />
      <path d="M 0,0 C 4,12 5,26 2,38 C 0,26 0,12 0,0 Z" fill="#16a34a" stroke="#14532d" stroke-width="0.6" />
      <path d="M 0,0 C 8,10 13,22 10,34 C 6,24 2,12 0,0 Z" fill="#15803d" stroke="#14532d" stroke-width="0.6" />
      <line x1="0" y1="0" x2="0" y2="36" stroke="#14532d" stroke-width="0.6" />
    </g>
  `;
}

// Strand A (Spaced: string + orange flower flanked by 2 leaves, 5 stations)
function renderStrandA(x, startY, stations = 5, flowerRadius = 9.5) {
  const step = 42;
  const endY = startY + (stations - 1) * step;
  let out = `<!-- Strand A at x=${x} -->\n<g class="strand-a">`;
  // Dark green string
  out += `<line x1="${x}" y1="${startY - 10}" x2="${x}" y2="${endY}" stroke="#14532d" stroke-width="1.8" />`;

  for (let i = 0; i < stations; i++) {
    const cy = startY + i * step;
    if (i < stations - 1) {
      out += flankingLeaf(x, cy - 4, false);
      out += flankingLeaf(x, cy - 4, true);
      out += marigoldSvg(x, cy, flowerRadius, false);
    } else {
      // Bottom terminal station
      out += marigoldSvg(x, cy, flowerRadius, false);
      out += bottomLeavesCluster(x, cy + flowerRadius * 0.6, 3);
    }
  }
  out += `</g>`;
  return out;
}

// Strand B (Solid stacked marigold chain, alternating yellow and orange)
function renderStrandB(x, startY, count = 12, flowerRadius = 9) {
  const step = flowerRadius * 1.62; // slight vertical overlap
  let out = `<!-- Strand B at x=${x} -->\n<g class="strand-b">`;

  for (let i = 0; i < count; i++) {
    const cy = startY + i * step;
    const isYellow = (i % 2 === 0);
    out += marigoldSvg(x, cy, flowerRadius, isYellow);
  }

  const lastCy = startY + (count - 1) * step;
  out += bottomLeavesCluster(x, lastCy + flowerRadius * 0.7, 4);
  out += `</g>`;
  return out;
}

function buildGarlandSvg(mirrored = false) {
  const w = 175;
  const h = 270;
  
  // Spacings between 4 strands: x = 20, x = 62, x = 106, x = 148
  // Total span: ~130px with clear 42px between each strand!
  let content = '';
  if (!mirrored) {
    content += renderStrandA(22, 18, 5, 9.5); // Strand 1 (longest, 5 stations)
    content += renderStrandB(64, 12, 12, 9);   // Strand 2 (second longest, 12 flowers)
    content += renderStrandA(106, 18, 4, 9.5); // Strand 3 (third longest, 4 stations)
    content += renderStrandB(148, 12, 8, 9);   // Strand 4 (shortest, 8 flowers)
  } else {
    // Mirrored for right side:
    content += renderStrandB(22, 12, 8, 9);    // Strand 4 (shortest)
    content += renderStrandA(64, 18, 4, 9.5);  // Strand 3
    content += renderStrandB(106, 12, 12, 9);  // Strand 2
    content += renderStrandA(148, 18, 5, 9.5); // Strand 1 (longest, rightmost)
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none">
      ${content}
    </svg>
  `;
}

const leftSvg = buildGarlandSvg(false);
const rightSvg = buildGarlandSvg(true);

sharp(Buffer.from(leftSvg))
  .png()
  .toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/exact_garland_preview.png')
  .then(() => console.log('Exact garland rendered!'));
