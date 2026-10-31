"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSearchBox, NoSearchResults } from "@/components/admin/AdminSearchBox";
import {
  adminApproveNgoProfileChange, adminGetNgoProfileChanges, adminRejectNgoProfileChange, type AdminNgoProfileChange,
} from "@/lib/api";
import { documentLabel } from "@/features/ngo-registration/ngoRegistrationModel";

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
    return url ? <a href={url} target="_blank" rel="noopener noreferrer" data-testid="admin-doc-file" className="font-semibold text-emerald-700 underline">Open file</a> : <>File #{value}</>;
  }
  if (field !== "representatives") return <>{value}</>;
  let reps: Rep[];
  try { reps = JSON.parse(value) as Rep[]; } catch { return <>{value}</>; }
  return (
    <ul className="space-y-1.5">
      {reps.map((r, i) => (
        <li key={i} data-testid="admin-rep">
          <span className="font-semibold">{r.fullName}</span>{r.designation ? ` (${r.designation})` : ""}
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

/** Admin: NGO requests to change a verified profile field (old vs new). Approving applies it; rejecting needs a reason. */
export function NgoProfileChangesPanel({ onChange }: { onChange?: () => void } = {}) {
  const [items, setItems] = useState<AdminNgoProfileChange[] | null>(null);
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [query, setQuery] = useState("");
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    adminGetNgoProfileChanges(status, query).then(setItems).catch(() => { setItems([]); setError("We couldn't load profile changes."); });
  }, [status, query]);
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

  return (
    <section aria-label="NGO profile changes" className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-bold">Profile changes</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${status === s ? "border-emerald-700 bg-emerald-700 text-white" : "border-stone-300"}`}>
            {s === "PENDING" ? "Waiting" : s === "APPROVED" ? "Approved" : "Not approved"}
          </button>
        ))}
      </div>
      <div className="mt-3"><AdminSearchBox value={query} onChange={setQuery} label="Search profile changes" placeholder="Search NGO name or value" /></div>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      {items == null ? <p className="mt-4 text-sm text-stone-500">Loading…</p>
        : items.length === 0 ? (query ? <NoSearchResults query={query} onClear={() => setQuery("")} /> : <p className="mt-4 text-sm text-stone-500">Nothing here.</p>)
        : (
          <ul className="mt-4 space-y-3">
            {items.map(({ request: r, organizationName, slug, idProofUrls }) => (
              <li key={r.id} data-testid="admin-profile-change" className="rounded-lg border border-stone-200 p-4 dark:border-zinc-700">
                <p className="text-sm font-bold">{organizationName}{slug && <a href={`/ngos/${slug}`} className="ml-2 text-xs font-semibold text-emerald-700 underline">public page</a>}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-stone-500">{FIELD_LABELS[r.field] ?? (r.field.startsWith("documents.") ? `Document: ${documentLabel(r.field.slice(10))}` : r.field)}</p>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-stone-500">Current</dt><dd><ShowValue field={r.field} value={r.oldValue} idProofUrls={idProofUrls} /></dd></div>
                  <div><dt className="text-xs text-stone-500">Requested</dt><dd><ShowValue field={r.field} value={r.newValue} idProofUrls={idProofUrls} /></dd></div>
                </dl>
                {r.reason && <p className="mt-2 text-xs text-stone-600">NGO&apos;s reason: {r.reason}</p>}
                {r.status === "REJECTED" && r.adminReason && <p className="mt-2 text-xs text-red-600">Not approved: {r.adminReason}</p>}
                {r.status === "PENDING" && (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <button type="button" disabled={busy === r.id} onClick={() => void decide(r.id, true)}
                      className="min-h-[36px] rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white disabled:opacity-50">Approve</button>
                    <input aria-label="Reason" placeholder="Reason (needed to reject)" value={reasons[r.id] ?? ""}
                      onChange={(e) => setReasons((p) => ({ ...p, [r.id]: e.target.value }))}
                      className="min-h-[36px] flex-1 rounded-lg border border-stone-300 px-2 text-xs dark:border-zinc-700 dark:bg-zinc-900" />
                    <button type="button" disabled={busy === r.id} onClick={() => void decide(r.id, false)}
                      className="min-h-[36px] rounded-lg border border-red-300 px-3 text-xs font-bold text-red-700 disabled:opacity-50">Reject</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
