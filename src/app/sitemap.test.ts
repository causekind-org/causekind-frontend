import { describe, expect, it } from "vitest";

import sitemap from "./sitemap";
import { IN_KIND_CATEGORIES } from "@/lib/inKindCategories";
import { blogPosts } from "@/data/blogData";

/**
 * What the sitemap offers for indexing.
 *
 * <p>The file states its own contract: every URL must be canonical and final —
 * the same www host the canonical tags use, nothing that redirects, and nothing
 * auth-gated. These check the contract rather than the list, because the list
 * changes and the rules do not.
 *
 * <p>The category pages are here because they were the one indexable route
 * family missing from it: statically generated, carrying their own
 * `generateMetadata`, declaring a canonical, and never offered.
 */
describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("lists every in-kind category page", () => {
    for (const category of IN_KIND_CATEGORIES) {
      expect(urls, category.slug).toContain(
        `https://www.causekind.com/requests/category/${category.slug}`,
      );
    }
  });

  it("cannot leave a newly added category unlisted", () => {
    // Derived from the same registry generateStaticParams uses, so this holds by
    // construction rather than by someone remembering. That is the actual fix —
    // the previous gap was a hand-maintained list falling behind.
    const categoryUrls = urls.filter((u) => u.includes("/requests/category/"));
    expect(categoryUrls).toHaveLength(IN_KIND_CATEGORIES.length);
  });

  it("matches the canonical each category page emits", () => {
    // The page declares `/requests/category/<slug>`. A sitemap URL that differs
    // by so much as a trailing slash is a second URL for the same page.
    for (const url of urls.filter((u) => u.includes("/requests/category/"))) {
      expect(url).not.toMatch(/\/$/);
      expect(url.startsWith("https://www.causekind.com/requests/category/")).toBe(true);
    }
  });

  it("offers no auth-gated or utility route", () => {
    // They render nothing indexable to a signed-out crawler and burn crawl budget
    // that should go to the articles and category pages.
    for (const path of ["/login", "/register", "/dashboard", "/profile", "/thank-you", "/items/new", "/requests/new"]) {
      expect(urls, path).not.toContain(`https://www.causekind.com${path}`);
    }
  });

  it("offers nothing that redirects", () => {
    // /help permanently redirects to /faq, so /faq is listed and /help is not.
    expect(urls).not.toContain("https://www.causekind.com/help");
    expect(urls).toContain("https://www.causekind.com/faq");
  });

  it("keeps the homepage as the bare origin, matching its normalised canonical", () => {
    expect(urls).toContain("https://www.causekind.com");
  });

  it("still lists the blog posts", () => {
    // Derived from blogData, so a new article appears automatically.
    expect(urls.filter((u) => u.includes("/blog/"))).toHaveLength(blogPosts.length);
  });

  it("has no duplicate URLs", () => {
    // Two entries for one page splits its signals between them.
    expect(new Set(urls).size).toBe(urls.length);
  });
});
