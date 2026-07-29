"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A reload that can be called freely without stacking requests or flashing a
 * skeleton.
 *
 * <p>Three problems this solves in the Handover Hub:
 *
 * <p>1. <b>Stacking.</b> A mutation finishing and an SSE event describing the same
 * mutation arrive within milliseconds of each other, and both wanted to refetch.
 * A reload already in flight now sets a "do it once more when you're done" flag
 * instead of starting a second request.
 *
 * <p>2. <b>Skeleton flash.</b> The page's `loading` flag drove a full-page
 * skeleton, so any background refresh blanked a form the user was looking at.
 * Background reloads are tracked separately and never touch the initial-load flag.
 *
 * <p>3. <b>Unmount writes.</b> A reload resolving after navigation would setState
 * on a dead component. Guarded by the mounted ref.
 */
export function useCoalescedReload(fetcher: () => Promise<void>) {
  const inFlight = useRef(false);
  const queued = useRef(false);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    if (inFlight.current) {
      // Something changed while we were already fetching, so the response we're
      // about to get may be stale. Remember to go again rather than racing.
      queued.current = true;
      return;
    }
    inFlight.current = true;
    if (mounted.current) setRefreshing(true);
    try {
      do {
        queued.current = false;
        await fetcherRef.current();
      } while (queued.current && mounted.current);
    } finally {
      inFlight.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  return { reload, refreshing };
}
