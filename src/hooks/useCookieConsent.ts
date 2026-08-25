"use client";

import { useEffect, useState } from "react";
import { readConsent, subscribeConsent, type ConsentState } from "@/lib/cookieConsent";

/**
 * The visitor's cookie-consent answer, kept current as they click.
 *
 * Starts at "unset" on every render path, including the client's first, so the
 * server and client agree on the first paint and React does not hydrate a
 * mismatch. That means a non-essential script gated on this mounts one tick
 * later than the page — which is the correct trade: the alternative is reading
 * localStorage during render and firing a tracker before the visitor has
 * answered.
 */
export function useCookieConsent(): ConsentState {
  const [consent, setConsent] = useState<ConsentState>("unset");

  useEffect(() => {
    const sync = () => setConsent(readConsent());
    sync();
    return subscribeConsent(sync);
  }, []);

  return consent;
}
