/**
 * convert-images-to-webp.mjs
 * Run: node scripts/convert-images-to-webp.mjs
 *
 * Converts every .png/.jpg/.jpeg under public/ to .webp (same directory,
 * same base name), skipping files that already have a .webp sibling.
 * Leaves the originals in place — a separate cleanup step removes them
 * once source references have been updated and the site is verified.
 * SVGs are left untouched (vector — converting to a raster format is a
 * regression, not an optimization).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(png|jpe?g)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

async function main() {
  const files = walk(PUBLIC_DIR);
  console.log(`\n📦 ${files.length} raster images found under public/\n`);

  let converted = 0;
  let skipped = 0;
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const webpPath = file.replace(/\.(png|jpe?g)$/i, ".webp");
    if (fs.existsSync(webpPath)) {
      console.log(`  ↳ skip (already exists): ${path.relative(PUBLIC_DIR, webpPath)}`);
      skipped++;
      continue;
    }
    const beforeSize = fs.statSync(file).size;
    await sharp(file).webp({ quality: 82 }).toFile(webpPath);
    const afterSize = fs.statSync(webpPath).size;
    totalBefore += beforeSize;
    totalAfter += afterSize;
    converted++;
    const pct = (((beforeSize - afterSize) / beforeSize) * 100).toFixed(0);
    console.log(
      `  ✓ ${path.relative(PUBLIC_DIR, file)} → .webp  (${(beforeSize / 1024 / 1024).toFixed(2)}MB → ${(afterSize / 1024 / 1024).toFixed(2)}MB, -${pct}%)`
    );
  }

  console.log(`\n✅ Converted ${converted}, skipped ${skipped}`);
  if (converted) {
    console.log(
      `   Total: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB (saved ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0)}%)`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
