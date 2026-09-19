"use client";

/* ============================================================================
 * ⚠️  TEMPORARY TEST PIXEL — SAFE TO DELETE ENTIRELY  ⚠️
 * ----------------------------------------------------------------------------
 * A throwaway Meta pixel used only for Event Setup Tool / tracking tests.
 *
 * It is fully self-contained and shares NOTHING with the real pixel in
 * `MetaPixel.tsx`. It uses `trackSingle` so every event it sends goes ONLY to
 * this test ID — the production pixel (1618600203011745) never receives a
 * PageView from this file.
 *
 * TO REMOVE COMPLETELY (no effect on the real pixel):
 *   1. Delete this file (src/components/MetaPixelTest.tsx).
 *   2. In src/app/layout.tsx, delete the `<MetaPixelTest />` line and its
 *      import at the top.
 * Nothing else references it.
 * ==========================================================================*/

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, Suspense } from "react";

const TEST_PIXEL_ID = "28686496047640631";

function MetaPixelTestInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRun = useRef(true);

  useEffect(() => {
    // The init script below already fires the first PageView for this pixel;
    // skip the effect's initial run so it isn't reported twice.
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    // trackSingle => this event reaches ONLY the test pixel, never the real one.
    if (typeof fbq === "function") {
      fbq("trackSingle", TEST_PIXEL_ID, "PageView");
    }
  }, [pathname, searchParams]);

  return (
    <>
      <Script
        id="fb-pixel-test"
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
            fbq('init', '${TEST_PIXEL_ID}');
            fbq('trackSingle', '${TEST_PIXEL_ID}', 'PageView');
          `,
        }}
      />
      {/* suppressHydrationWarning: the Meta Pixel SDK adds aria-hidden / data-aria-hidden
          to this element after load; those attributes are absent in SSR HTML, causing a
          benign hydration mismatch. The noscript fallback is only meaningful when JS is
          disabled (contradicting the React runtime), so suppressing the warning here is safe. */}
      <noscript suppressHydrationWarning>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${TEST_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

export default function MetaPixelTest() {
  // Suspense wraps useSearchParams so the layout isn't forced to client render.
  return (
    <Suspense fallback={null}>
      <MetaPixelTestInner />
    </Suspense>
  );
}
