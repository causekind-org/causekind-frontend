"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import {
  adminGetMatches, adminGetMatchHistory,
  type ItemMatch, type StatusHistoryEntry,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronDown, ChevronUp, Clock, MapPin, Phone, Package } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  DONOR_REVIEW: "bg-amber-100 text-amber-800",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  AWAITING_DONEE_CONFIRMATION: "bg-blue-100 text-blue-800",
  DONEE_ACCEPTED: "bg-cyan-100 text-cyan-800",
  BOTH_PARTIES_ACCEPTED: "bg-indigo-100 text-indigo-800",
  LOGISTICS_CONFIRMED: "bg-violet-100 text-violet-800",
  TRANSPORT_DISCUSSION: "bg-purple-100 text-purple-800",
  PICKUP_SCHEDULED: "bg-orange-100 text-orange-800",
  PICKED_UP: "bg-lime-100 text-lime-800",
  IN_TRANSIT: "bg-teal-100 text-teal-800",
  DELIVERED_PENDING_CONFIRMATION: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-green-100 text-green-800",
  FULFILLED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  DONOR_REJECTED: "bg-red-100 text-red-800",
};

const ALL_STATUSES = [
  "ALL", "PENDING_APPROVAL", "AWAITING_DONEE_CONFIRMATION", "DONEE_ACCEPTED",
  "BOTH_PARTIES_ACCEPTED", "LOGISTICS_CONFIRMED", "IN_TRANSIT", "COMPLETED",
  "REJECTED", "CANCELLED",
];

