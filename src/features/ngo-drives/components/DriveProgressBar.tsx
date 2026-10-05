"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getNgoDrive } from "@/lib/api";

export type DriveProgressBarProps = {
  driveId: number;
  quantityNeeded: number;
  initialQuantityReceived: number;
  initialQuantityPledged: number;
  unit: string;
};

export function DriveProgressBar({
  driveId,
  quantityNeeded,
  initialQuantityReceived,
  initialQuantityPledged,
  unit,
}: DriveProgressBarProps) {
  const [received, setReceived] = useState(initialQuantityReceived);
  const [pledged, setPledged] = useState(initialQuantityPledged);

  const fetchQuantities = useCallback(async () => {
    try {
      // Through the API client: a relative fetch would hit the frontend host, not the API.
      const data = await getNgoDrive(driveId);
      setReceived(data.quantityReceived || 0);
      setPledged(data.quantityPledged || 0);
    } catch (e) {
      // Ignore
    }
  }, [driveId]);

  useEffect(() => {
    setReceived(initialQuantityReceived);
    setPledged(initialQuantityPledged);
  }, [initialQuantityReceived, initialQuantityPledged]);

  useEffect(() => {
    const handleEntityUpdate = (e: CustomEvent) => {
      const { entityType, entityId } = e.detail;
      if (entityType === "NGO_DRIVE" && Number(entityId) === driveId) {
        fetchQuantities();
      }
    };
    window.addEventListener("ck-entity-update", handleEntityUpdate as EventListener);
    
    // Tab focus fallback
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchQuantities();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // 30s interval fallback
    const interval = setInterval(fetchQuantities, 30000);
    
    return () => {
      window.removeEventListener("ck-entity-update", handleEntityUpdate as EventListener);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [driveId, fetchQuantities]);

  const stillNeeded = Math.max(0, quantityNeeded - received - pledged);
  const receivedPct = Math.min(100, (received / quantityNeeded) * 100);
  const pledgedPct = Math.min(100 - receivedPct, (pledged / quantityNeeded) * 100);

  let statusText = `${received} received · ${pledged} on the way · ${stillNeeded} still needed`;
  if (stillNeeded === 0 && received < quantityNeeded) {
    statusText = "Fully offered";
  } else if (received >= quantityNeeded) {
    statusText = "All received";
  }

  return (
    <div className="w-full flex flex-col gap-1.5 font-sans">
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
        <div 
          className="h-full bg-emerald-600 transition-all duration-500 ease-out" 
          style={{ width: `${receivedPct}%` }} 
        />
        <div 
          className="h-full bg-emerald-300 transition-all duration-500 ease-out" 
          style={{ width: `${pledgedPct}%` }} 
        />
      </div>
      <div className="text-xs text-slate-500 font-medium tracking-wide">
        {statusText}
      </div>
    </div>
  );
}
