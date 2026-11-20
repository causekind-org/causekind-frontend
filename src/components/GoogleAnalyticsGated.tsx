"use client";

import Script from "next/script";
import { useAfterLoadIdle } from "@/hooks/useAfterLoadIdle";
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
  const ready = useAfterLoadIdle();
  if (!GA_ID || TRACKING_DISABLED || isInternalTraffic()) return null;
  if (!TESTING_BYPASS && consent !== "accepted") return null;
  // The stub runs at once (no network): it sets up dataLayer/gtag and queues
  // 'js' + 'config' exactly once, so the first page_view is sent once and any
  // early trackGA events wait in the queue. gtag.js itself loads after the
  // page has shown (window load + idle, 3 s cap) and drains the queue.
  return (
    <>
      <Script
        id="ga-stub"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=window.gtag||gtag;window.gtag('js',new Date());window.gtag('config','${GA_ID}');`,
        }}
      />
      {ready && <Script id="ga-lib" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />}
    </>
  );
}
