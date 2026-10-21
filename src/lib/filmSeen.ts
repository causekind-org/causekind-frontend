/**
 * Whether this visitor may skip the landing film (handoffs/Landing Film Skip Plan.md).
 *
 * "Seen" = the visitor scrolled into the film at least once in this browser.
 * Eligibility is decided once per *page view* and cached here at module level,
 * so the film remounting within one view (lg breakpoint, auth restoring,
 * Strict Mode) never changes it, and the first view can never qualify itself:
 * the cache is filled before `markFilmSeen()` writes anything.
 *
 * A view ends on a full page load (new module instance) or when the visitor
 * leaves `/` client-side — FilmViewObserver calls `endView()` on departure.
 *
 * Client-only: nothing here runs at import time or during render, and the
 * server path returns false without caching. Storage failures (blocked site
 * data) behave as a first visit.
 */

const KEY = "ck:film-seen";
let snapshot: boolean | null = null;

export function isFilmSkipEligible(): boolean {
  if (typeof window === "undefined") return false;
  if (snapshot === null) {
    try {
      snapshot = window.localStorage.getItem(KEY) === "1";
    } catch {
      snapshot = false;
    }
  }
  return snapshot;
}

/** Idempotent. Called the first time the film becomes active in a view. */
export function markFilmSeen(): void {
  if (typeof window === "undefined") return;
  isFilmSkipEligible(); // snapshot before writing, so this view stays ineligible
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* storage blocked: next view behaves as a first visit */
  }
}

/** Drops the cached decision; the next read starts a new view. */
export function endView(): void {
  snapshot = null;
}
