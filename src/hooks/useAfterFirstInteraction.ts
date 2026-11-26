"use client";

import { useEffect, useState } from "react";

/**
 * Activity: anything that means the visitor is busy right now. useDeferredTracker
 * waits for a quiet moment after these before loading a tracker library.
 */
export const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll", "wheel", "mousemove"] as const;

/**
 * What may START tracker loading: deliberate input only. `scroll` and
 * `mousemove` were in this list and fire without a person — scroll restoration,
 * code that scrolls, a test tool's screenshot pass or an emulated cursor — so
 * Meta Pixel, GA4 and Clarity loaded in 2 of 9 Lighthouse category runs (26 Nov
 * report: +7–9 s main thread, +3.5 s TBT) and not in the other 7. A real scroll
 * still counts: on a phone it begins with touchstart, on a desktop with wheel,
 * a key or a pointerdown on the scrollbar.
 */
export const START_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

/**
 * True from the visitor's first deliberate input: a tap, touch, key press or
 * mouse wheel (START_EVENTS). Tracker callers additionally
 * useDeferredTracker so library loading waits for quiet/idle time and is spaced
 * across providers, rather than competing with this first interaction.
 *
 * Their queue stubs are set up before this, so events from the visitor's
 * session are still sent once the scripts arrive. Trade-off accepted: a visitor
 * who never taps, touches, types or uses the wheel is not counted.
 */
export function useAfterFirstInteraction(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const opts: AddEventListenerOptions = { passive: true, capture: true };
    const onInteract = () => {
      for (const e of START_EVENTS) window.removeEventListener(e, onInteract, opts);
      setReady(true);
    };
    for (const e of START_EVENTS) window.addEventListener(e, onInteract, opts);
    return () => {
      for (const e of START_EVENTS) window.removeEventListener(e, onInteract, opts);
    };
  }, [ready]);

  return ready;
}