export default function AdminMatchesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [history, setHistory] = useState<Record<number, StatusHistoryEntry[]>>({});
  const [historyLoading, setHistoryLoading] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    loadMatches();
  }, [user, isLoading, router]);

  async function loadMatches(status?: string) {
    setLoading(true);
    try {
      const data = await adminGetMatches(status === "ALL" || !status ? undefined : status);
      setMatches(data);
    } catch {
      toast.error("Failed to load matches");
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(id: number) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!history[id]) {
      setHistoryLoading(id);
      try {
        const h = await adminGetMatchHistory(id);
        setHistory(prev => ({ ...prev, [id]: h }));
      } catch {
        toast.error("Failed to load history");
      } finally {
        setHistoryLoading(null);
      }
    }
  }

  function handleFilter(status: string) {
    setStatusFilter(status);
    loadMatches(status);
  }

  if (isLoading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="size-8 animate-spin text-stone-400" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      <div className="border-b bg-white dark:bg-zinc-900 px-4 py-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Match History</h1>
            <p className="text-sm text-stone-500 mt-1">Complete lifecycle view of all in-kind donation matches</p>
          </div>
          <Link href="/admin/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-5">
        {/* Status filter */}
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => handleFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusFilter === s ? "bg-[#1e3a60] text-white border-[#1e3a60]" : "bg-white dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-stone-300 hover:border-[#1e3a60]"}`}>
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-stone-400" /></div>
        ) : matches.length === 0 ? (
          <p className="text-center py-20 text-stone-400">No matches found for this filter.</p>
        ) : (
          <div className="space-y-3">
            {matches.map(m => (
              <Card key={m.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800/50" onClick={() => toggleExpand(m.id)}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status] ?? "bg-stone-100 text-stone-700"}`}>
                          {m.status.replace(/_/g, " ")}
                        </span>
                        {m.matchScore != null && (
                          <span className="text-xs text-stone-500">AI Score: <strong>{m.matchScore}%</strong></span>
                        )}
                        <span className="text-xs text-stone-400">#{m.id}</span>
                        {m.deliveryOtpVerified && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">OTP Verified</span>}
                      </div>
                      <p className="font-semibold text-sm">{m.requestTitle || m.listingTitle || "Unnamed match"}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-500">
                        <span>Donor: <strong className="text-stone-700 dark:text-stone-300">{m.donorName}</strong> {m.donorCity && `· ${m.donorCity}`}</span>
                        <span>Donee: <strong className="text-stone-700 dark:text-stone-300">{m.doneeName}</strong> {m.doneeCity && `· ${m.doneeCity}`}</span>
                        <span>Created: {new Date(m.createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>
                    {expandedId === m.id ? <ChevronUp className="w-4 h-4 text-stone-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-stone-400 shrink-0 mt-1" />}
                  </div>

                  {/* Expanded detail */}
                  {expandedId === m.id && (
                    <div className="border-t dark:border-zinc-700 p-4 space-y-4 bg-stone-50 dark:bg-zinc-900/50">

                      {/* Contacts */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs space-y-1 border border-stone-100 dark:border-zinc-700">
                          <p className="font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1"><Phone className="w-3 h-3" /> Donor Contact</p>
                          <p>{m.donorName}</p>
                          <p className="font-semibold text-[#1e3a60] dark:text-blue-400">{m.donorContact ?? "—"}</p>
                          <p className="text-stone-400">{m.donorCity}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs space-y-1 border border-stone-100 dark:border-zinc-700">
                          <p className="font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1"><Phone className="w-3 h-3" /> Donee Contact</p>
                          <p>{m.doneeName}</p>
                          <p className="font-semibold text-[#1e3a60] dark:text-blue-400">{m.doneeContact ?? "—"}</p>
                          <p className="text-stone-400">{m.doneeCity}</p>
                        </div>
                      </div>

                      {/* Item description */}
                      {m.donorItemDescription && (
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs border border-stone-100 dark:border-zinc-700">
                          <p className="font-bold mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Item Description</p>
                          <p className="text-stone-600 dark:text-stone-400">{m.donorItemDescription}</p>
                          {m.doneeReason && <p className="mt-2 text-stone-500"><span className="font-semibold">Donee reason:</span> {m.doneeReason}</p>}
                        </div>
                      )}

                      {/* Logistics */}
                      {m.handoverMethod && (
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 text-xs border border-stone-100 dark:border-zinc-700">
                          <p className="font-bold mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Logistics Details</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-stone-600 dark:text-stone-400">
                            <div><span className="text-stone-400">Method: </span><strong>{m.handoverMethod.replace(/_/g, " ")}</strong></div>
                            {m.pickupDateTime && <div><span className="text-stone-400">Pickup: </span><strong>{new Date(m.pickupDateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong></div>}
                            {m.expectedDeliveryDate && <div><span className="text-stone-400">Expected delivery: </span><strong>{new Date(m.expectedDeliveryDate).toLocaleDateString("en-IN")}</strong></div>}
                            {m.handoverAddress && <div className="col-span-2"><span className="text-stone-400">Pickup address: </span><strong>{m.handoverAddress}</strong></div>}
                            {m.deliveryAddress && <div className="col-span-2"><span className="text-stone-400">Delivery address: </span><strong>{m.deliveryAddress}</strong></div>}
                            {m.transportArrangedBy && <div><span className="text-stone-400">Transport by: </span><strong>{m.transportArrangedBy.replace(/_/g, " ")}</strong></div>}
                            {m.allocatedQuantity && <div><span className="text-stone-400">Quantity: </span><strong>{m.allocatedQuantity}</strong></div>}
                            {m.fulfilmentNotes && <div className="col-span-2"><span className="text-stone-400">Notes: </span><strong>{m.fulfilmentNotes}</strong></div>}
                          </div>
                        </div>
                      )}

                      {/* Donor photos */}
                      {m.donorImages.length > 0 && (
                        <div>
                          <p className="text-xs font-bold mb-2">Item Photos</p>
                          <div className="flex gap-2 flex-wrap">
                            {m.donorImages.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`Item ${i + 1}`} className="h-20 w-20 rounded-lg border object-cover hover:opacity-80 transition" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status history timeline */}
                      <div>
                        <p className="text-xs font-bold mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Status History</p>
                        {historyLoading === m.id ? (
                          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></div>
                        ) : (history[m.id] ?? []).length === 0 ? (
                          <p className="text-xs text-stone-400">No history recorded yet.</p>
                        ) : (
                          <ol className="relative border-l border-stone-200 dark:border-zinc-700 ml-2 space-y-3">
                            {(history[m.id] ?? []).map((h, i) => (
                              <li key={i} className="ml-4">
                                <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-[#1e3a60]" />
                                <p className="text-xs text-stone-400">{new Date(h.changedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                                <p className="text-xs font-semibold">
                                  <span className="text-stone-400">{h.fromStatus?.replace(/_/g, " ")} → </span>
                                  <span className={`${STATUS_COLORS[h.toStatus] ?? ""} px-1.5 py-0.5 rounded`}>{h.toStatus.replace(/_/g, " ")}</span>
                                </p>
                                <p className="text-xs text-stone-400">{h.changedByEmail}{h.note ? ` · ${h.note}` : ""}</p>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>

                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
