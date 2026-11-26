import { describe, expect, it } from "vitest";
import { stripLocalePrefix } from "./useSitePathname";

describe("stripLocalePrefix", () => {
  it("drops the internal locale segment the proxy adds", () => {
    expect(stripLocalePrefix("/en/blog/how-to-donate-books-india")).toBe("/blog/how-to-donate-books-india");
    expect(stripLocalePrefix("/hi/contact")).toBe("/contact");
  });
  it("maps the bare locale to the home page", () => {
    expect(stripLocalePrefix("/en")).toBe("/");
  });
  it("leaves visitor paths alone", () => {
    expect(stripLocalePrefix("/blog")).toBe("/blog");
    expect(stripLocalePrefix("/")).toBe("/");
    expect(stripLocalePrefix("/english-tips")).toBe("/english-tips");
  });
  it("handles a missing pathname", () => {
    expect(stripLocalePrefix(null)).toBe("");
  });
});
