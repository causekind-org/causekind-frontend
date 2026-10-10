"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminGetNgoApplications, adminGetNgoApplication, adminDecideNgoApplication, adminGetNgoEvidenceLink, ApiError,
  type NgoReviewApplication, type NgoReviewDetail, type NgoReviewFile,
} from "@/lib/api";
import { correctionFieldLabel } from "@/features/ngo-registration/ngoRegistrationModel";

const field = "w-full rounded-lg border border-stone-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const button = "rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-zinc-700";
const label = (value: string) => value.replaceAll("_", " ").toLowerCase();
const message = (error: unknown) => error instanceof Error ? error.message : "Could not load NGO applications. Please retry.";

/** Per-item reasons the server gave (e.g. each missing required document), if any. */
const fieldMessages = (error: unknown): string[] => {
  const body = error instanceof ApiError ? (error.data as { fieldErrors?: { message?: string }[] } | undefined) : undefined;
  return (body?.fieldErrors ?? []).map(f => f?.message ?? "").filter(Boolean);
};

/** The wizard's text fields, in wizard order, that a reviewer can flag for correction. */
const TEXT_FIELDS = [
  "organizationName", "legalStructure", "registrationNumber", "registeredOfficeAddress", "yearOfEstablishment",
  "representativeName", "designation", "mobileNumber", "officialEmail",
] as const;

/**
 * Evidence links are presigned for five minutes (private storage). Refresh a little before
 * that so previews and "Open PDF" keep working while the reviewer reads.
 */
const LINK_REFRESH_MS = 4 * 60 * 1000;

const fileKey = (file: NgoReviewFile) => `${file.kind}-${file.id}`;
const isImage = (file: NgoReviewFile) =>
  file.mimeType ? file.mimeType.startsWith("image/") : file.kind === "photo";

/**
 * The NGO application review: list by status, everything the NGO submitted,
 * its evidence previewed through short-lived links, AI notes (advisory), and the decision.
 * Approving creates the NGO profile server-side, which unlocks requests and drives.
 *
 * The admin dashboard's "NGO Applications" tab (/admin/ngos redirects there), so there
 * is one review path to maintain.
 */
