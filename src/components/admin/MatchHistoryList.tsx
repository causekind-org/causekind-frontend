"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { adminGetMatches, type ItemMatch } from "@/lib/api";

const CLOSED = new Set(["COMPLETED", "FULFILLED", "CERTIFICATE_ISSUED"]);
const STOPPED = new Set(["FAILED", "CANCELLED", "REJECTED", "DONOR_REJECTED"]);
const NOT_YET = new Set(["DONOR_REVIEW", "PENDING_APPROVAL"]);

export type MatchView = "ACTIVE" | "DONE" | "STOPPED";

const VIEW: Record<MatchView, { keep: (s: string) => boolean; empty: string; badge: string }> = {
  ACTIVE: { keep: (s) => !CLOSED.has(s) && !STOPPED.has(s) && !NOT_YET.has(s), empty: "No matches are in progress.", badge: "bg-sky-50 text-sky-700" },
  DONE: { keep: (s) => CLOSED.has(s), empty: "No completed matches yet.", badge: "bg-emerald-50 text-emerald-700" },
  STOPPED: { keep: (s) => STOPPED.has(s), empty: "No rejected, cancelled or failed matches.", badge: "bg-red-50 text-red-700" },
};

/**
 * Read-only views for the admin Matches tab beyond the approval queue. Before this, a match
 * left the tab the moment it was approved, and the only way to follow it was the Match
 * History report.
 */
export function MatchHistoryList({ view }: { view: MatchView }) {
  const [rows, setRows] = useState<ItemMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const v = VIEW[view];

  useEffect(() => {
    let live = true;
    setRows(null); setError(null);
    adminGetMatches(undefined, { excludeNgo: true })
      .then((r) => { if (live) setRows(r.filter((m) => v.keep(m.status))); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load matches"); });
    return () => { live = false; };
  }, [view, v]);

  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  if (!rows) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>;
  if (rows.length === 0) return <p className="py-16 text-center text-sm text-stone-400">{v.empty}</p>;

  return (
    <ul className="space-y-3">
      {rows.map((m) => (
        <li key={m.id} className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-bold text-stone-900 min-w-0 truncate">
              {m.requestTitle ?? m.listingTitle ?? `Match #${m.id}`}
            </p>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-black uppercase tracking-wide ${v.badge}`}>
              {m.status.replace(/_/g, " ").toLowerCase()}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Donor {m.donorName} ({m.donorCity ?? "—"}) → Donee {m.doneeName ?? "—"} ({m.doneeCity ?? "—"})
          </p>
        </li>
      ))}
    </ul>
  );
}
