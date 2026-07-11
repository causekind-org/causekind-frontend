"use client";

import { useEffect, useRef } from "react";

export type EntityUpdateDetail = {
  entityType: string;
  entityId: number;
  action?: string;
  timestamp: number;
};

// A burst of events (e.g. AI screening finishing several listings, or a scheduled
// job sweeping many offers) coalesces into ONE onUpdate call per window instead of
// one refetch per event.
const DEBOUNCE_MS = 400;

/**
 * Subscribes to the site-wide "ck-entity-update" window event (rebroadcast from the
 * single SSE connection in useNotifications) and calls onUpdate whenever one of the
 * given entityTypes changes on the backend.
 *
 * Events arriving within DEBOUNCE_MS of the first are batched: onUpdate fires once
 * with the latest detail plus the full batch, so consumers that filter by entityId
 * must check `batch`, not just `detail`.
 *
 * onUpdate is read through a ref so callers can pass an inline closure without
 * causing this effect to re-subscribe on every render.
 */
export function useEntityUpdates(
  entityTypes: string[],
  onUpdate: (detail: EntityUpdateDetail, batch: EntityUpdateDetail[]) => void,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const key = entityTypes.join(",");

  useEffect(() => {
    const types = key.split(",").filter(Boolean);
    let pending: EntityUpdateDetail[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    function flush() {
      timer = null;
      if (pending.length === 0) return;
      const batch = pending;
      pending = [];
      onUpdateRef.current(batch[batch.length - 1], batch);
    }

    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as EntityUpdateDetail | undefined;
      if (!detail || !types.includes(detail.entityType)) return;
      pending.push(detail);
      // Fixed window from the first event (not sliding) so a steady stream still
      // flushes every DEBOUNCE_MS instead of being starved indefinitely.
      if (!timer) timer = setTimeout(flush, DEBOUNCE_MS);
    }

    window.addEventListener("ck-entity-update", handler);
    return () => {
      window.removeEventListener("ck-entity-update", handler);
      if (timer) clearTimeout(timer);
      pending = [];
    };
  }, [key]);
}
