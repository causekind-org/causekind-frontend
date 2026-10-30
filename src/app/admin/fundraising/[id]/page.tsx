"use client";

import { useCallback, useEffect, useState } from "react";

import { FrLink as Link, useFrParams } from "@/features/fundraising/adminLink";
import { FEATURES } from "@/lib/features";
import { fundraising, fundraisingCampaigns, ApiError, type FundraisingAdminApplication, type FundraisingCampaign, type FundraisingEvidence, type FundraisingScope } from "@/lib/api";
import { CATEGORY_LABEL, StatusChip, formatDate, formatINR } from "@/features/fundraising/ui";
import { FieldInfo } from "@/features/fundraising/FieldInfo";
import a from "@/features/fundraising/admin.module.css";
import { PayoutDetails } from "@/features/fundraising/PayoutDetails";
import type { FundraisingAdminApplication as AdminApp, FundraisingEvidenceRequirement } from "@/lib/api";

type Decision = "approve" | "info" | "decline";
const DECIDABLE = ["SUBMITTED", "IN_REVIEW", "RESUBMITTED"];

/** F11 — Admin application review, F12 — decision dialog (canvas F11-AdminReview, F12-DecisionDialog). */
export default function AdminFundraisingReviewPage() {
  const { id } = useFrParams<{ id: string }>();
  const appId = Number(id);
  const [data, setData] = useState<FundraisingAdminApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<FundraisingEvidence | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [page, setPage] = useState<FundraisingCampaign | null>(null);

  const load = useCallback(() => {
    fundraising.admin.get(appId).then((d) => { setData(d); setDoc((cur) => cur ?? d.application.evidence.find((e) => !e.superseded) ?? null); })
      .catch(() => setError("Couldn't load this application."));
  }, [appId]);
  useEffect(() => { if (FEATURES.fundraising) load(); }, [load]);
  // Single form: the public page travels with the application and is approved with it.
  const pageId = data?.pageCampaignId ?? null;
  useEffect(() => {
    if (pageId == null) { setPage(null); return; }
    fundraisingCampaigns.admin.get(pageId).then((d) => setPage(d.campaign)).catch(() => setPage(null));
  }, [pageId]);

  if (!FEATURES.fundraising) return <div className={a.root}><main className={a.wrap} style={{ paddingTop: 40 }}><p className={a.muted}>Fundraising is switched off.</p></main></div>;
  if (!data) return <div className={a.root}><main className={a.wrap} style={{ paddingTop: 40 }}>{error ? <p role="alert" className={a.err}>{error}</p> : <div className={a.skel} style={{ width: "40%" }} />}</main></div>;

  const app = data.application;
  const decidable = DECIDABLE.includes(app.status);

  async function startReview() {
    try { setData(await fundraising.admin.startReview(appId)); } catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't open for review."); }
  }

  return (
    <div className={a.root}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e4ddd5", padding: "16px 28px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 400px", minWidth: 0 }}>
          <Link href="/admin/fundraising" className={a.small}>← Fundraising applications</Link>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
            <h1 className={a.serif} style={{ fontSize: 24 }}>{data.applicantName}{app.forSelf ? "" : ` — for ${app.relationship?.toLowerCase() ?? "someone else"}`}</h1>
            <StatusChip status={app.status} />
          </div>
          <p className={a.muted}>{app.reference}{app.category ? ` · ${CATEGORY_LABEL[app.category]}` : ""} · requested {formatINR(app.requestedAmount)} · submitted {formatDate(app.submittedAt)}</p>
        </div>
        {(app.status === "SUBMITTED" || app.status === "RESUBMITTED") && <button type="button" className={`${a.btn} ${a.bs}`} onClick={startReview}>Start review</button>}
        <button type="button" className={`${a.btn} ${a.bs}`} disabled={!decidable} onClick={() => setDecision("info")}>Request information</button>
        <button type="button" className={`${a.btn} ${a.bs}`} style={{ color: "#8f1d1d" }} disabled={!decidable} onClick={() => setDecision("decline")}>Do not approve</button>
        <button type="button" className={`${a.btn} ${a.bp}`} disabled={!decidable} onClick={() => setDecision("approve")}>{data.pageCampaignId != null ? "Approve application and page" : "Approve application"}</button>
      </div>
      {app.status === "WITHDRAWN" && <div role="status" style={{ padding: "10px 28px", background: "#fdf3e1", color: "#5c3800" }}>The applicant withdrew this application. You can&apos;t record a decision.</div>}
      {error && <div role="alert" style={{ padding: "10px 28px", background: "#fbeaea" }} className={a.err}>{error} <button type="button" className={`${a.btn} ${a.bs}`} onClick={() => { setError(null); load(); }}>Refresh</button></div>}

      <main data-fr-grid="app3" style={{ padding: "20px 28px 48px", display: "grid", gridTemplateColumns: "340px minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className={`${a.card} ${a.pane}`} aria-labelledby="auto">
            <div style={{ display: "flex", justifyContent: "space-between" }}><h2 id="auto" className={a.h}>Automated findings</h2><span className={`${a.small} ${a.muted}`}>not conclusions</span></div>
            <p className={a.small} style={{ padding: "10px 12px", borderRadius: 8, background: "#efebe6" }}>No automated checks run on fundraising evidence yet. <strong>Nothing here is a pass</strong> — read each document yourself.</p>
          </section>
          <section className={`${a.card} ${a.pane}`} aria-labelledby="who">
            <h2 id="who" className={a.h}>Who needs help</h2>
            <p className={a.small}>{app.forSelf ? "The applicant, for themselves." : <>
              <strong>{app.beneficiaryLegalName ?? "—"}</strong> (private) · shown as &quot;{app.beneficiaryDisplayName ?? "—"}&quot;<br />
              {app.relationship ?? "—"} · {app.beneficiaryAgeRange ?? "—"}<br />
              <span className={a.muted}>Authority:</span> {app.authorityExplanation ?? "—"}</>}</p>
            <p className={a.small}><span className={a.muted}>Applicant:</span> {data.applicantName} · {data.applicantEmail}</p>
          </section>
          <section className={`${a.card} ${a.pane}`} aria-labelledby="fb">
            <h2 id="fb" className={a.h}>Funding breakdown</h2>
            <dl style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "4px 12px" }}>
              {app.costItems.map((c, i) => {
                const bill = c.evidenceId == null ? undefined : app.evidence.find((e) => e.id === c.evidenceId);
                const extras = [c.reference ? `bill no. ${c.reference}` : null, bill ? `file: ${bill.fileName ?? "bill"}` : null].filter(Boolean).join(" · ");
                return <Row key={i} k={extras ? `${c.expense} (${extras})` : c.expense} v={formatINR(c.amount)} />;
              })}
              <Row k="Total" v={formatINR(app.totalCosts)} bold />
              {/* Money already in hand is shown for context only; it is not subtracted (owner, 2026-10-26). */}
              <Row k="Insurance (not subtracted)" v={formatINR(app.insuranceAmount ?? 0)} />
              <Row k="Own / family (not subtracted)" v={formatINR(app.ownContribution ?? 0)} />
              <Row k="Grants (not subtracted)" v={formatINR(app.grantsAmount ?? 0)} />
              <Row k="Other fundraising (not subtracted)" v={formatINR(app.otherFundraisingAmount ?? 0)} />
              <Row k="Still needed" v={formatINR(app.outstandingGap)} bold />
              <Row k="Requested" v={formatINR(app.requestedAmount)} bold />
            </dl>
            {app.amountDifferenceReason && <p className={a.small}><span className={a.muted}>Difference explained:</span> {app.amountDifferenceReason}</p>}
            {app.linkedItemRequestId && <p className={a.small}>Linked item request #{app.linkedItemRequestId}</p>}
          </section>
          <section className={`${a.card} ${a.pane}`} aria-labelledby="need">
            <h2 id="need" className={a.h}>The need</h2>
            <p className={a.small} style={{ whiteSpace: "pre-wrap" }}>{app.whatHappened ?? "—"}</p>
            <p className={`${a.small} ${a.muted}`}>Needed by: {app.urgency && /^\d{4}-\d{2}-\d{2}$/.test(app.urgency) ? formatDate(app.urgency) : app.urgency ?? "—"}</p>
          </section>
          <PayoutDetails applicationId={app.id} payout={app.payout} organiserName={data.applicantName} beneficiaryName={app.forSelf ? null : app.beneficiaryLegalName} />
          {page && (
            <section className={`${a.card} ${a.pane}`} aria-labelledby="pg">
              <h2 id="pg" className={a.h}>Public fundraiser page</h2>
              <p className={`${a.small} ${a.muted}`}>Written in the same form. Approving this application publishes it (after payment setup).</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {page.coverUrl ? <img src={page.coverUrl} alt={page.coverAltText ?? ""} style={{ width: "100%", maxWidth: 420, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 8 }} />
                : <p className={a.small}>No cover photo.</p>}
              <p className={a.small}><span className={a.muted}>Title:</span> <strong>{page.title || "—"}</strong></p>
              <p className={a.small}><span className={a.muted}>Shown name:</span> {page.beneficiaryDisplayName || "—"} · <span className={a.muted}>Last day to collect:</span> {page.endDate ? formatDate(page.endDate) : "—"}</p>
              <p className={a.small}><span className={a.muted}>Cover permission:</span> {page.coverConsent ? "Confirmed" : "Not confirmed"}</p>
              <p className={a.small}><span className={a.muted}>Donors see:</span> beneficiary {page.beneficiaryNameVisibility?.toLowerCase().replace("_", " ") ?? "—"} · organiser {page.organiserNameVisibility?.toLowerCase().replace("_", " ") ?? "—"} · location {page.locationVisibility?.toLowerCase() ?? "—"}</p>
              <div className={a.small}>
                <div className={a.muted}>Documents shown to donors (consent version {page.disclosureVersion})</div>
                {app.evidence.filter((e) => page.publicEvidenceIds.includes(e.id) || page.legacyPublicEvidenceIds.includes(e.id)).map((e) => (
                  <div key={e.id}>{e.fileName ?? typeWords(e.type)} — {page.publicEvidenceIds.includes(e.id)
                    ? <><strong>Public (consented)</strong>{(() => {
                        const at = page.publicEvidenceConsents.find((x) => x.evidenceId === e.id)?.consentedAt;
                        return at ? <span className={a.muted}> · {new Date(at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span> : null;
                      })()}</>
                    : <span className={a.muted}>Old selection, not consented — stays private</span>}</div>
                ))}
                {page.publicEvidenceIds.length === 0 && page.legacyPublicEvidenceIds.length === 0 && <div>None — every document stays private.</div>}
              </div>
              <div>
                <div className={`${a.small} ${a.muted}`}>Story</div>
                <p className={a.small} style={{ whiteSpace: "pre-wrap" }}>{page.story || "—"}</p>
              </div>
            </section>
          )}
        </div>

        <section className={a.card} style={{ display: "flex", flexDirection: "column", minHeight: 720 }} aria-labelledby="ev">
          <div className={a.pane} style={{ borderBottom: "1px solid #e4ddd5" }}>
            <h2 id="ev" className={a.h}>Evidence · private</h2>
            <EvidenceByRequirement app={app} doc={doc} onPick={setDoc} />
          </div>
          <div style={{ flex: 1, padding: 20, background: "#3a3330", display: "flex", flexDirection: "column", gap: 10 }}>
            {doc?.viewUrl ? (
              <>
                <div className={a.small} style={{ color: "#e8ddd2", display: "flex", justifyContent: "space-between" }}><span>{doc.fileName ?? "Document"} · uploaded {formatDate(doc.uploadedAt)}</span><a href={doc.viewUrl} target="_blank" rel="noreferrer" style={{ color: "#f0b97a" }}>Open full size</a></div>
                {/\.pdf($|\?)/i.test(doc.viewUrl) || doc.fileName?.toLowerCase().endsWith(".pdf")
                  ? <iframe title="Evidence preview" src={doc.viewUrl} style={{ flex: 1, border: 0, background: "#fbf9f6", borderRadius: 4, minHeight: 600 }} />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={doc.viewUrl} alt={`Evidence: ${doc.type}`} style={{ maxWidth: "100%", margin: "0 auto", borderRadius: 4, background: "#fbf9f6" }} />}
              </>
            ) : <p style={{ color: "#e8ddd2" }}>Choose a document to preview.</p>}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className={`${a.card} ${a.pane}`} aria-labelledby="qs">
            <h2 id="qs" className={a.h}>Questions and answers</h2>
            {app.infoRequests.length === 0 && <p className={`${a.small} ${a.muted}`}>None asked yet.</p>}
            {app.infoRequests.map((q) => (
              <div key={q.id} className={a.small} style={{ borderTop: "1px solid #efe9e2", paddingTop: 8 }}>
                <strong>{q.section}:</strong> {q.question}<br />
                <span className={a.muted}>{q.response ? `Answer: ${q.response}` : "Not answered yet"}</span>
              </div>
            ))}
          </section>
          <section className={`${a.card} ${a.pane}`} aria-labelledby="dh">
            <h2 id="dh" className={a.h}>Decision record</h2>
            {app.decidedAt ? <p className={a.small}><strong>{app.status === "APPROVED" ? "Approved" : "Not approved"}</strong> · {data.decidedBy} · {formatDate(app.decidedAt)}<br />{app.decisionReason}</p> : <p className={`${a.small} ${a.muted}`}>No decision yet.</p>}
            {data.internalNote && <p className={a.small}><span className={a.muted}>Internal note:</span> {data.internalNote}</p>}
            <p className={`${a.small} ${a.muted}`}>Full timeline: status history and audit log.</p>
          </section>
        </div>
      </main>

      {decision && <DecisionDialog data={data} initial={decision} onClose={() => setDecision(null)} onDone={(d) => { setData(d); setDecision(null); }} onStale={() => { setDecision(null); setError("This application changed since you opened it. Refresh before deciding."); }} />}
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <><dt className={a.small} style={{ color: bold ? "#1f140c" : "#6b5d52", fontWeight: bold ? 700 : 400 }}>{k}</dt><dd className={`${a.small} ${a.num}`} style={{ fontWeight: bold ? 700 : 400 }}>{v}</dd></>;
}

function DecisionDialog({ data, initial, onClose, onDone, onStale }: {
  data: FundraisingAdminApplication; initial: Decision; onClose: () => void;
  onDone: (d: FundraisingAdminApplication) => void; onStale: () => void;
}) {
  const app = data.application;
  const [mode, setMode] = useState<Decision>(initial);
  const [scope, setScope] = useState<FundraisingScope>("THIS_NEED");
  const [conditions, setConditions] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [resubmit, setResubmit] = useState(true);
  const [questions, setQuestions] = useState([{ section: "EVIDENCE", question: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    try {
      const v = app.version;
      if (mode === "approve") onDone(await fundraising.admin.approve(app.id, { expectedVersion: v, scope, conditions: conditions || undefined, reason, internalNote: note || undefined }));
      else if (mode === "decline") onDone(await fundraising.admin.notApprove(app.id, { expectedVersion: v, reason, internalNote: note, resubmissionAllowed: resubmit }));
      else onDone(await fundraising.admin.requestInformation(app.id, { expectedVersion: v, questions: questions.filter((q) => q.question.trim()), internalNote: note || undefined }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) { onStale(); return; }
      setError(e instanceof ApiError ? e.message : "Couldn't record the decision.");
      setBusy(false);
    }
  }

  const valid = mode === "approve" ? reason.trim() !== "" : mode === "decline" ? reason.trim() !== "" && note.trim() !== "" : questions.some((q) => q.question.trim());

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(31,26,23,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 16px", zIndex: 60, overflowY: "auto" }}>
      <section role="dialog" aria-modal="true" aria-labelledby="dt" className={a.card} style={{ padding: 28, width: "100%", maxWidth: 720, display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div><h2 id="dt" className={a.serif} style={{ fontSize: 24 }}>Record a decision</h2><p className={a.muted}>{app.reference} · {data.applicantName}{app.category ? ` · ${CATEGORY_LABEL[app.category]}` : ""}</p></div>
          <button type="button" className={`${a.btn} ${a.bs}`} aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className={a.seg} role="radiogroup" aria-label="Decision">
          {([["approve", "Approve"], ["info", "Request information"], ["decline", "Do not approve"]] as const).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} className={`${a.segBtn} ${mode === k ? a.segOn : ""}`} onClick={() => setMode(k)}>{l}</button>
          ))}
        </div>

        {mode === "approve" && (
          <>
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <legend className={a.lbl}>Scope of approval <FieldInfo k="dScope" /> <span style={{ fontSize: 11, fontWeight: 700, color: "#7a4a00", background: "#fdf3e1", borderRadius: 99, padding: "1px 7px" }}>† undecided policy</span></legend>
              {([["THIS_NEED", "This need", "Can become one campaign for this need."], ["ACCOUNT", "Account eligibility", "May start further campaigns; each still goes through publication review."]] as const).map(([k, t, d]) => (
                <label key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", border: "1px solid #d6ccc1", borderRadius: 8 }}>
                  <input type="radio" name="scope" checked={scope === k} onChange={() => setScope(k)} style={{ width: 18, height: 18, marginTop: 2, accentColor: "#b04a15" }} />
                  <span><strong>{t}</strong><br /><span className={`${a.muted} ${a.small}`}>{d}</span></span>
                </label>
              ))}
            </fieldset>
            <div><label className={a.lbl} htmlFor="cn">Conditions <FieldInfo k="dConditions" /> <span className={a.muted} style={{ fontWeight: 500 }}>(shown to applicant)</span></label><textarea id="cn" className={a.in} rows={2} value={conditions} onChange={(e) => setConditions(e.target.value)} /></div>
            <div><label className={a.lbl} htmlFor="rs">Reason <FieldInfo k="dReason" /> <span className={a.muted} style={{ fontWeight: 500 }}>(required · shown to applicant)</span></label><textarea id="rs" className={a.in} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <div><label className={a.lbl} htmlFor="nt">Internal note <FieldInfo k="dNote" /> <span className={a.muted} style={{ fontWeight: 500 }}>(admins only)</span></label><textarea id="nt" className={a.in} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <p className={a.small} style={{ padding: "10px 12px", borderRadius: 8, background: "#efebe6" }}>Recorded with your name and the time. Approval does not publish anything.</p>
          </>
        )}

        {mode === "info" && (
          <>
            <p className={a.lbl} style={{ display: "flex", alignItems: "center", gap: 6 }}>Questions for the applicant <FieldInfo k="dQuestions" /></p>
            {questions.map((q, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "160px minmax(0,1fr)", gap: 10 }}>
                <select className={a.in} aria-label={`Section for question ${i + 1}`} value={q.section} onChange={(e) => setQuestions(questions.map((x, j) => (j === i ? { ...x, section: e.target.value } : x)))}>
                  {["WHO_NEEDS_HELP", "NEED", "EVIDENCE", "DECLARATIONS"].map((sct) => <option key={sct} value={sct}>{sct.replace(/_/g, " ").toLowerCase()}</option>)}
                </select>
                <textarea className={a.in} rows={2} aria-label={`Question ${i + 1}`} placeholder="A specific question the applicant can answer" value={q.question} onChange={(e) => setQuestions(questions.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
              </div>
            ))}
            <div><button type="button" className={`${a.btn} ${a.bs}`} onClick={() => setQuestions([...questions, { section: "NEED", question: "" }])}>+ Add another question</button></div>
            <div><label className={a.lbl} htmlFor="nt2">Internal note <FieldInfo k="dNote" /> <span className={a.muted} style={{ fontWeight: 500 }}>(admins only)</span></label><textarea id="nt2" className={a.in} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </>
        )}

        {mode === "decline" && (
          <>
            <div><label className={a.lbl} htmlFor="r1">Reason the applicant will see (required) <FieldInfo k="dDeclineReason" /></label><textarea id="r1" className={a.in} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <div><label className={a.lbl} htmlFor="r2">Internal note (required) <FieldInfo k="dDeclineNote" /></label><textarea id="r2" className={a.in} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}><input type="checkbox" checked={resubmit} onChange={(e) => setResubmit(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#b04a15" }} />Applicant may apply again for this need</label>
          </>
        )}

        {error && <p role="alert" className={a.err}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className={`${a.btn} ${a.bs}`} onClick={onClose}>Cancel</button>
          <button type="button" className={`${a.btn} ${mode === "decline" ? a.bx : a.bp}`} disabled={!valid || busy} onClick={submit}>
            {busy ? "Saving…" : mode === "approve" ? "Approve application" : mode === "decline" ? "Record “Not approved”" : "Send request"}
          </button>
        </div>
      </section>
    </div>
  );
}

/** Admin names for the server's requirement groups (FundraisingEvidenceRules). Admin copy stays English. */
const REQUIREMENT_LABEL: Record<string, string> = {
  identity: "Organiser ID", consent: "Beneficiary's consent", relationship: "Proof of relationship",
  medicalReport: "Medical report", treatmentEstimate: "Treatment estimate",
  enrolment: "Admission or enrolment letter", fees: "Fee demand",
  event: "Proof of what happened", cost: "Cost proof", supporting: "Supporting document",
};
const typeWords = (t: string) => t.replace(/_/g, " ").toLowerCase();

/**
 * Evidence grouped by the server's requirement groups, each met by any of its types. Closed applications
 * get one historical notice and no fault markers; open ones show Missing, or "Required from the next
 * submission" when they were last sent under the earlier rule.
 */
function EvidenceByRequirement({ app, doc, onPick }: {
  app: AdminApp["application"]; doc: FundraisingEvidence | null; onPick: (e: FundraisingEvidence) => void;
}) {
  const groups: FundraisingEvidenceRequirement[] = app.requiredEvidence ?? [];
  const historical = groups.some((g) => g.state === "HISTORICAL")
    || ["APPROVED", "NOT_APPROVED", "WITHDRAWN", "EXPIRED"].includes(app.status);
  const grouped = new Set(groups.flatMap((g) => g.anyOf));
  const rest = app.evidence.filter((e) => !grouped.has(e.type));
  const chip = (e: FundraisingEvidence) => (
    <button key={e.id} type="button" onClick={() => onPick(e)} aria-current={doc?.id === e.id}
      style={{ display: "flex", gap: 6, alignItems: "center", padding: doc?.id === e.id ? "7px 9px" : "8px 10px", borderRadius: 8, cursor: "pointer", font: "inherit",
        border: doc?.id === e.id ? "2px solid #b04a15" : "1px solid #e4ddd5", background: "#fff", opacity: e.superseded ? 0.6 : 1 }}>
      <span className={a.small}>{e.fileName ?? typeWords(e.type)}{e.superseded ? " · earlier version" : ""}{e.fromProfile ? " · from profile" : ""}</span>
    </button>
  );
  const badge = (g: FundraisingEvidenceRequirement) =>
    g.state === "MET" ? <span className={a.small} style={{ color: "#1d5b3a", fontWeight: 700 }}>Provided</span>
      : g.state === "MISSING" ? <span className={a.small} style={{ color: "#8f1d1d", fontWeight: 700 }}>Missing</span>
      : g.state === "NEXT_SUBMISSION" ? <span className={a.small} style={{ color: "#8a5a00", fontWeight: 700 }}>Required from the next submission</span>
      : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {historical && <p className={a.small} style={{ padding: "8px 10px", borderRadius: 8, background: "#efebe6" }}>Historical application — current requirements shown for reference.</p>}
      {groups.map((g) => {
        const files = app.evidence.filter((e) => g.anyOf.includes(e.type));
        return (
          <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
              <span className={a.small}><strong>{REQUIREMENT_LABEL[g.key] ?? g.key}</strong>{g.anyOf.length > 1 && <span className={a.muted}> · accepts {g.anyOf.map(typeWords).join(" or ")}</span>}</span>
              {!historical && badge(g)}
            </div>
            {g.key === "medicalReport" && <p className={`${a.small} ${a.muted}`}>Check the date on the report itself: it should be within 6 months of submission. The upload date doesn&apos;t show this.</p>}
            {files.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{files.map(chip)}</div>}
          </div>
        );
      })}
      {rest.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className={a.small}><strong>Other documents</strong></span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{rest.map(chip)}</div>
        </div>
      )}
      {app.evidence.length === 0 && <span className={a.muted}>No evidence uploaded.</span>}
    </div>
  );
}
