import type { SuperAdminEntity } from "./api";

const PREFIX: Record<SuperAdminEntity, string> = {
  "users": "USR",
  "campaigns": "CMP",
  "donations": "DON",
  "item-requests": "REQ",
  "item-listings": "LST",
  "matches": "MTC",
};

// Crockford base32 — I, L, O and U omitted so codes can't be misread aloud.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const SPAN = 32 ** 4;    // 1_048_576 distinct codes per entity
const SCATTER = 0x1D2F3; // odd ⇒ coprime with 2^20 ⇒ bijective mod SPAN

function encode(n: number): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out = ALPHABET[n % 32] + out;
    n = Math.floor(n / 32);
  }
  return out;
}

/**
 * Stable display code for a row — the same id always yields the same code.
 *
 * Scattered rather than legible on purpose: a code like USR-0042 sitting on
 * row #3 would recreate the "why does it say 42?" confusion that positional
 * serial numbers exist to remove.
 *
 * Collision-free, not merely collision-unlikely: SPAN is 2^20 and SCATTER is
 * odd, so multiplication mod SPAN is a bijection — distinct ids provably
 * cannot collide. Past ~1M rows in one table codes would wrap and repeat.
 */
export function rowCode(entity: SuperAdminEntity, id: unknown): string {
  // Guard null/undefined explicitly — Number(null) is 0, which would otherwise
  // render a missing id as the real-looking code for id 0.
  if (id === null || id === undefined || id === "") return "—";
  const n = Math.floor(Number(id));
  if (!Number.isFinite(n) || n < 0) return "—";
  return `${PREFIX[entity]}-${encode((n * SCATTER) % SPAN)}`;
}
