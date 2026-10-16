"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  adminListPurchases, adminProcessPurchaseDeadlines, adminResolvePurchaseIssue, adminReviewPurchaseProof,
  type PurchaseView,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { purchaseMethodLabel } from "@/features/donation-offer-wizard/offerModel";
import { formatLocal } from "@/features/purchase/purchaseModel";

/**
 * Open purchase commitments (OFFER_REVIEW capability, enforced server-side).
 *
 * <p>Every decision needs a written reason (≥10 chars) because the backend
 * records it in the audit log. Private evidence opens through 10-minute links.
 */
export function PurchaseQueuePanel() {
  const [rows, setRows] = useState<PurchaseView[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await adminListPurchases(page)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't load purchases"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);
  useEntityUpdates(["OFFER"], (_l, batch) => { if (batch.some(d => rows.some(r => r.offerId === d.entityId))) void load(); });

  async function act(key: string, fn: () => Promise<unknown>, ok: string) {
    setActing(key);
    try { await fn(); toast.success(ok); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Action failed"); }
    finally { setActing(null); }
  }

  const overdue = (r: PurchaseView) => !r.orderedAt && !!r.deadline && new Date(r.deadline) < new Date();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">{rows.length} open purchase{rows.length === 1 ? "" : "s"} on this page</p>
        <button onClick={() => void load()} className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-600 hover:text-stone-900">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#b04a15]" /></div>}
      {!loading && rows.length === 0 && <p className="py-10 text-center text-sm text-stone-500">No open purchases.</p>}

      {!loading && rows.map(r => {
        const text = reason[r.offerId] ?? "";
        const reasonOk = text.trim().length >= 10;
        const proofPending = r.method === "BUY_AND_HAND_OVER" && r.status === "PROOF_UPLOADED";
        const issue = r.status === "ISSUE_RAISED";
        return (
          <div key={r.offerId} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-stone-900 dark:text-stone-100">Offer #{r.offerId}</span>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 dark:bg-zinc-800">{purchaseMethodLabel(r.method)}</span>
              <span className="rounded-full bg-orange-50 px-2 py-0.5 font-semibold text-[#b04a15]">{r.status?.replace(/_/g, " ") ?? "—"}</span>
              {overdue(r) && <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">Overdue</span>}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div><dt className="text-stone-500">Accepted qty</dt><dd>{r.acceptedQuantity ?? "—"}</dd></div>
              <div><dt className="text-stone-500">Deadline</dt><dd>{formatLocal(r.deadline)}</dd></div>
              <div><dt className="text-stone-500">Ordered</dt><dd>{r.orderedQuantity ?? "—"} {r.retailer ? `· ${r.retailer}` : ""}</dd></div>
              <div><dt className="text-stone-500">Received</dt><dd>{r.receivedQuantity ?? 0}</dd></div>
            </dl>
            {r.evidence.length > 0 && (
              <ul className="flex flex-wrap gap-3 text-xs">
                {r.evidence.map(e => (
                  <li key={e.id}>
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-[#b04a15] underline">{e.type.replace(/_/g, " ").toLowerCase()}</a>
                    {e.prohibited && <span className="ml-1 font-semibold text-red-600">flagged</span>}
                    {e.screeningAvailable === false && <span className="ml-1 text-amber-600">not screened</span>}
                  </li>
                ))}
              </ul>
            )}

            {(proofPending || issue) && (
              <textarea rows={2} value={text} onChange={e => setReason(s => ({ ...s, [r.offerId]: e.target.value }))}
                placeholder="Reason (recorded in the audit log, at least 10 characters)"
                className="w-full rounded-lg border border-stone-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
            )}

            <div className="flex flex-wrap gap-2">
              {proofPending && (
                <>
                  <button disabled={!reasonOk || !!acting} onClick={() => void act(`ok${r.offerId}`, () => adminReviewPurchaseProof(r.offerId, { approve: true, reason: text.trim() }), "Photo approved — handover can begin")}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Approve photo</button>
                  <button disabled={!reasonOk || !!acting} onClick={() => void act(`no${r.offerId}`, () => adminReviewPurchaseProof(r.offerId, { approve: false, reason: text.trim() }), "Photo rejected — donor asked to replace it")}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Reject photo</button>
                </>
              )}
              {issue && (
                <>
                  <button disabled={!reasonOk || !!acting} onClick={() => void act(`retry${r.offerId}`, () => adminResolvePurchaseIssue(r.offerId, { action: "RETRY_DELIVERY", reason: text.trim() }), "Marked for redelivery")}
                    className="rounded-lg bg-[#b04a15] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Expect redelivery</button>
                  <button disabled={!reasonOk || !!acting} onClick={() => void act(`close${r.offerId}`, () => adminResolvePurchaseIssue(r.offerId, { action: "CANCEL_REMAINDER", reason: text.trim() }), "Remainder closed")}
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Close remainder</button>
                </>
              )}
              <button disabled={!!acting} onClick={() => void act(`tick${r.offerId}`, () => adminProcessPurchaseDeadlines(r.offerId), "Deadlines processed")}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 disabled:opacity-50">Run deadline check</button>            </div>
          </div>
        );
      })}

      <div className="flex justify-between">
        <button disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs disabled:opacity-40">Previous</button>
        <button disabled={rows.length < 25 || loading} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
