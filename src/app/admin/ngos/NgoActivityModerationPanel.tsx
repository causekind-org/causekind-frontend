"use client";

import { useCallback, useEffect, useState } from "react";
import { approveNgoActivity, getPendingNgoActivities, rejectNgoActivity, type AdminNgoActivity } from "@/lib/api";
import { toast } from "@/lib/toast";
import { AdminSearchBox, NoSearchResults, matchesQuery } from "@/components/admin/AdminSearchBox";
import { readUrlParam, writeUrlParams } from "@/components/admin/adminUrlState";

/** NGO past-activity entries waiting for review: approve, or reject with a reason. */
export function NgoActivityModerationPanel({ onChange }: { onChange?: () => void } = {}) {
  const [items, setItems] = useState<AdminNgoActivity[] | null>(null);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [query, setQuery] = useState(() => readUrlParam("q").trim().slice(0, 100));
  useEffect(() => { writeUrlParams({ q: query || null }); }, [query]);
  useEffect(() => () => writeUrlParams({ q: null }), []);

  const load = useCallback(async () => {
    try { setItems(await getPendingNgoActivities()); } catch { setItems([]); toast.error("Couldn't load past activity to review."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function decide(id: number, approve: boolean) {
    const reason = (reasons[id] ?? "").trim();
    if (!approve && !reason) { toast.error("Add a reason so the NGO can fix it."); return; }
    setBusy(id);
    try {
      if (approve) await approveNgoActivity(id); else await rejectNgoActivity(id, reason);
      setItems(list => (list ?? []).filter(x => x.activity.id !== id));
      onChange?.();
      toast.success(approve ? "Approved. It now shows on the NGO's page." : "Sent back to the NGO.");
    } catch {
      toast.error("That didn't work. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const shown = (items ?? []).filter(x => matchesQuery(query, x.organizationName, x.activity.title));
  return (
    <section aria-label="Past activity to review" className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-bold">Past activity to review</h2>
      <div className="mt-3"><AdminSearchBox value={query} onChange={setQuery} label="Search past activity" placeholder="Search NGO name or activity title" /></div>
      {items === null ? <p role="status" className="mt-2 text-sm">Loading…</p>
        : items.length === 0 ? <p className="mt-2 text-sm text-stone-500">Nothing waiting.</p>
        : shown.length === 0 ? <div className="mt-3"><NoSearchResults query={query} onClear={() => setQuery("")} /></div> : (
        <ul className="mt-3 space-y-4">
          {shown.map(({ activity: a, organizationName }) => (
            <li key={a.id} data-testid="admin-activity" className="rounded-lg border border-stone-200 p-4 dark:border-zinc-700">
              <p className="text-xs text-stone-500">{organizationName ?? "NGO"} · {a.activityDate}</p>
              <p className="font-semibold">{a.title}</p>
              {a.description && <p className="mt-1 text-sm">{a.description}</p>}
              <p className="mt-1 text-xs">Consent confirmed: {a.consentGiven ? "yes" : "no"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {a.media.map(m => m.url && (m.mediaType === "VIDEO"
                  ? <video key={m.id} controls preload="metadata" src={m.url} className="h-28 rounded-md bg-black" aria-label="Activity video" />
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded photo URL
                  : <img key={m.id} src={m.url} alt="" className="h-28 w-28 rounded-md object-cover" />))}
                {a.media.some(m => m.mediaType === "VIDEO" && !m.url) && <p className="text-xs text-stone-500">Video still being checked.</p>}
              </div>
              <label className="mt-3 block text-xs font-semibold" htmlFor={`reject-${a.id}`}>Reason (if sending back)</label>
              <input id={`reject-${a.id}`} value={reasons[a.id] ?? ""} onChange={e => setReasons(r => ({ ...r, [a.id]: e.target.value }))}
                className="mt-1 w-full rounded-md border border-stone-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={busy === a.id} onClick={() => void decide(a.id, true)}
                  className="min-h-10 rounded-md bg-ngo-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Approve</button>
                <button type="button" disabled={busy === a.id} onClick={() => void decide(a.id, false)}
                  className="min-h-10 rounded-md border border-red-300 px-4 text-sm font-semibold text-red-700 disabled:opacity-50">Send back</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
