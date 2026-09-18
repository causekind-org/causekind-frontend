"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyItemRequests, type ItemRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, History, Package, CheckCircle } from "lucide-react";
import { TranslatedText } from "@/hooks/useDynamicTranslation";

export default function DashboardHistoryPage() {
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ItemRequest[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    getMyItemRequests()
      .then((reqs) => {
        setRequests(reqs.filter(r => r.status === "FULFILLED"));
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
          <Link href="/dashboard" className="h-9 w-9 rounded-lg border border-stone-200 dark:border-zinc-700 flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <History className="w-5 h-5 text-[var(--ck-role-accent)]" />
              Request History
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">Fully fulfilled requests that have been completed.</p>
          </div>
        </div>

        {/* Fulfilled Requests */}
        <Card className="bg-white/90 dark:bg-zinc-900/80 backdrop-blur-sm border-stone-100/80 dark:border-zinc-700/50 shadow-sm overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
          <CardHeader className="border-b border-stone-100 dark:border-zinc-800 pb-3 sm:pb-4">
            <CardTitle className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Fully Fulfilled Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {requests.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Package className="w-10 h-10 text-stone-200 dark:text-zinc-700 mx-auto" />
                <p className="text-sm text-stone-500">No fully fulfilled requests yet.</p>
                <p className="text-xs text-stone-400">When all units of a request are delivered, it will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                {requests.map(r => {
                  // Use real fulfilledQuantity from the backend
                  const fulfilled = r.fulfilledQuantity ?? r.quantity;
                  return (
                    <div key={`req-${r.id}`} className="p-4 sm:p-5 hover:bg-stone-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 sm:gap-4 items-start min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                              <TranslatedText text={r.title} />
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-400 mt-1">
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {fulfilled} / {r.quantity} Fulfilled ✓
                              </span>
                              <span>•</span>
                              <span><TranslatedText text={r.category} /></span>
                              <span>•</span>
                              <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs shrink-0 bg-emerald-600 hover:bg-emerald-700">
                          Fulfilled
                        </Badge>
                      </div>
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
