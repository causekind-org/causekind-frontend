/**
 * generate-translations.mjs
 * Run: node scripts/generate-translations.mjs
 *
 * Uses the unofficial Google Translate API (no API key, no credit card).
 * Reads messages/en.json → translates all strings → writes messages/{lang}.json
 * Skips already-translated keys so you can re-run safely.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = path.resolve(__dirname, "../messages");

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

// next-intl interpolation placeholders ({query}, {count}, …) and rich-text
// tags (<b>…</b>, <email></email>) must survive translation verbatim — the
// app calls t("key", { query }) expecting the literal English name back.
// Google Translate doesn't know that, and word-like placeholder names (e.g.
// {query}, {category}) get translated as if they were content. Swap them
// for opaque tokens before sending, then restore the originals after.
function protectPlaceholders(text) {
  const tokens = [];
  const protectedText = text.replace(/\{[^}]+\}|<\/?[a-zA-Z][^>]*>/g, (match) => {
    tokens.push(match);
    return ` XXPLACEHOLDERXX${tokens.length - 1}XX `;
  });
  return { protectedText, tokens };
}

function restorePlaceholders(text, tokens) {
  // Translation sometimes drops the padding space on one side (seen with
  // Arabic/Spanish producing "in{category}") — rather than trust what
  // survived, enforce exactly one space on each side of every restored
  // placeholder/tag, then collapse any doubled-up spacing that creates.
  return text
    .replace(/\s*XXPLACEHOLDERXX\s*(\d+)\s*XX\s*/gi, (_, i) => ` ${tokens[Number(i)] ?? ""} `)
    .replace(/[ \t]+/g, " ")
    .trim();
}

async function translate(text, lang) {
  const { protectedText, tokens } = protectPlaceholders(text);
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${lang}&dt=t&q=` +
    encodeURIComponent(protectedText);
  const r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  // d[0] is array of [translated, original, ...] segments
  const translated = d[0].map((s) => s[0]).join("");
  return tokens.length ? restorePlaceholders(translated, tokens) : translated;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else if (v && typeof v === "object") Object.assign(out, flatten(v, key));
  }
  return out;
}

function setPath(obj, dotPath, val) {
  const keys = dotPath.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]]) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = val;
}

const sourceJson = JSON.parse(fs.readFileSync(`${MESSAGES_DIR}/en.json`, "utf8"));
const sourceFlat = flatten(sourceJson);
const total = Object.keys(sourceFlat).length;
console.log(`\n📦 Source: ${total} strings from en.json\n`);

for (const [lang, name] of Object.entries(LANGUAGES)) {
  console.log(`\n→ ${lang} (${name})`);
  const outFile = `${MESSAGES_DIR}/${lang}.json`;

  // Load existing translations — so we never re-translate unnecessarily
  let existing = {};
  if (fs.existsSync(outFile)) {
    try {
      existing = flatten(JSON.parse(fs.readFileSync(outFile, "utf8")));
      console.log(`  ↳ ${Object.keys(existing).length} already translated`);
    } catch {
      console.log("  ↳ Could not parse existing file — will retranslate all");
    }
  }

  const result = {};
  let newCount = 0;
  let cachedCount = 0;
  let errorCount = 0;
  const entries = Object.entries(sourceFlat);

  for (let i = 0; i < entries.length; i++) {
    const [key, val] = entries[i];

    if (existing[key]) {
      setPath(result, key, existing[key]);
      cachedCount++;
    } else {
      try {
        const translated = await translate(val, lang);
        setPath(result, key, translated);
        newCount++;
        process.stdout.write(
          `  [${String(i + 1).padStart(3)}/${total}] ${key.slice(0, 55).padEnd(55)}\r`
        );
        await sleep(140);
      } catch (err) {
        setPath(result, key, val); // English fallback
        errorCount++;
        if (errorCount <= 5) {
          process.stdout.write("\n");
          console.error(`  ⚠ Error on "${key}": ${err.message}`);
        }
        await sleep(600);
      }
    }
  }

  fs.writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");
  process.stdout.write("\n");
  console.log(
    `  ✓ Saved ${lang}.json — ${newCount} new, ${cachedCount} cached` +
      (errorCount ? `, ${errorCount} errors (English fallback used)` : "")
  );
}

console.log("\n✅ All languages generated!\n");
