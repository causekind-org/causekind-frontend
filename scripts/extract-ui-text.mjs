#!/usr/bin/env node
/**
 * Extracts <UiText> / ui("…") source strings into messages/en.json → "ui".
 *
 *   node scripts/extract-ui-text.mjs           add new entries, drop unused ones
 *   node scripts/extract-ui-text.mjs --check   exit 1 if the catalogue is out of date
 *                                              or a call site isn't a string literal
 *
 * Only literals written in code are accepted: <UiText>{someVariable}</UiText> or
 * ui(value) is an error, so user-provided values can never be registered.
 * Keys come from src/lib/uiText/key.ts (loaded via Node type stripping), the same
 * function the app uses at runtime.
 *
 * This does NOT find English that was never wrapped — the coverage scan
 * (handoffs/i18n-inventory/i18n-inventory.mjs) stays the check for that.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { uiKey, uiCatalogueValue } = await import(pathToFileURL(path.join(root, "src/lib/uiText/key.ts")).href);
const check = process.argv.includes("--check");

const ENTITIES = { "&apos;": "'", "&quot;": '"', "&amp;": "&", "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&ldquo;": "“", "&rdquo;": "”", "&lsquo;": "‘", "&rsquo;": "’", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…", "&middot;": "·" };
const decode = (s) => s.replace(/&[a-z]+;/g, (e) => ENTITIES[e] ?? e);
const unescapeJs = (s) => s.replace(/\\(.)/g, (_, c) => ({ n: "\n", t: "\t" }[c] ?? c));

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); }
    else if (/\.(tsx|ts)$/.test(e.name) && !/\.test\.(tsx|ts)$/.test(e.name) && !p.endsWith(path.join("components", "UiText.tsx"))) files.push(p);
  }
})(path.join(root, "src"));

const entries = new Map();
const errors = [];
const lineOf = (code, index) => code.slice(0, index).split("\n").length;

for (const file of files) {
  // Blank out comments (keeping newlines so line numbers stay right): docs and
  // examples that mention <UiText> or ui("…") are not call sites.
  const code = fs.readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[\s;{}()])\/\/[^\n]*/g, (c, lead) => lead + " ".repeat(c.length - lead.length));
  const rel = path.relative(root, file).replace(/\\/g, "/");

  for (const m of code.matchAll(/<UiText((?:\s+context="[^"]*")?)\s*>([\s\S]*?)<\/UiText>/g)) {
    const context = m[1].match(/context="([^"]*)"/)?.[1];
    const inner = m[2];
    if (/[{<]/.test(inner)) { errors.push(`${rel}:${lineOf(code, m.index)} <UiText> children must be literal text (no {…} or elements)`); continue; }
    const text = decode(inner);
    if (text.trim()) entries.set(uiKey(text, context), uiCatalogueValue(text));
  }
  for (const m of code.matchAll(/<UiText\b(?![^>]*>[\s\S]*?<\/UiText>)/g)) {
    errors.push(`${rel}:${lineOf(code, m.index)} <UiText> must wrap literal text`);
  }

  if (!/\buseUiText\(/.test(code)) continue;
  for (const m of code.matchAll(/\bui\(\s*(["'])((?:\\.|(?!\1)[^\\])*)\1\s*(?:,\s*(["'])((?:\\.|(?!\3)[^\\])*)\3\s*)?\)/g)) {
    const text = unescapeJs(m[2]);
    if (text.trim()) entries.set(uiKey(text, m[4] ? unescapeJs(m[4]) : undefined), uiCatalogueValue(text));
  }
  for (const m of code.matchAll(/\bui\(\s*(?!["'])/g)) {
    errors.push(`${rel}:${lineOf(code, m.index)} ui(…) must be called with a string literal`);
  }
}

const enPath = path.join(root, "messages/en.json");
const raw = fs.readFileSync(enPath, "utf8");
const bom = raw.charCodeAt(0) === 0xfeff ? "﻿" : "";
const en = JSON.parse(raw.replace(/^﻿/, ""));
const next = Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)));
const before = JSON.stringify(en.ui ?? {});
const changed = before !== JSON.stringify(next);

for (const e of errors) console.error("✗ " + e);
if (check) {
  if (changed) console.error(`✗ messages/en.json "ui" is out of date — run: npm run i18n:extract`);
  if (errors.length || changed) process.exit(1);
  console.log(`✓ ${entries.size} UiText entries, catalogue up to date`);
} else {
  if (errors.length) process.exit(1);
  if (changed) {
    en.ui = next;
    fs.writeFileSync(enPath, bom + JSON.stringify(en, null, 2) + "\n");
  }
  console.log(`${changed ? "Updated" : "No change:"} ${entries.size} UiText entries in messages/en.json`);
}
