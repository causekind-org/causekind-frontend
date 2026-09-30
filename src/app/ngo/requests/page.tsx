"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { getMyItemRequests, reopenItemRequest, type ItemRequest } from "@/lib/api";

export default function NgoRequestsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const load = useCallback(async () => {
    if (!user || !["NGO", "NGO_PARTNER"].includes(user.role?.toUpperCase() || "")) return;
    setLoading(true); setError("");
    try { setRows(await getMyItemRequests()); } catch (e) { setError(e instanceof Error ? e.message : "We could not load your requests."); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/login?next=%2Fngo%2Frequests"); return; }
    if (!["NGO", "NGO_PARTNER"].includes(user.role?.toUpperCase() || "")) { router.replace("/requests"); return; }
    void load();
  }, [user, isLoading, router, load]);
  useEntityUpdates(["REQUEST"], () => { void load(); });
  async function reopen(id: number) {
    setBusy(id); setError("");
    try { await reopenItemRequest(id); router.push(`/ngo/requests/new?draft=${id}`); }
    catch (e) { setError(e instanceof Error ? e.message : "We could not reopen this request."); }
    finally { setBusy(null); }
  }
  return <main className="min-h-screen bg-stone-50 px-4 py-8 dark:bg-zinc-950"><div className="mx-auto max-w-4xl space-y-6">
    <Link href="/ngo" className="text-sm underline">NGO home</Link>
    <header className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold">Your organization’s requests</h1><Link href="/ngo/requests/new" className="rounded-xl bg-ngo-700 px-4 py-3 text-sm font-semibold text-white">Post a request</Link></header>
    <nav className="flex flex-wrap gap-4 text-sm underline"><Link href="/donee/offers">Review incoming offers</Link><Link href="/ngo/handovers">Track handovers</Link></nav>
    {error && <div role="alert" className="rounded-xl border border-red-300 p-4"><p>{error}</p><button className="mt-2 underline" onClick={() => void load()}>Retry</button></div>}
    {loading || isLoading ? <p role="status">Loading your requests…</p> : !error && rows.length === 0 ? <p>No requests yet. Start with the items your organization needs most.</p> : null}
    {!loading && !error && rows.map(row => <article key={row.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-semibold">{row.title === "Draft" ? "Untitled draft" : row.title}</h2><span className="text-sm capitalize">{row.status.replaceAll("_", " ").toLowerCase()}</span></div>
      <p className="text-sm text-stone-500">{row.category || "Category not selected"} · Quantity {row.quantity} · {row.city || "Location not selected"}</p>
      {row.description && <p className="whitespace-pre-wrap text-sm">{row.description}</p>}
      {row.rejectionReason && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{row.rejectionReason}</p>}
      {row.status === "DRAFT" ? <Link className="inline-block text-sm font-semibold underline" href={`/ngo/requests/new?draft=${row.id}`}>Continue draft</Link>
        : row.status === "REJECTED" ? <button disabled={busy !== null} className="text-sm font-semibold underline disabled:opacity-50" onClick={() => void reopen(row.id)}>{busy === row.id ? "Opening…" : "Fix and resubmit"}</button>
        : <Link className="inline-block text-sm underline" href={`/ngo/handovers?request=${row.id}`}>View related handovers</Link>}
    </article>)}
  </div></main>;
}
