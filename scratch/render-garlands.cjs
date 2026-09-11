const sharp = require('sharp');
const fs = require('fs');

function buildDefs() {
  return `
    <defs>
      <filter id="garlandShadow" x="-30%" y="-20%" width="160%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#451a03" flood-opacity="0.28" />
      </filter>

      <!-- Marigold Rich Saffron Orange -->
      <radialGradient id="mgOrangeGrad" cx="38%" cy="36%" r="65%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="20%" stop-color="#fb923c" />
        <stop offset="60%" stop-color="#ea580c" />
        <stop offset="88%" stop-color="#c2410c" />
        <stop offset="100%" stop-color="#7c2d12" />
      </radialGradient>
      <radialGradient id="mgOrangeMidGrad" cx="36%" cy="34%" r="65%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="25%" stop-color="#fed7aa" />
        <stop offset="55%" stop-color="#f97316" />
        <stop offset="85%" stop-color="#ea580c" />
        <stop offset="100%" stop-color="#9a3412" />
      </radialGradient>
      <radialGradient id="mgOrangeInnerGrad" cx="42%" cy="38%" r="55%">
        <stop offset="0%" stop-color="#fef9c3" />
        <stop offset="45%" stop-color="#fbbf24" />
        <stop offset="85%" stop-color="#ea580c" />
        <stop offset="100%" stop-color="#9a3412" />
      </radialGradient>

      <!-- Marigold Radiant Golden Yellow -->
      <radialGradient id="mgYellowGrad" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="25%" stop-color="#fef08a" />
        <stop offset="60%" stop-color="#facc15" />
        <stop offset="85%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#b45309" />
      </radialGradient>
      <radialGradient id="mgYellowMidGrad" cx="36%" cy="34%" r="65%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="30%" stop-color="#fef9c3" />
        <stop offset="65%" stop-color="#facc15" />
        <stop offset="90%" stop-color="#eab308" />
        <stop offset="100%" stop-color="#a16207" />
      </radialGradient>
      <radialGradient id="mgYellowInnerGrad" cx="42%" cy="38%" r="55%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="50%" stop-color="#fef08a" />
        <stop offset="85%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#b45309" />
      </radialGradient>

      <!-- Glossy Mango Leaf Gradients -->
      <linearGradient id="leafDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#166534" />
        <stop offset="50%" stop-color="#14532d" />
        <stop offset="100%" stop-color="#052e16" />
      </linearGradient>
      <linearGradient id="leafLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4ade80" />
        <stop offset="30%" stop-color="#22c55e" />
        <stop offset="75%" stop-color="#16a34a" />
        <stop offset="100%" stop-color="#15803d" />
      </linearGradient>
    </defs>
  `;
}

