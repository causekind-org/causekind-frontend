"use client";

import { useCallback, useEffect, useState } from "react";

import { FrLink as Link, useFrParams } from "@/features/fundraising/adminLink";
import { FEATURES } from "@/lib/features";
import { fundraisingCampaigns, fundraisers, fundraisingDonors, fundraisingOutcomes, ApiError, type AdminDonorReport, type FundraisingAdminCampaign } from "@/lib/api";
import { CATEGORY_LABEL, CampaignChip, formatDate, formatINR } from "@/features/fundraising/ui";
import { FieldInfo } from "@/features/fundraising/FieldInfo";
import a from "@/features/fundraising/admin.module.css";
import { PayoutDetails } from "@/features/fundraising/PayoutDetails";

type Decision = "changes" | "approve" | "decline";

/** F19 — publication review workspace; F20 — publication decision dialog. */
export default function AdminCampaignReviewPage() {
  const { id } = useFrParams<{ id: string }>();
  const cid = Number(id);
  const [data, setData] = useState<FundraisingAdminCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);

  const load = useCallback(() => {
    fundraisingCampaigns.admin.get(cid).then(setData).catch(() => setError("Couldn't load this campaign."));
  }, [cid]);
  useEffect(() => { if (FEATURES.fundraising) load(); }, [load]);

  if (!FEATURES.fundraising) return <div className={a.root}><main className={a.wrap} style={{ paddingTop: 40 }}><p className={a.muted}>Fundraising is switched off.</p></main></div>;
  if (!data) return <div className={a.root}><main className={a.wrap} style={{ paddingTop: 40 }}>{error ? <p role="alert" className={a.err}>{error}</p> : <div className={a.skel} style={{ width: "40%" }} />}</main></div>;

  const c = data.campaign;
  const reviewing = c.status === "PUBLICATION_REVIEW";
  const differs = (x: unknown, y: unknown) => String(x ?? "") !== String(y ?? "");

  return (
    <div className={a.root}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e4ddd5", padding: "16px 28px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0 }}>
          <Link href="/admin/fundraising/campaigns" className={a.small}>← Publication review</Link>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
            <h1 className={a.serif} style={{ fontSize: 22 }}>{c.title || "Untitled campaign"}</h1><CampaignChip status={c.status} />
          </div>
          <p className={a.muted}>Organiser {data.applicantName} · from {c.applicationReference} · submitted {formatDate(c.submittedAt)}</p>
        </div>
        <button type="button" className={`${a.btn} ${a.bs}`} disabled={!reviewing} onClick={() => setDecision("changes")}>Request changes</button>
        <button type="button" className={`${a.btn} ${a.bs}`} style={{ color: "#8f1d1d" }} disabled={!reviewing} onClick={() => setDecision("decline")}>Decline publication</button>
        <button type="button" className={`${a.btn} ${a.bp}`} disabled={!reviewing} onClick={() => setDecision("approve")}>Approve for publication</button>
      </div>
      {error && <div role="alert" style={{ padding: "10px 28px", background: "#fbeaea" }} className={a.err}>{error} <button type="button" className={`${a.btn} ${a.bs}`} onClick={() => { setError(null); load(); }}>Refresh</button></div>}

      <main data-fr-grid="two" style={{ padding: "20px 28px 48px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <section className={a.card} style={{ overflowX: "auto" }} aria-labelledby="cmp">
            <div className={a.pane} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <h2 id="cmp" className={a.h}>Approved application vs public draft</h2>
              <span className={`${a.small} ${a.muted}`}>{c.hasMaterialChanges ? "Differs from application" : "No material changes"}</span>
            </div>
            <table className={a.table}>
              <thead><tr><th style={{ width: 170 }}>Item</th><th>Approved application</th><th>Public draft</th><th style={{ width: 130 }}>Check</th></tr></thead>
              <tbody>
                <tr><td><strong>Category</strong></td><td colSpan={2}>{c.category ? CATEGORY_LABEL[c.category] : "—"}</td><td>Locked</td></tr>
                <tr style={{ background: differs(c.targetAmount, c.approvedTarget) ? "#fffaf0" : undefined }}><td><strong>Target</strong></td><td>{formatINR(c.approvedTarget)}</td><td>{formatINR(c.targetAmount)}</td><td>{differs(c.targetAmount, c.approvedTarget) ? <span className={a.err}>Changed</span> : "Matches"}</td></tr>
                {c.costItems.map((r, i) => (
                  <tr key={i} style={{ background: r.changed ? "#fffaf0" : undefined }}>
                    <td><strong>{r.expense}</strong></td><td>{r.approvedAmount != null ? formatINR(r.approvedAmount) : "Not in application"}</td><td>{formatINR(r.amount)}</td><td>{r.changed ? <span className={a.err}>Changed</span> : "Matches"}</td>
                  </tr>
                ))}
                <tr><td><strong>End date</strong></td><td>—</td><td>{formatDate(c.endDate)}</td><td>Review</td></tr>
                <tr><td><strong>Shown as</strong></td><td>—</td><td>&ldquo;{c.beneficiaryDisplayName ?? "—"}&rdquo; ({(c.beneficiaryNameVisibility ?? "").toLowerCase().replace("_", " ")}) · {(c.locationVisibility ?? "").toLowerCase()}</td><td>Within privacy</td></tr>
                <tr><td><strong>Cover photo</strong></td><td>—</td><td>{c.coverUrl ? "1 photo" : "None"} · {c.coverAltText ? "description" : "no description"} · {c.coverConsent ? "permission ticked" : "permission not ticked"}</td><td>Review</td></tr>
                <tr><td><strong>Public documents</strong></td><td>Private</td><td>{c.publicEvidenceIds.length ? `${c.publicEvidenceIds.length} consented (v${c.disclosureVersion}) · redaction needed` : "None"}{c.legacyPublicEvidenceIds.length ? ` · ${c.legacyPublicEvidenceIds.length} old selection(s), not consented, stay private` : ""}</td><td>{c.publicEvidenceIds.length ? "Redact" : "—"}</td></tr>
              </tbody>
            </table>
            {c.changeReason && <p className={a.small} style={{ padding: "12px 16px" }}><span className={a.muted}>Organiser&apos;s reason for the change:</span> {c.changeReason}</p>}
          </section>

          <section className={`${a.card} ${a.pane}`} aria-labelledby="pv">
            <h2 id="pv" className={a.h}>Public preview</h2>
            <div data-fr-grid="two" style={{ display: "grid", gridTemplateColumns: "240px minmax(0,1fr)", gap: 16 }}>
              {c.coverUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.coverUrl} alt={c.coverAltText ?? ""} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 6 }} />
                : <div style={{ aspectRatio: "16 / 9", borderRadius: 6, background: "#e4dbd0" }} />}
              <div><p className={a.serif} style={{ fontSize: 18 }}>{c.title || "Untitled"}</p><p className={`${a.small} ${a.muted}`}>Organised by {c.organiserName} · {formatINR(c.targetAmount)} target</p></div>
            </div>
            <p className={a.small} style={{ whiteSpace: "pre-wrap" }}>{c.story}</p>
          </section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className={`${a.card} ${a.pane}`} aria-labelledby="pre">
            <h2 id="pre" className={a.h}>Launch prerequisites</h2>
            {/* The one action here, first in the panel (owner, 2026-10-28). */}
            {c.status !== "APPROVED" && c.status !== "CANCELLED" && c.status !== "PUBLICATION_DECLINED" && (
              <PayoutToggle id={c.id} version={c.version} ready={c.paymentSetupComplete} hasDetails={!!data.payout} onDone={setData} onError={setError} />
            )}
            <p className={a.small}><span style={{ color: "#1d5b3a", fontWeight: 700 }}>Met</span> · Application approved</p>
            <p className={a.small}>{data.payout
              ? <><span style={{ color: "#1d5b3a", fontWeight: 700 }}>Met</span> · Donee has given bank details</>
              : <><span style={{ color: "#5c4f45", fontWeight: 700 }}>Not met</span> · Donee has given bank details</>}</p>
            <p className={a.small}>{c.paymentSetupComplete
              ? <><span style={{ color: "#1d5b3a", fontWeight: 700 }}>Met</span> · Bank details checked</>
              : <><span style={{ color: "#5c4f45", fontWeight: 700 }}>Not met</span> · Bank details checked</>}</p>
            {data.applicationId != null && <PayoutDetails applicationId={data.applicationId} payout={data.payout} organiserName={data.applicantName} />}
            <p className={a.small} style={{ padding: "10px 12px", borderRadius: 8, background: "#efebe6" }}>
              {c.status === "APPROVED" ? <>This campaign is <strong>Live</strong> and taking donations.</>
                : c.paymentSetupComplete ? <>Approving now makes it <strong>Live</strong>.</>
                : <>Approving now results in <strong>Approved — setup incomplete</strong>. It goes live once the bank details are checked.</>}
            </p>
            <p className={`${a.small} ${a.muted}`}>Bank details are stored encrypted and shown only to admins.</p>
            {(c.status === "APPROVED" || c.status === "PAUSED") && <CloseNow id={c.id} onDone={setData} />}
          </section>
          <section className={`${a.card} ${a.pane}`} aria-labelledby="dr">
            <h2 id="dr" className={a.h}>Decision record</h2>
            {c.decidedAt ? <p className={a.small}>{data.decidedBy} · {formatDate(c.decidedAt)}<br />{c.reviewerMessage}</p> : <p className={`${a.small} ${a.muted}`}>No decision yet.</p>}
            {data.internalNote && <p className={a.small}><span className={a.muted}>Internal note:</span> {data.internalNote}</p>}
          </section>
        </div>
      </main>

      {["APPROVED", "PAUSED", "COLLECTIONS_CLOSED", "OUTCOME_REPORTING"].includes(c.status) && <DonorDetails id={c.id} />}

      {decision && <DecisionDialog data={data} initial={decision} onClose={() => setDecision(null)} onDone={(d) => { setData(d); setDecision(null); }}
        onStale={() => { setDecision(null); setError("This campaign changed since you opened it. Refresh before deciding."); }} />}
    </div>
  );
}

