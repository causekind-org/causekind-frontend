"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyItemRequests, getOffersForMyRequests, type ItemRequest, type DonationOffer } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, History, Package, CheckCircle } from "lucide-react";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { isRequestActive } from "@/lib/requestActions";
import { getRequestFulfilment } from "@/lib/requestFulfilment";

const CLOSED_LABEL: Record<string, string> = { CANCELLED: "Withdrawn", EXPIRED: "Expired", REJECTED: "Rejected" };

const offerDate = (o: DonationOffer) => new Date(o.closedAt || o.createdAt).getTime();

export default function DashboardHistoryPage() {
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [offers, setOffers] = useState<DonationOffer[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([
      getMyItemRequests(),
      getOffersForMyRequests()
    ])
      .then(([reqs, offs]) => {
        const completed = offs.filter(o => o.status === "COMPLETED");
        // Most recent delivery first; a request with no offer behind it (closed
        // through the item-listing match flow) falls back to when it was posted.
        const lastActivity = (r: ItemRequest) => Math.max(
          new Date(r.createdAt).getTime(),
          ...completed.filter(o => o.requestId === r.id).map(offerDate),
        );
        // By what was received, not the raw counter — a request completed through
        // the match flow is FULFILLED with a counter of 0 and belongs here too.
        setRequests(reqs
          .filter(r => getRequestFulfilment(r).fulfilled > 0)
          .sort((a, b) => lastActivity(b) - lastActivity(a)));
        setOffers(completed);
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
            <p className="text-xs text-stone-400 mt-0.5">Requests that have received fulfillments from donors.</p>
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
                  const reqOffers = offers
                    .filter(o => o.requestId === r.id)
                    .sort((a, b) => offerDate(a) - offerDate(b));

                  return (
                    <div key={`req-${r.id}`} className="p-4 sm:p-5 hover:bg-stone-50/50 dark:hover:bg-zinc-800/20 transition-colors">
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
                              <span>Requested {new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="default" className={`text-xs shrink-0 ${isFully ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                          {isFully ? "Fully Fulfilled" : "Partially Fulfilled"}
                        </Badge>
                      </div>

                      {reqOffers.length > 0 && (
                        <div className="sm:ml-14 mt-4 space-y-2 border-l-2 border-emerald-100 dark:border-emerald-900/50 pl-4 py-1">
                          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Deliveries</p>
                          {reqOffers.map((offer, idx) => (
                            <div key={offer.id} className="bg-stone-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-stone-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                  <span className="text-3xs font-bold text-emerald-700 dark:text-emerald-400">{idx + 1}</span>
                                </div>
                                <span className="font-medium text-sm text-stone-700 dark:text-stone-300 truncate">
                                  {offer.donorName || "Donor"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-stone-500">{new Date(offerDate(offer)).toLocaleDateString()}</span>
                                <span className={`text-sm font-bold px-2 py-0.5 rounded ${isFully ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30'}`}>
                                  +{offer.itemDetails?.quantity ?? 1}
                                </span>
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
    </div>
  );
}
