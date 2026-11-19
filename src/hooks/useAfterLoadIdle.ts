"use client";

import { useEffect, useState } from "react";

/**
 * True once the page has finished loading and the browser is idle, or after
 * `maxMs` at the latest. Trackers use it so their scripts never compete with
 * the first view. Their queue stubs are set up earlier, so no event is lost.
 */
export function useAfterLoadIdle(maxMs = 3000): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    const finish = () => {
      if (done) return;
      done = true;
      setReady(true);
    };
    const afterLoad = () => {
      if (w.requestIdleCallback) idleId = w.requestIdleCallback(finish, { timeout: 1000 });
      else setTimeout(finish, 200);
    };
    const cap = setTimeout(finish, maxMs);
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });

    return () => {
      done = true;
      clearTimeout(cap);
      window.removeEventListener("load", afterLoad);
      if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
    };
  }, [maxMs]);

  return ready;
}
