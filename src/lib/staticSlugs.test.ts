import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { blogPosts } from "@/data/blogData";
import { initiatives } from "@/lib/initiatives";
import { IN_KIND_SLUGS } from "@/lib/inKindCategories";
import { BLOG_SLUGS, CATEGORY_SLUGS, INITIATIVE_SLUGS } from "@/lib/staticSlugs";

const sorted = (xs: readonly string[]) => [...xs].sort();

// A slug missing from staticSlugs has its real page answered with a 404 by the
// proxy, so each list must match the data the pages are built from exactly.
describe("staticSlugs", () => {
  it("lists exactly the blog slugs in blogData", () => {
    expect(sorted(BLOG_SLUGS)).toEqual(sorted(blogPosts.map((p) => p.slug)));
  });

  it("lists exactly the initiative slugs", () => {
    expect(sorted(INITIATIVE_SLUGS)).toEqual(sorted(initiatives.map((i) => i.slug)));
  });

  it("lists exactly the category slugs", () => {
    expect(sorted(CATEGORY_SLUGS)).toEqual(sorted(IN_KIND_SLUGS));
  });

  it("imports nothing, so the proxy bundle carries slugs only", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/staticSlugs.ts"), "utf8");
    expect(source).not.toMatch(/^\s*import\s/m);
  });
});
