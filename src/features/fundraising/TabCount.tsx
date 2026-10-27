"use client";

import { useEffect, useState } from "react";

/** Row count per queue tab, fetched once per tab; reloads when `refreshKey` changes. A failed tab shows nothing. */
export function useTabCounts<S>(statuses: (S | undefined)[], fetch: (s?: S) => Promise<unknown[]>, refreshKey: unknown) {
  const [counts, setCounts] = useState<(number | null)[]>(() => statuses.map(() => null));
  useEffect(() => {
    Promise.all(statuses.map((s) => fetch(s).then((r) => r.length).catch(() => null))).then(setCounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);
  return counts;
}

/** The number on a queue tab: orange when something is there, muted at zero. */
export function TabCount({ n }: { n: number | null }) {
  if (n == null) return null;
  return <span style={{ marginLeft: 6, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: n > 0 ? "#b04a15" : "#a8a29e" }}>{n}</span>;
}
