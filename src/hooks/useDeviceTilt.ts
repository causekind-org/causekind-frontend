"use client";

import { useEffect, useRef } from "react";
import type { TrayTiltInput } from "@/components/donate/trayPhysics";

/** Calibrated, screen-relative tilt. Sensor samples never cause React renders. */
export function useDeviceTilt(active: boolean) {
  const input = useRef<TrayTiltInput>({ x: 0, y: 0, wake: null }).current;

  useEffect(() => {
    const reset = () => { input.x = 0; input.y = 0; input.wake?.(); };
    if (!active) { reset(); return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let baseline: { beta: number; gamma: number } | null = null;
    let last = -Infinity;
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (document.hidden || reduced.matches || event.beta === null || event.gamma === null) return;
      if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      const now = performance.now();
      if (now - last < 33) return;
      last = now;
      if (!baseline) { baseline = { beta: event.beta, gamma: event.gamma }; return; }
      const delta = (value: number, origin: number) => ((value - origin + 540) % 360) - 180;
      const dx = delta(event.gamma, baseline.gamma);
      const dy = delta(event.beta, baseline.beta);
      const angle = (window.screen.orientation?.angle ?? 0) * Math.PI / 180;
      const force = (degrees: number) => Math.abs(degrees) < 1 ? 0 : Math.max(-2200, Math.min(2200, degrees * 65));
      const x = force(dx * Math.cos(angle) + dy * Math.sin(angle));
      const y = force(dy * Math.cos(angle) - dx * Math.sin(angle));
      if (Math.abs(x - input.x) + Math.abs(y - input.y) < 25) return;
      input.x = x; input.y = y;
      input.wake?.();
    };
    const recalibrate = () => { baseline = null; last = -Infinity; reset(); };
    const sync = () => {
      window.removeEventListener("deviceorientation", onOrientation);
      recalibrate();
      // Default-on, with no app permission UI or requestPermission call. Browsers
      // that withhold sensor events simply retain the normal drag simulation.
      if (!window.isSecureContext || !("DeviceOrientationEvent" in window) || reduced.matches) return;
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
    };
    sync();
    reduced.addEventListener("change", sync);
    window.screen.orientation?.addEventListener("change", recalibrate);
    document.addEventListener("visibilitychange", recalibrate);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      reduced.removeEventListener("change", sync);
      window.screen.orientation?.removeEventListener("change", recalibrate);
      document.removeEventListener("visibilitychange", recalibrate);
      reset();
    };
  }, [active, input]);

  return input;
}
