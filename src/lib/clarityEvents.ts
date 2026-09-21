/**
 * Central place for Microsoft Clarity custom events fired from app code,
 * e.g. donation funnel steps. Mirrors the shape of metaEvents.ts so both
 * trackers stay easy to keep in sync at the same call sites.
 */

type ClarityFn = (...args: unknown[]) => void;

function getClarity(): ClarityFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { clarity?: ClarityFn }).clarity;
}

/** Fire a custom Clarity event by name. Safe to call before Clarity has loaded. */
export function trackClarity(event: string): void {
  const clarity = getClarity();
  if (typeof clarity !== "function") return;
  clarity("event", event);
}

/** Attach a custom key/value tag to the current Clarity session. */
export function tagClarity(key: string, value: string): void {
  const clarity = getClarity();
  if (typeof clarity !== "function") return;
  clarity("set", key, value);
}

// Donation funnel — fired at the same points as the matching metaEvents.ts
// calls (started, payment submitted, completed) so recordings/funnels in
// Clarity line up with Meta conversion data.
export function trackDonationStarted(): void {
  trackClarity("donation_started");
}

export function trackDonationPaymentSubmitted(): void {
  trackClarity("donation_payment_submitted");
}

export function trackDonationCompleted(): void {
  trackClarity("donation_completed");
}
