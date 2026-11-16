import { describe, expect, it } from "vitest";
import { loginUrlFor, safeInternalPath } from "./safeRedirect";
import { resolvePostAuthDestination } from "./postAuthDestination";

describe("login ?next= round trip for the request-detail offer intent", () => {
  it("encodes the return path, including its own query string", () => {
    expect(loginUrlFor("/requests/42?intent=offer")).toBe("/login?next=%2Frequests%2F42%3Fintent%3Doffer");
  });

  it("decodes back to /requests/{id}?intent=offer for a donor", () => {
    const next = new URL("http://x" + loginUrlFor("/requests/42?intent=offer")).searchParams.get("next");
    expect(resolvePostAuthDestination(next, "DONOR").path).toBe("/requests/42?intent=offer");
  });

  it.each([
    "//evil.example", "/\\evil.example", "https://evil.example", "javascript:alert(1)",
    "%2F%2Fevil.example", " //evil.example", "evil.example/path",
  ])("rejects off-site next=%s", (bad) => {
    expect(safeInternalPath(bad)).toBeNull();
    expect(resolvePostAuthDestination(bad, "DONOR").path).not.toContain("evil");
  });
});
