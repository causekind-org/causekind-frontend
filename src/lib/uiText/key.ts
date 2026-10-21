/**
 * Catalogue keys for source-text UI copy (<UiText> / ui("…")).
 *
 * The English text stays the catalogue *value*; the key is derived from it:
 * a short readable slug plus a hash of (context + text). Keys contain only
 * [a-z0-9_], so punctuation in the English (dots especially) can never be read
 * as a next-intl key path. A context ("button", "status", …) gives the same
 * English a separate key when it needs a different translation.
 *
 * Plain TypeScript with no imports: also loaded by scripts/extract-ui-text.mjs
 * (Node type stripping), so the app and the extractor always agree.
 */

/** JSX-like whitespace: runs collapse to one space, ends trimmed. */
export function normalizeUiText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function uiKey(text: string, context?: string): string {
  const source = normalizeUiText(text);
  const slug = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .split("_")
    .slice(0, 5)
    .join("_")
    .slice(0, 40) || "text";
  const ctx = context ? normalizeUiText(context) : "";
  return `${slug}_${fnv1a(ctx ? `${ctx}\u0004${source}` : source)}`;
}

/** ICU-safe catalogue value: braces are quoted so they print literally. */
export function uiCatalogueValue(text: string): string {
  return normalizeUiText(text).replace(/'/g, "''").replace(/[{}]/g, (b) => `'${b}'`);
}