function DecisionDialog({ data, initial, onClose, onDone, onStale }: {
  data: FundraisingAdminCampaign; initial: Decision; onClose: () => void; onDone: (d: FundraisingAdminCampaign) => void; onStale: () => void;
}) {
  const c = data.campaign;
  const [mode, setMode] = useState<Decision>(initial);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = mode === "approve" ? note.trim() !== "" : message.trim() !== "" && (mode === "changes" || note.trim() !== "");

  async function submit() {
    setBusy(true); setError(null);
    try {
      const v = c.version;
      if (mode === "approve") onDone(await fundraisingCampaigns.admin.approve(c.id, { expectedVersion: v, message: message || undefined, internalNote: note }));
      else if (mode === "decline") onDone(await fundraisingCampaigns.admin.decline(c.id, { expectedVersion: v, reason: message, internalNote: note }));
      else onDone(await fundraisingCampaigns.admin.requestChanges(c.id, { expectedVersion: v, message, internalNote: note || undefined }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) { onStale(); return; }
      setError(e instanceof ApiError ? e.message : "Couldn't record the decision."); setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(31,26,23,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 16px", zIndex: 60, overflowY: "auto" }}>
      <section role="dialog" aria-modal="true" aria-labelledby="dt" className={a.card} style={{ padding: 28, width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div><h2 id="dt" className={a.serif} style={{ fontSize: 24 }}>Publication decision</h2><p className={a.muted}>{c.title || "Untitled campaign"}</p></div>
          <button type="button" className={`${a.btn} ${a.bs}`} aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className={a.seg} role="radiogroup" aria-label="Decision">
          {([["changes", "Request changes"], ["approve", "Approve for publication"], ["decline", "Decline publication"]] as const).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={mode === k} className={`${a.segBtn} ${mode === k ? a.segOn : ""}`} onClick={() => setMode(k)}>{l}</button>
          ))}
        </div>
        {mode === "approve" && (
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "#efebe6" }}>
            <strong>Result: Approved — setup incomplete</strong>
            <p className={a.small}>Payment setup isn&apos;t met, so the page stays private and can&apos;t take donations.</p>
          </div>
        )}
        <div><label className={a.lbl} htmlFor="m">{mode === "changes" ? "What to change (organiser-facing, required)" : mode === "decline" ? "Reason (organiser-facing, required)" : "Message to the organiser (optional)"} <FieldInfo k={mode === "changes" ? "pChanges" : mode === "decline" ? "pDecline" : "pMessage"} /></label>
          <textarea id="m" className={a.in} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
        <div><label className={a.lbl} htmlFor="n">Internal note {mode === "changes" ? "(optional)" : "(required)"} <FieldInfo k="pNote" /></label>
          <textarea id="n" className={a.in} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <p className={`${a.small} ${a.muted}`}>Recorded with your name and the time in the review history.</p>
        {error && <p role="alert" className={a.err}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className={`${a.btn} ${a.bs}`} onClick={onClose}>Cancel</button>
          <button type="button" className={`${a.btn} ${mode === "decline" ? a.bx : a.bp}`} disabled={!valid || busy} onClick={submit}>
            {busy ? "Saving…" : mode === "approve" ? "Approve for publication" : mode === "decline" ? "Decline publication" : "Send change request"}
          </button>
        </div>
      </section>
    </div>
  );
}

/** "Close now": the same audited transition as the daily end-date job (Live or Paused → Outcome reporting). */
function CloseNow({ id, onDone }: { id: number; onDone: (d: FundraisingAdminCampaign) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!open) return <button type="button" className={`${a.btn} ${a.bs}`} style={{ color: "#8f1d1d" }} onClick={() => setOpen(true)}>Close now</button>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 8, background: "#fbeaea" }}>
      <label className={a.lbl} htmlFor="cnr">Why end donations now? (internal, required) <FieldInfo k="cnReason" /></label>
      <textarea id="cnr" className={a.in} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      <p className={`${a.small} ${a.muted}`}>Donations stop for good and the organiser is asked for an outcome report. Existing donations are kept. No refunds.</p>
      {err && <p className={a.err} role="alert">{err}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className={`${a.btn} ${a.bs}`} onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className={`${a.btn} ${a.bx}`} disabled={busy || !reason.trim()}
          onClick={async () => { setBusy(true); setErr(null); try { onDone(await fundraisingOutcomes.admin.closeNow(id, reason.trim())); setOpen(false); } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't close"); } finally { setBusy(false); } }}>
          End donations
        </button>
      </div>
    </div>
  );
}

/** Admin confirms the donee's bank details are checked; on an approved campaign this makes it Live. Needs details first. */
function PayoutToggle({ id, version, ready, hasDetails, onDone, onError }: {
  id: number; version: number; ready: boolean; hasDetails: boolean; onDone: (d: FundraisingAdminCampaign) => void; onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try { onDone(await fundraisers.setPayoutReady(id, version, !ready)); }
    catch (e) { onError(e instanceof ApiError ? e.message : "Couldn't update the payout setup."); }
    finally { setBusy(false); }
  }
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", border: "1px solid #d6ccc1", borderRadius: 8, cursor: "pointer" }}>
      <input type="checkbox" checked={ready} disabled={busy || (!hasDetails && !ready)} onChange={toggle} style={{ width: 18, height: 18, accentColor: "#b04a15" }} />
      <span className={a.small}><strong>Bank details checked</strong>{!hasDetails && !ready && <span className={a.muted}> — the donee hasn&apos;t given bank details yet</span>}</span>
    </label>
  );
}

/** Admin-only donor details: real names (including anonymous donors), contact, fee and payment ids. */
function DonorDetails({ id }: { id: number }) {
  const [r, setR] = useState<AdminDonorReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fundraisingDonors.report(id).then(setR).catch(() => setErr("Couldn't load donations")); }, [id]);
  const exportCsv = async () => {
    setBusy(true); setErr(null);
    try { await fundraisingDonors.downloadCsv(id); } catch { setErr("Couldn't export donations"); } finally { setBusy(false); }
  };
  const stat = (label: string, value: string, strong?: boolean) => (
    <div className={`${a.card} ${a.pane}`} style={{ gap: 4 }}>
      <span className={`${a.small} ${a.muted}`}>{label}</span>
      <strong className={a.num} style={{ textAlign: "left", fontSize: strong ? 24 : 20 }}>{value}</strong>
    </div>
  );
  return (
    <section style={{ padding: "0 28px 48px", display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby="dd">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 id="dd" className={a.serif} style={{ fontSize: 22 }}>Donations</h2>
          <p className={`${a.small} ${a.muted}`}>Full donor details, including donors who hid their name publicly. Viewing and exporting are logged.</p>
        </div>
        <button type="button" className={`${a.btn} ${a.bs}`} disabled={busy || !r || r.rows.length === 0} onClick={exportCsv}>Export CSV</button>
      </div>
      {err && <p className={a.err} role="alert">{err}</p>}
      {!r ? (!err && <div className={a.skel} style={{ width: "50%" }} />) : (
        <>
          <div data-fr-grid="four" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
            {stat("Confirmed donations", String(r.summary.confirmedCount))}
            {stat("Confirmed gross", formatINR(r.summary.gross))}
            {stat("Platform fee", formatINR(r.summary.fee))}
            {stat("Net to transfer to beneficiary", formatINR(r.summary.netToTransfer), true)}
          </div>
          <p className={`${a.small} ${a.muted}`}>Totals count confirmed donations only. Sahas Charitable Trust makes the transfer outside CauseKind.</p>
          {r.rows.length === 0 ? <div className={a.card} style={{ padding: 20 }}><p className={a.muted}>No donations yet.</p></div> : (
            <div className={a.card} style={{ overflowX: "auto" }}>
              <table className={a.table}>
                <thead><tr><th>Donor</th><th>Contact</th><th className={a.num}>Amount</th><th className={a.num}>Fee</th><th className={a.num}>Net</th><th>Status</th><th>Date</th><th>Razorpay</th></tr></thead>
                <tbody>
                  {r.rows.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.name ?? "—"}</strong>{d.anonymous && <div className={`${a.small} ${a.muted}`}>Shown publicly as Anonymous</div>}</td>
                      <td className={a.small}>{d.email ?? "—"}<br />{d.phone ?? "—"}</td>
                      <td className={a.num}>{formatINR(d.amount)}</td>
                      <td className={a.num}>{formatINR(d.fee)}<div className={`${a.small} ${a.muted}`}>{d.feePercent}%</div></td>
                      <td className={a.num}>{formatINR(d.net)}</td>
                      <td className={a.small} style={{ fontWeight: 600, color: d.status === "COMPLETED" ? "#1d5b3a" : d.status === "FAILED" ? "#8f1d1d" : "#1e3a60" }}>{d.status === "COMPLETED" ? "Confirmed" : d.status === "FAILED" ? "Failed" : "Pending"}</td>
                      <td className={a.small}>{formatDate(d.at)}</td>
                      <td className={a.small} style={{ fontFamily: "ui-monospace, monospace" }}>{d.razorpayOrderId ?? "—"}<br />{d.razorpayPaymentId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
