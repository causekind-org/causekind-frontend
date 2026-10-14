"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";
import { StartDriveLink } from "@/components/ngo-landing/StartDriveLink";
import { doneeAcceptMatch, doneeRejectMatch, uploadNgoHandoverProof, type NgoHandover } from "@/lib/api";

export default function NgoHandoversPage() {
  return <Suspense fallback={<p role="status">Loading handovers…</p>}><Handovers /></Suspense>;
}

function Handovers() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { overview, isLoading, error, refresh } = useNgoStatus();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const [reasons, setReasons] = useState<Record<number, string>>({});
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login?next=%2Fngo%2Fhandovers");
    else if (!["NGO", "NGO_PARTNER"].includes(user.role?.toUpperCase() || "")) router.replace("/requests");
  }, [user, authLoading, router]);
  async function act(row: NgoHandover, action: "accept" | "reject" | "photo", file?: File) {
    setBusy(`${row.kind}-${row.id}`); setFeedback(""); setActionError("");
    try {
      if (action === "photo") {
        if (!file) return;
        await uploadNgoHandoverProof(row.kind, row.id, file);
        setFeedback("Thank you! Your handover photo has been saved.");
      } else if (action === "accept") {
        await doneeAcceptMatch(row.id);
        setFeedback("Thank you for accepting. We’ll wait for the donor’s confirmation before arranging the handover.");
      } else {
        await doneeRejectMatch(row.id, reasons[row.id]?.trim());
        setFeedback("Thank you for letting us know. This match has been declined.");
      }
      window.dispatchEvent(new Event("ngo-activity-updated"));
      await refresh();
    } catch (e) { setActionError(e instanceof Error ? e.message : "We couldn’t save that. Please try again."); }
    finally { setBusy(null); }
  }
  // ?drive= filters drive handovers; ?request= is the old alias for legacy request handovers.
  const driveId = params.get("drive");
  const requestId = params.get("request");
  const filterId = driveId ?? requestId;
  const rows = overview?.handovers.filter(row => !filterId
    || (driveId ? row.kind === "DRIVE_OFFER" : row.kind !== "DRIVE_OFFER") && String(row.requestId) === filterId) ?? [];
  if (authLoading || !user || !["NGO", "NGO_PARTNER"].includes(user.role?.toUpperCase() || "")) return <p role="status">Loading your account…</p>;
  return <main className="min-h-screen bg-stone-50 px-4 py-8 dark:bg-zinc-950"><div className="mx-auto max-w-4xl space-y-6">
    <Link href="/dashboard/ngo#live-drives" className="text-sm underline">Your drives</Link>
    <header><h1 className="text-3xl font-bold">Handovers and photos</h1><p className="mt-2 text-sm text-stone-500">Track your items, confirm receipt, and share a photo of the handover.</p></header>
    <nav className="flex flex-wrap gap-4 text-sm underline"><Link href="/dashboard/ngo#live-drives">Review incoming offers</Link><StartDriveLink href="/ngo/drives/new">Start a drive</StartDriveLink>{filterId && <Link href="/ngo/handovers">Show all handovers</Link>}</nav>
    {feedback && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{feedback}</p>}
    {actionError && <p role="alert" className="rounded-xl border border-red-300 p-4">{actionError}</p>}
    {isLoading ? <p role="status">Loading your handovers…</p> : error ? <div role="alert"><p>{error}</p><button className="mt-2 underline" onClick={() => void refresh()}>Retry</button></div> : overview && <>
      <dl className="grid gap-4 sm:grid-cols-3">{[["Scheduled receipts pending", overview.dropoffsToConfirm], ["Photos due", overview.photosDue], ["Both parties and OTP confirmed", overview.verifiedDeliveries]].map(([label, count]) => <div key={label} className="rounded-xl border border-stone-200 p-4 dark:border-zinc-700"><dt className="text-sm">{label}</dt><dd className="mt-2 text-2xl font-bold">{count}</dd></div>)}</dl>
      {rows.length === 0 && <p>No handovers to show yet{filterId ? " for this drive" : ""}. Accepted offers and available matches will appear here.</p>}
      {rows.map(row => <article key={`${row.kind}-${row.id}`} className="space-y-3 rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold">{row.title}</h2>
        <p className="text-sm capitalize">{row.status.replaceAll("_", " ").toLowerCase()} · {row.quantity} items allocated</p>
        {row.scheduledAt && <p className="text-sm">Scheduled: {new Date(row.scheduledAt).toLocaleString()}</p>}
        <p className="text-sm">{row.dualConfirmed ? "Thank you! Receipt is confirmed by both parties and OTP." : row.received ? "Thank you for confirming receipt. The remaining handover checks are still pending." : "Please confirm receipt only after the items arrive."}</p>
        {row.kind === "MATCH" && row.status === "AWAITING_DONEE_CONFIRMATION" ? <div className="space-y-3">
          <button disabled={busy !== null} className="rounded-lg bg-ngo-700 px-4 py-2 text-white disabled:opacity-50" onClick={() => void act(row, "accept")}>Accept this match</button>
          <label className="block text-sm">If this match is unsuitable, tell us why<textarea className="mt-1 block w-full rounded-lg border bg-transparent p-2" maxLength={500} value={reasons[row.id] || ""} onChange={e => setReasons(prev => ({ ...prev, [row.id]: e.target.value }))} /></label>
          <button disabled={busy !== null || !reasons[row.id]?.trim()} className="text-sm underline disabled:opacity-50" onClick={() => void act(row, "reject")}>Decline this match</button>
        </div> : row.status === "DONEE_ACCEPTED" ? <p className="text-sm">Your choice is saved. Waiting for the donor to confirm.</p> : <Link className="inline-block text-sm font-semibold underline" href={row.href}>Open handover details</Link>}
        {row.photoDue && row.kind === "DRIVE_OFFER" ? <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-950">Collection is complete. Please upload the distribution photos for this drive. <Link className="font-semibold underline" href={`/ngo/drives/${row.requestId}`}>Upload distribution proof</Link></p> : row.photoDue ? <label className="block rounded-lg bg-amber-50 p-4 text-sm text-amber-950">Please upload a clear photo of the items received. Avoid showing people or personal documents.
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy !== null} className="mt-3 block w-full" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void act(row, "photo", file); }} />
        </label> : row.received && <p className="text-sm text-emerald-700">Handover photo saved. Thank you!</p>}
        {busy === `${row.kind}-${row.id}` && <p role="status">Saving your update…</p>}
      </article>)}
    </>}
  </div></main>;
}
