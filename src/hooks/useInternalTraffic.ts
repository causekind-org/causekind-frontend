"use client";

import { useSyncExternalStore } from "react";
import { isInternalTraffic } from "@/lib/internalTraffic";

function subscribe(listener: () => void) {
  window.addEventListener("ck:internal-traffic", listener);
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener("ck:internal-traffic", listener);
    window.removeEventListener("focus", listener);
  };
}

/** Unknown during SSR/hydration; never branch on document.cookie in render. */
export function useInternalTraffic(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribe, isInternalTraffic, () => null);
}
