/**
 * translate-missing-blogs.mjs
 * Run: node --experimental-strip-types scripts/translate-missing-blogs.mjs [locale ...]
 *
 * Fills in blog posts that exist in src/data/blogData.ts but have no entry in
 * public/blog-translations/<locale>.json — i.e. posts added after the last
 * translation run.
 *
 * Differs from generate-blog-translations.mjs in three ways that matter:
 *
 *   1. Writes straight to public/blog-translations/, which is what
 *      src/data/blogTranslations/index.ts actually fetches at runtime. The
 *      older script wrote to src/data/blogTranslations/ and relied on someone
 *      copying the files across by hand.
 *
 *   2. Retries a failed translation with backoff and then gives up on the
 *      whole post, rather than silently substituting the English text. A post
 *      is only written once every one of its text nodes translated, so a
 *      rate-limit can never leave a half-English article on the site.
 *
 *   3. Runs locales concurrently. 1,271 text nodes x 13 locales is ~16.5k
 *      requests; serially that is a day of wall clock.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { JSDOM } from "jsdom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/blog-translations");

const LANGUAGES = {
  hi: "Hindi", ta: "Tamil", te: "Telugu", mr: "Marathi", bn: "Bengali",
  gu: "Gujarati", kn: "Kannada", ml: "Malayalam", pa: "Punjabi", ur: "Urdu",
  es: "Spanish", fr: "French", ar: "Arabic",
};

const TIPS_KEY = "__insider_tips__";

// Google's free endpoint tolerates roughly this much concurrency across all
// locales combined before it starts 429ing. Tuned down from 13 (one flight per
// locale) after seeing sporadic rate limits.
const MAX_INFLIGHT = 8;
const PER_REQUEST_DELAY_MS = 90;
const RETRY_DELAYS_MS = [1_000, 3_000, 8_000, 20_000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A plain counting semaphore. Each locale worker is internally serial, so this
// only caps how many locales are mid-request at the same instant.
let inflight = 0;
const waiters = [];
async function acquire() {
  if (inflight < MAX_INFLIGHT) { inflight++; return; }
  await new Promise((r) => waiters.push(r));
  inflight++;
}
function release() {
  inflight--;
  waiters.shift()?.();
}

async function translateOnce(text, lang) {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=` +
    encodeURIComponent(text);
  const r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  if (!Array.isArray(d?.[0])) throw new Error("unexpected response shape");
  return d[0].map((s) => s[0]).join("");
}

/** Throws if every attempt fails — the caller aborts the post rather than
 *  writing the untranslated English through. */
async function translate(text, lang) {
  await acquire();
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const out = await translateOnce(text, lang);
        await sleep(PER_REQUEST_DELAY_MS);
        return out;
      } catch (err) {
        if (attempt >= RETRY_DELAYS_MS.length) {
          throw new Error(`${lang}: giving up after ${attempt + 1} attempts — ${err.message}`);
        }
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  } finally {
    release();
  }
}

// Walks the post HTML and translates text nodes only, so headings, links,
// <strong> and <hr> come through structurally identical to the English.
async function translateHtml(html, lang, onNode) {
  const dom = new JSDOM(`<div id="root">${html}</div>`);
  const container = dom.window.document.getElementById("root");

  const textNodes = [];
  const walker = dom.window.document.createTreeWalker(container, dom.window.NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.textContent && node.textContent.trim()) textNodes.push(node);
  }

  for (const n of textNodes) {
    n.textContent = await translate(n.textContent, lang);
    onNode?.();
  }

  return container.innerHTML;
}

async function runLocale(lang, name, blogPosts, insiderTips, log) {
  const outFile = path.join(OUT_DIR, `${lang}.json`);

  let result = {};
  if (fs.existsSync(outFile)) {
    result = JSON.parse(fs.readFileSync(outFile, "utf8"));
  }

  const missing = blogPosts.filter((p) => !result[p.slug]);
  if (!missing.length && result[TIPS_KEY]) {
    log(`${lang} (${name}): nothing missing`);
    return { lang, translated: 0, failed: [] };
  }

  log(`${lang} (${name}): ${missing.length} post(s) to translate`);
  const failed = [];
  let translated = 0;

  for (const post of missing) {
    try {
      const [title, description, category] = await Promise.all([
        translate(post.title, lang),
        translate(post.description, lang),
        translate(post.category, lang),
      ]);

      let nodes = 0;
      const content = await translateHtml(post.content || "", lang, () => { nodes++; });

      result[post.slug] = { title, description, category, content };
      // Write per post so an interrupted run keeps everything finished so far,
      // and a re-run picks up exactly where it stopped.
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");
      translated++;
      log(`${lang}: ✓ ${post.slug} (${nodes} nodes)`);
    } catch (err) {
      // Leave the slug absent rather than half-done. The reader falls back to
      // English for a missing slug, which is correct; a partially translated
      // post would not be.
      failed.push(post.slug);
      log(`${lang}: ✗ ${post.slug} — ${err.message}`);
    }
  }

  if (!result[TIPS_KEY]) {
    try {
      const tips = {};
      for (const tip of insiderTips) {
        const [title, description] = await Promise.all([
          translate(tip.title, lang),
          translate(tip.description, lang),
        ]);
        tips[tip.slug] = { title, description };
      }
      result[TIPS_KEY] = tips;
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");
    } catch (err) {
      failed.push(TIPS_KEY);
      log(`${lang}: ✗ insider tips — ${err.message}`);
    }
  }

  return { lang, translated, failed };
}

async function main() {
  const requested = process.argv.slice(2);
  const targets = requested.length
    ? Object.fromEntries(requested.map((c) => [c, LANGUAGES[c] || c]))
    : LANGUAGES;

  const { blogPosts, insiderTips } = await import(
    pathToFileURL(path.join(ROOT, "src/data/blogData.ts")).href
  );

  const started = Date.now();
  const log = (msg) => {
    const s = Math.round((Date.now() - started) / 1000);
    console.log(`[${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}] ${msg}`);
  };

  log(`${blogPosts.length} posts in blogData, ${Object.keys(targets).length} locale(s)`);

  const results = await Promise.all(
    Object.entries(targets).map(([lang, name]) =>
      runLocale(lang, name, blogPosts, insiderTips, log)
    )
  );

  console.log("\n=== Summary ===");
  let anyFailed = false;
  for (const r of results) {
    const note = r.failed.length ? `  FAILED: ${r.failed.join(", ")}` : "";
    if (r.failed.length) anyFailed = true;
    console.log(`${r.lang.padEnd(4)} translated ${String(r.translated).padStart(3)}${note}`);
  }
  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
