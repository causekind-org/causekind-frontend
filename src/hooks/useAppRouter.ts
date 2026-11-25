"use client";

import { useCallback, useMemo } from "react";
import { useRouter as useNextRouter } from "next/navigation";
import { startNavigation } from "@/lib/navigationFeedback";

/** Next router with the same API and immediate feedback for button navigation. */
export function useRouter() {
  const router = useNextRouter();
  const push = useCallback<typeof router.push>((href, options) => {
    startNavigation(href);
    if (options === undefined) router.push(href);
    else router.push(href, options);
  }, [router]);
  const replace = useCallback<typeof router.replace>((href, options) => {
    startNavigation(href);
    if (options === undefined) router.replace(href);
    else router.replace(href, options);
  }, [router]);
  return useMemo(() => ({ ...router, push, replace }), [router, push, replace]);
}
