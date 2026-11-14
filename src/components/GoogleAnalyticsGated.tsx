"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { isInternalTraffic } from "@/lib/internalTraffic";

import { GA_ID } from "@/lib/gaId";

// TEMP: same bypass as MetaPixel/GTM/Clarity — no consent banner is mounted yet.
const TESTING_BYPASS = true;

// Staging sets this so test traffic never reaches the Pixel/GTM/Clarity/GA data.
const TRACKING_DISABLED = process.env.NEXT_PUBLIC_DISABLE_TRACKING === "true";

/**
 * Google Analytics 4, gated exactly like GoogleTagManagerGated: off on staging,
 * off for office IPs, and (once the banner is back) only after consent.
 * Page views on client-side navigation come from GA4 enhanced measurement
 * ("Page changes based on browser history events" — on by default).
 * Custom events go through `trackGA` in lib/gaEvents.ts.
 */
export default function GoogleAnalyticsGated() {
  const consent = useCookieConsent();
  if (!GA_ID || TRACKING_DISABLED || isInternalTraffic()) return null;
  if (!TESTING_BYPASS && consent !== "accepted") return null;
  return <GoogleAnalytics gaId={GA_ID} />;
}
