"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { endView } from "@/lib/filmSeen";

/**
 * Ends the landing film's "page view" when the visitor leaves `/` client-side,
 * so returning to the home page re-reads whether they may skip the film.
 *
 * Lives in the root layout because HomeClient is unmounted while the visitor is
 * elsewhere and can't see the departure. Clearing on *departure* (not arrival)
 * means the clear always finishes long before any return, so it never races
 * the film's first read. `/` → `/` (query or hash only) is not a departure.
 */
export function FilmViewObserver() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === "/" && pathname !== "/") endView();
    previous.current = pathname;
  }, [pathname]);
  return null;
}
