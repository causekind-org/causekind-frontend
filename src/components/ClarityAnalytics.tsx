"use client";

import Script from "next/script";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const CLARITY_PROJECT_ID = "ykpnfnuc02";

// TEMP: mirrors MetaPixel's TESTING_BYPASS — no consent banner is mounted yet,
// so `consent` can never become "accepted" on its own. Remove this bypass
// (revert to `consent === "accepted"`) once the banner is back.
const TESTING_BYPASS = true;

/**
 * Microsoft Clarity, gated behind the same cookie-consent answer as
 * MetaPixel. Clarity is a separate, independent script — its own global
 * (`window.clarity`), its own tag inserted into <head> — so it does not
 * collide with fbq/the Meta Pixel or GTM; they can all run side by side.
 */
export default function ClarityAnalytics() {
  const consent = useCookieConsent();
  const consentAccepted = TESTING_BYPASS || consent === "accepted";

  if (!consentAccepted) return null;

  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
        `,
      }}
    />
  );
}
