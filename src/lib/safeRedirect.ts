/**
 * Guards the `?next=` round trip through login.
 *
 * A redirect target that arrives in the URL is attacker-controlled: anyone can
 * send `causekind.com/login?next=https://evil.example/harvest` and the victim
 * sees a genuine CauseKind login page before being handed to someone else's
 * site, freshly authenticated and primed to trust whatever it asks for. That is
 * an open redirect, and the only reliable defence is to refuse anything that is
 * not unambiguously a path on this origin.
 *
 * Rejects, deliberately:
 * - absolute URLs of any scheme (`https:`, `http:`, `javascript:`, `data:`)
 * - protocol-relative `//evil.example`, which browsers resolve as absolute
 * - backslash variants `/\evil.example`, which several browsers normalise to `//`
 * - anything not starting with a single `/`
 * - control characters, which exist here only to split headers or slip past a
 *   naive prefix check
 */
export const DEFAULT_REDIRECT = "/";

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // A caller may hand us the raw query value or an already-decoded one. Decode
  // once, and treat a malformed escape as hostile rather than guessing at it.
  let value: string;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }

  // Reject rather than strip — a sanitised hostile value is still a hostile
  // value that got closer than it should have.
  if (CONTROL_CHARS.test(value)) return null;

  // Leading whitespace would let " //evil.example" reach the browser as a
  // protocol-relative URL, so it must not survive into the checks below.
  value = value.trim();

  if (!value.startsWith("/")) return null;
  // "//host" and "/\host" both resolve to another origin.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;

  // A colon before the first slash/query/hash would mean a scheme slipped in
  // through some normalisation we did not anticipate.
  const firstSegment = value.slice(1).split(/[/?#]/)[0];
  if (firstSegment.includes(":")) return null;

  return value;
}

/** Builds `/login?next=<encoded>` for a destination the guest was trying to reach. */
export function loginUrlFor(destination: string): string {
  const safe = safeInternalPath(destination);
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}
