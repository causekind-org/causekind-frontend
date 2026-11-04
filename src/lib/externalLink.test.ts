import { describe, expect, it } from "vitest";
import { linkDomain, safeExternalUrl } from "./externalLink";

describe("safeExternalUrl", () => {
  it("adds https when there is no scheme and keeps http and https", () => {
    expect(safeExternalUrl("www.x.com")).toBe("https://www.x.com");
    expect(safeExternalUrl("x.com")).toBe("https://x.com");
    expect(safeExternalUrl("https://x.com")).toBe("https://x.com");
    expect(safeExternalUrl("http://x.com")).toBe("http://x.com");
  });
  it.each(["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,x", "ftp://x.com", "https:x.com", "x", "a b.com", "https://x.com@evil.com", "", null])("rejects %s", (bad) => {
    expect(safeExternalUrl(bad)).toBeNull();
  });
  it("shows the bare domain", () => {
    expect(linkDomain("https://www.varunngo.com/about")).toBe("varunngo.com");
  });
});
