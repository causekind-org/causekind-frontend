"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { DONATE_SCROLL_PARAM, scrollToSection } from "@/lib/donateScroll";

/** Ids this is allowed to scroll to. */
const ALLOWED = new Set(["donate-form", "stories", "about-sahas"]);

/**
 * Scrolls to the section named by `?scroll=` once the page has settled.
 *
 * <p>Renders nothing; it exists so MoneyDonateClient does not need the hook
 * itself and so the behaviour sits next to the button that triggers it.
 *
 * <p><b>Why the retry loop.</b> The target is below ImpactCarousel, which sizes
 * itself from a ResizeObserver and whose cards are absolutely positioned. Scroll
 * on the first frame and the page keeps growing underneath, leaving the form
 * somewhere other than where we aimed. Two animation frames plus a short
 * bounded retry lets layout settle without an arbitrary long delay — and the
 * loop stops the moment it succeeds.
 *
 * <p><b>Why the param is then removed.</b> Left in the URL, a refresh (or a
 * back-navigation) would re-trigger the scroll, yanking someone who had
 * deliberately scrolled elsewhere. `replaceState` clears it without adding a
 * history entry, so Back still leaves the page rather than undoing the scroll.
 */
export function DonateScrollOnArrival() {
  const params = useSearchParams();
  const target = params.get(DONATE_SCROLL_PARAM);

  useEffect(() => {
    if (!target || !ALLOWED.has(target)) return;

    let cancelled = false;
    let attempts = 0;
    let raf = 0;

    const attempt = () => {
      if (cancelled) return;
      if (scrollToSection(target)) {
        // Drop the param so a reload does not scroll again.
        const url = new URL(window.location.href);
        url.searchParams.delete(DONATE_SCROLL_PARAM);
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
        return;
      }
      // Not mounted yet. Give up after ~1s rather than spinning forever.
      if (attempts++ < 30) raf = requestAnimationFrame(attempt);
    };

    // Two frames: one for this commit to paint, one for the sections below to
    // have measured themselves.
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(attempt);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target]);

  return null;
}
