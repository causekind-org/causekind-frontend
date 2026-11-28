"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSearchBox, NoSearchResults, matchesQuery } from "@/components/admin/AdminSearchBox";
import { AdminStatusTabs } from "@/components/admin/AdminStatusTabs";
import { DecisionLine, reviewTabs, tabOptions, useAdminStatusTabs } from "@/components/admin/useAdminStatusTabs";
import {
  adminApproveNgoProfileChange, adminGetNgoProfileChanges, adminRejectNgoProfileChange, type AdminNgoProfileChange,
} from "@/lib/api";
import { documentLabel } from "@/features/ngo-registration/ngoRegistrationModel";
import { AdminReviewTable, BackToList, TwoLine } from "@/components/admin/AdminReviewTable";
import { useReviewParam } from "@/components/admin/useReviewParam";

const FIELD_LABELS: Record<string, string> = {
  organizationName: "Legal name", panNumber: "PAN", registrationNumber: "Registration number",
  officialEmail: "Official email", registeredOfficeAddress: "Registered office address", representatives: "Representatives / trustees",
};

type Rep = { fullName: string; designation?: string; mobileNumber?: string; email?: string; panNumber?: string; idProofDocumentId?: number };

/** Representatives are stored as JSON (every detail of an added/replaced person, with its ID proof); everything else is plain text. */
function ShowValue({ field, value, idProofUrls }: { field: string; value?: string | null; idProofUrls?: Record<string, string> | null }) {
  if (!value) return <>—</>;
  if (field.startsWith("documents.")) {
    const url = idProofUrls?.[value];
    return url ? <DocFile url={url} /> : <span className="text-stone-500">File #{value} (link not available)</span>;
  }
  if (field !== "representatives") return <>{value}</>;
  let reps: Rep[];
  try { reps = JSON.parse(value) as Rep[]; } catch { return <>{value}</>; }
  return (
    <ul className="space-y-1.5">
      {reps.map((r, i) => (
        <li key={i} data-testid="admin-rep">
          <span className="font-semibold ck-user-text">{r.fullName}</span>{r.designation ? ` (${r.designation})` : ""}
          {(r.mobileNumber || r.email || r.panNumber) && (
            <span className="block text-xs text-stone-600">{[r.mobileNumber, r.email, r.panNumber && `PAN ${r.panNumber}`].filter(Boolean).join(" · ")}</span>
          )}
          {r.idProofDocumentId != null && idProofUrls?.[String(r.idProofDocumentId)] && (
            <a href={idProofUrls[String(r.idProofDocumentId)]} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 underline">ID proof</a>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A document: an image preview when the file is an image (hidden if it isn't), and a clear button to open it. */
function DocFile({ url }: { url: string }) {
  const [isImage, setIsImage] = useState(true);
  return (
    <div className="space-y-2">
      {isImage && (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL
        <img src={url} alt="" onError={() => setIsImage(false)}
          className="h-40 w-full rounded-lg border border-stone-200 bg-white object-contain dark:border-zinc-700" />
      )}
      <a href={url} target="_blank" rel="noopener noreferrer" data-testid="admin-doc-file"
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold text-stone-800 hover:bg-stone-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-stone-100">
        Open file <span aria-hidden>↗</span>
      </a>
    </div>
  );
}

/** Admin: NGO requests to change a verified profile field (old vs new). Approving applies it; rejecting needs a reason. */
const CHANGE_TABS = reviewTabs("Waiting", "Not approved");
const changeStatus = (x: AdminNgoProfileChange) => x.request.status;

export function NgoProfileChangesPanel({ onChange }: { onChange?: () => void } = {}) {
  const [items, setItems] = useState<AdminNgoProfileChange[] | null>(null);
  const { index: statusIndex, setIndex: setStatusIndex, tab, query, setQuery } = useAdminStatusTabs(CHANGE_TABS);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reviewId, setReviewId] = useReviewParam();

  // Every request once: the tab counts and lists come from the same rows.
  const load = useCallback(() => {
    adminGetNgoProfileChanges("ALL").then(setItems).catch(() => { setItems([]); setError("We couldn't load profile changes."); });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(id: number, approve: boolean) {
    setError("");
    if (!approve && !(reasons[id] ?? "").trim()) { setError("Tell the NGO why the change was not approved."); return; }
    setBusy(id);
    try {
      if (approve) await adminApproveNgoProfileChange(id);
      else await adminRejectNgoProfileChange(id, reasons[id].trim());
      load();
      onChange?.();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That didn't work. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const shownChanges = (list: AdminNgoProfileChange[]) => list.filter(x => tab.matches(changeStatus(x))
    && matchesQuery(query, x.organizationName, x.request.field, x.request.newValue, x.request.oldValue));
  const fieldName = (f: string) => FIELD_LABELS[f] ?? (f.startsWith("documents.") ? `Document: ${documentLabel(f.slice(10))}` : f);
  const reviewing = reviewId ? (items ?? []).find(x => String(x.request.id) === reviewId) : undefined;

  return (
    <section aria-label="NGO profile changes" className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-bold">Profile changes</h2>
      <div className="mt-3"><AdminStatusTabs label="Profile change status" options={tabOptions(CHANGE_TABS, items ?? [], changeStatus)} selected={statusIndex} onSelect={i => { setReviewId(null); setStatusIndex(i); }} /></div>
      <div className="mt-3"><AdminSearchBox value={query} onChange={setQuery} label="Search profile changes" placeholder="Search NGO name or value" /></div>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      {reviewing && <div className="mt-3"><BackToList onBack={() => setReviewId(null)} /></div>}
      {items == null ? <p className="mt-4 text-sm text-stone-500">Loading…</p>
        : !reviewing && shownChanges(items).length === 0 ? (query && items.some(x => tab.matches(changeStatus(x))) ? <NoSearchResults query={query} onClear={() => setQuery("")} /> : <p className="mt-4 text-sm text-stone-500">Nothing here.</p>)
        : !reviewing ? (
          <div className="mt-4">
            <AdminReviewTable label="Profile changes" rows={shownChanges(items)} name={x => `${x.organizationName ?? "NGO"} ${fieldName(x.request.field)}`} rowTestId="admin-profile-change-row" rowKey={x => x.request.id}
              highlight={x => x.request.status === "PENDING"} onReview={x => setReviewId(String(x.request.id))}
              columns={[
                { header: "NGO", cell: x => <TwoLine main={x.organizationName} /> },
                { header: "Field", cell: x => fieldName(x.request.field) },
                { header: "State", cell: x => x.request.status === "PENDING" ? "Waiting" : x.request.status === "APPROVED" ? "Approved" : "Not approved" },
              ]} />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {[reviewing].map(({ request: r, organizationName, slug, idProofUrls, decidedBy }) => (
              <li key={r.id} data-testid="admin-profile-change" className="overflow-hidden rounded-2xl border border-stone-200 dark:border-zinc-700">
                {/* Who and what */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 bg-stone-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-800/60">
                  <div className="min-w-0">
                    <p className="text-base font-bold ck-user-text">{organizationName}</p>
                    <p className="mt-1 inline-flex rounded-full bg-[#10233a]/10 px-2.5 py-0.5 text-xs font-bold text-[#10233a] dark:bg-white/10 dark:text-stone-100">
                      Wants to change: {fieldName(r.field)}
                    </p>
                  </div>
                  {slug && <a href={`/ngos/${slug}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-[32px] items-center rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-stone-200">View public page ↗</a>}
                </div>

                {/* Before / after */}
                <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2">
                  <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
                    <dt className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Current</dt>
                    <dd className="ck-user-text break-words"><ShowValue field={r.field} value={r.oldValue} idProofUrls={idProofUrls} /></dd>
                  </div>
                  <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                    <dt className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Requested</dt>
                    <dd className="ck-user-text break-words"><ShowValue field={r.field} value={r.newValue} idProofUrls={idProofUrls} /></dd>
                  </div>
                </dl>
                {r.reason && <p className="mx-5 -mt-1 mb-4 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700 dark:bg-zinc-800 dark:text-stone-200"><span className="font-semibold">NGO&apos;s reason:</span> {r.reason}</p>}
                <div className="px-5"><DecisionLine status={r.status} by={decidedBy} at={r.decidedAt} reason={r.adminReason} /></div>

                {/* Decision */}
                {r.status === "PENDING" && (
                  <div className="mt-2 space-y-3 border-t border-stone-200 bg-stone-50/60 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-800/40">
                    <p className="text-xs text-stone-600 dark:text-stone-300">Approving updates the NGO&apos;s verified profile straight away. To reject, write a reason the NGO will see.</p>
                    <textarea aria-label="Reason" placeholder="Reason (needed to reject)" rows={2} value={reasons[r.id] ?? ""}
                      onChange={(e) => setReasons((p) => ({ ...p, [r.id]: e.target.value }))}
                      className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" disabled={busy === r.id} onClick={() => void decide(r.id, false)}
                        className="min-h-[40px] rounded-lg border border-red-300 bg-white px-4 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:bg-zinc-900">Reject</button>
                      <button type="button" disabled={busy === r.id} onClick={() => void decide(r.id, true)}
                        className="min-h-[40px] rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">Approve</button>
                    </div>
                  </div>
                )}
                {r.status !== "PENDING" && <div className="h-4" />}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
