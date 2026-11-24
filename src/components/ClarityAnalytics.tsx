"use client";

import Script from "next/script";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { isInternalTraffic } from "@/lib/internalTraffic";
import { useDeferredTracker } from "@/hooks/useDeferredTracker";

const CLARITY_PROJECT_ID = "ykpnfnuc02";

// TEMP: mirrors MetaPixel's TESTING_BYPASS — no consent banner is mounted yet,
// so `consent` can never become "accepted" on its own. Remove this bypass
// (revert to `consent === "accepted"`) once the banner is back.
const TESTING_BYPASS = true;

// Staging sets this so test traffic never reaches the Pixel/GTM/Clarity data.
const TRACKING_DISABLED = process.env.NEXT_PUBLIC_DISABLE_TRACKING === "true";

/**
 * Microsoft Clarity, gated behind the same cookie-consent answer as
 * MetaPixel. Clarity is a separate, independent script — its own global
 * (`window.clarity`), its own tag inserted into <head> — so it does not
 * collide with fbq/the Meta Pixel or GTM; they can all run side by side.
 */
export default function ClarityAnalytics() {
  const consent = useCookieConsent();
  const consentAccepted = TESTING_BYPASS || consent === "accepted";
  const ready = useDeferredTracker(5000);

  if (TRACKING_DISABLED || isInternalTraffic() || !consentAccepted) return null;

  // Queue stub at once (early window.clarity calls are kept); the tag script
  // loads after interaction, a quiet window and a staggered idle slot.
  return (
    <>
      <Script
        id="ms-clarity-stub"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};`,
        }}
      />
      {ready && <Script id="ms-clarity" src={`https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`} strategy="afterInteractive" />}
    </>
  );
}
