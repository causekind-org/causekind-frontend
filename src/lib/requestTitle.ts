/**
 * The <title> only: cut so the full "<part> | CauseKind" stays at 60
 * characters or fewer (48 for the part, ellipsis included), at a word boundary.
 * The page's visible H1 keeps the full title.
 */
const TITLE_SUFFIX = " | CauseKind";
export function capTitle(title: string, max = 60 - TITLE_SUFFIX.length): string {
  const t = title.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}
