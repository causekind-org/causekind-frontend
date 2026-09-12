/**
 * extend-walk-offscreen.mjs
 * Run: node scripts/extend-walk-offscreen.mjs <frames-dir> <out-dir> [stepPx] [extraFrames]
 *
 * Copies a PNG sequence and appends N frames that carry the final frame further
 * in one direction, so a subject that the clip cut off mid-exit finishes leaving
 * the frame. See docs/ganpati-mushak-asset.md, "The books band: finishing the
 * walk", for why `mushak-books.webm` needed it and how the numbers were picked.
 *
 * The appended frames freeze the subject's animation, so this only works where
 * very little of it is still on screen — the point is to slide a tail or a heel
 * out of shot, not to fake a walk cycle. Match `stepPx` to the subject's own
 * measured speed over the last few real frames or the seam will be visible.
 *
 * Not wired into any build. It is run by hand when a clip is (re)delivered, and
 * the encoded result is committed under public/images/ganpati/.
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

async function main() {
  const [inDir, outDir, stepArg, extraArg] = process.argv.slice(2);
  if (!inDir || !outDir) {
    console.error("usage: node scripts/extend-walk-offscreen.mjs <frames-dir> <out-dir> [stepPx] [extraFrames]");
    process.exit(1);
  }
  const step = Number(stepArg || 12);
  const extra = Number(extraArg || 20);

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(inDir).filter((f) => f.endsWith(".png")).sort();
  if (!files.length) {
    console.error(`no PNG frames in ${inDir}`);
    process.exit(1);
  }
  files.forEach((f, i) =>
    fs.copyFileSync(path.join(inDir, f), path.join(outDir, `f${String(i + 1).padStart(4, "0")}.png`))
  );

  const lastPath = path.join(inDir, files[files.length - 1]);
  const { width: W, height: H } = await sharp(lastPath).metadata();

  for (let j = 1; j <= extra; j++) {
    const shift = j * step;
    const name = path.join(outDir, `f${String(files.length + j).padStart(4, "0")}.png`);
    const canvas = sharp({
      create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    });
    // Past the frame width there is nothing left to carry, so the tail of the
    // run is simply empty frames — which is the pause before the loop repeats.
    if (shift >= W) {
      await canvas.png().toFile(name);
      continue;
    }
    const slice = await sharp(lastPath)
      .extract({ left: 0, top: 0, width: W - shift, height: H })
      .png()
      .toBuffer();
    await canvas.composite([{ input: slice, left: shift, top: 0 }]).png().toFile(name);
  }

  console.log(`wrote ${files.length + extra} frames to ${outDir} (${files.length} original + ${extra} appended at ${step}px)`);
}

main();
