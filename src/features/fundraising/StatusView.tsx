"use client";

import { useState } from "react";
import Link from "@/components/AppLink";
import { fundraising, ApiError, type FundraisingApplication } from "@/lib/api";
import { CATEGORY_LABEL, Icon, StatusChip, formatDate } from "./ui";
import s from "./fundraising.module.css";

const WITHDRAWABLE = ["SUBMITTED", "IN_REVIEW", "INFORMATION_REQUESTED", "RESUBMITTED"];

/** F08 — Application status (canvas F08-Status-InReview / F08-Status-NotApproved), F38 withdraw dialog. */
export function StatusView({ app, onChange, justSubmitted }: { app: FundraisingApplication; onChange: (a: FundraisingApplication) => void; justSubmitted?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setError(null);
    try { onChange(await fundraising.withdraw(app.id)); setConfirming(false); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't withdraw. Try again."); }
  }

  if (app.status === "NOT_APPROVED") return <NotApproved app={app} />;

  const reviewing = app.status === "SUBMITTED" || app.status === "IN_REVIEW" || app.status === "RESUBMITTED";
  const step2Label = app.status === "SUBMITTED" ? "Waiting for a reviewer" : app.status === "RESUBMITTED" ? "Resubmitted" : "In review";

  return (
    <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 72, display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
        <Link href="/fundraising" className={s.small} style={{ textDecoration: "none" }}>← Back to fundraisers</Link>
        {justSubmitted && (
          <div role="status" className={s.card} style={{ padding: "22px 24px", display: "flex", gap: 16, alignItems: "flex-start", borderColor: "#b7d9c3", background: "#f4faf6" }}>
            <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#1d5b3a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="check" /></span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h1 className={s.serif} style={{ fontSize: 28 }}>Application submitted</h1>
              <p>Reference <strong>{app.reference}</strong> · submitted {formatDate(app.submittedAt)}</p>
              <p className={`${s.muted} ${s.small}`}>Nothing is public, and no donations are being collected.</p>
            </div>
          </div>
        )}
        {!justSubmitted && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <StatusChip status={app.status} />
            <h1 className={s.serif} style={{ fontSize: 30 }}>
              {app.status === "APPROVED" ? "Your application has been approved" :
               app.status === "INFORMATION_REQUESTED" ? "The reviewer has some questions" :
               app.status === "WITHDRAWN" ? "You withdrew this application" : "Your application"}
            </h1>
            <p className={s.muted}>{app.reference}{app.category ? ` · ${CATEGORY_LABEL[app.category]}` : ""}{app.submittedAt ? ` · submitted ${formatDate(app.submittedAt)}` : ""}</p>
          </div>
        )}

        {app.status === "APPROVED" && (
          <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="ap">
            <h2 id="ap" style={{ fontSize: 16, fontWeight: 700 }}>Finish your fundraiser page and submit it for publication.</h2>
            {app.decisionReason && <p>{app.decisionReason}</p>}
            {app.decisionConditions && <p className={s.small}><strong>Condition:</strong> {app.decisionConditions}</p>}
            <div><span className={`${s.btn} ${s.bp}`} aria-disabled="true">Prepare fundraiser</span></div>
            <p className={`${s.muted} ${s.small}`}>Preparing the campaign page arrives in the next release.</p>
          </section>
        )}

        {app.status === "INFORMATION_REQUESTED" && (
          <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="iq">
            <h2 id="iq" style={{ fontSize: 16, fontWeight: 700 }}>{app.infoRequests.filter((q) => !q.response).length} question(s) to answer</h2>
            <p className={s.muted}>Answer just these. Everything else you sent stays as it is.</p>
            <div><Link href={`/fundraising/applications/${app.id}/respond`} className={`${s.btn} ${s.bp}`}>Respond to review</Link></div>
          </section>
        )}

        {reviewing && (
          <section className={s.card} style={{ padding: 24 }} aria-labelledby="where">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <h2 id="where" className={s.serif} style={{ fontSize: 22 }}>Where it is now</h2>
              <StatusChip status={app.status} />
            </div>
            <ol style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 22 }}>
              <li style={{ display: "flex", gap: 14 }}><Dot tone="done">✓</Dot><div><strong>Submitted</strong><p className={`${s.muted} ${s.small}`}>{formatDate(app.submittedAt)}</p></div></li>
              <li style={{ display: "flex", gap: 14 }}><Dot tone="now">2</Dot><div><strong>{step2Label}</strong><p className={`${s.muted} ${s.small}`}>A reviewer checks your details and documents. If they need anything, you&apos;ll get a notification and see &quot;Action needed&quot; here.</p></div></li>
              <li style={{ display: "flex", gap: 14 }}><Dot tone="later">3</Dot><div><strong>Decision</strong><p className={`${s.muted} ${s.small}`}>Approved, or not approved with a reason.</p></div></li>
            </ol>
          </section>
        )}

        {app.status === "WITHDRAWN" && (
          <div><Link href="/fundraising/start" className={`${s.btn} ${s.bp}`}>Start again</Link></div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><Link href="/fundraising" className={`${s.btn} ${s.bs}`}>Back to dashboard</Link></div>
      </div>

      <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {WITHDRAWABLE.includes(app.status) && (
          <div className={s.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Changed your mind?</h2>
            <p className={`${s.muted} ${s.small}`}>You can withdraw this application before a decision. It stays in your history.</p>
            <button type="button" className={`${s.btn} ${s.bs} ${s.danger}`} style={{ borderColor: "#e9b8b3" }} onClick={() => setConfirming(true)}>Withdraw application</button>
          </div>
        )}
      </aside>

      {confirming && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(31,20,12,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="wd" className={s.card} style={{ padding: 28, maxWidth: 520, width: "100%", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
            <h2 id="wd" className={s.serif} style={{ fontSize: 23 }}>Withdraw this application?</h2>
            <p>{app.reference}{app.category ? ` · ${CATEGORY_LABEL[app.category]}` : ""}</p>
            <ul className={s.small} style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
              <li>The review stops and no decision is made.</li><li>It stays in your application history as Withdrawn.</li>
              <li>Your documents stay private.</li><li>Your other approvals and campaigns aren&apos;t affected.</li>
            </ul>
            {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setConfirming(false)}>Keep application</button>
              <button type="button" className={s.btn} style={{ background: "#8f1d1d", color: "#fff" }} onClick={withdraw}>Withdraw application</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Dot({ tone, children }: { tone: "done" | "now" | "later"; children: React.ReactNode }) {
  const bg = tone === "done" ? "#e6f2ea" : tone === "now" ? "#1e3a60" : "#f1ece6";
  const fg = tone === "done" ? "#1d5b3a" : tone === "now" ? "#fff" : "#6b5d52";
  return <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: bg, color: fg }}>{children}</span>;
}

function NotApproved({ app }: { app: FundraisingApplication }) {
  return (
    <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 24, maxWidth: 880 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Link href="/fundraising" className={s.small} style={{ textDecoration: "none" }}>← Back to fundraisers</Link>
        <StatusChip status="NOT_APPROVED" />
        <h1 className={s.serif} style={{ fontSize: 32 }}>We couldn&apos;t approve this application</h1>
        <p className={s.muted}>Application {app.reference}{app.category ? ` · ${CATEGORY_LABEL[app.category]}` : ""} · decided {formatDate(app.decidedAt)}</p>
      </div>
      <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="why">
        <h2 id="why" style={{ fontSize: 16, fontWeight: 700 }}>Reason from the reviewer</h2>
        <p style={{ fontSize: 16, lineHeight: 1.65 }}>{app.decisionReason}</p>
      </section>
      <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby="next">
        <h2 id="next" style={{ fontSize: 16, fontWeight: 700 }}>What you can do</h2>
        {app.resubmissionAllowed ? (
          <>
            <p>You can apply again for this need.</p>
            <div><Link href="/fundraising/start" className={`${s.btn} ${s.bp}`}>Start new application</Link></div>
            <p className={`${s.muted} ${s.small}`}>Whether a new application starts blank or from a copy of this one is still being decided.</p>
          </>
        ) : (
          <>
            <p>This decision is final for this need. You can still request items, and apply for a different need.</p>
            <div><Link href="/requests/new" className={`${s.btn} ${s.bp}`}>Request items</Link></div>
          </>
        )}
      </section>
      <p className={`${s.muted} ${s.small}`}>This decision doesn&apos;t change any earlier approval you hold, or any campaign already live.</p>
    </main>
  );
}
