"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackSitePage } from "@/features/scan-donation/tracking";
import { isInternalTraffic } from "@/lib/internalTraffic";

const TRACKING_DISABLED = process.env.NEXT_PUBLIC_DISABLE_TRACKING === "true";

/** Click and time-on-page tracking on every public page; restarts on each route change. */
export default function SiteTracking() {
  const pathname = usePathname();
  useEffect(() => {
    if (TRACKING_DISABLED || isInternalTraffic()) return;
    if (/\/(admin|super-admin)(\/|$)/.test(pathname)) return;
    return trackSitePage(pathname);
  }, [pathname]);
  return null;
}
