import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../src');

async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
      let content = await fs.readFile(fullPath, 'utf8');
      
      // We only want to replace references in /images/ or ending in .jpg/.png
      // The simplest is just a global replace for .jpg and .png
      // But let's be slightly more careful to avoid accidental replacements
      const original = content;
      content = content.replace(/\.jpg/g, '.webp');
      content = content.replace(/\.png/g, '.webp');
      
      if (original !== content) {
        console.log(`Updated references in ${path.relative(srcDir, fullPath)}`);
        await fs.writeFile(fullPath, content, 'utf8');
      }
    }
  }
}

async function run() {
  console.log('Starting reference update...');
  await processDirectory(srcDir);
  console.log('Update complete!');
}

run().catch(console.error);
