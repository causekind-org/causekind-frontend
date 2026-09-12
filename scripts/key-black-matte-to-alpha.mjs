/**
 * key-black-matte-to-alpha.mjs
 * Run: node scripts/key-black-matte-to-alpha.mjs <frames-dir> <out-dir> [crop]
 *      crop is JSON: {"left":18,"top":103,"width":774,"height":518}
 *
 * Turns a PNG sequence whose subject was flattened on to a black matte into a
 * PNG sequence with a real alpha channel, ready to be encoded as VP9/WebM.
 * It exists because `ffmpeg`'s own `colorkey` cannot do this particular job:
 * see docs/ganpati-mushak-asset.md for the full recipe and the measurements
 * behind the two thresholds below.
 *
 * The short version of why a colour key fails: the mushak's pupils measure a
 * true 0,0,0, exactly like the matte, so any tolerance that removes the
 * background also punches two holes through his eyes. This keys by reachability
 * instead — black the flood fill can reach from the frame border is background,
 * black it cannot reach is enclosed by the subject and stays opaque.
 *
 * Not wired into any build. It is run by hand when a clip is (re)cut, and the
 * encoded result is committed under public/images/ganpati/.
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";

/** Max channel at or below this is a candidate matte pixel. The delivered clip
 *  measures 61% of its pixels at <= 2, so there is a wide margin here. */
const MATTE = 10;

/** Max channel at or above this is fully opaque at the rim. Between the two the
 *  alpha ramps, which is what keeps the artwork's antialiased edge. */
const RAMP = 45;

/** How far the subject's colour is bled outward under the transparent pixels.
 *  yuva420p subsamples chroma 2x1x1, so whatever sits under a transparent pixel
 *  still tints the visible pixel beside it; 3px covers that. */
const BLEED = 3;

/** What the rest of the transparent region is flooded with — the donee card's
 *  parchment. Only ever seen by a decoder that ignores WebM alpha, where a
 *  parchment box on a parchment card beats a black one. */
const GROUND = [0xff, 0xfa, 0xf3];

async function keyFrame(inPath, outPath, crop) {
  const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const N = W * H;

  const maxc = new Uint8Array(N);
  for (let i = 0, p = 0; i < N; i++, p += C) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    maxc[i] = r > g ? (r > b ? r : b) : (g > b ? g : b);
  }

  // Flood the matte inward from the border. Anything dark but enclosed by the
  // subject is never reached, so it keeps full opacity.
  const outside = new Uint8Array(N);
  const stack = [];
  const push = (i) => { if (!outside[i] && maxc[i] <= MATTE) { outside[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop(), x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }

  // Rim pixels are kept but ramped, so the edge does not become a staircase.
  const near = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (outside[i]) continue;
    for (let dy = -2; dy <= 2 && !near[i]; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (outside[yy * W + xx]) { near[i] = 1; break; }
    }
  }

  const out = Buffer.alloc(N * 4);
  for (let i = 0, p = 0, q = 0; i < N; i++, p += C, q += 4) {
    if (outside[i]) { out[q] = out[q + 1] = out[q + 2] = out[q + 3] = 0; continue; }
    let r = data[p], g = data[p + 1], b = data[p + 2];
    // Despill: the original key left a green rim on the silhouette.
    const rb = (r + b) >> 1;
    if (g > rb + 10) g = rb + 10;
    let a = 255;
    if (near[i]) {
      const m = maxc[i];
      a = m >= RAMP ? 255 : Math.round((m / RAMP) * 255);
      if (a < 8) a = 8;
      // Flattening on to black *is* premultiplication; undo it so the edge does
      // not composite dark.
      const k = 255 / a;
      r = Math.min(255, Math.round(r * k));
      g = Math.min(255, Math.round(g * k));
      b = Math.min(255, Math.round(b * k));
    }
    out[q] = r; out[q + 1] = g; out[q + 2] = b; out[q + 3] = a;
  }

  // Bleed the subject's colour outward, then flood the rest with the ground.
  const known = new Uint8Array(N);
  for (let i = 0; i < N; i++) known[i] = out[i * 4 + 3] > 0 ? 1 : 0;
  let frontier = [];
  for (let i = 0; i < N; i++) if (known[i]) frontier.push(i);
  for (let depth = 0; depth < BLEED && frontier.length; depth++) {
    const next = [];
    const claimed = new Map();
    for (const i of frontier) {
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx;
        if (known[j]) continue;
        let acc = claimed.get(j);
        if (!acc) { acc = [0, 0, 0, 0]; claimed.set(j, acc); next.push(j); }
        acc[0] += out[i * 4]; acc[1] += out[i * 4 + 1]; acc[2] += out[i * 4 + 2]; acc[3]++;
      }
    }
    for (const [j, acc] of claimed) {
      out[j * 4] = (acc[0] / acc[3]) | 0;
      out[j * 4 + 1] = (acc[1] / acc[3]) | 0;
      out[j * 4 + 2] = (acc[2] / acc[3]) | 0;
      known[j] = 1;
    }
    frontier = next;
  }
  for (let i = 0; i < N; i++) {
    if (known[i]) continue;
    out[i * 4] = GROUND[0]; out[i * 4 + 1] = GROUND[1]; out[i * 4 + 2] = GROUND[2];
  }

  let img = sharp(out, { raw: { width: W, height: H, channels: 4 } });
  if (crop) img = img.extract(crop);
  await img.png({ compressionLevel: 6 }).toFile(outPath);
}

async function main() {
  const [inDir, outDir, cropArg] = process.argv.slice(2);
  if (!inDir || !outDir) {
    console.error("usage: node scripts/key-black-matte-to-alpha.mjs <frames-dir> <out-dir> [crop-json]");
    process.exit(1);
  }
  const crop = cropArg ? JSON.parse(cropArg) : null;
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(inDir).filter((f) => f.endsWith(".png")).sort();
  for (const f of files) await keyFrame(path.join(inDir, f), path.join(outDir, f), crop);
  console.log(`keyed ${files.length} frames -> ${outDir}`);
}

main();