function marigoldFlower(cx, cy, r, isYellow = false) {
  const outerGrad = isYellow ? 'url(#mgYellowGrad)' : 'url(#mgOrangeGrad)';
  const midGrad = isYellow ? 'url(#mgYellowMidGrad)' : 'url(#mgOrangeMidGrad)';
  const inGrad = isYellow ? 'url(#mgYellowInnerGrad)' : 'url(#mgOrangeInnerGrad)';

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
    <g filter="url(#garlandShadow)">
      <circle cx="${cx}" cy="${cy + 1.5}" r="${(r * 0.92).toFixed(1)}" fill="#451a03" opacity="0.32" />
      <path d="${dOuter}" fill="${outerGrad}" stroke="#c2410c" stroke-width="0.5" stroke-opacity="0.4" />
      <path d="${dMid}" fill="${midGrad}" stroke="#b45309" stroke-width="0.4" stroke-opacity="0.5" />
      <path d="${dIn}" fill="${inGrad}" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.22).toFixed(1)}" fill="#9a3412" />
      <circle cx="${cx}" cy="${cy}" r="${(r * 0.12).toFixed(1)}" fill="#fef08a" />
    </g>
  `;
}

function mangoLeaf(x, y, length, angleDeg) {
  const w = length * 0.32;
  return `
    <g transform="translate(${x}, ${y}) rotate(${angleDeg})">
      <path d="M 0,0 C -${w.toFixed(1)},${(length*0.28).toFixed(1)} -${w.toFixed(1)},${(length*0.65).toFixed(1)} 0,${length.toFixed(1)} C ${w.toFixed(1)},${(length*0.65).toFixed(1)} ${w.toFixed(1)},${(length*0.28).toFixed(1)} 0,0 Z"
            fill="#052e16" opacity="0.22" transform="translate(0, 1.2)" />
      <path d="M 0,0 C -${w.toFixed(1)},${(length*0.28).toFixed(1)} -${w.toFixed(1)},${(length*0.65).toFixed(1)} 0,${length.toFixed(1)} L 0,0 Z"
            fill="url(#leafDarkGrad)" />
      <path d="M 0,0 C ${w.toFixed(1)},${(length*0.28).toFixed(1)} ${w.toFixed(1)},${(length*0.65).toFixed(1)} 0,${length.toFixed(1)} L 0,0 Z"
            fill="url(#leafLightGrad)" />
      <path d="M 0,${(length*0.08).toFixed(1)} C ${(w*0.5).toFixed(1)},${(length*0.3).toFixed(1)} ${(w*0.4).toFixed(1)},${(length*0.6).toFixed(1)} 0,${(length*0.85).toFixed(1)}"
            stroke="#bbf7d0" stroke-width="0.75" stroke-linecap="round" fill="none" opacity="0.65" />
      <line x1="0" y1="0" x2="0" y2="${(length*0.95).toFixed(1)}" stroke="#14532d" stroke-width="0.8" opacity="0.8" />
    </g>
  `;
}

function leafBunch(cx, cy, scale = 1) {
  const l = 32 * scale;
  return `
    <g class="leaf-bunch" filter="url(#garlandShadow)">
      ${mangoLeaf(cx, cy, l * 0.88, -36)}
      ${mangoLeaf(cx, cy, l * 0.94, -18)}
      ${mangoLeaf(cx, cy, l * 0.94, 18)}
      ${mangoLeaf(cx, cy, l * 0.88, 36)}
      ${mangoLeaf(cx, cy, l * 1.05, 0)}
    </g>
  `;
}

function leafTip(cx, cy, scale = 1) {
  const l = 25 * scale;
  return `
    <g class="leaf-tip">
      ${mangoLeaf(cx, cy, l * 0.85, -20)}
      ${mangoLeaf(cx, cy, l * 0.85, 20)}
      ${mangoLeaf(cx, cy, l * 1.0, 0)}
    </g>
  `;
}

// Build Left Corner SVG (4 strands, lush draping, width 132, height 330)
function buildLeftCornerSVG() {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 330" width="132" height="330" fill="none">`;
  s += buildDefs();

  // Corner Anchor Header (y=0 to 30)
  s += `<g class="corner-header">`;
  s += leafBunch(20, 4, 1.15);
  s += leafBunch(52, 4, 1.2);
  s += leafBunch(86, 4, 1.15);
  s += leafBunch(114, 4, 1.05);
  s += marigoldFlower(20, 16, 12, false);
  s += marigoldFlower(52, 16, 12.5, true);
  s += marigoldFlower(86, 16, 12, false);
  s += marigoldFlower(114, 16, 11, true);
  s += `</g>`;

  // Strand 1 (Outer left edge, x=18)
  s += `<g class="strand-1" style="transform-origin: 18px 24px;">`;
  s += leafBunch(18, 26, 0.85);
  s += marigoldFlower(18, 54, 11.5, true);
  s += marigoldFlower(18, 73, 11.5, false);
  s += marigoldFlower(18, 92, 11.5, true);
  s += leafBunch(18, 108, 0.8);
  s += marigoldFlower(18, 134, 11, false);
  s += marigoldFlower(18, 152, 11, true);
  s += leafBunch(18, 168, 0.75);
  s += marigoldFlower(18, 192, 10.5, false);
  s += marigoldFlower(18, 209, 10.5, true);
  s += leafTip(18, 224, 0.85);
  s += `</g>`;

  // Strand 2 (Center left, x=48 - Longest cascade)
  s += `<g class="strand-2" style="transform-origin: 48px 24px;">`;
  s += marigoldFlower(48, 36, 12, false);
  s += leafBunch(48, 52, 0.9);
  s += marigoldFlower(48, 80, 12, true);
  s += marigoldFlower(48, 100, 12, false);
  s += marigoldFlower(48, 120, 12, true);
  s += leafBunch(48, 138, 0.85);
  s += marigoldFlower(48, 164, 11.5, false);
  s += marigoldFlower(48, 183, 11.5, true);
  s += marigoldFlower(48, 202, 11.5, false);
  s += leafBunch(48, 218, 0.8);
  s += marigoldFlower(48, 242, 11, true);
  s += marigoldFlower(48, 259, 11, false);
  s += leafTip(48, 274, 0.95);
  s += `</g>`;

  // Strand 3 (Center right, x=80)
  s += `<g class="strand-3" style="transform-origin: 80px 24px;">`;
  s += leafBunch(80, 28, 0.85);
  s += marigoldFlower(80, 56, 11.5, false);
  s += marigoldFlower(80, 75, 11.5, true);
  s += marigoldFlower(80, 94, 11.5, false);
  s += leafBunch(80, 110, 0.8);
  s += marigoldFlower(80, 136, 11, true);
  s += marigoldFlower(80, 154, 11, false);
  s += leafBunch(80, 170, 0.75);
  s += marigoldFlower(80, 194, 10.5, true);
  s += marigoldFlower(80, 211, 10.5, false);
  s += leafTip(80, 226, 0.85);
  s += `</g>`;

  // Strand 4 (Innermost right, x=110 - graceful short cascade)
  s += `<g class="strand-4" style="transform-origin: 110px 24px;">`;
  s += marigoldFlower(110, 36, 11, true);
  s += leafBunch(110, 52, 0.78);
  s += marigoldFlower(110, 78, 11, false);
  s += marigoldFlower(110, 96, 11, true);
  s += leafBunch(110, 112, 0.72);
  s += marigoldFlower(110, 134, 10.5, false);
  s += marigoldFlower(110, 150, 10.5, true);
  s += leafTip(110, 164, 0.8);
  s += `</g>`;

  s += `</svg>`;
  return s;
}

