"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ApiError, adminDocumentsQueue, adminReconcileCaptureTime, adminReconcileDocuments,
  type DocumentsQueueRow, type DocumentsStatus,
} from "@/lib/api";
import { formatINR } from "@/features/fundraising/ui";
import a from "@/features/fundraising/admin.module.css";

const ATTENTION: DocumentsStatus[] = ["GAVE_UP", "UNCERTAIN", "SUPPRESSED", "CAPTURE_TIME_REVIEW"];
const LABEL: Record<string, string> = {
  GAVE_UP: "Couldn't deliver", UNCERTAIN: "Delivery uncertain", SUPPRESSED: "Address suppressed",
  CAPTURE_TIME_REVIEW: "Capture time review",
};
const HELP: Record<string, string> = {
  GAVE_UP: "Every retry failed before the email left. Fix the cause, then queue another attempt.",
  UNCERTAIN: "The send may have reached the donor. Ask them: confirm delivered, or queue another attempt.",
  SUPPRESSED: "The donor's address is on the suppression list. Queuing again is refused by the sender until the address is cleared.",
  CAPTURE_TIME_REVIEW: "No trustworthy capture time. Enter it from a Razorpay record (report or dashboard export) — not the payment's created time.",
};

/**
 * Fundraiser donations whose documents need a person (2026-10-30). Admin bells link here. Every action needs a
 * reason (and, for capture time, an evidence reference) and is audit-logged by the server. Nothing is sent from
 * this page: "Queue another attempt" hands the donation back to the sender, which still honours suppression.
 */
// useSearchParams on a static route needs a Suspense boundary for the build.
export default function DonationDocumentsQueuePage() {
  return <Suspense fallback={null}><DocumentsQueue /></Suspense>;
}

function DocumentsQueue() {
  const initial = useSearchParams().get("status");
  const [filter, setFilter] = useState<DocumentsStatus | "ALL">(
    initial && ATTENTION.includes(initial as DocumentsStatus) ? (initial as DocumentsStatus) : "ALL");
  const [rows, setRows] = useState<DocumentsQueueRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setRows(null); setFailed(false);
    adminDocumentsQueue(filter === "ALL" ? ATTENTION : [filter]).then(setRows).catch(() => setFailed(true));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className={a.root}>
      <main className={a.wrap} style={{ paddingTop: 28, paddingBottom: 56, display: "flex", flexDirection: "column", gap: 18 }}>
        <div><h1 className={a.serif} style={{ fontSize: 28 }}>Donation documents</h1>
          <p className={a.muted}>Fundraiser donations whose certificate or receipt needs a person. Payment is already confirmed for all of these.</p></div>
        <nav className={a.tabs} aria-label="Filter">
          {(["ALL", ...ATTENTION] as const).map((f) => (
            <button key={f} type="button" className={`${a.tab} ${filter === f ? a.tabOn : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "ALL" ? "Needs attention" : LABEL[f]}
            </button>
          ))}
        </nav>
        {failed ? (
          <div className={a.card} role="alert" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            <strong className={a.err}>Couldn&apos;t load the queue</strong><button type="button" className={`${a.btn} ${a.bs}`} onClick={load}>Retry</button>
          </div>
        ) : rows === null ? <p className={a.muted} aria-busy="true">Loading…</p>
          : rows.length === 0 ? <div className={a.card} style={{ padding: 20 }}>Nothing needs attention here.</div>
          : rows.map((r) => <QueueCard key={r.id} r={r} onDone={load} />)}
      </main>
    </div>
  );
}

function QueueCard({ r, onDone }: { r: DocumentsQueueRow; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");

  async function act(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); onDone(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "That didn't work. Try again."); setBusy(false); }
  }
  const needReason = !reason.trim();
  const isCapture = r.documentsStatus === "CAPTURE_TIME_REVIEW";

  return (
    <section className={a.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby={`d${r.id}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 id={`d${r.id}`} style={{ fontSize: 16, fontWeight: 700 }}>Donation #{r.id} · {r.fundraiser ?? "—"}</h2>
        <span className={a.small}><strong>{LABEL[r.documentsStatus] ?? r.documentsStatus}</strong>{r.attempts ? ` · ${r.attempts} attempt(s)` : ""}</span>
      </div>
      <p className={a.small}>{r.donorName ?? "—"} · {r.donorEmail ?? "no email"} · {formatINR(r.amount)} · order {r.razorpayOrderId ?? "—"} · payment {r.razorpayPaymentId ?? "—"}</p>
      <p className={`${a.small} ${a.muted}`}>{HELP[r.documentsStatus]}</p>
      {isCapture && (
        <p className={a.small}>
          Capture time: {r.capturedAtUtc ? `${r.capturedAtUtc} UTC (${r.captureTimeSource})` : "none"} · observed {r.captureObservedAtUtc ?? "—"} UTC
          {r.captureTimeConflict && <><br /><span className={a.err}>Conflict: {r.captureTimeConflict}</span></>}
        </p>
      )}
      <label className={a.small}>Reason (required, recorded in the audit log)
        <input className={a.in} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
      </label>
      {isCapture ? (
        <>
          <label className={a.small}>Capture time from the provider record (your local time)
            <input type="datetime-local" step={1} className={a.in} value={capturedAt} onChange={(e) => setCapturedAt(e.target.value)} />
          </label>
          <label className={a.small}>Evidence reference (Razorpay report / export id)
            <input className={a.in} value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} maxLength={300} />
          </label>
          <div><button type="button" className={`${a.btn} ${a.bp}`} disabled={busy || needReason || !capturedAt || !evidenceRef.trim()}
            onClick={() => void act(() => adminReconcileCaptureTime(r.id, {
              capturedAt: new Date(capturedAt).toISOString(), reason: reason.trim(), evidenceRef: evidenceRef.trim(),
            }))}>Save capture time and queue documents</button></div>
        </>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {r.documentsStatus === "UNCERTAIN" && (
            <button type="button" className={`${a.btn} ${a.bs}`} disabled={busy || needReason}
              onClick={() => void act(() => adminReconcileDocuments(r.id, true, reason.trim()))}>Donor confirmed they received it</button>
          )}
          <button type="button" className={`${a.btn} ${a.bp}`} disabled={busy || needReason}
            onClick={() => void act(() => adminReconcileDocuments(r.id, false, reason.trim()))}>Queue another attempt</button>
        </div>
      )}
      {error && <p role="alert" className={a.err}>{error}</p>}
    </section>
  );
}
