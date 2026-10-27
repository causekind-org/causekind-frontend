"use client";

/** Reads one query parameter from the current URL (client only). */
export function readUrlParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

/** Sets (or removes, when empty) query parameters without navigating; keeps the others (e.g. ?tab=). */
export function writeUrlParams(values: Record<string, string | null | undefined>, mode: "replace" | "push" = "replace") {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(values)) { if (v) params.set(k, v); else params.delete(k); }
  const qs = params.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  if (mode === "push") window.history.pushState(window.history.state, "", url);
  else window.history.replaceState(window.history.state, "", url);
}

/** Index of the option whose status matches ?status= (first match), else the default. */
export function statusIndexFromUrl<T extends { value?: string }>(options: T[], fallback: number): number {
  const raw = readUrlParam("status");
  if (!raw) return fallback;
  const v = raw === "ALL" ? "" : raw;
  const i = options.findIndex((o) => (o.value ?? "") === v);
  return i >= 0 ? i : fallback;
}
