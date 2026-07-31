"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * True once the page footer is close enough that bottom-anchored chrome should
 * get out of its way.
 *
 * <p><b>An IntersectionObserver, deliberately — not a scroll calculation.</b>
 * The obvious version compares `scrollY + viewportHeight` against
 * `scrollHeight` past some pixel threshold, which is what `SiteBottomBlur` used
 * to do with a hardcoded 95. That approach has to be re-tuned for every screen
 * size, breaks when the mobile URL bar changes the viewport height, and drifts
 * the moment a layout shift changes `scrollHeight` — the footer's own height
 * already varies with role, breakpoint and locale. An observer measures
 * nothing, needs no threshold, runs off the main thread, and is therefore
 * correct at any screen or browser size without being told about them.
 *
 * <p>The bottom `rootMargin` grows the viewport downward so this flips
 * BEFORE the footer actually appears, giving the chrome time to animate out
 * rather than reacting once it has already been overlapped.
 *
 * @param marginPx how far ahead of the footer to trigger.
 */
export function useNearFooter(marginPx = 72): boolean {
  const pathname = usePathname();
  const [near, setNear] = useState(false);

  useEffect(() => {
    const footer = document.getElementById("footer");
    // Admin and super-admin surfaces render no footer — stay put rather than
    // hiding chrome forever on a page that has nothing to make way for.
    if (!footer) {
      setNear(false);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: `0px 0px ${marginPx}px 0px`, threshold: 0 },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, [pathname, marginPx]);

  return near;
}
