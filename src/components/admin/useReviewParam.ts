"use client";

import { useCallback, useEffect, useState } from "react";
import { readUrlParam, writeUrlParams } from "./adminUrlState";

/**
 * The item open for review (?review=<id>), like opening it on its own page:
 * Review pushes a history entry, so browser Back returns to the list.
 */
export function useReviewParam(name = "review"): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(() => readUrlParam(name) || null);
  const set = useCallback((next: string | null) => {
    setId(next);
    writeUrlParams({ [name]: next }, next ? "push" : "replace");
    if (typeof window !== "undefined" && !navigator.userAgent.includes("jsdom")) window.scrollTo({ top: 0 });
  }, [name]);
  useEffect(() => {
    const onPop = () => setId(readUrlParam(name) || null);
    window.addEventListener("popstate", onPop);
    return () => { window.removeEventListener("popstate", onPop); writeUrlParams({ [name]: null }); };
  }, [name]);
  return [id, set];
}
