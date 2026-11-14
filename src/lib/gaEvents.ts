import { GA_ID } from "@/lib/gaId";

/**
 * Google Analytics 4 custom events. Safe to call before (or without) GA:
 * gtag() only queues onto window.dataLayer, which gtag.js drains once loaded,
 * so events fired on page load are not lost. Never pass donor details here.
 */
type GaParams = Record<string, string | number | boolean>;

export function trackGA(event: string, params?: GaParams): void {
  if (typeof window === "undefined" || !GA_ID) return;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
  if (typeof w.gtag === "function") { w.gtag("event", event, params ?? {}); return; }
  // gtag.js reads queued `arguments` objects, not plain objects.
  (function gtag(..._a: unknown[]) { (w.dataLayer ??= []).push(arguments); })("event", event, params ?? {});
}