// Build Right Corner SVG (3 strands side-by-side, width 80, height 260)
// Positioned snugly at right-0, leaves plenty of space for the bell on the left!
function buildRightCornerSVG() {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 260" width="80" height="260" fill="none">`;
  s += buildDefs();

  // Corner Anchor Header (y=0 to 28)
  s += `<g class="corner-header">`;
  s += leafBunch(64, 4, 1.15);
  s += leafBunch(40, 4, 1.1);
  s += leafBunch(16, 4, 0.95);
  s += marigoldFlower(64, 16, 12, false);
  s += marigoldFlower(40, 16, 12, true);
  s += marigoldFlower(16, 16, 11, false);
  s += `</g>`;

  // Strand 1 (Outermost right edge, x=64)
  s += `<g class="strand-1" style="transform-origin: 64px 24px;">`;
  s += leafBunch(64, 26, 0.85);
  s += marigoldFlower(64, 54, 11.5, true);
  s += marigoldFlower(64, 73, 11.5, false);
  s += marigoldFlower(64, 92, 11.5, true);
  s += leafBunch(64, 108, 0.8);
  s += marigoldFlower(64, 134, 11, false);
  s += marigoldFlower(64, 152, 11, true);
  s += leafBunch(64, 168, 0.75);
  s += marigoldFlower(64, 192, 10.5, false);
  s += marigoldFlower(64, 209, 10.5, true);
  s += leafTip(64, 224, 0.85);
  s += `</g>`;

  // Strand 2 (Middle, x=40 - slightly longer cascade)
  s += `<g class="strand-2" style="transform-origin: 40px 24px;">`;
  s += marigoldFlower(40, 36, 11.5, false);
  s += leafBunch(40, 52, 0.85);
  s += marigoldFlower(40, 80, 11.5, true);
  s += marigoldFlower(40, 99, 11.5, false);
  s += marigoldFlower(40, 118, 11.5, true);
  s += leafBunch(40, 134, 0.8);
  s += marigoldFlower(40, 158, 11, false);
  s += marigoldFlower(40, 176, 11, true);
  s += leafBunch(40, 192, 0.75);
  s += marigoldFlower(40, 214, 10.5, false);
  s += leafTip(40, 228, 0.85);
  s += `</g>`;

  // Strand 3 (Inner, x=16 - shorter accent)
  s += `<g class="strand-3" style="transform-origin: 16px 24px;">`;
  s += leafBunch(16, 28, 0.75);
  s += marigoldFlower(16, 52, 11, true);
  s += marigoldFlower(16, 70, 11, false);
  s += leafBunch(16, 86, 0.7);
  s += marigoldFlower(16, 108, 10.5, true);
  s += marigoldFlower(16, 124, 10.5, false);
  s += leafTip(16, 138, 0.75);
  s += `</g>`;

  s += `</svg>`;
  return s;
}

const leftSvg = buildLeftCornerSVG();
const rightSvg = buildRightCornerSVG();

fs.writeFileSync('scratch/garland_left.svg', leftSvg);
fs.writeFileSync('scratch/garland_right.svg', rightSvg);

sharp(Buffer.from(leftSvg))
  .png()
  .toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/garland_left_preview.png')
  .then(() => sharp(Buffer.from(rightSvg)).png().toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/garland_right_preview.png'))
  .then(() => console.log('Both corner previews rendered!'));
