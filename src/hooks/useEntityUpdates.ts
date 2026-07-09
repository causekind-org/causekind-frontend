"use client";

import { useEffect, useRef } from "react";

export type EntityUpdateDetail = {
  entityType: string;
  entityId: number;
  action?: string;
  timestamp: number;
};

/**
 * Subscribes to the site-wide "ck-entity-update" window event (rebroadcast from the
 * single SSE connection in useNotifications) and calls onUpdate whenever one of the
 * given entityTypes changes on the backend — lets any page refetch its own data and
 * reflect changes within a second, without the user refreshing.
 *
 * onUpdate is read through a ref so callers can pass an inline closure without
 * causing this effect to re-subscribe on every render.
 */
export function useEntityUpdates(entityTypes: string[], onUpdate: (detail: EntityUpdateDetail) => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const key = entityTypes.join(",");

  useEffect(() => {
    const types = key.split(",").filter(Boolean);
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as EntityUpdateDetail | undefined;
      if (!detail || !types.includes(detail.entityType)) return;
      onUpdateRef.current(detail);
    }
    window.addEventListener("ck-entity-update", handler);
    return () => window.removeEventListener("ck-entity-update", handler);
  }, [key]);
}
