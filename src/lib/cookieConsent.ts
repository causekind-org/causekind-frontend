// Single source of truth for the cookie-consent answer.
//
// This exists because the answer had three readers and no writer anyone checked.
// `CookieConsent.tsx` wrote `ck_cookie_consent`, `overlayGates.ts` read it only to
// ask "has the banner been dealt with?", and `MetaPixel.tsx` — the one thing on the
// site that actually needs consent — never read it at all and fired the Facebook
// pixel on every route change regardless of what the visitor clicked. Centralising
// the format here is what makes that gate possible to write correctly once.
//
// The stored value has two shapes, for historical reasons, and both are still in
// real browsers:
//
//   "accepted"                                  — a bare string
//   {"choice":"declined","ts":1690000000000}    — JSON, so the banner can re-ask
//
// Anything else is an older format we no longer write. It is treated as "unset for
// the purpose of asking again" but NEVER as consent — see `parse` below.

export const CONSENT_KEY = "ck_cookie_consent";

/** Fired on this tab when the answer changes; `storage` covers other tabs. */
export const CONSENT_EVENT = "ck:cookie-consent";

/** Re-ask after 24h if the visitor previously declined. */
export const RE_ASK_DELAY_MS = 24 * 60 * 60 * 1000;

export type ConsentState =
  /** Explicitly accepted. The only value that may enable a non-essential cookie. */
  | "accepted"
  /** Explicitly declined, within the re-ask window. */
  | "declined"
  /** Never asked, answer expired, or a format we don't recognise. */
  | "unset";

/**
 * The visitor's current answer.
 *
 * Returns "unset" during SSR and on the first client render, because
 * `localStorage` does not exist on the server. Callers must therefore treat
 * "unset" as "no consent" rather than "not known yet" — defaulting the other way
 * would fire a tracker on every first paint, which is the bug this module exists
 * to fix.
 */
export function readConsent(): ConsentState {
  if (typeof window === "undefined") return "unset";
  try {
    return parse(window.localStorage.getItem(CONSENT_KEY));
  } catch {
    // Private mode / storage disabled. No consent is recorded, so there is none.
    return "unset";
  }
}

function parse(stored: string | null): ConsentState {
  if (stored === null) return "unset";
  if (stored === "accepted") return "accepted";

  try {
    const data = JSON.parse(stored);
    if (data?.choice === "declined" && typeof data.ts === "number") {
      // Expired declines become "unset" so the banner asks again. They must not
      // become "accepted" — silence is not agreement.
      return Date.now() - data.ts < RE_ASK_DELAY_MS ? "declined" : "unset";
    }
  } catch {
    // Not our JSON — an old plain string. Fall through.
  }
  // Unrecognised. Deliberately not "accepted": an unreadable value must never be
  // the reason a tracker loads.
  return "unset";
}

/** True only on an explicit "accepted". The gate every non-essential script uses. */
export function hasConsent(): boolean {
  return readConsent() === "accepted";
}

/** Records the visitor's answer and notifies every reader in this tab. */
export function writeConsent(choice: "accepted" | "declined"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CONSENT_KEY,
      // Kept byte-identical to what the banner wrote before this module existed,
      // so answers already in visitors' browsers keep working.
      choice === "accepted"
        ? "accepted"
        : JSON.stringify({ choice: "declined", ts: Date.now() })
    );
  } catch {
    // Storage unavailable — the banner will ask again next visit. Still notify,
    // so anything gated in this session reacts to the click.
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/** Clears the answer so the banner asks again. Used when a decline expires. */
export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* nothing stored, nothing to clear */
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

/**
 * Subscribes to changes. Returns an unsubscribe function.
 *
 * Listens for both our own event (same tab — `storage` does not fire on the tab
 * that wrote) and `storage` (the visitor accepting in another tab should not
 * leave this one un-tracked, or vice versa).
 */
export function subscribeConsent(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CONSENT_KEY) onChange();
  };
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
