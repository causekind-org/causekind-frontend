"use client";

import { usePathname } from "next/navigation";
import { locales } from "@/i18n/config";

/**
 * The pathname as the visitor sees it, without the internal locale segment.
 *
 * <p>Why: the language lives in a cookie, never in the URL; `src/proxy.ts`
 * rewrites `/blog/x` to `/en/blog/x` internally. When a page is pre-rendered,
 * `usePathname()` returns that internal `/en/blog/x`, but in the browser it
 * returns `/blog/x`. Anything rendered from the pathname (the header's active
 * nav link, the bottom nav, the footer) then differed between the server HTML
 * and the first client render: React error #418 on every page that is a nav
 * item (home, /blog/*, /contact), found 24 Nov 2026 from the Lighthouse report.
 * React threw the server HTML away and re-rendered, adding main-thread work.
 */
export function stripLocalePrefix(pathname: string | null | undefined): string {
  const p = pathname ?? "";
  const seg = p.split("/")[1];
  if (seg && (locales as string[]).includes(seg)) {
    const rest = p.slice(seg.length + 1);
    return rest === "" ? "/" : rest;
  }
  return p;
}

export function useSitePathname(): string {
  return stripLocalePrefix(usePathname());
}
