import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imgDir = path.join(__dirname, '../public/images');

async function run() {
  const files = await fs.readdir(imgDir);
  const targetExts = ['.png', '.jpg', '.jpeg'];
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (targetExts.includes(ext)) {
      const srcPath = path.join(imgDir, file);
      const destPath = path.join(imgDir, file.replace(new RegExp(`\\${ext}$`, 'i'), '.webp'));
      
      console.log(`Converting ${file} -> ${path.basename(destPath)}`);
      
      await sharp(srcPath)
        .webp({ quality: 80 }) // 80 is a good balance between quality and size
        .toFile(destPath);
        
      console.log(`Deleting ${file}`);
      await fs.unlink(srcPath);
    }
  }
  console.log('Conversion complete!');
}

run().catch(console.error);
