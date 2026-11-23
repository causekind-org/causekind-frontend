import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import { blogPosts } from "./blogData";
import { blogContent } from "./blogContent";

/**
 * The guide posts added in November 2026: each has the on-page SEO basics the
 * other posts have, its hero image, its place in the sitemap and llms.txt, and
 * internal links that all resolve.
 */
const NEW_POSTS = [
  { slug: "how-to-donate-books-india", keyword: "donate books in India", date: "2026-11-21" },
  { slug: "how-to-donate-furniture-india", keyword: "donate furniture in India", date: "2026-11-21" },
  { slug: "how-to-donate-blankets-india", keyword: "donate blankets in India", date: "2026-11-21" },
  { slug: "how-to-donate-sports-equipment-india", keyword: "donate sports equipment in India", date: "2026-11-21" },
  { slug: "how-to-donate-kitchen-utensils-india", keyword: "donate kitchen utensils in India", date: "2026-11-21" },
  { slug: "how-to-donate-wheelchairs-india", keyword: "donate wheelchairs in India", date: "2026-11-21" },
  { slug: "what-to-donate-each-month-india", keyword: "what to donate each month in India", date: "2026-11-23" },
  { slug: "how-to-help-ngo-without-money-india", keyword: "help an NGO without money in India", date: "2026-11-23" },
  { slug: "how-to-donate-loved-ones-belongings-india", keyword: "donate a loved one's belongings", date: "2026-11-23" },
  { slug: "what-to-do-with-old-items-india", keyword: "what to do with old items in India", date: "2026-11-23" },
];

const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
const has = (haystack: string | undefined, needle: string) =>
  (haystack ?? "").toLowerCase().includes(needle.toLowerCase());

/** Keyword words the slug must contain (small words dropped, apostrophes removed). */
const SMALL_WORDS = new Set(["a", "an", "in", "the", "to", "of"]);
const slugWords = (keyword: string) =>
  keyword.toLowerCase().replace(/['’]/g, "").split(/\s+/).filter((w) => !SMALL_WORDS.has(w));

/** True when an internal path is a real page: an existing post or a route folder. */
const APP = path.join(process.cwd(), "src/app/[locale]");
const slugs = new Set(blogPosts.map((p) => p.slug));
function pageExists(href: string): boolean {
  const clean = href.replace(/^https:\/\/www\.causekind\.com/, "").split(/[?#]/)[0].replace(/\/$/, "");
  if (clean === "") return true; // home
  const blog = clean.match(/^\/blog\/([^/]+)$/);
  if (blog) return slugs.has(blog[1]);
  const segments = clean.split("/").filter(Boolean);
  const candidates = [path.join(APP, ...segments), path.join(APP, "(auth)", ...segments)];
  if (segments[0] === "requests" && segments[1] === "category") return true; // /requests/category/[slug]
  return candidates.some((dir) => fs.existsSync(path.join(dir, "page.tsx")));
}

describe("new blog posts (November 2026)", () => {
  let sitemapEntries: Awaited<ReturnType<typeof sitemap>> = [];
  beforeAll(async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ slugs: [] }), { status: 200 })));
    sitemapEntries = await sitemap();
    vi.unstubAllGlobals();
  });
  const llms = fs.readFileSync(path.join(process.cwd(), "public/llms.txt"), "utf8");

  for (const { slug, keyword, date } of NEW_POSTS) {
    describe(slug, () => {
      const post = blogPosts.find((p) => p.slug === slug)!;
      const html = blogContent[slug] ?? "";
      const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]));
      const iso = `${date}T00:00:00+05:30`;

      it(`exists with the real ${date} dates`, () => {
        expect(post).toBeDefined();
        expect(post.datePublished).toBe(iso);
        expect(post.dateModified).toBe(iso);
      });

      it("has one H1 (the page title; none in the body) and at least 6 H2", () => {
        expect(html).not.toMatch(/<h1[\s>]/i);
        expect(post.title.length).toBeGreaterThan(0);
        expect(h2s.length).toBeGreaterThanOrEqual(6);
      });

      it("uses the exact focus keyword in title tag, meta description, H1 and an H2, and its words in the slug", () => {
        expect(has(post.seoTitle, keyword)).toBe(true);
        expect(has(post.seoDescription, keyword)).toBe(true);
        expect(has(post.title, keyword)).toBe(true);
        expect(h2s.some((h) => has(h, keyword))).toBe(true);
        const parts = slug.split("-");
        for (const word of slugWords(keyword)) expect(parts, word).toContain(word);
        expect((post.seoTitle ?? "").length + " | CauseKind".length).toBeLessThanOrEqual(60);
        expect((post.seoDescription ?? "").length).toBeLessThanOrEqual(160);
      });

      it("has a .webp hero image in public/ and alt text", () => {
        expect(post.image).toBe(`/${slug}.webp`);
        expect(fs.existsSync(path.join(process.cwd(), "public", post.image))).toBe(true);
        expect(post.heroAlt && post.heroAlt.length > 0).toBe(true);
      });

      it("is in the sitemap (lastmod = its date) and in llms.txt", () => {
        const entry = sitemapEntries.find((e) => e.url.endsWith(`/blog/${slug}`));
        expect(entry).toBeDefined();
        expect(new Date(entry!.lastModified as Date).getTime()).toBe(new Date(iso).getTime());
        expect(llms).toContain(`/blog/${slug}`);
      });

      it("links only to existing posts and pages", () => {
        const hrefs = [...html.matchAll(/href="([^"]+)"/g)]
          .map((m) => m[1])
          .filter((h) => h.startsWith("/") || h.startsWith("https://www.causekind.com"));
        expect(hrefs.length).toBeGreaterThan(0);
        expect(hrefs.filter((h) => !pageExists(h))).toEqual([]);
      });
    });
  }
});
