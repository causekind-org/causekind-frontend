/** Manual, potentially billable cache warming. Never invoked by build/start. */
import fs from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { locales } from "../src/i18n/config.ts";
import { splitTranslationText } from "../src/lib/translation/text.ts";

const args = process.argv.slice(2);
const valueOf = (flag) => {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
};

if (args.includes("--help") || !valueOf("--locales")) {
  console.log("Usage: npm run translate:warm -- --url http://localhost:3000 --locales hi,mr [--blogs]");
  console.log("Warms the running server's Google cache. Makes billable Google requests on cache misses.");
  console.log("Run against the deployment that needs the cache. Local warming does not warm production.");
  process.exit(args.includes("--help") ? 0 : 1);
}

const targets = [...new Set(valueOf("--locales").split(","))];
if (targets.some((locale) => locale === "en" || !locales.includes(locale))) {
  throw new Error("Use a comma-separated list of supported non-English language codes.");
}
const origin = new URL(valueOf("--url") || "http://localhost:3000");
if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password ||
    origin.pathname !== "/" || origin.search || origin.hash) {
  throw new Error("--url must be an HTTP(S) origin without credentials, path, query or fragment.");
}

const english = JSON.parse(await fs.readFile(new URL("../messages/en.json", import.meta.url), "utf8"));
const keys = [];
function collectKeys(value, prefix = "") {
  if (typeof value === "string") keys.push(prefix);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) collectKeys(child, prefix ? `${prefix}.${key}` : key);
  }
}
collectKeys(english);

async function post(path, payload) {
  // Pace requests below the shared 60/minute/IP limit. This is sequential so
  // a quota/provider failure stops the run without scheduling more spending.
  await delay(1_100);
  const response = await fetch(new URL(path, origin), {
    method: "POST", redirect: "error",
    headers: { "Content-Type": "application/json", Origin: origin.origin, "Sec-Fetch-Site": "same-origin" },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Cache warming stopped: HTTP ${response.status}. Check server configuration, limits and logs.`);
  const data = await response.json();
  const expected = payload.keys?.length ?? payload.texts.length;
  if (!Array.isArray(data.results) || data.results.length !== expected ||
      data.results.some((result) => result.translated !== true)) {
    throw new Error("Cache warming incomplete. Successful entries remain cached; fix the failure and rerun.");
  }
}

// Interface keys already in messages/<locale>.json and blog posts already in
// public/blog-translations/<locale>.json are served from those files, so they
// are skipped here: warming only pays for what is genuinely missing.
async function readJson(relative) {
  try { return JSON.parse(await fs.readFile(new URL(relative, import.meta.url), "utf8")); }
  catch { return {}; }
}
function hasString(tree, key) {
  let node = tree;
  for (const part of key.split(".")) node = node && typeof node === "object" ? node[part] : undefined;
  return typeof node === "string" && node.trim() !== "";
}

const blogChunks = []; // { slug, chunks }
if (args.includes("--blogs")) {
  const { blogPosts, insiderTips } = await import("../src/data/blogData.ts");
  const { blogContent } = await import("../src/data/blogContent.ts");
  const { JSDOM } = await import("jsdom");
  let unique;
  function add(text) {
    for (const chunk of splitTranslationText(text || "")) if (chunk.trim()) unique.add(chunk.trim());
  }
  for (const post of blogPosts) {
    unique = new Set();
    [post.title, post.description, post.category].forEach(add);
    const dom = new JSDOM(`<div id="translation-root">${blogContent[post.slug] || ""}</div>`);
    const root = dom.window.document.getElementById("translation-root");
    const walker = dom.window.document.createTreeWalker(root, dom.window.NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement?.closest('script, style, noscript, code, pre, [translate="no"]')) add(node.textContent);
    }
    dom.window.close();
    blogChunks.push({ slug: post.slug, chunks: [...unique] });
  }
  unique = new Set();
  for (const tip of insiderTips) [tip.title, tip.description].forEach(add);
  blogChunks.push({ slug: "__insider_tips__", chunks: [...unique] });
}

try {
  for (const target of targets) {
    const staticMessages = await readJson(`../messages/${target}.json`);
    const missingKeys = keys.filter((key) => !hasString(staticMessages, key));
    const staticBlog = await readJson(`../public/blog-translations/${target}.json`);
    const blogTexts = [...new Set(blogChunks.filter(({ slug }) => !staticBlog[slug]).flatMap(({ chunks }) => chunks))];
    console.log(`Warming ${target}: ${missingKeys.length} of ${keys.length} interface messages missing from messages/${target}.json` +
      (args.includes("--blogs") ? `, ${blogTexts.length} blog strings from posts missing from the static blog file` : "") + ".");
    for (let index = 0; index < missingKeys.length; index += 16) {
      await post("/api/translate/messages", { target, keys: missingKeys.slice(index, index + 16) });
    }
    for (let index = 0; index < blogTexts.length;) {
      const texts = [];
      let size = 0;
      while (index < blogTexts.length && texts.length < 32 && size + blogTexts[index].length <= 20_000) {
        texts.push(blogTexts[index]);
        size += blogTexts[index++].length;
      }
      await post("/api/translate", { target, texts });
    }
    console.log(`${target}: requested translations cached successfully.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Cache warming failed.");
  process.exitCode = 1;
}