export function NgoReviewPanel({
  initialApplicationId = null,
  onDecision,
}: {
  /** Opens this application on mount (deep link `?application=`). */
  initialApplicationId?: string | null;
  /** Called after a decision is saved — lets the dashboard refresh its badge. */
  onDecision?: () => void;
}) {
  const [status, setStatus] = useState("UNDER_REVIEW");
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(0);
  const [applications, setApplications] = useState<NgoReviewApplication[]>([]);
  const [detail, setDetail] = useState<NgoReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorItems, setErrorItems] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "NEEDS_INFORMATION">("NEEDS_INFORMATION");
  /** Items flagged for correction → the reviewer's note for each. */
  const [flagged, setFlagged] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, { url: string; at: number }>>({});
  const [linkErrors, setLinkErrors] = useState<Record<string, boolean>>({});
  const [enlarged, setEnlarged] = useState<{ url: string; name: string } | null>(null);
  const selection = useRef(0);
  const retried = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(""); setErrorItems([]);
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
    setOpening(true); setDetail(null); setLinks({}); setLinkErrors({}); setEnlarged(null); retried.current = new Set();
    setReason(""); setFlagged({}); setError(""); setErrorItems([]); setNotice("");
    setDecision("NEEDS_INFORMATION");
    try {
      const result = await adminGetNgoApplication(id);
      if (request === selection.current) setDetail(result);
    } catch (e) { if (request === selection.current) setError(message(e)); }
    finally { if (request === selection.current) setOpening(false); }
  }, []);

  useEffect(() => { if (initialApplicationId) void open(initialApplicationId); }, [initialApplicationId, open]);

  /** Fetches a fresh signed link for each file through the same access-checked endpoint. */
  const fetchLinks = useCallback(async (applicationId: string, files: NgoReviewFile[]) => {
    const request = selection.current;
    await Promise.all(files.map(async (file) => {
      const key = fileKey(file);
      try {
        const result = await adminGetNgoEvidenceLink(applicationId, file);
        if (request !== selection.current) return;
        setLinks(prev => ({ ...prev, [key]: { url: result.url, at: Date.now() } }));
        setLinkErrors(prev => ({ ...prev, [key]: false }));
      } catch {
        if (request === selection.current) setLinkErrors(prev => ({ ...prev, [key]: true }));
      }
    }));
  }, []);

  // Previews load as soon as an application opens, and links renew before they expire.
  useEffect(() => {
    if (!detail || detail.files.length === 0) return;
    const id = detail.application.applicationId;
    void fetchLinks(id, detail.files);
    const timer = setInterval(() => void fetchLinks(id, detail.files), LINK_REFRESH_MS);
    return () => clearInterval(timer);
  }, [detail, fetchLinks]);

  /** An image that failed to load most likely has an expired link: renew it once. */
  function previewFailed(file: NgoReviewFile) {
    const key = fileKey(file);
    if (!detail || retried.current.has(key)) { setLinkErrors(prev => ({ ...prev, [key]: true })); return; }
    retried.current.add(key);
    void fetchLinks(detail.application.applicationId, [file]);
  }

  /** "Open PDF": renews the link first if it is close to expiring. */
  function openFile(event: React.MouseEvent<HTMLAnchorElement>, file: NgoReviewFile) {
    const link = links[fileKey(file)];
    if (!detail || !link || Date.now() - link.at < LINK_REFRESH_MS) return;
    event.preventDefault();
    // Opened now (inside the click) so it is not blocked; it gets the fresh link below.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    void adminGetNgoEvidenceLink(detail.application.applicationId, file).then(result => {
      setLinks(prev => ({ ...prev, [fileKey(file)]: { url: result.url, at: Date.now() } }));
      if (tab) tab.location.href = result.url; else window.open(result.url, "_blank", "noopener");
    }).catch(e => { tab?.close(); setError(message(e)); });
  }

  const flaggedItems = Object.entries(flagged).map(([fieldKey, note]) => ({ field: fieldKey, note: note.trim() }));
  const correctionsReady = flaggedItems.length > 0 && flaggedItems.every(item => item.note.length > 0);

  function toggleFlag(fieldKey: string, on: boolean) {
    setFlagged(prev => {
      const next = { ...prev };
      if (on) next[fieldKey] = prev[fieldKey] ?? ""; else delete next[fieldKey];
      return next;
    });
  }

  async function saveDecision(event: React.FormEvent) {
    event.preventDefault();
    if (!detail || busy) return;
    if (decision === "NEEDS_INFORMATION" && !correctionsReady) {
      setError(flaggedItems.length === 0
        ? "Pick at least one item that needs changes."
        : "Write what is wrong for each item you picked.");
      return;
    }
    setBusy(true); setError(""); setErrorItems([]); setNotice("");
    const id = detail.application.applicationId;
    try {
      await adminDecideNgoApplication(id, decision, reason, decision === "NEEDS_INFORMATION" ? flaggedItems : undefined);
      setDetail(await adminGetNgoApplication(id));
      await refresh();
      onDecision?.();
      setNotice(decision === "APPROVED"
        ? "Approved. The NGO can now post requests and start drives, and has been notified."
        : decision === "NEEDS_INFORMATION"
          ? "Corrections requested. The NGO will see everything else filled in and only these items to fix."
          : "Decision saved. The applicant can see the updated status and your explanation.");
    } catch (e) {
      const items = fieldMessages(e);
      setErrorItems(items);
      setError(items.length ? "This application can't be approved yet:" : message(e));
    }
    finally { setBusy(false); }
  }

  const checklist = detail ? [
    ...TEXT_FIELDS.map(key => ({ key, name: correctionFieldLabel(key), value: String(detail.application[key] ?? "") })),
    ...detail.files.filter(f => f.field).map(f => ({ key: f.field!, name: correctionFieldLabel(f.field!), value: f.name || label(f.type) })),
  ] : [];

  return (
    <div className="space-y-6 text-stone-900 dark:text-stone-100">
      <p className="text-sm text-stone-600 dark:text-stone-400">Review the organization and its evidence before recording a decision. AI notes are advisory.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-52 text-sm">Application status
          <select className={field} value={status} disabled={busy || loading} onChange={e => { setStatus(e.target.value); setPage(0); }}>
            <option value="UNDER_REVIEW">Awaiting review</option><option value="PENDING_VERIFICATION">Pending verification</option><option value="NEEDS_INFORMATION">Corrections requested</option>
            <option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
            <option value="PENDING_VERIFICATION">Email verification pending</option><option value="">All current applications</option>
          </select>
        </label>
        <button className={button} disabled={loading || busy} onClick={() => void refresh()}>Refresh</button>
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          {errorItems.length > 0 && (
            <ul className="mt-2 list-disc pl-5 space-y-0.5">
              {errorItems.map(item => <li key={item}>{item}</li>)}
            </ul>
          )}
        </div>
      )}
      {notice && <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section aria-label="Current applications" className="space-y-3">
          {loading ? <p role="status">Loading applications…</p> : !error && applications.length === 0 ? <p className="text-sm text-stone-500">No applications in this status.</p> : null}
          {applications.map(app => <button key={app.applicationId} disabled={busy} onClick={() => void open(app.applicationId)}
            className={`w-full rounded-xl border bg-white p-4 text-left disabled:opacity-50 dark:bg-zinc-900 ${detail?.application.applicationId === app.applicationId ? "border-ngo-700 ring-1 ring-ngo-700" : "border-stone-200 dark:border-zinc-700"}`}>
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
          {opening ? <p role="status">Loading application…</p> : !detail ? <p className="text-sm text-stone-500">Select an application to review its details.</p> : <>
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
            {detail.corrections && detail.corrections.items.length > 0 && (
              <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
                <h3 className="font-bold">Corrections requested</h3>
                {detail.corrections.summary && <p className="mt-1 whitespace-pre-wrap">{detail.corrections.summary}</p>}
                <ul className="mt-2 list-disc space-y-0.5 pl-5">
                  {detail.corrections.items.map(item => <li key={item.field}><span className="font-semibold">{correctionFieldLabel(item.field)}</span>: {item.note}</li>)}
                </ul>
              </div>
            )}
            <h3 className="mt-7 font-bold">Evidence</h3>
            <p className="mt-1 text-xs text-stone-500">Files are private. Previews use secure links that expire after five minutes and renew automatically.</p>
            {detail.files.length === 0 && <p className="mt-3 text-sm">No uploaded evidence found.</p>}
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">{detail.files.map(file => {
              const key = fileKey(file);
              const link = links[key];
              const name = file.name || label(file.type);
              return <li key={key} data-testid="evidence-item" className="rounded-lg border border-stone-200 p-3 text-sm dark:border-zinc-700">
                {isImage(file) ? (
                  link && !linkErrors[key] ? (
                    <button type="button" className="block w-full overflow-hidden rounded-md bg-stone-100 dark:bg-zinc-800"
                      onClick={() => setEnlarged({ url: link.url, name })} aria-label={`Enlarge ${name}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL, not optimisable */}
                      <img src={link.url} alt={name} className="h-40 w-full object-contain" onError={() => previewFailed(file)} />
                    </button>
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-md bg-stone-100 text-xs text-stone-500 dark:bg-zinc-800">
                      {linkErrors[key] ? "Preview unavailable" : "Loading preview…"}
                    </div>
                  )
                ) : null}
                <p className={`${isImage(file) ? "mt-2 " : ""}break-words font-semibold`}>{name}</p>
                <p className="text-xs capitalize">{label(file.type)}{file.moderationVerdict ? ` · ${file.moderationVerdict}` : ""}</p>
                {!file.ownershipRecorded && <p className="mt-1 text-amber-700">Historical ownership is unverified. Request a fresh upload before approval.</p>}
                <div className="mt-2 flex flex-wrap gap-4">
                  {link ? (
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline" onClick={e => openFile(e, file)}>
                      {isImage(file) ? "Open full size" : "Open PDF"}
                    </a>
                  ) : linkErrors[key] ? (
                    <button type="button" className="underline" onClick={() => void fetchLinks(detail.application.applicationId, [file])}>Retry loading file</button>
                  ) : (
                    <span className="text-xs text-stone-500">Preparing secure link…</span>
                  )}
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
              {decision === "NEEDS_INFORMATION" && (
                <fieldset className="space-y-2" aria-label="Items that need changes">
                  <legend className="text-sm font-semibold">What needs changes? <span className="font-normal text-stone-500">Pick each item and say what is wrong.</span></legend>
                  <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 dark:divide-zinc-700 dark:border-zinc-700">
                    {checklist.map(item => {
                      const on = item.key in flagged;
                      return <li key={item.key} className="p-3">
                        <label className="flex items-start gap-3 text-sm">
                          <input type="checkbox" className="mt-0.5 h-4 w-4" checked={on} disabled={busy}
                            onChange={e => toggleFlag(item.key, e.target.checked)} />
                          <span className="min-w-0">
                            <span className="block font-semibold">{item.name}</span>
                            <span className="block break-words text-xs text-stone-500">{item.value || "Not provided"}</span>
                          </span>
                        </label>
                        {on && (
                          <textarea className={`${field} mt-2`} rows={2} maxLength={500} disabled={busy} required
                            aria-label={`What is wrong with ${item.name}`} value={flagged[item.key]}
                            onChange={e => setFlagged(prev => ({ ...prev, [item.key]: e.target.value }))} />
                        )}
                      </li>;
                    })}
                  </ul>
                </fieldset>
              )}
              <label className="block text-sm">{decision === "NEEDS_INFORMATION" ? "Message to the applicant (optional)" : "Explanation for the applicant"}{decision === "REJECTED" && " (required)"}
                <textarea className={field} rows={decision === "NEEDS_INFORMATION" ? 2 : 4} maxLength={2000} required={decision === "REJECTED"} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} />
              </label>
              <p className="text-xs text-stone-500">Approving lets this NGO post requests and start drives. Every decision updates the applicant’s status.</p>
              <button className={`${button} bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900`}
                disabled={busy || (decision === "NEEDS_INFORMATION" && !correctionsReady)}>{busy ? "Saving decision…" : "Save decision"}</button>
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
      {enlarged && (
        <div role="dialog" aria-modal="true" aria-label={enlarged.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setEnlarged(null)}>
          <div className="relative max-h-full max-w-5xl" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
            <img src={enlarged.url} alt={enlarged.name} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
            <button type="button" className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-stone-900"
              onClick={() => setEnlarged(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
