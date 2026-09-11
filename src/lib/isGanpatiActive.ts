import { GANPATI_START, GANPATI_END, GANPATI_CONFIG, type GanpatiThemeOverride } from "@/config/theme.config";

/**
 * Returns true only when the current date/time (IST) falls within
 * the 11-day Ganpati festival window:
 * 14 Sept 2026, 00:00:00 IST to 24 Sept 2026, 23:59:59 IST.
 *
 * Honors development override via NEXT_PUBLIC_GANPATI_THEME="on" | "off".
 * Safe for both SSR and client-side execution without hydration mismatch.
 */
export function isGanpatiActive(
  now: Date = new Date(),
  override: GanpatiThemeOverride = GANPATI_CONFIG.override
): boolean {
  if (override === "on") return true;
  if (override === "off") return false;

  const currentMs = now.getTime();
  return currentMs >= GANPATI_START.getTime() && currentMs <= GANPATI_END.getTime();
}

/**
 * Re-export dates and config for convenience.
 */
export { GANPATI_START, GANPATI_END, GANPATI_CONFIG };
