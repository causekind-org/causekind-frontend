"use client";

import { useEffect, useState } from "react";

/**
 * Hosts where unfinished placeholder content (founder's note, sample reviews)
 * may be shown. Production (causekind.com) never shows it.
 */
const PREVIEW_HOSTS = ["localhost", "127.0.0.1", "staging.causekind.com"];

export function isPlaceholderPreviewHost(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window === "undefined") return false;
  return PREVIEW_HOSTS.includes(window.location.hostname);
}

/** False on the server and first render (avoids hydration mismatch), then the real answer. */
export function usePlaceholderPreview(): boolean {
  const [allowed, setAllowed] = useState(process.env.NODE_ENV === "development");
  useEffect(() => {
    setAllowed(isPlaceholderPreviewHost());
  }, []);
  return allowed;
}
