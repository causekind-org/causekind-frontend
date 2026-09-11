"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type BubblePosition = { x: number; y: number };

/** How far the pointer must travel before this counts as a drag and not a tap. */
const DRAG_THRESHOLD_PX = 6;

/** Keeps the bubble from being dragged flush into a corner. */
const EDGE_GAP_PX = 8;

/**
 * Makes a fixed-position bubble draggable, and remembers where it was left.
 *
 * <p><b>A drag must not fire a click.</b> The support bubble is a `<button>`
 * whose whole job is to open a panel, so the hard part here is not the movement
 * — it is that finishing a drag on top of the button would otherwise open the
 * panel every time. Movement past {@link DRAG_THRESHOLD_PX} latches `draggedRef`
 * and the click handler this hook returns swallows exactly one click.
 *
 * <p><b>It stays on screen.</b> Position is stored as a top-left point in
 * viewport pixels and clamped on every move, on release, and again whenever the
 * viewport changes — rotating a phone or opening the keyboard otherwise leaves
 * the bubble stranded outside. The caller passes the size it occupies plus any
 * bottom chrome it must not sit behind.
 *
 * <p><b>Keyboard and pointer stay independent.</b> Dragging is pointer-only, so
 * Enter and Space still open the panel; `setPointerCapture` keeps a drag alive
 * when the finger leaves the button, and touch scrolling is suppressed only
 * while a drag is actually in progress.
 */
export function useDraggableBubble({
  storageKey,
  size,
  bottomInset = 0,
  enabled = true,
}: {
  /** Where to remember the position. Per-viewer, never shared. */
  storageKey: string;
  /** The bubble's width and height in px — used for clamping. */
  size: number;
  /** Space at the bottom the bubble must stay clear of, e.g. a nav dock. */
  bottomInset?: number;
  enabled?: boolean;
}) {
  const [position, setPosition] = useState<BubblePosition | null>(null);
  const [dragging, setDragging] = useState(false);

  const originRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const swallowClickRef = useRef(false);

  const clamp = useCallback(
    (p: BubblePosition): BubblePosition => {
      const maxX = Math.max(EDGE_GAP_PX, window.innerWidth - size - EDGE_GAP_PX);
      const maxY = Math.max(EDGE_GAP_PX, window.innerHeight - size - bottomInset - EDGE_GAP_PX);
      return {
        x: Math.min(Math.max(p.x, EDGE_GAP_PX), maxX),
        y: Math.min(Math.max(p.y, EDGE_GAP_PX), maxY),
      };
    },
    [size, bottomInset],
  );

  // Restore after mount, never during render: the server has no localStorage,
  // and a first paint that disagreed with it would be a hydration mismatch.
  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
        setPosition(clamp(parsed));
      }
    } catch {}
  }, [storageKey, enabled, clamp]);

  // A bubble parked against the right edge of a landscape phone is off-screen
  // once it turns portrait. Re-clamp rather than reset, so the viewer keeps
  // roughly the spot they chose.
  useEffect(() => {
    if (!enabled) return;
    const onResize = () => setPosition(p => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [enabled, clamp]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      originRef.current = { px: e.clientX, py: e.clientY, x: rect.left, y: rect.top };
      draggedRef.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const origin = originRef.current;
      if (!origin) return;
      const dx = e.clientX - origin.px;
      const dy = e.clientY - origin.py;

      if (!draggedRef.current) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        draggedRef.current = true;
        setDragging(true);
      }

      setPosition(clamp({ x: origin.x + dx, y: origin.y + dy }));
    },
    [clamp],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!originRef.current) return;
      originRef.current = null;
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (!draggedRef.current) return;

      // The click for this same gesture is still to come. Swallow it, or the
      // drag that just ended also opens the panel.
      swallowClickRef.current = true;
      setDragging(false);
      setPosition(p => {
        if (!p) return p;
        const next = clamp(p);
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
        return next;
      });
    },
    [clamp, storageKey],
  );

  /** Wrap the button's own click handler so a finished drag does not fire it. */
  const guardClick = useCallback((run: () => void) => {
    return () => {
      if (swallowClickRef.current) {
        swallowClickRef.current = false;
        return;
      }
      run();
    };
  }, []);

  return {
    /** Null until the viewer has moved it — the caller keeps its CSS default. */
    position,
    dragging,
    guardClick,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}

export default useDraggableBubble;
