"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyItemRequests, getMyMatches, type ItemRequest, type ItemMatch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, History, Package, Truck } from "lucide-react";
import { PageSkeleton } from "@/components/skeletons";
import { TranslatedText } from "@/hooks/useDynamicTranslation";

function getFulfilmentStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    COMPLETED: { label: "Completed & Closed", variant: "default" },
    FULFILLED: { label: "Completed & Closed", variant: "default" },
    FAILED: { label: "Delivery Failed", variant: "destructive" },
    CANCELLED: { label: "Match Cancelled", variant: "destructive" },
    REJECTED: { label: "Match Rejected", variant: "destructive" },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

function getRequestStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    FULFILLED: { label: "Completed", variant: "default" },
    EXPIRED: { label: "Expired", variant: "outline" },
    REJECTED: { label: "Rejected", variant: "destructive" },
    CANCELLED: { label: "Withdrawn", variant: "outline" },
  };
  return map[status] ?? { label: status, variant: "outline" as const };
}

export default function DashboardHistoryPage() {
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([
      getMyItemRequests(),
      getMyMatches()
    ])
      .then(([reqs, mats]) => {
        setRequests(reqs.filter(r => r.status === "FULFILLED"));
        setMatches(mats.filter(m => m.status === "FULFILLED" || m.status === "COMPLETED"));
      })
      .catch(err => console.error("Error loading history:", err))
      .finally(() => setLoading(false));
  }, [user, isLoading]);

  if (isLoading || loading) return <div className="p-8 text-center text-stone-500">Loading history...</div>;
  if (!user) return <div className="p-8 text-center">Please sign in to view your history.</div>;

  return (
    <div className="container max-w-4xl py-6 sm:py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
          <History className="w-6 h-6 text-[var(--ck-role-accent)]" />
          Request History
        </h1>
      </div>

      <div className="space-y-6">
        <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm overflow-hidden">
          <CardHeader className="border-b pb-3 sm:pb-4 relative z-10">
            <CardTitle className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-300">
              Fully Fulfilled Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {requests.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm">
                No fully fulfilled requests yet.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                {requests.map(r => {
                  const badge = getRequestStatusBadge(r.status);
                  return (
                    <div key={`req-${r.id}`} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-stone-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <div className="flex gap-4 items-start">
                        <div className="h-10 w-10 rounded-xl bg-stone-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-stone-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900 dark:text-stone-100"><TranslatedText text={r.title} /></p>
                          <div className="flex flex-wrap gap-3 text-xs text-stone-400 mt-1">
                            <span>Requested: {r.quantity}</span>
                            <span>•</span>
                            <span>Fulfilled: {r.fulfilledQuantity ?? r.quantity}</span>
                            <span>•</span>
                            <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={badge.variant} className="text-xs shrink-0">{badge.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/85 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm overflow-hidden">
          <CardHeader className="border-b pb-3 sm:pb-4 relative z-10">
            <CardTitle className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-300">
              Fulfillment Records (Completed Matches)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {matches.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm">
                No completed fulfillment records yet.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                {matches.map(m => {
                  const badge = getFulfilmentStatusBadge(m.status);
                  return (
                    <div key={`match-${m.id}`} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-stone-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <div className="flex gap-4 items-start">
                        <div className="h-10 w-10 rounded-xl bg-[var(--ck-role-soft)] dark:bg-[var(--ck-role-accent)]/20 flex items-center justify-center shrink-0">
                          <Truck className="w-5 h-5 text-[var(--ck-role-accent)]" />
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900 dark:text-stone-100">
                            <TranslatedText text={m.listingTitle || "Donated Item"} />
                          </p>
                          <div className="flex flex-col gap-1 mt-1">
                            <p className="text-xs text-stone-500">For request: <TranslatedText text={m.requestTitle || ""} /></p>
                            <p className="text-xs text-stone-400">
                              Donor: {m.donorName} • Quantity: {m.requestQuantity ?? 1} • {new Date(m.createdAt || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Badge variant={badge.variant} className="text-xs shrink-0">{badge.label}</Badge>
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
