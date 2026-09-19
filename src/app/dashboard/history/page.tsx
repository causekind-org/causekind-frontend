"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getMyItemRequests, getMyMatches, getOffersForMyRequests,
  type DonationOffer, type ItemMatch, type ItemRequest,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight, History, Package, CheckCircle } from "lucide-react";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { isRequestActive } from "@/lib/requestActions";
import { getRequestFulfilment } from "@/lib/requestFulfilment";
import { deliveriesForRequest, totalReceived, type Delivery } from "@/features/fulfilment-history/deliveries";
import { DeliveryDetailsDialog } from "@/features/fulfilment-history/DeliveryDetailsDialog";

const CLOSED_LABEL: Record<string, string> = { CANCELLED: "Withdrawn", EXPIRED: "Expired", REJECTED: "Rejected" };

const shortDate = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function DashboardHistoryPage() {
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [offers, setOffers] = useState<DonationOffer[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  // The last delivery opened, kept while the dialog animates closed.
  const [selected, setSelected] = useState<{ delivery: Delivery; request: ItemRequest } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([
      getMyItemRequests(),
      getOffersForMyRequests(),
      // Matches are optional here — a failure leaves offer deliveries showing.
      getMyMatches().catch(() => [] as ItemMatch[]),
    ])
      .then(([reqs, offs, mats]) => {
        const mine = new Set(reqs.map(r => r.id));
        // Only matches against this donee's own requests — the same account can
        // also be the donor on a match.
        const myMatches = mats.filter(m => m.requestId != null && mine.has(m.requestId));
        // Most recent delivery first; a request with no delivery on record falls
        // back to when it was posted.
        const lastActivity = (r: ItemRequest) => Math.max(
          new Date(r.createdAt).getTime(),
          ...deliveriesForRequest(r.id, offs, myMatches).map(d => d.deliveredAt),
        );
        // By what was received, not the raw counter — a request completed through
        // the match flow is FULFILLED with a counter of 0 and belongs here too.
        setRequests(reqs
          .filter(r => getRequestFulfilment(r).fulfilled > 0)
          .sort((a, b) => lastActivity(b) - lastActivity(a)));
        setOffers(offs);
        setMatches(myMatches);
      })
      .catch(err => console.error("Error loading history:", err))
      .finally(() => setLoading(false));
  }, [user, isLoading]);

  if (isLoading || loading) return <div className="p-8 text-center text-stone-500">Loading history...</div>;
  if (!user) return <div className="p-8 text-center">Please sign in to view your history.</div>;

  return (
    <div className="min-h-screen bg-[#eef3f9] dark:bg-zinc-950 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard#requests" aria-label="Back to your requests" className="h-9 w-9 rounded-lg border border-stone-200 dark:border-zinc-700 flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <History className="w-5 h-5 text-[var(--ck-role-accent)]" />
              Fulfillment History
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">Every delivery you received, request by request. Open one for its full record.</p>
          </div>
        </div>

        {/* Fulfilled Requests — `relative` so the accent bar stays inside the card
            (Card itself isn't positioned, and the bar was painting down the page edge). */}
        <Card className="relative bg-white/90 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--ck-role-accent)]" />
          <CardHeader className="border-b border-stone-100 dark:border-zinc-800 pb-3 sm:pb-4">
            <CardTitle className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[var(--ck-role-accent)]" />
              Fulfillment Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {requests.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Package className="w-10 h-10 text-stone-200 dark:text-zinc-700 mx-auto" />
                <p className="text-sm text-stone-500">No fulfillment records yet.</p>
                <p className="text-xs text-stone-400">When donors successfully deliver items to you, they will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                {requests.map(r => {
                  const { fulfilled, requested, remaining, isFullyFulfilled: isFully } = getRequestFulfilment(r);
                  // "Remaining" only means something while donors can still send it.
                  const stillOpen = isRequestActive(r.status);
                  const deliveries = deliveriesForRequest(r.id, offers, matches);
                  const recordedTotal = totalReceived(deliveries);
                  const tone = isFully
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                    : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30";

                  return (
                    <div key={`req-${r.id}`} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 sm:gap-4 items-start min-w-0">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isFully ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-blue-50 dark:bg-blue-950/30'}`}>
                            <Package className={`w-5 h-5 ${isFully ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-3xs font-bold uppercase tracking-wider text-stone-400">Original Request</p>
                            <p className="font-semibold text-stone-900 dark:text-stone-100 truncate text-base sm:text-lg">
                              <TranslatedText text={r.title} />
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-400 mt-1">
                              <span className={`font-semibold ${isFully ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                {fulfilled} / {requested} {isFully ? "✓" : ""}
                              </span>
                              <span>•</span>
                              <span><TranslatedText text={r.category} /></span>
                              <span>•</span>
                              <span>Requested {shortDate(new Date(r.createdAt).getTime())}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="default" className={`text-xs shrink-0 ${isFully ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                          {isFully ? "Fully Fulfilled" : "Partially Fulfilled"}
                        </Badge>
                      </div>

                      {deliveries.length > 0 && (
                        <div className="sm:ml-14 mt-4 space-y-2 border-l-2 border-emerald-100 dark:border-emerald-900/50 pl-4 py-1">
                          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                            Deliveries ({deliveries.length})
                          </p>
                          {deliveries.map((d, idx) => (
                            <div key={d.key} className="bg-stone-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-stone-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                  <span className="text-3xs font-bold text-emerald-700 dark:text-emerald-400">{idx + 1}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-stone-700 dark:text-stone-300 truncate">{d.donorName}</p>
                                  <p className="text-xs text-stone-500">
                                    {shortDate(d.deliveredAt)}
                                    {d.kind === "match" && " · item match"}
                                    {/* Offered and received differ only when the donee confirmed a different count. */}
                                    {d.received != null && d.offered != null && d.received !== d.offered && ` · ${d.offered} offered`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-auto">
                                <span className={`text-sm font-bold px-2 py-0.5 rounded tabular-nums ${tone}`}>
                                  {d.received != null ? `+${d.received}` : "Delivered"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => { setSelected({ delivery: d, request: r }); setDetailsOpen(true); }}
                                  className="inline-flex items-center gap-0.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-600 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)]/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300 dark:hover:bg-zinc-800"
                                >
                                  View details <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </div>
                            </div>
                          ))}

                          <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-stone-100 dark:border-zinc-800">
                            <span className="text-sm font-bold text-stone-600 dark:text-stone-400">Total Fulfilled:</span>
                            <div className="flex gap-4">
                              <span className={`text-sm font-bold ${isFully ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>{fulfilled} / {requested}</span>
                              {!isFully && (
                                <span className="text-sm font-bold text-stone-500">
                                  {stillOpen ? `Remaining: ${remaining}` : `${CLOSED_LABEL[r.status] ?? "Closed"} · ${remaining} not received`}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Older records can disagree — e.g. a request closed complete by
                              the match flow before deliveries were counted. Say so rather
                              than show rows that silently don't add up. */}
                          {recordedTotal !== fulfilled && (
                            <p className="text-xs text-stone-400">
                              The deliveries on record add up to {recordedTotal}. The request&apos;s count of {fulfilled} includes deliveries recorded before itemised tracking.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeliveryDetailsDialog
        delivery={selected?.delivery ?? null}
        open={detailsOpen}
        requestTitle={selected?.request.title ?? ""}
        doneeName={selected?.request.doneeName ?? "You"}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
