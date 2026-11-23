/**
 * Heading ids and the "In this article" list for blog posts.
 *
 * Ids always come from the ENGLISH source headings, in document order, so a
 * link such as /blog/x#why-it-matters is the same in every language. Labels
 * come from the HTML actually shown (translated when a translation is active).
 * Only ids are added: heading levels and text are never changed.
 */

export type TocItem = { id: string; level: 2 | 3; text: string };

const HEADING = /<h([2-4])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

/** Visible text of a heading's inner HTML. */
export function headingText(inner: string): string {
  return inner
    .replace(/<[^>]*>/g, "")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (ENTITIES[e.toLowerCase()]) return ENTITIES[e.toLowerCase()];
      if (e[0] === "#") {
        const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function uniqueId(base: string, used: Set<string>): string {
  const root = base || "section";
  let id = root;
  for (let n = 2; used.has(id); n++) id = `${root}-${n}`;
  used.add(id);
  return id;
}

/** Stable ids for every h2-h4 in the English source, in order. */
export function sourceHeadingIds(sourceHtml: string): string[] {
  const used = new Set<string>();
  return [...sourceHtml.matchAll(HEADING)].map((m) => uniqueId(slugify(headingText(m[3])), used));
}

/**
 * Adds an id to every h2-h4 in `html` (the English source's id at the same
 * position; a heading the source lacks gets one from its own text) and returns
 * the h2/h3 list for the table of contents. A heading that already has an id
 * keeps it.
 */
export function withHeadingIds(html: string, sourceHtml: string): { html: string; toc: TocItem[] } {
  const ids = sourceHeadingIds(sourceHtml);
  const used = new Set(ids);
  const toc: TocItem[] = [];
  let index = 0;
  const out = html.replace(HEADING, (match, level: string, attrs: string | undefined, inner: string) => {
    const text = headingText(inner);
    const existing = attrs?.match(/\sid\s*=\s*["']([^"']+)["']/i)?.[1];
    const id = existing ?? ids[index] ?? uniqueId(slugify(text), used);
    index++;
    const lvl = Number(level);
    if ((lvl === 2 || lvl === 3) && text) toc.push({ id, level: lvl, text });
    if (existing) return match;
    return `<h${level} id="${id}"${attrs ?? ""}>${inner}</h${level}>`;
  });
  return { html: out, toc };
}
