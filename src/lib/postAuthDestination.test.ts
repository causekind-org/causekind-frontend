import { describe, expect, it } from "vitest";
import {
  homeForRole,
  registerUrlPreserving,
  resolvePostAuthDestination,
  socialCompletionUrl,
} from "./postAuthDestination";
import { loginUrlFor, safeInternalPath } from "./safeRedirect";

/**
 * The guest -> login -> offer round trip, and the ways it can be turned into an
 * open redirect.
 *
 * <p>Every hostile case here is asserted to land on a safe internal path, never
 * merely to be "sanitised". A cleaned-up hostile value that still gets followed
 * is the bug; rejecting it outright is the fix.
 */
describe("loginUrlFor", () => {
  it("produces the exact encoded next the flow depends on", () => {
    expect(loginUrlFor("/requests/123/offer")).toBe(
      "/login?next=%2Frequests%2F123%2Foffer",
    );
  });

  it("never emits the obsolete redirect parameter", () => {
    expect(loginUrlFor("/requests/123/offer")).not.toContain("redirect=");
  });

  it("drops a hostile destination rather than encoding it", () => {
    expect(loginUrlFor("https://evil.example/harvest")).toBe("/login");
    expect(loginUrlFor("//evil.example")).toBe("/login");
  });
});

describe("safeInternalPath rejects everything that leaves this origin", () => {
  const hostile = [
    "https://evil.example",
    "http://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "  //evil.example",
    "https:/\\evil.example",
    "/\t/evil.example",
  ];

  it.each(hostile)("rejects %j", value => {
    expect(safeInternalPath(value)).toBeNull();
  });

  it("rejects a malformed percent-escape instead of guessing at it", () => {
    expect(safeInternalPath("%E0%A4%A")).toBeNull();
  });

  it("keeps a genuine internal path, query and hash intact", () => {
    expect(safeInternalPath("/requests/123/offer")).toBe("/requests/123/offer");
    expect(safeInternalPath("/requests?category=Education")).toBe(
      "/requests?category=Education",
    );
  });
});

describe("resolvePostAuthDestination", () => {
  it("returns a donor to the exact request they picked", () => {
    expect(resolvePostAuthDestination("/requests/123/offer", "DONOR")).toEqual({
      path: "/requests/123/offer",
    });
  });

  it("accepts the encoded form that actually arrives in the URL", () => {
    expect(
      resolvePostAuthDestination("%2Frequests%2F123%2Foffer", "DONOR").path,
    ).toBe("/requests/123/offer");
  });

  it("falls back to the role's home when there is no destination", () => {
    expect(resolvePostAuthDestination(null, "DONOR").path).toBe("/");
    expect(resolvePostAuthDestination(null, "ADMIN").path).toBe("/admin/dashboard");
    expect(resolvePostAuthDestination(null, "SUPER_ADMIN").path).toBe("/super-admin");
  });

  it("falls back to home for a hostile destination, never following it", () => {
    const out = resolvePostAuthDestination("https://evil.example", "DONOR");
    expect(out.path).toBe("/");
    expect(out.path).not.toContain("evil.example");
  });

  it("keeps a donee out of the donor offer wizard, with a reason", () => {
    const out = resolvePostAuthDestination("/requests/123/offer", "DONEE");
    expect(out.path).toBe("/requests");
    expect(out.notice).toMatch(/donor account/i);
  });

  it("still honours a non-offer destination for a donee", () => {
    // The block is specific to the donor wizard. A donee returning to a
    // category page they were reading must not be bounced.
    expect(
      resolvePostAuthDestination("/requests/category/education", "DONEE").path,
    ).toBe("/requests/category/education");
  });

  it("does not treat a lookalike route as the offer wizard", () => {
    // Anchored regex, not startsWith: a future sibling route must not
    // accidentally inherit the donee block.
    expect(
      resolvePostAuthDestination("/requests/123/offer-history", "DONEE").path,
    ).toBe("/requests/123/offer-history");
  });
});

describe("registerUrlPreserving", () => {
  it("carries the destination and preselects the donor role", () => {
    const url = registerUrlPreserving("/requests/123/offer");
    expect(url).toContain("role=DONOR");
    expect(url).toContain("next=%2Frequests%2F123%2Foffer");
  });

  it("does not preselect a role when there is no destination", () => {
    // A bare "create account" link must not silently decide the user is a donor.
    expect(registerUrlPreserving(null)).toBe("/register");
  });

  it("drops a hostile destination", () => {
    expect(registerUrlPreserving("https://evil.example")).toBe("/register");
  });
});

describe("socialCompletionUrl", () => {
  it("keeps the social flag so the register page stays in social mode", () => {
    const url = socialCompletionUrl("/requests/123/offer");
    expect(url).toContain("social=google");
    expect(url).toContain("next=%2Frequests%2F123%2Foffer");
  });

  it("keeps the social flag even with no destination", () => {
    expect(socialCompletionUrl(null)).toBe("/register?social=google");
  });
});

describe("homeForRole", () => {
  it("sends unknown and absent roles to the public home, not an admin route", () => {
    expect(homeForRole(null)).toBe("/");
    expect(homeForRole("SOMETHING_NEW")).toBe("/");
  });
});
