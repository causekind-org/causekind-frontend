"use client";

import { useCallback } from "react";

/**
 * Cursor-tracking 3D tilt: writes --tilt-x/--tilt-y CSS vars on the element as
 * the mouse moves so `.glass-3d` (styles.css) can rotate it toward the cursor.
 * Spread the returned handlers onto the element: <button {...tilt} />.
 */
export function useTilt(maxDeg = 16) {
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--tilt-x", `${(px * maxDeg).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(-py * maxDeg).toFixed(2)}deg`);
  }, [maxDeg]);

  const onMouseLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }, []);

  return { onMouseMove, onMouseLeave };
}
