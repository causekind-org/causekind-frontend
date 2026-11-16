"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { adminGetCampaigns, type Campaign } from "@/lib/api";

const inr = (n: number) => `₹${new Intl.NumberFormat("en-IN").format(Number(n ?? 0))}`;

/**
 * Read-only list of already-decided campaigns (APPROVED / REJECTED) for the admin
 * Campaigns tab. Before this, the tab only ever fetched PENDING_APPROVAL, so a
 * decision vanished from the admin panel the moment it was made.
 */
export function CampaignHistoryList({ status }: { status: "APPROVED" | "REJECTED" }) {
  const [rows, setRows] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setRows(null); setError(null);
    adminGetCampaigns(status, { excludeNgo: true })
      .then((r) => { if (live) setRows(r); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load campaigns"); });
    return () => { live = false; };
  }, [status]);

  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  if (!rows) return (
    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
  );
  if (rows.length === 0) return (
    <p className="py-16 text-center text-sm text-stone-400">
      No {status === "APPROVED" ? "approved" : "rejected"} campaigns yet.
    </p>
  );

  return (
    <ul className="space-y-3">
      {rows.map((c) => (
        <li key={c.id} className="rounded-2xl border border-stone-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-stone-900 truncate">{c.title}</p>
              <p className="text-xs text-stone-500 mt-1">
                {[c.doneeName, [c.city, c.state].filter(Boolean).join(", "), c.category].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-black uppercase tracking-wide ${
              status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}>{status === "APPROVED" ? "Approved" : "Rejected"}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-600">
            <span>Goal <b className="tabular-nums">{inr(c.targetAmount)}</b></span>
            {status === "APPROVED" && <span>Raised <b className="tabular-nums">{inr(c.amountRaised)}</b></span>}
            <span>Decided {new Date(c.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
          {status === "REJECTED" && c.rejectionReason && (
            <p className="mt-3 rounded-xl bg-red-50/60 px-3 py-2 text-xs text-red-800">
              <b>Reason:</b> {c.rejectionReason}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
