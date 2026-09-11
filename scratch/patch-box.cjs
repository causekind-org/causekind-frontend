const sharp = require('sharp');
const fs = require('fs');

async function updateGiftBox() {
  const src = 'public/images/ganpati-hero-bg-v4.webp';
  const meta = await sharp(src).metadata();
  console.log('Image dimensions:', meta.width, meta.height);

  // In 1376 x 768:
  // The box front is roughly from x = 1180 to 1350, y = 470 to 630
  // Let's crop x: 1150, y: 440, w: 226, h: 260 to test patching
  const boxCrop = await sharp(src)
    .extract({ left: 1150, top: 440, width: 226, height: 260 })
    .toBuffer();

  // Create an SVG overlay that cleanly patches the old text and writes "Spread Joy"
  // Box face in crop coordinates:
  // left edge of face: ~35px, top: ~30px, right: ~220px, bottom: ~180px
  const svgOverlay = `
    <svg width="226" height="260" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardboardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#c99b6e" />
          <stop offset="50%" stop-color="#bf9164" />
          <stop offset="100%" stop-color="#b6885b" />
        </linearGradient>
      </defs>
      <!-- Smooth patch covering the old Share Care Spread Joy text and heart -->
      <path d="M 50,45 L 210,48 L 210,165 L 50,162 Z" fill="url(#cardboardGrad)" opacity="0.95" filter="blur(1px)" />
      
      <!-- Clean, elegant "Spread Joy" handwritten text matching reference style -->
      <text x="130" y="112"
            text-anchor="middle"
            font-family="Caveat, 'Segoe Script', cursive, sans-serif"
            font-size="20"
            font-weight="700"
            font-style="italic"
            fill="#3f1c0d"
            letter-spacing="0.5px">
        Spread Joy
      </text>
    </svg>
  `;

  const patchedCrop = await sharp(boxCrop)
    .composite([{ input: Buffer.from(svgOverlay), blend: 'over' }])
    .png()
    .toBuffer();

  await sharp(patchedCrop)
    .toFile('C:/Users/hp/.gemini/antigravity-ide/brain/e6211fd5-91f8-4818-851d-795d1ac6275b/patched_box_preview.png');

  console.log('Patched box preview saved!');
}

updateGiftBox().catch(console.error);
