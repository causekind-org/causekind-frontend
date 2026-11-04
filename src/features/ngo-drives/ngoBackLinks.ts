/** Back targets for NGO drive pages. Always a fixed link (never history), so Back can't loop. */

export const NGO_HANDOVERS_HREF = "/dashboard/ngo?tab=activity&filter=handovers";

/** An internal path from ?from= (same site only), else null. */
export function safeFrom(from: string | null | undefined): string | null {
  if (!from) return null;
  return from.startsWith("/") && !from.startsWith("//") && !from.includes("\\") ? from : null;
}

/** Handover page Back: where the NGO came from (?from=), else the dashboard's handovers list. */
export function ngoHandoverBackHref(from: string | null | undefined): string {
  return safeFrom(from) ?? NGO_HANDOVERS_HREF;
}

/** Drive page "Back to dashboard": the dashboard tab in ?from= (a tab name or a dashboard path), else the dashboard. Never a handover page. */
export function ngoDriveBackHref(from: string | null | undefined): string {
  if (from && /^[a-z-]+$/i.test(from)) return `/dashboard/ngo?tab=${from}`;
  const path = safeFrom(from);
  return path && path.startsWith("/dashboard/ngo") ? path : "/dashboard/ngo";
}

export function currentFromParam(): string | null {
  if (typeof window === "undefined") return null;
  try { return new URLSearchParams(window.location.search).get("from"); } catch { return null; }
}
