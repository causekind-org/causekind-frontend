import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guards the specific regression this work exists to fix.
 *
 * <p>`/requests` had a fully built public board wired up at the render guard —
 * and an effect above it that redirected every logged-out visitor to login
 * before that guard could run. The board was unreachable and had been for as
 * long as it had existed, because nothing failed: types checked, the build
 * passed, and the only symptom was a guest landing on a login page.
 *
 * <p>Checked at source level rather than by rendering. The page pulls in the
 * auth hook, the SSE bridge, geolocation, a portal-mounted modal and the donee
 * portal; rendering it to prove a redirect is absent means mocking most of the
 * app, and the mocks are where a real regression would hide. The failure being
 * guarded is textual — a `router.replace` to login on a guest path — so text is
 * a faithful thing to assert on.
 */
/**
 * Comments are stripped before matching.
 *
 * <p>Without this the suite fails on its own documentation: the comment left
 * where the redirect used to be quotes the removed line verbatim, and a naive
 * whole-file scan reads that prose as live code. Stripping is what makes the
 * assertions about behaviour rather than about whether anyone mentioned the old
 * bug — and the explanation of why the redirect is gone is worth keeping.
 */
function code(path: string): string {
  return readFileSync(resolve(__dirname, path), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments, including JSX {/* */}
    .replace(/(^|[^:])\/\/.*$/gm, "$1"); // line comments, sparing "https://"
}

/**
 * The route is two files, so the guard reads both as one body of source.
 *
 * <p>`page.tsx` became a thin server wrapper when the route was given its own
 * metadata — a "use client" module cannot export `metadata` — and the client
 * logic these assertions are about moved to `RequestsClient.tsx`. Reading only
 * `page.tsx` would leave every check below passing vacuously against a
 * seventeen-line wrapper, which is worse than no test: the redirect could come
 * back in the client component and this suite would still be green.
 */
const PAGE = [code("page.tsx"), code("RequestsClient.tsx")].join("\n");
const OFFER_PAGE = code("[id]/offer/page.tsx");

describe("/requests is public", () => {
  it("has no redirect-to-login for guests", () => {
    expect(PAGE).not.toMatch(/router\.(replace|push)\(\s*["'`]\/login\?redirect=/);
    expect(PAGE).not.toMatch(/["'`]\/login\?redirect=\/requests/);
  });

  it("uses no occurrence of the obsolete redirect parameter", () => {
    // Login validates `next` through safeInternalPath and ignores `redirect`
    // entirely, so any surviving `redirect=` is a destination silently dropped.
    expect(PAGE).not.toContain("redirect=");
  });

  it("still renders the public board for a logged-out visitor", () => {
    // Props deliberately unconstrained: the guard is about the board being
    // reachable at all, and pinning the exact attribute list made it fail on
    // `initialRequests` — a change that did not touch reachability.
    expect(PAGE).toMatch(/if\s*\(!user\)\s*return\s*<PublicRequestsBoard[^>]*\/>/);
  });

  /**
   * The board must not be gated behind the session check.
   *
   * <p>`authLoading` stays true for a visitor with empty localStorage until
   * /users/me answers, and that call is what wakes the deliberately-cold Hikari
   * pool. Gating the guest branch on it meant a logged-out visitor waited out
   * the whole wake-up to be told they were a guest, and only then mounted the
   * board — which then started its own fetch. Two round trips, the first
   * learning nothing.
   *
   * <p>`isRestoring` is the flag that answers "has localStorage been read", one
   * effect tick. The distinction is load-bearing and easy to undo by reaching
   * for the more obvious name, which is why it is asserted rather than trusted.
   */
  it("gates the guest branch on the storage read, not on the session check", () => {
    expect(PAGE).toMatch(/if\s*\(isRestoring\)\s*\{/);
    expect(PAGE).not.toMatch(/if\s*\(authLoading\)\s*\{\s*$/m);
  });

  /**
   * The board is seeded from the server, so a guest gets needs on first paint
   * instead of after hydration. If this wiring is ever dropped the page still
   * works — the board falls back to fetching on mount — which is exactly why it
   * needs a test: the regression would be invisible except as slowness.
   */
  it("hands the server-fetched board to the client", () => {
    expect(code("page.tsx")).toContain("getPublicItemRequests()");
    expect(PAGE).toMatch(/initialPublicRequests/);
  });

  it("builds any login URL through the validated helper", () => {
    const rawLoginPushes = PAGE.match(/router\.(replace|push)\(\s*["'`]\/login/g) ?? [];
    expect(rawLoginPushes).toEqual([]);
    expect(PAGE).toContain("loginUrlFor(");
  });
});

describe("the offer route stays protected", () => {
  it("sends a guest to login carrying the exact offer destination", () => {
    expect(OFFER_PAGE).toMatch(/loginUrlFor\(\s*`\/requests\/\$\{params\.id\}\/offer`\s*\)/);
  });

  it("waits for auth to resolve before deciding", () => {
    // Redirecting while `authLoading` is true would bounce a signed-in donor
    // out of their own wizard on a slow session check.
    expect(OFFER_PAGE).toMatch(/if\s*\(authLoading\)\s*return;/);
  });

  it("keeps a donee out of the donor wizard", () => {
    expect(OFFER_PAGE).toMatch(/user\.role\s*===\s*["'`]DONEE["'`]/);
  });
});
