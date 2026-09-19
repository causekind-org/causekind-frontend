/**
 * Central place for Meta (Facebook) conversion events fired from app code,
 * e.g. CompleteRegistration, Donate, Lead.
 *
 * TEST PHASE: events are sent to the TEST pixel only (Causekind Temp), via
 * `trackSingle`, so they never touch the real pixel's data while we verify.
 *
 * TO GO LIVE (send to the real pixel instead):
 *   - Set EVENT_PIXEL_ID to "1618600203011745" (the real pixel), or
 *   - Set EVENT_PIXEL_ID to "" to send to ALL initialised pixels (uses `track`).
 * Only this one line changes — the call sites stay the same.
 */
const EVENT_PIXEL_ID = "28686496047640631"; // Causekind Temp (TEST pixel)

type FbqParams = Record<string, unknown>;

export function trackMeta(event: string, params?: FbqParams): void {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq !== "function") return;

  if (EVENT_PIXEL_ID) {
    // Send to just the one pixel so other pixels' data stays clean.
    fbq("trackSingle", EVENT_PIXEL_ID, event, params);
  } else {
    // Send to every initialised pixel.
    fbq("track", event, params);
  }
}

/** A user finished creating an account (any of the registration paths). */
export function trackCompleteRegistration(params?: FbqParams): void {
  trackMeta("CompleteRegistration", params);
}
