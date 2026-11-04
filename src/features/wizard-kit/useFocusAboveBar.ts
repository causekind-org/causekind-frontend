"use client";

import { useEffect } from "react";

/**
 * Phones: a focused field scrolls into view above the wizard's bottom bar (and the
 * on-screen keyboard). `scroll-padding-bottom` (styles.css, [data-ck-wizard]) makes
 * scrollIntoView stop above the bar.
 */
export function useFocusAboveBar() {
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !el.matches?.("input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable=true]")) return;
      // After the keyboard opens and the viewport shrinks.
      window.setTimeout(() => el.scrollIntoView?.({ block: "center", behavior: "smooth" }), 250);
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, []);
}
