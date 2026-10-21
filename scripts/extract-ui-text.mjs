#!/usr/bin/env node
/**
 * Extracts <UiText> / useUiText() source strings into messages/en.json → "ui".
 *
 *   node scripts/extract-ui-text.mjs           add new entries, drop unused ones
 *   node scripts/extract-ui-text.mjs --check   exit 1 if the catalogue is out of date
 *                                              or any use is unsupported
 *
 * Parses with the TypeScript compiler, so comments and string contents are never
 * confused, imports may be aliased, and literal values are read exactly as
 * JavaScript reads them (’, \x27, …). Every reference to UiText / useUiText is
 * classified; anything that isn't one of the supported shapes is an error, never
 * silently skipped:
 *
 *   import { UiText, useUiText } from "@/components/UiText";   // aliases allowed
 *   const ui = useUiText();                                     // any binding name
 *   ui("Literal")            ui("Literal", "context")           // string literals only
 *   <UiText>Literal text</UiText>
 *   <UiText>{"Literal"}</UiText>
 *   <UiText context="status">Open</UiText>   <UiText context={"status"}>Open</UiText>
 *
 * Errors are reported and nothing is written, so a bad run can never drop entries.
 * Keys come from src/lib/uiText/key.ts (Node type stripping) — the runtime's function.
 *
 * This does NOT find English that was never wrapped — the coverage scan
 * (handoffs/i18n-inventory/i18n-inventory.mjs) stays the check for that.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ts = createRequire(import.meta.url)("typescript");
const { uiKey, uiCatalogueValue } = await import(pathToFileURL(path.join(root, "src/lib/uiText/key.ts")).href);
const check = process.argv.includes("--check");
const MODULE = "@/components/UiText";
const SELF = path.join(root, "src", "components", "UiText.tsx");

// JSX text entities, as the JSX compiler decodes them. Unknown named entities are errors.
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", mdash: "—", ndash: "–", hellip: "…", middot: "·", times: "×", rarr: "→", larr: "←", bull: "•", copy: "©", reg: "®", trade: "™", deg: "°", rupee: "₹" };
function decodeJsxText(raw, fail) {
  return raw.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === "#") return String.fromCodePoint(body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10));
    const value = NAMED[body.toLowerCase()];
    if (value === undefined) fail(`unsupported entity ${whole} — use the character itself`);
    return value ?? whole;
  });
}

const isLiteral = (n) => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n));

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); }
    else if (/\.(tsx|ts)$/.test(e.name) && !/\.test\.(tsx|ts)$/.test(e.name) && !/\.d\.ts$/.test(e.name) && p !== SELF) files.push(p);
  }
})(path.join(root, "src"));

const entries = new Map();
const errors = [];

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  if (!code.includes("UiText")) continue;
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const at = (node) => `${rel}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;
  const fail = (node, msg) => errors.push(`${at(node)} ${msg}`);
  const add = (text, context) => { if (text.trim()) entries.set(uiKey(text, context), uiCatalogueValue(text)); };

  // 1. Imports from the UiText module (aliases allowed; namespace/default imports rejected).
  const componentNames = new Set();
  const hookNames = new Set();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const spec = stmt.moduleSpecifier.text;
    const resolved = spec.startsWith(".") ? path.resolve(path.dirname(file), spec) : null;
    if (spec !== MODULE && resolved !== SELF.replace(/\.tsx$/, "")) continue;
    const clause = stmt.importClause;
    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings) || clause.name) { fail(stmt, `import from ${spec} must use named imports { UiText, useUiText }`); continue; }
    for (const el of clause.namedBindings.elements) {
      const imported = (el.propertyName ?? el.name).text;
      if (imported === "UiText") componentNames.add(el.name.text);
      else if (imported === "useUiText") hookNames.add(el.name.text);
    }
  }
  if (!componentNames.size && !hookNames.size) continue;

  // 2. Hook bindings: `const <name> = useUiText();` only.
  const translatorNames = new Set();
  (function findBindings(node) {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)
      && ts.isIdentifier(node.initializer.expression) && hookNames.has(node.initializer.expression.text)) {
      if (ts.isIdentifier(node.name) && node.initializer.arguments.length === 0) translatorNames.add(node.name.text);
    }
    ts.forEachChild(node, findBindings);
  })(sf);

  // 3. Classify every reference.
  (function visit(node) {
    if (ts.isIdentifier(node)) {
      const name = node.text;
      const parent = node.parent;
      const isDeclName = (ts.isImportSpecifier(parent) || ts.isVariableDeclaration(parent) || ts.isBindingElement(parent) || ts.isParameter(parent)) && parent.name === node;
      const isPropertyName = (ts.isPropertyAccessExpression(parent) && parent.name === node) || (ts.isPropertyAssignment(parent) && parent.name === node) || ts.isJsxAttribute(parent) || ts.isImportSpecifier(parent);

      if (hookNames.has(name) && !isDeclName && !isPropertyName) {
        const call = ts.isCallExpression(parent) && parent.expression === node ? parent : null;
        const decl = call && ts.isVariableDeclaration(call.parent) && call.parent.initializer === call ? call.parent : null;
        if (!decl || !ts.isIdentifier(decl.name) || call.arguments.length) fail(node, `${name}() must be used as: const ui = ${name}();`);
      }

      if (translatorNames.has(name) && !isDeclName && !isPropertyName) {
        const call = ts.isCallExpression(parent) && parent.expression === node ? parent : null;
        if (!call) fail(node, `${name} must be called directly as ${name}("literal")`);
        else {
          const [text, context, ...rest] = call.arguments;
          if (!isLiteral(text)) fail(call, `${name}(…) first argument must be a string literal`);
          else if (context !== undefined && !isLiteral(context)) fail(call, `${name}(…) context must be a string literal`);
          else if (rest.length) fail(call, `${name}(…) takes at most (text, context)`);
          else add(text.text, context?.text);
        }
      }

      if (componentNames.has(name) && !isDeclName && !isPropertyName) {
        const inTag = (ts.isJsxOpeningElement(parent) || ts.isJsxClosingElement(parent) || ts.isJsxSelfClosingElement(parent)) && parent.tagName === node;
        if (!inTag) fail(node, `${name} may only be used as a JSX element`);
        else if (ts.isJsxSelfClosingElement(parent)) fail(node, `<${name} /> must wrap literal text`);
      }
    }

    if (ts.isJsxElement(node) && ts.isIdentifier(node.openingElement.tagName) && componentNames.has(node.openingElement.tagName.text)) {
      const tag = node.openingElement.tagName.text;
      let context;
      let ok = true;
      for (const attr of node.openingElement.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || attr.name.getText(sf) !== "context") { fail(attr, `<${tag}> accepts only a context attribute`); ok = false; continue; }
        const init = attr.initializer;
        if (init && ts.isStringLiteral(init)) context = init.text;
        else if (init && ts.isJsxExpression(init) && isLiteral(init.expression)) context = init.expression.text;
        else { fail(attr, `<${tag} context> must be a string literal`); ok = false; }
      }
      const kids = node.children.filter((c) => !(ts.isJsxText(c) && c.containsOnlyTriviaWhiteSpaces));
      let text;
      if (kids.length !== 1) { fail(node, `<${tag}> must contain exactly one piece of literal text`); ok = false; }
      else if (ts.isJsxText(kids[0])) text = decodeJsxText(kids[0].text, (msg) => { fail(kids[0], msg); ok = false; });
      else if (ts.isJsxExpression(kids[0]) && isLiteral(kids[0].expression)) text = kids[0].expression.text;
      else { fail(kids[0], `<${tag}> children must be literal text, not an expression or element`); ok = false; }
      if (ok) add(text, context);
    }

    ts.forEachChild(node, visit);
  })(sf);
}

const enPath = path.join(root, "messages/en.json");
const raw = fs.readFileSync(enPath, "utf8");
const bom = raw.charCodeAt(0) === 0xfeff ? "﻿" : "";
const en = JSON.parse(raw.replace(/^﻿/, ""));
const next = Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)));
const changed = JSON.stringify(en.ui ?? {}) !== JSON.stringify(next);

for (const e of errors) console.error("✗ " + e);
if (errors.length) {
  console.error(`✗ ${errors.length} unsupported use(s); catalogue not ${check ? "checked" : "written"}`);
  process.exit(1);
}
if (check) {
  if (changed) { console.error(`✗ messages/en.json "ui" is out of date — run: npm run i18n:extract`); process.exit(1); }
  console.log(`✓ ${entries.size} UiText entries, catalogue up to date`);
} else {
  if (changed) {
    en.ui = next;
    fs.writeFileSync(enPath, bom + JSON.stringify(en, null, 2) + "\n");
  }
  console.log(`${changed ? "Updated" : "No change:"} ${entries.size} UiText entries in messages/en.json`);
}
