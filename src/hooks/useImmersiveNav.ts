"use client";

import { useEffect, useState } from "react";

/**
 * Whether a full-screen section (the landing film) has asked the site's nav
 * chrome to get out of the way. Sections announce it with a `ck:immersive-nav`
 * window event whose `detail` is the desired hidden state; the header and the
 * mobile dock both listen, so neither has to know which section is asking.
 */
export function useImmersiveNav() {
  const [immersive, setImmersive] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setImmersive(!!(e as CustomEvent).detail);
    window.addEventListener("ck:immersive-nav", on);
    return () => window.removeEventListener("ck:immersive-nav", on);
  }, []);
  return immersive;
}
