"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { adminGetItemListings, type ItemListing } from "@/lib/api";

const VIEW = {
  NEEDS_INFORMATION: { label: "Waiting on donor", empty: "No listings are waiting on the donor.", badge: "bg-amber-50 text-amber-700" },
  ELIGIBLE_FOR_MATCHING: { label: "Approved", empty: "No approved listings yet.", badge: "bg-emerald-50 text-emerald-700" },
} as const;

/**
 * Read-only views for the admin Listings tab beyond the pending queue: listings sent back
 * to the donor for more information, and listings already approved for matching. Before
 * this, a listing left the admin panel entirely once it was decided.
 */
export function ListingHistoryList({ status }: { status: keyof typeof VIEW }) {
  const [rows, setRows] = useState<ItemListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const v = VIEW[status];

  useEffect(() => {
    let live = true;
    setRows(null); setError(null);
    adminGetItemListings(status, { excludeNgo: true })
      .then((r) => { if (live) setRows(r as ItemListing[]); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load listings"); });
    return () => { live = false; };
  }, [status]);

  if (error) return <p className="py-16 text-center text-sm text-red-600">{error}</p>;
  if (!rows) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>;
  if (rows.length === 0) return <p className="py-16 text-center text-sm text-stone-400">{v.empty}</p>;

  return (
    <ul className="space-y-3">
      {rows.map((l) => {
        const cover = l.photoUrls?.[0] ?? l.imageUrl;
        return (
          <li key={l.id} className="flex gap-4 rounded-2xl border border-stone-200 bg-white px-5 py-4">
            {cover
              ? <img src={cover} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover bg-stone-100" />
              : <div className="h-16 w-16 shrink-0 rounded-xl bg-stone-100" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-stone-900 truncate">{l.title}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-2xs font-black uppercase tracking-wide ${v.badge}`}>{v.label}</span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {[l.donorName, l.city, l.category, `Qty ${l.quantity}`, l.condition].filter(Boolean).join(" · ")}
              </p>
              {l.submittedAt && (
                <p className="text-xs text-stone-400 mt-1">
                  Submitted {new Date(l.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
