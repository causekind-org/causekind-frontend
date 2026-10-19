"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { fundraisingReports, type AdminFundraisingReport, type ReportCase } from "@/lib/api";
import { CampaignChip, formatDate, formatINR } from "@/features/fundraising/ui";
import a from "@/features/fundraising/admin.module.css";

const REASON: Record<string, string> = {
  UNTRUE: "Information looks untrue or exaggerated",
  PRIVACY: "Privacy or images used without consent",
  DUPLICATE: "Same need raised elsewhere",
  OTHER: "Something else",
};
const STATUS: Record<string, string> = {
  RECEIVED: "Received", UNDER_INVESTIGATION: "Under investigation", RESPONSE_REQUESTED: "Organiser response requested",
  DISMISSED: "Dismissed", ACTION_TAKEN: "Action taken",
};
const OPEN = ["RECEIVED", "UNDER_INVESTIGATION", "RESPONSE_REQUESTED"];
const DEFAULT_NOTICE = "Donations are paused while we review some information.";

type Dialog = "pause" | "restore" | "close" | "questions" | { dismiss: AdminFundraisingReport } | null;

/** F34 — one fundraiser's report case: reports, organiser response, timeline, pause/restore/close. */
export default function AdminReportCasePage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const id = Number(campaignId);
  const [c, setC] = useState<ReportCase | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(() => { fundraisingReports.admin.get(id).then(setC).catch(() => setErr("Couldn't load this case")); }, [id]);
  useEffect(() => { if (FEATURES.fundraising) load(); }, [load]);

  if (!FEATURES.fundraising) return <div className={a.root}><main className={a.wrap} style={{ paddingTop: 40 }}><p className={a.muted}>Fundraising is switched off.</p></main></div>;
  if (!c) return <div className={a.root}><main className={a.wrap} style={{ paddingTop: 40 }}>{err ? <p role="alert" className={a.err}>{err}</p> : <div className={a.skel} style={{ width: "40%" }} />}</main></div>;

  const live = c.campaignStatus === "APPROVED";
  const paused = c.campaignStatus === "PAUSED";
  const openInquiry = c.inquiries.find((i) => i.status === "OPEN");
  const openReports = c.reports.filter((r) => OPEN.includes(r.status)).length;
  const done = (next: ReportCase) => { setC(next); setDialog(null); };

  const timeline = [
    ...c.reports.map((r) => ({ at: r.createdAt, text: `Report ${r.reference} received` })),
    ...c.reports.filter((r) => r.decidedAt).map((r) => ({ at: r.decidedAt!, text: `${r.reference} ${STATUS[r.status].toLowerCase()} · ${r.decidedBy ?? ""}` })),
    ...c.inquiries.map((i) => ({ at: i.createdAt, text: `Organiser response requested · ${i.requestedBy ?? ""}` })),
    ...c.inquiries.filter((i) => i.answeredAt).map((i) => ({ at: i.answeredAt!, text: "Response received · organiser" })),
    ...(c.pausedAt ? [{ at: c.pausedAt, text: `Paused · ${c.pausedBy ?? ""}${c.pauseReason ? ` · "${c.pauseReason}"` : ""}` }] : []),
  ].sort((x, y) => y.at.localeCompare(x.at));

  return (
    <div className={a.root}>
      <main className={a.wrap} style={{ paddingTop: 24, paddingBottom: 56, display: "flex", flexDirection: "column", gap: 18 }}>
        <Link href="/admin/fundraising/reports" className={a.small} style={{ textDecoration: "none" }}>← Reports</Link>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h1 className={a.serif} style={{ fontSize: 26 }}>{c.title}</h1><CampaignChip status={c.campaignStatus} />
            </div>
            <p className={`${a.small} ${a.muted}`}>{c.reports.length} report{c.reports.length === 1 ? "" : "s"} · organiser {c.organiser} · {formatINR(c.confirmed)} confirmed · <Link href={`/fundraisers/${c.campaignId}`}>Public page</Link></p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(live || paused) && !openInquiry && <button type="button" className={`${a.btn} ${a.bs}`} onClick={() => setDialog("questions")}>Request organiser response</button>}
            {live && <button type="button" className={`${a.btn} ${a.bs}`} onClick={() => setDialog("pause")}>Pause donations</button>}
            {paused && <button type="button" className={`${a.btn} ${a.bp}`} onClick={() => setDialog("restore")}>Restore to Live</button>}
            {(live || paused) && <button type="button" className={`${a.btn} ${a.bs}`} style={{ color: "#8f1d1d" }} onClick={() => setDialog("close")}>Close collections</button>}
          </div>
        </div>
        {err && <p role="alert" className={a.err}>{err}</p>}
        {paused && (
          <div className={a.card} style={{ padding: "14px 18px", background: "#fdf3e1", borderColor: "#f0d9a8", display: "flex", flexDirection: "column", gap: 4 }}>
            <p className={a.small}><strong>Public notice:</strong> &quot;{c.pauseNotice}&quot;</p>
            {c.pauseActions && <p className={a.small}><strong>Asked of organiser:</strong> {c.pauseActions}</p>}
            <p className={a.small}><strong>Internal reason:</strong> {c.pauseReason}</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 18, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {c.reports.map((r) => (
              <section key={r.id} className={`${a.card} ${a.pane}`} aria-labelledby={`r${r.id}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <h2 id={`r${r.id}`} style={{ fontSize: 15, fontWeight: 700 }}>Report {r.reference} · {formatDate(r.createdAt)}</h2>
                  <span className={a.small} style={{ fontWeight: 700, color: OPEN.includes(r.status) ? "#1e3a60" : "#5c4f45" }}>{STATUS[r.status]}</span>
                </div>
                <p className={a.small}><strong>{REASON[r.reason]}.</strong> &quot;{r.details}&quot;</p>
                <p className={`${a.small} ${a.muted}`}>Reporter (admins only): {r.reporterName} · {r.reporterEmail}</p>
                {r.hasEvidence && <button type="button" className={`${a.btn} ${a.bs}`} style={{ alignSelf: "flex-start" }}
                  onClick={() => fundraisingReports.admin.reportEvidence(r.id).then((x) => window.open(x.url, "_blank", "noopener")).catch(() => setErr("Couldn't open the attachment"))}>
                  View attachment{r.evidenceFileName ? ` (${r.evidenceFileName})` : ""}</button>}
                {r.adminNote && <p className={a.small}><span className={a.muted}>Note:</span> {r.adminNote}</p>}
                {OPEN.includes(r.status) && <button type="button" className={`${a.btn} ${a.bs}`} style={{ alignSelf: "flex-start" }} onClick={() => setDialog({ dismiss: r })}>Dismiss with reason</button>}
              </section>
            ))}

            {c.inquiries.map((i) => (
              <section key={i.id} className={`${a.card} ${a.pane}`} style={{ background: "#fcfbf9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700 }}>Organiser questions · {formatDate(i.createdAt)}</h2>
                  <span className={a.small} style={{ fontWeight: 700 }}>{i.status === "OPEN" ? "Waiting for response" : i.status === "ANSWERED" ? `Response received ${formatDate(i.answeredAt)}` : "Withdrawn"}</span>
                </div>
                {i.deadline && <p className={`${a.small} ${a.muted}`}>Deadline {formatDate(i.deadline)} (no automatic action)</p>}
                {i.questions.map((q) => (
                  <div key={q.id} style={{ borderTop: "1px solid #efe9e2", paddingTop: 10 }}>
                    <p className={a.small}><strong>Q{q.position}.</strong> {q.question}</p>
                    <p className={a.small} style={{ whiteSpace: "pre-wrap" }}>{q.answer ? q.answer : <span className={a.muted}>No answer yet</span>}</p>
                    {q.hasEvidence && <button type="button" className={a.small} style={{ background: "none", border: 0, padding: 0, color: "#9a3f11", cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => fundraisingReports.admin.answerEvidence(c.campaignId, q.id).then((x) => window.open(x.url, "_blank", "noopener")).catch(() => setErr("Couldn't open the attachment"))}>
                      {q.evidenceFileName || "Attachment"}</button>}
                  </div>
                ))}
              </section>
            ))}
          </div>

          <section className={`${a.card} ${a.pane}`} aria-labelledby="tl">
            <h2 id="tl" className={a.h}>Timeline</h2>
            {timeline.map((t, i) => <p key={i} className={a.small}>{t.text}<br /><span className={a.muted}>{formatDate(t.at)}</span></p>)}
            <p className={`${a.small} ${a.muted}`}>{openReports} open report{openReports === 1 ? "" : "s"}. Existing donations are never changed by a pause or closure.</p>
          </section>
        </div>
      </main>

      {dialog && <CaseDialog c={c} dialog={dialog} onClose={() => setDialog(null)} onDone={done} />}
    </div>
  );
}

function CaseDialog({ c, dialog, onClose, onDone }: { c: ReportCase; dialog: NonNullable<Dialog>; onClose: () => void; onDone: (c: ReportCase) => void }) {
  const [notice, setNotice] = useState(DEFAULT_NOTICE);
  const [actions, setActions] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const kind = typeof dialog === "string" ? dialog : "dismiss";
  const run = async (fn: () => Promise<ReportCase>) => {
    setBusy(true); setErr(null);
    try { onDone(await fn()); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); setBusy(false); }
  };
  const submit = () => {
    const m = fundraisingReports.admin;
    if (kind === "pause") return run(() => m.pause(c.campaignId, { expectedVersion: c.campaignVersion, publicNotice: notice, organiserActions: actions, internalReason: reason }));
    if (kind === "restore") return run(() => m.restore(c.campaignId, { expectedVersion: c.campaignVersion, internalReason: reason, message }));
    if (kind === "close") return run(() => m.closeCollections(c.campaignId, { expectedVersion: c.campaignVersion, internalReason: reason, message }));
    if (kind === "questions") return run(() => m.requestResponse(c.campaignId, questions.filter((q) => q.trim()), deadline || null));
    return run(() => m.dismiss((dialog as { dismiss: AdminFundraisingReport }).dismiss.id, null, reason));
  };
  const title = { pause: "Pause donations", restore: "Restore to Live", close: "Close collections", questions: "Request organiser response", dismiss: "Dismiss report" }[kind];
  const ok = kind === "questions" ? questions.some((q) => q.trim()) : reason.trim().length > 0;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(31,20,12,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="dlg" className={`${a.card} ${a.pane}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: "100%", gap: 12, padding: 24 }}>
        <h2 id="dlg" className={a.serif} style={{ fontSize: 22 }}>{title}</h2>
        {kind === "pause" && <>
          <label className={a.lbl} htmlFor="pn">Public explanation</label>
          <textarea id="pn" className={a.in} rows={2} maxLength={500} value={notice} onChange={(e) => setNotice(e.target.value)} />
          <p className={`${a.small} ${a.muted}`}>Shown on the public page. Keep it neutral — never say &quot;fraud&quot;.</p>
          <label className={a.lbl} htmlFor="pa">What the organiser must do (private)</label>
          <textarea id="pa" className={a.in} rows={2} maxLength={2000} value={actions} onChange={(e) => setActions(e.target.value)} />
        </>}
        {kind === "questions" && <>
          {questions.map((q, i) => (
            <div key={i}>
              <label className={a.lbl} htmlFor={`qq${i}`}>Question {i + 1}</label>
              <textarea id={`qq${i}`} className={a.in} rows={2} maxLength={2000} value={q} onChange={(e) => setQuestions((qs) => qs.map((x, j) => j === i ? e.target.value : x))} />
            </div>
          ))}
          {questions.length < 10 && <button type="button" className={`${a.btn} ${a.bs}`} style={{ alignSelf: "flex-start" }} onClick={() => setQuestions((qs) => [...qs, ""])}>Add question</button>}
          <label className={a.lbl} htmlFor="dl">Response deadline (optional)</label>
          <input id="dl" type="date" className={a.in} value={deadline} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} onChange={(e) => setDeadline(e.target.value)} />
          <p className={`${a.small} ${a.muted}`}>Nothing happens automatically when it passes. The organiser is never told who reported.</p>
        </>}
        {kind !== "questions" && <>
          <label className={a.lbl} htmlFor="ir">{kind === "dismiss" ? "Reason for dismissing (internal, required)" : "Reason (internal, required)"}</label>
          <textarea id="ir" className={a.in} rows={2} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </>}
        {(kind === "restore" || kind === "close") && <>
          <label className={a.lbl} htmlFor="mo">Message to organiser</label>
          <textarea id="mo" className={a.in} rows={2} maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} />
        </>}
        <p className={`${a.small} ${a.muted}`}>
          {kind === "pause" && "Donate is disabled; the page stays reachable by link and leaves the public list. Existing donations are kept."}
          {kind === "restore" && "Open reports become Action taken; reporters see Closed. The pause notice is removed."}
          {kind === "close" && "Donations stop for good. The public page stays visible. Open reports become Action taken. No refunds."}
          {kind === "dismiss" && "The reporter sees Closed. The outcome is never shared with them."}
        </p>
        {err && <p className={a.err} role="alert">{err}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className={`${a.btn} ${a.bs}`} onClick={onClose}>Cancel</button>
          <button type="button" className={`${a.btn} ${kind === "close" || kind === "dismiss" ? a.bx : a.bp}`} disabled={busy || !ok} onClick={submit}>{title}</button>
        </div>
      </section>
    </div>
  );
}
