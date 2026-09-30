"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  adminGetNgoApplications, adminGetNgoApplication, adminDecideNgoApplication, adminGetNgoEvidenceLink,
  type NgoReviewApplication, type NgoReviewDetail, type NgoReviewFile,
} from "@/lib/api";

const field = "w-full rounded-lg border border-stone-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const button = "rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-zinc-700";
const label = (value: string) => value.replaceAll("_", " ").toLowerCase();
const message = (error: unknown) => error instanceof Error ? error.message : "Could not load NGO applications. Please retry.";

export default function NgoReviewPage() {
  return <Suspense fallback={<p role="status">Loading NGO application…</p>}><NgoReviewContent /></Suspense>;
}

function NgoReviewContent() {
  const params = useSearchParams();
  const applicationId = params.get("application");
  const [status, setStatus] = useState("UNDER_REVIEW");
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [applications, setApplications] = useState<NgoReviewApplication[]>([]);
  const [detail, setDetail] = useState<NgoReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "NEEDS_INFORMATION">("NEEDS_INFORMATION");
  const [links, setLinks] = useState<Record<string, string>>({});
  const selection = useRef(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminGetNgoApplications(status, page);
      setApplications(result.content);
      setPages(result.totalPages);
    } catch (e) { setApplications([]); setError(message(e)); }
    finally { setLoading(false); }
  }, [status, page]);

  useEffect(() => { void refresh(); }, [refresh]);

  const open = useCallback(async (id: string) => {
    const request = ++selection.current;
    setOpening(true); setDetail(null); setLinks({}); setReason(""); setError(""); setNotice("");
    setDecision("NEEDS_INFORMATION");
    try {
      const result = await adminGetNgoApplication(id);
      if (request === selection.current) setDetail(result);
    } catch (e) { if (request === selection.current) setError(message(e)); }
    finally { if (request === selection.current) setOpening(false); }
  }, []);

  useEffect(() => { if (applicationId) void open(applicationId); }, [applicationId, open]);

  async function evidence(file: NgoReviewFile) {
    if (!detail) return;
    const request = selection.current;
    try {
      const result = await adminGetNgoEvidenceLink(detail.application.applicationId, file);
      if (request === selection.current) setLinks(prev => ({ ...prev, [`${file.kind}-${file.id}`]: result.url }));
    } catch (e) { setError(message(e)); }
  }

  async function saveDecision(event: React.FormEvent) {
    event.preventDefault();
    if (!detail || busy) return;
    setBusy(true); setError(""); setNotice("");
    const id = detail.application.applicationId;
    try {
      await adminDecideNgoApplication(id, decision, reason);
      setDetail(await adminGetNgoApplication(id));
      await refresh();
      setNotice("Decision saved. The applicant can see the updated status and your explanation.");
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 dark:bg-zinc-950 dark:text-stone-100 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/admin/dashboard" className="text-sm underline">Back to admin dashboard</Link>
        <header>
          <h1 className="text-3xl font-bold">NGO applications</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Review the organization and its evidence before recording a decision. AI notes are advisory.</p>
        </header>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-52 text-sm">Application status
            <select className={field} value={status} disabled={busy || loading} onChange={e => { setStatus(e.target.value); setPage(0); }}>
              <option value="UNDER_REVIEW">Awaiting review</option><option value="NEEDS_INFORMATION">Corrections requested</option>
              <option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
              <option value="PENDING_VERIFICATION">Email verification pending</option><option value="">All current applications</option>
            </select>
          </label>
          <button className={button} disabled={loading || busy} onClick={() => void refresh()}>Refresh</button>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <section aria-label="Current applications" className="space-y-3">
            {loading ? <p role="status">Loading applications…</p> : !error && applications.length === 0 ? <p>No applications in this status.</p> : null}
            {applications.map(app => <button key={app.applicationId} disabled={busy} onClick={() => void open(app.applicationId)}
              className="w-full rounded-xl border border-stone-200 bg-white p-4 text-left disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900">
              <span className="block font-semibold">{app.organizationName}</span>
              <span className="mt-1 block break-all text-xs text-stone-500">{app.applicationId}</span>
              <span className="mt-2 block text-sm capitalize">{label(app.status)}</span>
            </button>)}
            <div className="flex items-center gap-3">
              <button className={button} disabled={page === 0 || loading || busy} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span className="text-xs">{pages ? `${page + 1} / ${pages}` : "0 pages"}</span>
              <button className={button} disabled={page + 1 >= pages || loading || busy} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </section>
          <section aria-label="Application details" className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 sm:p-7">
            {opening ? <p role="status">Loading application…</p> : !detail ? <p>Select an application to review its details.</p> : <>
              <h2 className="text-2xl font-bold">{detail.application.organizationName}</h2>
              <p className="mt-1 text-sm capitalize">{label(detail.application.status)}{!detail.current && " · Historical submission"}</p>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                {Object.entries({
                  "Legal structure": detail.application.legalStructure, "Registration number": detail.application.registrationNumber,
                  "Registered address": detail.application.registeredOfficeAddress, "Established": detail.application.yearOfEstablishment,
                  "Representative": detail.application.representativeName, "Designation": detail.application.designation,
                  "Phone": detail.application.mobileNumber, "Contact email": detail.application.officialEmail,
                  "Account email verified": detail.application.verifiedAt ? new Date(detail.application.verifiedAt).toLocaleString() : "Pending",
                }).map(([name, value]) => <div key={name}><dt className="text-stone-500">{name}</dt><dd className="mt-1 break-words">{value || "Not provided"}</dd></div>)}
              </dl>
              <h3 className="mt-7 font-bold">Evidence</h3>
              <p className="mt-1 text-xs text-stone-500">Secure file links expire after five minutes. Generate another link if needed.</p>
              {detail.files.length === 0 && <p className="mt-3 text-sm">No uploaded evidence found.</p>}
              <ul className="mt-3 space-y-3">{detail.files.map(file => {
                const key = `${file.kind}-${file.id}`;
                return <li key={key} className="rounded-lg border border-stone-200 p-3 text-sm dark:border-zinc-700">
                  <p className="break-words font-semibold">{file.name || label(file.type)}</p>
                  <p className="text-xs capitalize">{label(file.type)}{file.moderationVerdict ? ` · ${file.moderationVerdict}` : ""}</p>
                  {!file.ownershipRecorded && <p className="mt-1 text-amber-700">Historical ownership is unverified. Request a fresh upload before approval.</p>}
                  <div className="mt-2 flex flex-wrap gap-4">
                    <button type="button" className="underline" onClick={() => void evidence(file)}>Generate secure link</button>
                    {links[key] && <a href={links[key]} target="_blank" rel="noopener noreferrer" className="underline">Open file</a>}
                  </div>
                </li>;
              })}</ul>
              <div className="mt-6 rounded-lg bg-stone-50 p-4 text-sm dark:bg-zinc-800">
                <h3 className="font-bold">AI screening · advisory</h3>
                <p>{detail.application.aiScreeningVerdict || "No screening result yet"}</p>
                <p className="mt-2 whitespace-pre-wrap">{detail.application.aiScreeningNotes || "Review the submitted evidence directly."}</p>
              </div>
              {detail.current && detail.application.status === "UNDER_REVIEW" && <form onSubmit={saveDecision} className="mt-6 space-y-4 border-t border-stone-200 pt-6 dark:border-zinc-700">
                <h3 className="font-bold">Record your decision</h3>
                <label className="block text-sm">Decision<select className={field} value={decision} disabled={busy} onChange={e => setDecision(e.target.value as typeof decision)}>
                  <option value="NEEDS_INFORMATION">Request corrections</option><option value="APPROVED">Approve organization</option><option value="REJECTED">Reject application</option>
                </select></label>
                <label className="block text-sm">Explanation for the applicant{decision !== "APPROVED" && " (required)"}
                  <textarea className={field} rows={4} maxLength={2000} required={decision !== "APPROVED"} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain what you reviewed and what the organization needs to do next." />
                </label>
                <p className="text-xs text-stone-500">Submitting records this decision and updates the applicant’s status.</p>
                <button className={`${button} bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900`} disabled={busy}>{busy ? "Saving decision…" : "Save decision"}</button>
              </form>}
              {detail.decisions.length > 0 && <div className="mt-6"><h3 className="font-bold">Decision history</h3><ul className="mt-2 space-y-3 text-sm">
                {detail.decisions.map(entry => <li key={entry.id}><p>{label(entry.fromStatus)} → {label(entry.toStatus)} · {entry.changedByEmail}</p><p className="whitespace-pre-wrap">{entry.note}</p><p className="text-xs text-stone-500">{new Date(entry.changedAt).toLocaleString()}</p></li>)}
              </ul></div>}
              {detail.submissions.length > 1 && <div className="mt-6"><h3 className="font-bold">Submission history</h3><ul className="mt-2 space-y-2 text-sm">
                {detail.submissions.map(app => <li key={app.applicationId}><button className="break-all text-left underline" disabled={busy} onClick={() => void open(app.applicationId)}>{app.applicationId} · {label(app.status)}</button></li>)}
              </ul></div>}
            </>}
          </section>
        </div>
      </div>
    </main>
  );
}
