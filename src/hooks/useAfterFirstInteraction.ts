"use client";

import { useEffect, useState } from "react";

/** Events that count as the visitor interacting with the page. */
export const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll", "wheel", "mousemove"] as const;

/**
 * True from the visitor's first interaction with the page: a scroll, tap,
 * touch, key press, mouse wheel or mouse move. Tracker callers additionally
 * useDeferredTracker so library loading waits for quiet/idle time and is spaced
 * across providers, rather than competing with this first interaction.
 *
 * Their queue stubs are set up before this, so events from the visitor's
 * session are still sent once the scripts arrive. Trade-off accepted: a visitor
 * who never scrolls, taps or moves the mouse is not counted.
 */
export function useAfterFirstInteraction(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const opts: AddEventListenerOptions = { passive: true, capture: true };
    const onInteract = () => {
      for (const e of INTERACTION_EVENTS) window.removeEventListener(e, onInteract, opts);
      setReady(true);
    };
    for (const e of INTERACTION_EVENTS) window.addEventListener(e, onInteract, opts);
    return () => {
      for (const e of INTERACTION_EVENTS) window.removeEventListener(e, onInteract, opts);
    };
  }, [ready]);

  return ready;
}
