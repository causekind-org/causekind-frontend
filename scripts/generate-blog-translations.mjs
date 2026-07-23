/**
 * generate-blog-translations.mjs
 * Run: node scripts/generate-blog-translations.mjs [locale ...]
 *   e.g. node scripts/generate-blog-translations.mjs hi
 *        node scripts/generate-blog-translations.mjs        (all configured locales)
 *
 * Pre-translates every blog post's title/description/category/content into
 * static JSON, once, offline — so the live site never calls a translation
 * API per pageview (which is what was hitting MyMemory's free daily quota).
 *
 * Uses the same unofficial Google Translate endpoint as
 * generate-translations.mjs (no API key). Content is walked as a DOM so
 * only text nodes are translated — HTML tags (headings, bold, links, hr)
 * survive untouched. Skips slugs/fields already translated so re-runs are
 * cheap and safe.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { JSDOM } from "jsdom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "src/data/blogTranslations");

const LANGUAGES = {
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  bn: "Bengali",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  ur: "Urdu",
  es: "Spanish",
  fr: "French",
  ar: "Arabic",
};

const requested = process.argv.slice(2);
const targets = requested.length
  ? Object.fromEntries(requested.map((code) => [code, LANGUAGES[code] || code]))
  : LANGUAGES;

async function translate(text, lang) {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=` +
    encodeURIComponent(text);
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return d[0].map((s) => s[0]).join("");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Translates an HTML string node-by-node (tags untouched) — mirrors
// translateHtml() in src/hooks/useDynamicTranslation.ts, but running
// server-side against jsdom instead of the browser DOM.
async function translateHtml(html, lang, onProgress) {
  const dom = new JSDOM(`<div id="root">${html}</div>`);
  const container = dom.window.document.getElementById("root");

  const textNodes = [];
  const walker = dom.window.document.createTreeWalker(container, dom.window.NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.textContent && node.textContent.trim()) textNodes.push(node);
  }

  for (const n of textNodes) {
    try {
      n.textContent = await translate(n.textContent, lang);
    } catch (err) {
      onProgress?.(`error (kept English): ${err.message}`);
      await sleep(600);
    }
    onProgress?.();
    await sleep(140);
  }

  return container.innerHTML;
}

// Reserved key for the small "Insider Tips" carousel data — can't collide
// with a real post slug since blog slugs are plain kebab-case.
const TIPS_KEY = "__insider_tips__";

async function main() {
  const { blogPosts, insiderTips } = await import(pathToFileURL(path.join(ROOT, "src/data/blogData.ts")).href);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`\n📦 ${blogPosts.length} blog posts + ${insiderTips.length} insider tips to translate\n`);

  for (const [lang, name] of Object.entries(targets)) {
    console.log(`\n→ ${lang} (${name})`);
    const outFile = path.join(OUT_DIR, `${lang}.json`);

    let existing = {};
    if (fs.existsSync(outFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(outFile, "utf8"));
      } catch {
        console.log("  ↳ could not parse existing file — will retranslate all");
      }
    }

    const result = { ...existing };

    for (const post of blogPosts) {
      if (result[post.slug]) {
        console.log(`  ↳ ${post.slug} — already translated, skipping`);
        continue;
      }

      process.stdout.write(`  ↳ ${post.slug} — translating`);
      const [title, description, category] = await Promise.all([
        translate(post.title, lang),
        translate(post.description, lang),
        translate(post.category, lang),
      ]);
      await sleep(140);

      let count = 0;
      const content = await translateHtml(post.content || "", lang, (msg) => {
        if (msg) {
          process.stdout.write(`\n    ⚠ ${msg}`);
        } else {
          count++;
          process.stdout.write(`\r  ↳ ${post.slug} — translating (${count} text nodes)`);
        }
      });

      result[post.slug] = { title, description, category, content };
      process.stdout.write("\n");

      // Save after every post — a crash/rate-limit partway through doesn't lose prior work.
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");
    }

    if (!result[TIPS_KEY]) {
      console.log(`  ↳ insider tips — translating`);
      const tips = {};
      for (const tip of insiderTips) {
        const [title, description] = await Promise.all([
          translate(tip.title, lang),
          translate(tip.description, lang),
        ]);
        tips[tip.slug] = { title, description };
        await sleep(140);
      }
      result[TIPS_KEY] = tips;
      fs.writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");
    } else {
      console.log(`  ↳ insider tips — already translated, skipping`);
    }

    const postCount = Object.keys(result).filter((k) => k !== TIPS_KEY).length;
    console.log(`  ✓ Saved ${lang}.json — ${postCount} posts + insider tips`);
  }

  console.log("\n✅ Done!\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
