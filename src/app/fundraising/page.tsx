"use client";

import { useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { fundraising, type FundraisingApplication } from "@/lib/api";
import { DoneeGate } from "@/features/fundraising/DoneeGate";
import { Icon, StatusChip, CATEGORY_LABEL, formatDate } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

/** F01 — Donee dashboard fundraising area (canvas artboard Main.dc.html). */
export default function FundraisingDashboardPage() {
  return (
    <DoneeGate path="/fundraising">
      <Dashboard />
    </DoneeGate>
  );
}

function Dashboard() {
  const [apps, setApps] = useState<FundraisingApplication[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fundraising.mine().then(setApps).catch(() => setFailed(true));
  }, []);

  // Reusable-eligibility variant (handoff §3.2): the panel cites the approval
  // that granted access, never whichever application is newest.
  const grant = apps?.find((a) => a.status === "APPROVED") ?? null;
  const others = (apps ?? []).filter((a) => a !== grant && a.status !== "WITHDRAWN" && a.status !== "EXPIRED");
  const history = apps ?? [];

  return (
    <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 64, display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 className={s.serif} style={{ fontSize: 36, lineHeight: 1.15 }}>Your fundraisers</h1>
        <p className={s.muted} style={{ maxWidth: 640 }}>Raise money for a need, or ask for items. You can do either without the other.</p>
      </div>

      <div className={s.grid2} style={{ gap: 16 }}>
        <Link href="/requests/new" className={s.card} style={{ padding: 22, textDecoration: "none", color: "inherit", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <span style={{ width: 44, height: 44, borderRadius: 10, background: "#f1ece6", color: "#5c4f45", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /></svg>
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ fontSize: 17 }}>Request items</strong>
            <span className={`${s.muted} ${s.small}`}>Ask donors for specific things — clothes, books, a wheelchair.</span>
          </span>
        </Link>
        <Link href="/fundraising/start" className={s.card} style={{ padding: 22, textDecoration: "none", color: "inherit", display: "flex", gap: 16, alignItems: "flex-start", borderColor: "#b9c9de" }}>
          <span style={{ width: 44, height: 44, borderRadius: 10, background: "#eaf0f8", color: "#1e3a60", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9 8h6M9 11h6M11 8c3 0 3 5 0 5l4 4" /></svg>
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ fontSize: 17 }}>Start a fundraiser</strong>
            <span className={`${s.muted} ${s.small}`}>Raise money for a need. Our team reviews it before anything goes public.</span>
          </span>
        </Link>
      </div>

      {failed && (
        <div role="alert" className={s.card} style={{ padding: 18, borderColor: "#e9b8b3" }}>
          <strong style={{ color: "#8f1d1d" }}>Couldn&apos;t load your applications.</strong>{" "}
          <button type="button" className={`${s.btn} ${s.bq}`} onClick={() => { setFailed(false); fundraising.mine().then(setApps).catch(() => setFailed(true)); }}>Try again</button>
        </div>
      )}

      {apps && apps.length > 0 && (
        <section aria-labelledby="elig" className={s.card} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #efe7de" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className={s.sec}>Fundraising eligibility</span>
              <h2 id="elig" className={s.serif} style={{ fontSize: 22 }}>{grant ? "You can start fundraisers" : "Your applications"}</h2>
            </div>
            <a href="#history" className={s.small}>View application history ({history.length})</a>
          </div>
          {grant && (
            <div className={s.row}>
              <span className={`${s.chip} ${s.cOk}`}><Icon name="check" />Eligible</span>
              <div className={s.grow}>
                <strong>Granted by application {grant.reference}</strong>
                <div className={`${s.muted} ${s.small}`}>
                  Approved {formatDate(grant.decidedAt)}{grant.category ? ` · ${CATEGORY_LABEL[grant.category]}` : ""}
                  {grant.decisionConditions ? ` · Condition: ${grant.decisionConditions}` : ""}
                </div>
              </div>
              <Link href={`/fundraising/applications/${grant.id}`} className={`${s.btn} ${s.bs}`}>View approval</Link>
            </div>
          )}
          {others.map((a) => <ApplicationRow key={a.id} app={a} hasGrant={!!grant} />)}
        </section>
      )}

      <section aria-labelledby="camps" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 id="camps" className={s.serif} style={{ fontSize: 22 }}>Campaigns</h2>
        <div className={s.card} style={{ padding: "24px 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", background: "#fbf8f4", borderStyle: "dashed" }}>
          <strong>No campaigns yet</strong>
          <p className={`${s.muted} ${s.small}`}>After your application is approved, your campaigns will appear here.</p>
        </div>
      </section>

      {history.length > 0 && (
        <section id="history" aria-labelledby="hist" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 id="hist" className={s.serif} style={{ fontSize: 22 }}>Application history</h2>
          <div className={s.card} style={{ overflow: "hidden" }}>
            {history.map((a) => (
              <div key={a.id} className={s.row}>
                <StatusChip status={a.status} />
                <div className={s.grow}><strong>{a.reference}</strong>{a.category ? ` · ${CATEGORY_LABEL[a.category]}` : ""}<div className={`${s.muted} ${s.small}`}>Started {formatDate(a.createdAt)}{a.submittedAt ? ` · submitted ${formatDate(a.submittedAt)}` : ""}</div></div>
                <Link href={`/fundraising/applications/${a.id}`} className={`${s.btn} ${s.bs}`}>View</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className={`${s.muted} ${s.small}`} style={{ maxWidth: 720 }}>
        Confirmed totals count only payments our server has verified. Money raised is not money available to withdraw — how and when funds reach the beneficiary is still being decided.
      </p>
    </main>
  );
}

function ApplicationRow({ app, hasGrant }: { app: FundraisingApplication; hasGrant: boolean }) {
  const href = `/fundraising/applications/${app.id}`;
  const action: Record<string, { label: string; href: string; primary: boolean }> = {
    DRAFT: { label: "Continue application", href, primary: true },
    SUBMITTED: { label: "View application", href, primary: false },
    IN_REVIEW: { label: "View application", href, primary: false },
    RESUBMITTED: { label: "View application", href, primary: false },
    INFORMATION_REQUESTED: { label: "Respond to review", href: `${href}/respond`, primary: true },
    APPROVED: { label: "Prepare fundraiser", href, primary: true },
    NOT_APPROVED: { label: "View decision", href, primary: false },
  };
  const a = action[app.status] ?? { label: "View", href, primary: false };
  const open = app.infoRequests.filter((q) => !q.response).length;
  const detail =
    app.status === "DRAFT" ? `${app.missing.length} thing(s) left to complete` :
    app.status === "INFORMATION_REQUESTED" ? `${open} question(s) unresolved${hasGrant ? ". This does not affect your existing approval." : ""}` :
    app.submittedAt ? `Submitted ${formatDate(app.submittedAt)}` : `Started ${formatDate(app.createdAt)}`;
  return (
    <div className={s.row}>
      <StatusChip status={app.status} />
      <div className={s.grow}>
        <strong>{hasGrant ? "Later application " : "Application "}{app.reference}{app.category ? ` · ${CATEGORY_LABEL[app.category]}` : ""}</strong>
        <div className={`${s.muted} ${s.small}`}>{detail}</div>
      </div>
      <Link href={a.href} className={`${s.btn} ${a.primary ? s.bp : s.bs}`}>{a.label}</Link>
    </div>
  );
}
