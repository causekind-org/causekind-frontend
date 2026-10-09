import { useEffect, useState } from "react";

/**
 * The furthest step the donor has actually reached in this draft, as an index
 * into `steps`.
 *
 * <p>A step earns its green check only once the donor has continued past it —
 * never because its fields happen to be valid already (the offer wizard
 * pre-fills quantity from the request, which used to tick "Tell us about the
 * item" while the donor was still on step 1). Going back never lowers it, so
 * checks on steps the donor genuinely finished stay put.
 *
 * <p>Kept per draft in localStorage (by step NAME, so a changed step list cannot
 * misread it), which carries it across a reload or a later session on this
 * device. A draft opened somewhere else falls back to the step it reopens on.
 * `key` may be null until a lazily created draft has an id; the value is merged
 * and saved as soon as it arrives.
 */
export function useFurthestStep<S extends string>(key: string | null, steps: readonly S[], step: S): number {
  const [reached, setReached] = useState(() => Math.max(readStored(key, steps), steps.indexOf(step)));

  // A key that arrives later (draft created mid-flow, or a different draft).
  useEffect(() => {
    const stored = readStored(key, steps);
    if (stored > -1) setReached(r => Math.max(r, stored));
  }, [key, steps]);

  useEffect(() => {
    const i = steps.indexOf(step);
    if (i > -1) setReached(r => Math.max(r, i));
  }, [step, steps]);

  useEffect(() => {
    if (!key || reached < 0 || !steps[reached]) return;
    try { localStorage.setItem(key, steps[reached]); } catch { /* best-effort */ }
  }, [key, reached, steps]);

  return reached;
}

function readStored<S extends string>(key: string | null, steps: readonly S[]): number {
  if (!key) return -1;
  try {
    const saved = localStorage.getItem(key);
    return saved ? steps.indexOf(saved as S) : -1;
  } catch {
    return -1;
  }
}
