"use client";

import { useEffect, useState } from "react";
import { INTERACTION_EVENTS, useAfterFirstInteraction } from "@/hooks/useAfterFirstInteraction";

// Shared across tracker hooks so a long scroll cannot release all three at once.
let lastReleaseAt = -Infinity;
const QUIET_MS = 1000;
const RELEASE_GAP_MS = 1600;

/** Keep tracker libraries away from the tap/scroll that makes the app usable. */
export function useDeferredTracker(minimumDelayMs: number): boolean {
  const interacted = useAfterFirstInteraction();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!interacted || ready) return;
    let active = true;
    const startedAt = performance.now();
    let lastActivityAt = startedAt;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const remaining = () => {
      const now = performance.now();
      return Math.max(0, minimumDelayMs - (now - startedAt),
        QUIET_MS - (now - lastActivityAt), RELEASE_GAP_MS - (now - lastReleaseAt));
    };
    const release = () => {
      idleId = null;
      timer = null;
      if (!active || document.hidden) return;
      if (remaining() > 0) { schedule(); return; }
      lastReleaseAt = performance.now();
      setReady(true);
    };
    const check = () => {
      timer = null;
      if (!active || document.hidden) return;
      if (remaining() > 0) { schedule(); return; }
      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(release, { timeout: 2000 });
      } else {
        timer = setTimeout(release, 50);
      }
    };
    function schedule() {
      if (!active || document.hidden || timer !== null || idleId !== null) return;
      timer = setTimeout(check, Math.max(16, remaining()));
    }
    const onActivity = () => {
      // No React updates or per-scroll timer allocations: one pending check
      // reads this timestamp after the current interaction has settled.
      lastActivityAt = performance.now();
      schedule();
    };
    const onVisibility = () => {
      if (!document.hidden) onActivity();
    };
    const options: AddEventListenerOptions = { passive: true, capture: true };
    for (const event of INTERACTION_EVENTS) window.addEventListener(event, onActivity, options);
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      active = false;
      if (timer !== null) clearTimeout(timer);
      if (idleId !== null) idleWindow.cancelIdleCallback?.(idleId);
      for (const event of INTERACTION_EVENTS) window.removeEventListener(event, onActivity, options);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [interacted, minimumDelayMs, ready]);

  return ready;
}
