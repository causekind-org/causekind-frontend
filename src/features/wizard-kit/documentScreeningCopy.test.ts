import { describe, expect, it } from "vitest";

import {
  documentScreeningCopy,
  DOCUMENT_CODES,
  type DocumentCode,
} from "./documentScreeningCopy";

/**
 * The document screening copy.
 *
 * <p>What this guards is narrow and specific: a donee must never be shown text
 * written by the model. Both document prompts ask for "one honest sentence" and
 * that sentence used to be rendered in three separate places — the inline
 * message, the secondary line and a toast — so one document could be described
 * three different ways, in English, to someone reading Gujarati.
 */

/** Kept in step by hand with DocumentScreeningCodes on the backend. */
const SERVER_CODES = [
  "DOC_LOOKS_VALID",
  "DOC_WRONG_TYPE",
  "DOC_NOT_RECOGNISED",
  "DOC_UNCLEAR",
  "DOC_SCREENING_UNAVAILABLE",
];

describe("documentScreeningCopy", () => {
  it("has real copy for every code the server can send", () => {
    for (const code of SERVER_CODES) {
      const text = documentScreeningCopy(code);
      expect(typeof text, code).toBe("string");
      expect(text.length, code).toBeGreaterThan(0);
      // The failure that would otherwise be invisible: a code with no entry
      // silently renders the generic line forever and nobody notices.
      expect(text, code).not.toBe(documentScreeningCopy("SOMETHING_UNKNOWN"));
    }
  });

  it("claims no code the server cannot send", () => {
    // The VIDEO_TOO_LARGE mistake in its document form — copy for an outcome
    // that can never occur.
    for (const code of DOCUMENT_CODES) {
      expect(SERVER_CODES, code).toContain(code);
    }
  });

  it("never renders a raw code, for a code from a newer server", () => {
    const text = documentScreeningCopy("DOC_SOMETHING_ADDED_LATER");
    expect(text).not.toContain("DOC_");
    expect(text.length).toBeGreaterThan(0);
  });

  it("falls back to something true when there is no code at all", () => {
    for (const missing of [null, undefined, ""]) {
      const text = documentScreeningCopy(missing);
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain("undefined");
      expect(text).not.toContain("null");
    }
  });

  it("does not describe an unusable document as acceptable", () => {
    // Failing toward reassurance is the one error that matters here: this text
    // is what tells a donee whether the document they are relying on is fine.
    const notValid: DocumentCode[] = [
      "DOC_WRONG_TYPE", "DOC_NOT_RECOGNISED", "DOC_UNCLEAR", "DOC_SCREENING_UNAVAILABLE",
    ];
    for (const code of notValid) {
      expect(documentScreeningCopy(code), code).not.toBe(documentScreeningCopy("DOC_LOOKS_VALID"));
    }
  });

  it("tells someone what to do, not just what happened", () => {
    // A rejection with no next step is a dead end, which is the complaint this
    // whole piece of work started from.
    for (const code of ["DOC_WRONG_TYPE", "DOC_NOT_RECOGNISED"]) {
      expect(documentScreeningCopy(code).toLowerCase()).toMatch(/please|check|re-upload/);
    }
  });
});
