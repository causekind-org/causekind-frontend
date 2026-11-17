import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Writes src/lib/staticSlugs.ts: the valid slugs for /blog/<slug>,
 * /initiatives/<slug> and /requests/category/<slug>.
 *
 * src/proxy.ts needs those lists to answer an unknown slug with a real 404,
 * but it must not import the data files themselves: that would bundle every
 * post's metadata and the icon libraries into code that runs on every request.
 * So the slugs are copied out here, as text, into a file with no imports.
 *
 * Runs before every build and dev start, from two places so that neither can
 * be skipped: the "prebuild"/"predev" npm scripts, and next.config.ts (which
 * also covers a bare `next build`). It only writes when the content changed,
 * so running twice is harmless.
 *
 * Any doubt about the extraction is an error, not a warning. A slug missing
 * from the output would have its real page answered with a 404.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = "src/lib/staticSlugs.ts";

const SOURCES = [
  { name: "BLOG_SLUGS", file: "src/data/blogData.ts", array: "blogPosts" },
  { name: "INITIATIVE_SLUGS", file: "src/lib/initiatives.ts", array: "initiatives" },
  { name: "CATEGORY_SLUGS", file: "src/lib/inKindCategories.ts", array: "IN_KIND_CATEGORIES" },
];

function fail(message) {
  throw new Error(
    `generate-static-slugs: ${message}\n` +
      `The build is stopped on purpose: with a wrong slug list the proxy would answer real pages with 404.\n` +
      `Fix the source file's format, or update scripts/generate-static-slugs.mjs to read it.`,
  );
}

function extract({ name, file, array }) {
  const text = readFileSync(join(root, file), "utf8").replace(/\r\n/g, "\n");
  const start = text.indexOf(`export const ${array}`);
  if (start === -1) fail(`could not find "export const ${array} = [" in ${file}.`);
  const end = text.indexOf("\n];", start);
  if (end === -1) fail(`could not find the end of the ${array} array in ${file}.`);
  const block = text.slice(start, end);

  const slugs = [...block.matchAll(/\bslug:\s*(["'`])([^"'`]*)\1/g)].map((m) => m[2]);
  // One "  {" line per entry: every entry must have yielded exactly one slug.
  const entries = (block.match(/^ {2}\{\s*$/gm) ?? []).length;

  if (slugs.length === 0) fail(`found no slugs for ${name} in ${file}.`);
  if (entries !== slugs.length) {
    fail(`${file} has ${entries} entries in ${array} but ${slugs.length} slugs were read.`);
  }
  const invalid = slugs.filter((s) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s));
  if (invalid.length > 0) fail(`unexpected slug(s) in ${file}: ${invalid.map((s) => JSON.stringify(s)).join(", ")}.`);
  const duplicate = slugs.find((s, i) => slugs.indexOf(s) !== i);
  if (duplicate) fail(`duplicate slug "${duplicate}" in ${file}.`);
  return slugs;
}

export function generateStaticSlugs() {
  const lists = SOURCES.map((source) => ({ ...source, slugs: extract(source) }));
  const body = lists
    .map(
      ({ name, file, slugs }) =>
        `/** From ${file}. */\nexport const ${name}: readonly string[] = [\n${slugs.map((s) => `  "${s}",\n`).join("")}];\n`,
    )
    .join("\n");
  const content =
    `// AUTO-GENERATED — do not edit by hand.\n` +
    `// Written by scripts/generate-static-slugs.mjs before every build and dev start.\n` +
    `// To change these lists, edit the source file named above each one.\n` +
    `//\n` +
    `// Used by src/proxy.ts. This file must have no imports: see the generator.\n\n` +
    body;

  const target = join(root, OUTPUT);
  let current = null;
  try {
    current = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
  } catch {
    // First run: the file does not exist yet.
  }
  const changed = current !== content;
  if (changed) writeFileSync(target, content, "utf8");
  return { changed, counts: Object.fromEntries(lists.map((l) => [l.name, l.slugs.length])) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const { changed, counts } = generateStaticSlugs();
    const summary = Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ");
    console.log(`generate-static-slugs: ${OUTPUT} ${changed ? "updated" : "already up to date"} (${summary})`);
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  }
}
