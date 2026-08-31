/**
 * What a donee is told about an uploaded ID or residence document.
 *
 * <p>The server sends a stable code; it never sends prose. This is the only
 * place a code becomes words, so the inline message, the secondary line and the
 * toast cannot describe the same outcome differently — which they previously
 * did, because all three simply printed whatever sentence the model returned.
 *
 * <p><b>Why the model's sentence had to go.</b> It is written by the provider,
 * its wording changes between model versions, and it describes someone's
 * identity document in whatever phrasing the model chose. The listing-photo path
 * already states the rule this follows: nothing the provider writes reaches a
 * user. The sentence is still captured server-side for diagnostics.
 *
 * <p><b>These strings are English, deliberately, for now.</b> `requests/new` has
 * no next-intl wiring at all — every string on it is hardcoded English — so
 * translating this one line would leave a half-translated page, which reads worse
 * than a consistent one. Keeping the copy behind a code map means localising it
 * later is a swap of this file's values for message keys, with no change to any
 * call site. That is the whole reason this is a map rather than inline strings.
 */

/** The codes `DocumentScreeningCodes` on the server can actually emit. */
export const DOCUMENT_CODES = [
  "DOC_LOOKS_VALID",
  "DOC_WRONG_TYPE",
  "DOC_NOT_RECOGNISED",
  "DOC_UNCLEAR",
  "DOC_SCREENING_UNAVAILABLE",
] as const;

export type DocumentCode = (typeof DOCUMENT_CODES)[number];

const COPY: Record<DocumentCode, string> = {
  DOC_LOOKS_VALID:
    "This looks like the right document.",
  DOC_WRONG_TYPE:
    "This looks like a different document than the one asked for. Please check you picked the right file.",
  DOC_NOT_RECOGNISED:
    "We couldn't recognise this as the document asked for. Please re-upload a clear photo of the whole document.",
  DOC_UNCLEAR:
    "We couldn't tell either way from this photo. An admin will review it.",
  DOC_SCREENING_UNAVAILABLE:
    "We couldn't check this automatically right now. An admin will review it.",
};

/**
 * The line to show for a screening code.
 *
 * <p>An unrecognised code falls back to something still true and still
 * actionable, never the raw code. Codes are added server-side and a deployed
 * client is always older than the server it talks to, so this path is reached in
 * normal operation rather than only in a bug.
 */
export function documentScreeningCopy(code: string | null | undefined): string {
  if (!code) return "An admin will review this document.";
  return COPY[code as DocumentCode] ?? "An admin will review this document.";
}
