import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The public projection must not carry private fields — asserted against the
 * type, not the rendered output.
 *
 * <p>A DOM assertion cannot prove this. If `latitude` were added back to the
 * payload and simply not rendered, every rendering test would still pass while
 * the coordinates travelled to every anonymous visitor's browser and sat in the
 * network tab. The question is what the type permits, so the type is what is
 * checked.
 *
 * <p>The backend DTO is the real authority and has its own tests; this is the
 * frontend half of the same contract, and it fails loudly if someone widens
 * `PublicItemRequest` to match the authenticated shape "for convenience".
 */
const API_SRC = readFileSync(resolve(__dirname, "api.ts"), "utf8");

/** Extracts the body of `export type PublicItemRequest = { ... }`. */
function publicRequestTypeBody(): string {
  const start = API_SRC.search(/(export\s+)?(type|interface)\s+PublicItemRequest\b/);
  expect(start, "PublicItemRequest must exist in api.ts").toBeGreaterThan(-1);

  const open = API_SRC.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < API_SRC.length; i++) {
    if (API_SRC[i] === "{") depth++;
    else if (API_SRC[i] === "}") {
      depth--;
      if (depth === 0) return API_SRC.slice(open + 1, i);
    }
  }
  throw new Error("could not find the end of PublicItemRequest");
}

describe("PublicItemRequest carries nothing private", () => {
  const body = publicRequestTypeBody();

  const FORBIDDEN = [
    "latitude", "longitude", "lat", "lng", "coordinates",
    "pincode", "postalCode", "address", "locality", "street",
    "doneeId", "doneeName", "fullName",
    "email", "phone", "contact",
    "verificationTier", "verificationStatus", "verificationDueAt",
    "rejectionReason", "adminNotes", "internalNotes",
    "status", "reservedBy", "reservation", "matchedWith",
    "documents", "verificationDocuments", "identityProof", "residenceProof",
  ];

  it.each(FORBIDDEN)("does not expose %s", field => {
    // Word-boundary match on the property name, so `doneeFirstName` does not
    // trip the `doneeName` check and `city` is unaffected.
    const declared = new RegExp(`(^|[\\s;{])${field}\\s*[?:]`, "m");
    expect(declared.test(body), `${field} must not be on the public DTO`).toBe(false);
  });

  it("still carries the fields the board genuinely needs", () => {
    for (const field of ["id", "title", "category", "quantity", "city"]) {
      expect(new RegExp(`(^|[\\s;{])${field}\\s*[?:]`, "m").test(body)).toBe(true);
    }
  });

  it("reduces the donee to a first name", () => {
    expect(/doneeFirstName\s*[?:]/.test(body)).toBe(true);
  });
});

describe("the guest path uses the public endpoint only", () => {
  it("points getPublicItemRequests at /item-requests/public", () => {
    const fn = API_SRC.slice(API_SRC.indexOf("getPublicItemRequests"));
    expect(fn.slice(0, 400)).toContain("/item-requests/public");
  });
});
