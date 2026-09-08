import { describe, expect, it } from "vitest";

import enMessages from "../../../messages/en.json";
import {
  mediaStatusCopy,
  knownCodes,
  PHOTO_COPY,
  VIDEO_COPY,
  type MediaCopySpec,
  type MediaStatusName,
} from "./mediaStatusCopy";

/**
 * The contract that stops a screening result reaching someone as a blank.
 *
 * <p>Codes are added server-side, and a deployed client is always older than the
 * server it talks to. The failure this guards is silent: a new code renders the
 * generic line forever and nobody notices, because nothing errors. So every code
 * this build claims to know must resolve to real copy, and every state must
 * produce a label that exists.
 */

function resolve(key: string): unknown {
  let node: unknown = enMessages;
  for (const part of key.split(".")) node = (node as Record<string, unknown>)?.[part];
  return node;
}

const ALL_STATUSES: MediaStatusName[] = [
  "UPLOADING", "QUARANTINED", "VALIDATING", "TRANSCODING", "MALWARE_SCANNING",
  "MODERATING_VISUAL", "MODERATING_AUDIO", "REVIEW_REQUIRED", "APPROVED",
  "REJECTED", "FAILED", "DELETED",
];

describe.each([
  ["photo", PHOTO_COPY],
  ["video", VIDEO_COPY],
] as const)("%s copy", (_kind, spec: MediaCopySpec) => {
  it("has real copy for every code it claims to know", () => {
    for (const code of knownCodes(spec)) {
      const key = spec.reasons[code];
      const text = resolve(key);
      expect(typeof text, `${code} → ${key}`).toBe("string");
      expect((text as string).length, `${code} → ${key}`).toBeGreaterThan(0);
    }
  });

  it("has a generic line, which is what an unknown code must fall back to", () => {
    expect(typeof resolve(spec.genericReason)).toBe("string");
  });

  it("never renders a raw code, for a code from a newer server", () => {
    const copy = mediaStatusCopy({ status: "REJECTED", moderationCode: "SOMETHING_ADDED_LATER" }, spec);
    expect(copy.detailKey).toBe(spec.genericReason);
    expect(copy.detailKey).not.toContain("SOMETHING_ADDED_LATER");
  });

  it("gives every status a label that exists in en.json", () => {
    for (const status of ALL_STATUSES) {
      const copy = mediaStatusCopy({ status, moderationCode: null }, spec);
      expect(typeof resolve(copy.labelKey), `${status} → ${copy.labelKey}`).toBe("string");
    }
  });

  it("counts only an approved item, and blocks everything unresolved", () => {
    for (const status of ALL_STATUSES) {
      const copy = mediaStatusCopy({ status, moderationCode: null }, spec);
      expect(copy.counts, status).toBe(status === "APPROVED");
      // DELETED is excluded from lists entirely, so it blocks nothing.
      expect(copy.blocks, status).toBe(status !== "APPROVED" && status !== "DELETED");
    }
  });

  it("offers no retry on a rejection — the answer would be the same", () => {
    const copy = mediaStatusCopy({ status: "REJECTED", moderationCode: null }, spec);
    expect(copy.actions).not.toContain("retry");
  });

  it("offers retry where our side was unsure or unavailable", () => {
    for (const status of ["REVIEW_REQUIRED", "FAILED"] as const) {
      expect(mediaStatusCopy({ status, moderationCode: null }, spec).actions).toContain("retry");
    }
  });
});

describe("video codes match the server's vocabulary", () => {
  /**
   * Hand-checked against the VIDEO_* literals in the backend. This is a
   * deliberately dumb list: if the server adds a code and nobody adds it here,
   * the previous suite still passes and users get the generic line — this test
   * is the reminder that the pair is manually maintained.
   */
  const SERVER_CODES = [
    "VIDEO_UNREADABLE", "VIDEO_FORMAT_NOT_SUPPORTED", "VIDEO_TOO_LONG",
    "VIDEO_RESOLUTION_TOO_HIGH", "VIDEO_PROHIBITED_CONTENT", "VIDEO_MALWARE_DETECTED",
    "VIDEO_AWAITING_REVIEW", "VIDEO_PROCESSING_FAILED",
  ];

  it("describes every code the server can send", () => {
    for (const code of SERVER_CODES) {
      expect(knownCodes(VIDEO_COPY), code).toContain(code);
    }
  });

  it("claims no code the server cannot send", () => {
    // Guards the mistake this file was written after: a VIDEO_TOO_LARGE code
    // that read plausibly and that the server never emits, because oversize is
    // a validation failure there rather than a moderation verdict.
    for (const code of knownCodes(VIDEO_COPY)) {
      expect(SERVER_CODES, code).toContain(code);
    }
  });
});
