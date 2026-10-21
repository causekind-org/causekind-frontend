#!/usr/bin/env node
/**
 * Extracts <UiText> / useUiText() source strings into messages/en.json → "ui".
 *
 *   node scripts/extract-ui-text.mjs           add new entries, drop unused ones
 *   node scripts/extract-ui-text.mjs --check   exit 1 if the catalogue is out of date
 *                                              or any use is unsupported
 *
 * Builds a TypeScript program from tsconfig.json and uses the type checker's
 * symbol resolution, so:
 *  - UiText / useUiText are recognised however they're reached — aliased imports,
 *    barrel re-exports, `export … from` chains (aliases are resolved to the real
 *    exports in src/components/UiText.tsx);
 *  - a translator is the specific binding created by `const x = useUiText()`; an
 *    unrelated function or parameter with the same name is a different symbol and
 *    is not touched;
 *  - literal values are read exactly as JavaScript reads them, and comments are
 *    never confused with code.
 *
 * Every reference that resolves to UiText, useUiText or a translator binding is
 * classified; anything other than these shapes is an error:
 *
 *   const ui = useUiText();                   (any binding name)
 *   ui("Literal")   ui("Literal", "context")  (string literals only)
 *   <UiText>Literal text</UiText>   <UiText>{"Literal"}</UiText>
 *   <UiText context="status">Open</UiText>   <UiText context={"status"}>Open</UiText>
 *   re-exports of UiText / useUiText (consumers are then checked as above)
 *
 * Dynamic import() of the module is rejected. Errors are reported and nothing is
 * written. Keys come from src/lib/uiText/key.ts — the runtime's own function.
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
const SELF = path.join(root, "src", "components", "UiText.tsx");

// ── Program ───────────────────────────────────────────────────────────────
const configPath = path.join(root, "tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram({ rootNames: parsed.fileNames, options: { ...parsed.options, noEmit: true } });
const checker = program.getTypeChecker();

const selfFile = program.getSourceFile(SELF);
if (!selfFile) { console.error(`✗ ${path.relative(root, SELF)} not in the program`); process.exit(1); }
const selfExports = checker.getExportsOfModule(checker.getSymbolAtLocation(selfFile));
const COMPONENT = selfExports.find((s) => s.name === "UiText");
const HOOK = selfExports.find((s) => s.name === "useUiText");

const resolve = (sym) => (sym && sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym);
const symbolOf = (node) => resolve(checker.getSymbolAtLocation(node));

// ── Literals ──────────────────────────────────────────────────────────────
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

// ── Walk ──────────────────────────────────────────────────────────────────
const srcDir = path.join(root, "src") + path.sep;
const entries = new Map();
const errors = [];

for (const sf of program.getSourceFiles()) {
  const file = path.normalize(sf.fileName);
  if (!file.startsWith(srcDir) || file === SELF || /\.test\.tsx?$/.test(file) || sf.isDeclarationFile) continue;
  // No text prefilter: a barrel can re-export UiText under another name, so every
  // file is checked by symbol.
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const at = (node) => `${rel}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;
  const fail = (node, msg) => errors.push(`${at(node)} ${msg}`);
  const add = (text, context) => { if (text.trim()) entries.set(uiKey(text, context), uiCatalogueValue(text)); };

  // Translator bindings in this file: the symbols of `const x = useUiText()`.
  const translators = new Set();
  (function find(node) {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)
      && symbolOf(node.initializer.expression) === HOOK && ts.isIdentifier(node.name) && node.initializer.arguments.length === 0) {
      translators.add(checker.getSymbolAtLocation(node.name));
    }
    ts.forEachChild(node, find);
  })(sf);

  (function visit(node) {
    // Dynamic import of the module: not analysable.
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && isLiteral(node.arguments[0])
      && /(^|\/)UiText$/.test(node.arguments[0].text)) {
      fail(node, "dynamic import() of UiText is not supported; import { UiText, useUiText } statically");
    }

    if (ts.isIdentifier(node)) {
      const parent = node.parent;
      const declares = (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent) || ts.isFunctionDeclaration(parent)) && parent.name === node;
      const inImportExport = ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isExportSpecifier(parent) || ts.isNamespaceImport(parent);
      const isMemberName = (ts.isPropertyAccessExpression(parent) && parent.name === node) || (ts.isPropertyAssignment(parent) && parent.name === node) || (ts.isJsxAttribute(parent) && parent.name === node);

      if (!declares && !inImportExport && !isMemberName) {
        const local = checker.getSymbolAtLocation(node);
        const sym = resolve(local);

        if (sym === HOOK) {
          const call = ts.isCallExpression(parent) && parent.expression === node ? parent : null;
          const decl = call && ts.isVariableDeclaration(call.parent) && call.parent.initializer === call ? call.parent : null;
          if (!decl || !ts.isIdentifier(decl.name) || call.arguments.length) fail(node, `${node.text}() must be used as: const ui = ${node.text}();`);
        } else if (sym === COMPONENT) {
          const inTag = (ts.isJsxOpeningElement(parent) || ts.isJsxClosingElement(parent) || ts.isJsxSelfClosingElement(parent)) && parent.tagName === node;
          if (!inTag) fail(node, `${node.text} may only be used as a JSX element`);
          else if (ts.isJsxSelfClosingElement(parent)) fail(node, `<${node.text} /> must wrap literal text`);
        } else if (local && translators.has(local)) {
          const call = ts.isCallExpression(parent) && parent.expression === node ? parent : null;
          if (!call) fail(node, `${node.text} must be called directly as ${node.text}("literal")`);
          else {
            const [text, context, ...rest] = call.arguments;
            if (!isLiteral(text)) fail(call, `${node.text}(…) first argument must be a string literal`);
            else if (context !== undefined && !isLiteral(context)) fail(call, `${node.text}(…) context must be a string literal`);
            else if (rest.length) fail(call, `${node.text}(…) takes at most (text, context)`);
            else add(text.text, context?.text);
          }
        }
      }
    }

    if (ts.isJsxElement(node) && symbolOf(node.openingElement.tagName) === COMPONENT) {
      const tag = node.openingElement.tagName.getText(sf);
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

// ── Catalogue ─────────────────────────────────────────────────────────────
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
