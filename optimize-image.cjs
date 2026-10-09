const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'images', 'ngo-hero-landing.jpg');
const outputPathWebp = path.join(__dirname, 'public', 'images', 'ngo-hero-landing.webp');

async function optimizeImage() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    await sharp(inputPath)
      .resize({ width: 1920, withoutEnlargement: true }) // reasonable max width
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPathWebp);
    
    console.log(`Successfully created ${outputPathWebp}`);
  } catch (err) {
    console.error('Error optimizing image:', err);
    process.exit(1);
  }
}

optimizeImage();
