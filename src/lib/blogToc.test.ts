import { describe, expect, it } from "vitest";
import { blogContent } from "@/data/blogContent";
import { slugify, sourceHeadingIds, withHeadingIds } from "./blogToc";

describe("blogToc", () => {
  it("slugifies heading text", () => {
    expect(slugify("Addressing the Challenges Faced by Taxpayers")).toBe("addressing-the-challenges-faced-by-taxpayers");
    expect(slugify("80G & Tax: What's New?")).toBe("80g-tax-what-s-new");
  });

  it("makes duplicate ids unique and keeps levels and text", () => {
    const src = '<h2 class="a">Why</h2><p>x</p><h3>Why</h3><h2>Why</h2>';
    const { html, toc } = withHeadingIds(src, src);
    expect(html).toBe('<h2 id="why" class="a">Why</h2><p>x</p><h3 id="why-2">Why</h3><h2 id="why-3">Why</h2>');
    expect(toc.map((t) => [t.level, t.id, t.text])).toEqual([[2, "why", "Why"], [3, "why-2", "Why"], [2, "why-3", "Why"]]);
  });

  it("uses the English ids for translated HTML", () => {
    const en = "<h2>Why it matters</h2><h2>How to give</h2>";
    const hi = "<h2>यह क्यों मायने रखता है</h2><h2>कैसे दें</h2>";
    const { html, toc } = withHeadingIds(hi, en);
    expect(toc.map((t) => t.id)).toEqual(["why-it-matters", "how-to-give"]);
    expect(toc[0].text).toBe("यह क्यों मायने रखता है");
    expect(html).toContain('<h2 id="how-to-give">');
  });

  it("gives every heading of every real post a unique id without changing its text", () => {
    for (const [slug, content] of Object.entries(blogContent)) {
      const ids = sourceHeadingIds(content);
      expect(new Set(ids).size, slug).toBe(ids.length);
      const { html } = withHeadingIds(content, content);
      expect(html.replace(/ id="[^"]+"/g, ""), slug).toBe(content);
    }
  });
});
