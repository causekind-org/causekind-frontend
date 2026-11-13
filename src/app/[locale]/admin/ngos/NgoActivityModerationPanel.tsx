"use client";

import { useCallback, useEffect, useState } from "react";
import { approveNgoActivity, getPendingNgoActivities, rejectNgoActivity, type AdminNgoActivity } from "@/lib/api";
import { toast } from "@/lib/toast";
import { AdminSearchBox, NoSearchResults, matchesQuery } from "@/components/admin/AdminSearchBox";
import { AdminStatusTabs } from "@/components/admin/AdminStatusTabs";
import { DecisionLine, reviewTabs, tabOptions, useAdminStatusTabs } from "@/components/admin/useAdminStatusTabs";

const ACTIVITY_TABS = reviewTabs("Waiting for review", "Not approved");
const activityStatus = (x: AdminNgoActivity) => x.activity.status ?? "PENDING";

/** NGO past-activity entries waiting for review: approve, or reject with a reason. */
export function NgoActivityModerationPanel({ onChange, onCount }: {
  onChange?: () => void;
  /** The tab count: the length of the list shown here (one query for both). */
  onCount?: (n: number) => void;
} = {}) {
  const [items, setItems] = useState<AdminNgoActivity[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const { index: statusIndex, setIndex: setStatusIndex, tab, query, setQuery } = useAdminStatusTabs(ACTIVITY_TABS);

  const load = useCallback(async () => {
    setLoadFailed(false);
    setItems(prev => (prev && prev.length ? prev : null));
    // Every entry once: the tab counts and lists come from the same rows; the badge counts the waiting ones.
    try { const list = await getPendingNgoActivities("ALL"); setItems(list); onCount?.(list.filter(x => activityStatus(x) === "PENDING").length); }
    catch { setItems([]); setLoadFailed(true); toast.error("Couldn't load past activity to review."); }
  }, [onCount]);
  useEffect(() => { void load(); }, [load]);

  async function decide(id: number, approve: boolean) {
    const reason = (reasons[id] ?? "").trim();
    if (!approve && !reason) { toast.error("Add a reason so the NGO can fix it."); return; }
    setBusy(id);
    try {
      if (approve) await approveNgoActivity(id); else await rejectNgoActivity(id, reason);
      await load();
      onChange?.();
      toast.success(approve ? "Approved. It now shows on the NGO's page." : "Sent back to the NGO.");
    } catch {
      toast.error("That didn't work. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const inTab = (items ?? []).filter(x => tab.matches(activityStatus(x)));
  const shown = inTab.filter(x => matchesQuery(query, x.organizationName, x.activity.title));
  return (
    <section aria-label="Past activity to review" className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-bold">Past activity to review</h2>
      <div className="mt-3"><AdminStatusTabs label="Past activity status" options={tabOptions(ACTIVITY_TABS, items ?? [], activityStatus)} selected={statusIndex} onSelect={setStatusIndex} /></div>
      <div className="mt-3"><AdminSearchBox value={query} onChange={setQuery} label="Search past activity" placeholder="Search NGO name or activity title" /></div>
      {items === null ? <p role="status" className="mt-2 text-sm">Loading…</p>
        : loadFailed ? <p role="alert" className="mt-2 text-sm text-red-600">Couldn&apos;t load past activity to review. <button type="button" className="underline" onClick={() => void load()}>Retry</button></p>
        : inTab.length === 0 ? <p className="mt-2 text-sm text-stone-500">{statusIndex === 0 ? "Nothing waiting." : "Nothing here."}</p>
        : shown.length === 0 ? <div className="mt-3"><NoSearchResults query={query} onClear={() => setQuery("")} /></div> : (
        <ul className="mt-3 space-y-4">
          {shown.map(({ activity: a, organizationName, applicationUnderReview, editOfLive, resubmitted, decidedBy, decidedAt }) => (
            <li key={`${a.id}-${editOfLive ? `edit-${decidedAt ?? "waiting"}` : a.status}`} data-testid="admin-activity" className="rounded-lg border border-stone-200 p-4 dark:border-zinc-700">
              <p className="ck-user-text text-xs text-stone-500">{organizationName ?? "NGO"} · {a.activityDate}</p>
              {applicationUnderReview && <p data-testid="activity-application-label" className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-bold text-amber-800">NGO application under review</p>}
              {resubmitted && <p data-testid="activity-resubmitted" className="mt-1 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-2xs font-bold text-violet-800">Resubmitted</p>}
              {editOfLive && <p data-testid="activity-edit-label" className="mt-1 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-2xs font-bold text-sky-800">{a.status === "REJECTED" ? "Edit not approved" : a.status === "APPROVED" ? "Edit approved" : "Edit of a live activity"}</p>}
              <p className="font-semibold ck-user-text">{a.title}</p>
              {a.description && <p className="mt-1 text-sm ck-user-text">{a.description}</p>}
              <p className="mt-1 text-xs">Consent confirmed: {a.consentGiven ? "yes" : "no"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {a.media.map(m => m.url && (m.mediaType === "VIDEO"
                  ? <video key={m.id} controls preload="metadata" src={m.url} className="h-28 rounded-md bg-black" aria-label="Activity video" />
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded photo URL
                  : <img key={m.id} src={m.url} alt="" className="h-28 w-28 rounded-md object-cover" />))}
                {a.media.some(m => m.mediaType === "VIDEO" && !m.url) && <p className="text-xs text-stone-500">Video still being checked.</p>}
              </div>
              {activityStatus({ activity: a } as AdminNgoActivity) !== "PENDING" ? <DecisionLine status={a.status} by={decidedBy} at={decidedAt} reason={a.rejectionReason} rejectedText={editOfLive ? "Edit not approved" : "Not approved"} /> : <>
              <label className="mt-3 block text-xs font-semibold" htmlFor={`reject-${a.id}`}>Reason (if sending back)</label>
              <input id={`reject-${a.id}`} value={reasons[a.id] ?? ""} onChange={e => setReasons(r => ({ ...r, [a.id]: e.target.value }))}
                className="mt-1 w-full rounded-md border border-stone-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={busy === a.id} onClick={() => void decide(a.id, true)}
                  className="min-h-10 rounded-md bg-ngo-700 px-4 text-sm font-semibold text-white disabled:opacity-50">Approve</button>
                <button type="button" disabled={busy === a.id} onClick={() => void decide(a.id, false)}
                  className="min-h-10 rounded-md border border-red-300 px-4 text-sm font-semibold text-red-700 disabled:opacity-50">Send back</button>
              </div>
              </>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
