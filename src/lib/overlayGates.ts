// Shared "is any load-time overlay on screen?" check.
//
// Lives here rather than inside TourController because more than one thing needs
// the answer — the guided tour and the dock's request nudge — and the
// tour/location-gate race this encodes has already caused one incident. Two
// drifting copies of these conditions is exactly how that comes back.

/**
 * True when no load-time overlay (welcome, donor category picker, location gate,
 * cookie banner) is on screen. Callers must not paint over any of them.
 */
export function overlayGatesClear(): boolean {
  return (
    !document.querySelector(".ck-cat-backdrop-el") &&
    sessionStorage.getItem("ck_welcome_pending") !== "1" &&
    // LocationGate. Two signals, because it reveals on a 1200ms timer while
    // callers poll every 250ms: the flag is set the moment it commits to showing
    // (so we don't slip into the gap before it paints), the DOM marker covers
    // the rest.
    sessionStorage.getItem("ck_location_pending") !== "1" &&
    !document.querySelector(".ck-location-backdrop-el") &&
    // The guest-facing load-time overlay. WelcomeOverlay bails out entirely when
    // there is no user, so for a visitor the cookie banner is the one thing that
    // can still be on screen. It exposes no stable DOM marker, so its stored
    // answer is the signal that it has been dealt with.
    localStorage.getItem("ck_cookie_consent") !== null
  );
}

/**
 * True when the guided tour itself is running. Separate from
 * {@link overlayGatesClear} because the tour is a *consumer* of that check — it
 * would otherwise be gating on itself.
 */
export function tourIsOpen(): boolean {
  return !!document.querySelector(".ck-tour-root");
}
