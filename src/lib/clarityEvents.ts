/**
 * Central place for Microsoft Clarity custom events fired from app code,
 * e.g. donation funnel steps. Mirrors the shape of metaEvents.ts so both
 * trackers stay easy to keep in sync at the same call sites.
 */

import { trackGA } from "@/lib/gaEvents";

type ClarityFn = (...args: unknown[]) => void;

function getClarity(): ClarityFn | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { clarity?: ClarityFn }).clarity;
}

/** Events that tracking.ts already sends to GA with their params. */
const GA_SKIP = new Set(["scan_page_view", "initiate_checkout", "donation_success", "site_click", "time_on_page", "sahas_donate_step"]);

/** Fire a custom Clarity event by name. Safe to call before Clarity has loaded. */
export function trackClarity(event: string): void {
  if (!GA_SKIP.has(event)) trackGA(event);
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
