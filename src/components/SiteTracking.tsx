"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackSitePage } from "@/features/scan-donation/tracking";
import { isInternalTraffic, markInternalTraffic, STAFF_PATH } from "@/lib/internalTraffic";
import { GA_ID } from "@/lib/gaId";

const TRACKING_DISABLED = process.env.NEXT_PUBLIC_DISABLE_TRACKING === "true";

/**
 * Click and time-on-page tracking on every public page; restarts on each route change.
 * Opening an admin page marks the browser as internal, so staff drop out of GA, Clarity
 * and Meta from then on.
 */
export default function SiteTracking() {
  const pathname = usePathname() ?? "";
  useEffect(() => {
    if (STAFF_PATH.test(pathname)) { markInternalTraffic(GA_ID); return; }
    if (TRACKING_DISABLED || isInternalTraffic()) return;
    return trackSitePage(pathname);
  }, [pathname]);
  return null;
}
