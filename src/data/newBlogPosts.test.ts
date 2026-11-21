import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import { blogPosts } from "./blogData";
import { blogContent } from "./blogContent";

/**
 * The posts added on 2026-11-21 (books, furniture, blankets, sports equipment,
 * kitchen utensils, wheelchairs): each has
 * the on-page SEO basics the other posts have, its hero image, and its place
 * in the sitemap and llms.txt.
 */
const NEW_POSTS = [
  { slug: "how-to-donate-books-india", keyword: "donate books in India" },
  { slug: "how-to-donate-furniture-india", keyword: "donate furniture in India" },
  { slug: "how-to-donate-blankets-india", keyword: "donate blankets in India" },
  { slug: "how-to-donate-sports-equipment-india", keyword: "donate sports equipment in India" },
  { slug: "how-to-donate-kitchen-utensils-india", keyword: "donate kitchen utensils in India" },
  { slug: "how-to-donate-wheelchairs-india", keyword: "donate wheelchairs in India" },
];

const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
const has = (haystack: string | undefined, needle: string) =>
  (haystack ?? "").toLowerCase().includes(needle.toLowerCase());

describe("new blog posts (2026-11-21)", () => {
  let sitemapEntries: Awaited<ReturnType<typeof sitemap>> = [];
  beforeAll(async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ slugs: [] }), { status: 200 })));
    sitemapEntries = await sitemap();
    vi.unstubAllGlobals();
  });
  const llms = fs.readFileSync(path.join(process.cwd(), "public/llms.txt"), "utf8");

  for (const { slug, keyword } of NEW_POSTS) {
    describe(slug, () => {
      const post = blogPosts.find((p) => p.slug === slug)!;
      const html = blogContent[slug] ?? "";
      const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]));

      it("exists with the real 2026-11-21 dates", () => {
        expect(post).toBeDefined();
        expect(post.datePublished).toBe("2026-11-21T00:00:00+05:30");
        expect(post.dateModified).toBe("2026-11-21T00:00:00+05:30");
      });

      it("has one H1 (the page title; none in the body) and at least 6 H2", () => {
        expect(html).not.toMatch(/<h1[\s>]/i);
        expect(post.title.length).toBeGreaterThan(0);
        expect(h2s.length).toBeGreaterThanOrEqual(6);
      });

      it("uses the focus keyword in title tag, meta description, H1, slug and an H2", () => {
        expect(has(post.seoTitle, keyword)).toBe(true);
        expect(has(post.seoDescription, keyword)).toBe(true);
        expect(has(post.title, keyword)).toBe(true);
        expect(slug).toContain(keyword.toLowerCase().replace(/ in /, "-").replace(/ /g, "-"));
        expect(h2s.some((h) => has(h, keyword))).toBe(true);
        expect((post.seoTitle ?? "").length + " | CauseKind".length).toBeLessThanOrEqual(60);
        expect((post.seoDescription ?? "").length).toBeLessThanOrEqual(160);
      });

      it("has a .webp hero image in public/ and alt text", () => {
        expect(post.image).toBe(`/${slug}.webp`);
        expect(fs.existsSync(path.join(process.cwd(), "public", post.image))).toBe(true);
        expect(post.heroAlt && post.heroAlt.length > 0).toBe(true);
      });

      it("is in the sitemap and in llms.txt", () => {
        const entry = sitemapEntries.find((e) => e.url.endsWith(`/blog/${slug}`));
        expect(entry).toBeDefined();
        // lastmod = 2026-11-21 in India time (00:00 +05:30).
        expect(new Date(entry!.lastModified as Date).getTime()).toBe(new Date("2026-11-21T00:00:00+05:30").getTime());
        expect(llms).toContain(`/blog/${slug}`);
      });
    });
  }
});
