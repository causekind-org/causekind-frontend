"use client";

import { useEffect, useState } from "react";

// 1024px is the lg breakpoint — the same boundary TourController uses
// (`(max-width: 1023px)`) and the width at which --ck-bottom-chrome drops to 0
// because the mobile dock is gone.
const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * True only on viewports ≥1024px.
 *
 * Deliberately starts `false`: the server has no viewport, so anything gated on
 * this must be happy rendering nothing on the first pass. That holds for the
 * floating prompt pills, which render null until a timer fires anyway — there is
 * no visible flash to correct. Do not reach for this to gate content that must
 * be in the initial HTML.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}
