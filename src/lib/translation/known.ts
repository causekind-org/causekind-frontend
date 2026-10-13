import "server-only";

import { blogPosts, insiderTips } from "@/data/blogData";
import { blogContent } from "@/data/blogContent";
import { decodeEntities } from "./server";

// Text that ships with the site. The browser translates blog text node by
// node, and every node (and every chunk of one) is a substring of the decoded
// source HTML — tags sit between nodes, never inside them. Anything not found
// here is "free text" and gets the stricter limits in /api/translate.
let corpus: string | null = null;

function knownCorpus(): string {
  if (corpus === null) {
    corpus = [
      ...blogPosts.flatMap((post) => [post.title, post.description, post.category]),
      ...insiderTips.flatMap((tip) => [tip.title, tip.description]),
      ...Object.values(blogContent),
    ].map((text) => decodeEntities(text ?? "")).join("\n\u0000\n");
  }
  return corpus;
}

export function isKnownSiteText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && knownCorpus().includes(trimmed);
}
