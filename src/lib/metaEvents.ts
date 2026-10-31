/**
 * Central place for the Meta (Facebook) pixel.
 *
 * `META_PIXEL_ID` is the single pixel for the whole site — the base PageView
 * pixel (see MetaPixel.tsx) AND every conversion event fired from app code
 * (CompleteRegistration, ListItem, RequestItem, Donate). Change the pixel in
 * exactly one place: here.
 */
export const META_PIXEL_ID = "1104899899072358"; // Production pixel (Causekind)

/**
 * Which pixel conversion events report to. Defaults to the one site pixel.
 * Set to "" to send to ALL initialised pixels instead (uses `track`).
 */
const EVENT_PIXEL_ID = META_PIXEL_ID;

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

/**
 * Fire a CUSTOM Meta event (a name that isn't one of Meta's standard events,
 * e.g. ListItem, RequestItem). Same test-pixel routing as trackMeta.
 */
export function trackMetaCustom(event: string, params?: FbqParams): void {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq !== "function") return;

  if (EVENT_PIXEL_ID) {
    fbq("trackSingleCustom", EVENT_PIXEL_ID, event, params);
  } else {
    fbq("trackCustom", event, params);
  }
}

/** A user finished creating an account (any of the registration paths). */
export function trackCompleteRegistration(params?: FbqParams): void {
  trackMeta("CompleteRegistration", params);
}

/** A user submitted an item listing (donation) for review. */
export function trackListItem(params?: FbqParams): void {
  trackMetaCustom("ListItem", params);
}

/** A user submitted a request/need for items. */
export function trackRequestItem(params?: FbqParams): void {
  trackMetaCustom("RequestItem", params);
}

/**
 * A user completed a money donation. `value` is the amount and `currency` is
 * the ISO code (e.g. "INR"); Meta uses these to report donation value and to
 * optimise ads for higher-value donors.
 */
export function trackDonate(params: { value: number; currency: string } & FbqParams): void {
  trackMeta("Donate", params);
}
