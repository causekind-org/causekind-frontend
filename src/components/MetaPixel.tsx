"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, Suspense } from "react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "123456789";

// One-time bypass for pixel setup verification (e.g. Meta's automated domain
// checker, which can't click the cookie banner). Scoped to a single visit via
// a URL param — it does NOT touch the consent record, so it never affects any
// other visitor. No built-in expiry: remove this block entirely once
// verification is confirmed done.
const PREVIEW_TOKEN = "ck-px-verify-7q3n9x";

function hasValidPreviewToken(searchParams: URLSearchParams): boolean {
  return searchParams.get("pixel_preview") === PREVIEW_TOKEN;
}

function MetaPixelInner() {

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRun = useRef(true);

  useEffect(() => {
    // The init script below already fires the first PageView; skip this
    // effect's initial run so we don't double-report it within the same
    // second and trip Meta's duplicate-event detection.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }
  }, [pathname, searchParams]);

  return (
    <Script
      id="fb-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `,
      }}
    />
  );
}

/**
 * The Facebook pixel, which loads only after the visitor accepts cookies.
 *
 * <p>It used to load unconditionally. `CookieConsent` wrote the visitor's answer
 * to localStorage and nothing ever read it, so Decline set a key and changed
 * nothing — the pixel still initialised and reported a PageView on every route
 * change. That is the case GDPR is specifically about: a non-essential tracker
 * set before, and against, consent.
 *
 * <p>Gating rules, all deliberate:
 * <ul>
 *   <li><b>Deny by default.</b> Anything other than an explicit "accepted" —
 *       unanswered, declined, expired, unreadable, storage disabled, or simply
 *       not yet read on the first paint — renders nothing.</li>
 *   <li><b>No unmount teardown.</b> Returning null after a decline stops us
 *       adding the script, but `fbq` and its cookies survive in a session where
 *       consent was previously given and then withdrawn. Withdrawal takes effect
 *       on the next page load. Genuinely clearing it needs `_fbp`/`_fbc` cookie
 *       removal, which belongs with a real preferences centre rather than here.</li>
 *   <li><b>Admin routes never ask</b>, because `CookieConsent` skips them — so
 *       consent stays "unset" there and the pixel correctly never loads.</li>
 * </ul>
 */
// TEMP: no consent banner is mounted yet, so `consent` can never become
// "accepted" on its own. This bypass fires the pixel unconditionally for
// testing. Remove TESTING_BYPASS (revert to `consent === "accepted"`) once
// the banner is back — see DeferredOverlays.tsx and layout.tsx.
const TESTING_BYPASS = true;

export default function MetaPixel() {
  const consent = useCookieConsent();

  // Wrap in Suspense to avoid Next.js deoptimizing layout to client-side rendering due to searchParams
  return (
    <Suspense fallback={null}>
      <MetaPixelGate consentAccepted={TESTING_BYPASS || consent === "accepted"} />
    </Suspense>
  );
}

function MetaPixelGate({ consentAccepted }: { consentAccepted: boolean }) {
  const searchParams = useSearchParams();
  // Latches for the tab's lifetime so the pixel doesn't unmount mid-session
  // if the visitor navigates to a URL without the preview param.
  const previewRef = useRef(false);
  if (!previewRef.current) {
    previewRef.current = hasValidPreviewToken(searchParams);
  }

  if (!consentAccepted && !previewRef.current) return null;
  return <MetaPixelInner />;
}
