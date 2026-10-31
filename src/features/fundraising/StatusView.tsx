"use client";

import { useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { useRouter } from "next/navigation";
import { fundraising, fundraisingCampaigns, ApiError, type FundraisingApplication } from "@/lib/api";
import { useFundraisingLabels, StatusChip, Icon } from "./ui";
import s from "./fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
const WITHDRAWABLE = ["SUBMITTED", "IN_REVIEW", "INFORMATION_REQUESTED", "RESUBMITTED"];

/** F08 — Application status (canvas F08-Status-InReview / F08-Status-NotApproved), F38 withdraw dialog. */
export function StatusView({ app, onChange, justSubmitted }: { app: FundraisingApplication; onChange: (a: FundraisingApplication) => void; justSubmitted?: boolean }) {
  const ui = useUiText();
  const t = useTranslations("fundraiserFlow");
  const fmt = useFundraisingLabels();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setError(null);
    try { onChange(await fundraising.withdraw(app.id)); setConfirming(false); }
    catch (e) { setError(e instanceof ApiError ? e.message : ui("Couldn't withdraw. Try again.")); }
  }

  if (app.status === "NOT_APPROVED") return <NotApproved app={app} />;

  const reviewing = app.status === "SUBMITTED" || app.status === "IN_REVIEW" || app.status === "RESUBMITTED";
  const step2Label = app.status === "SUBMITTED" ? ui("Waiting for a reviewer") : app.status === "RESUBMITTED" ? ui("Resubmitted", "fundraising status") : ui("In review", "fundraising status");

  return (
    <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 72, display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
        <Link href="/fundraising" className={s.small} style={{ textDecoration: "none" }}><UiText>← Back to fundraisers</UiText></Link>
        {justSubmitted && (
          <div role="status" className={s.card} style={{ padding: "22px 24px", display: "flex", gap: 16, alignItems: "flex-start", borderColor: "#b7d9c3", background: "#f4faf6" }}>
            <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#1d5b3a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="check" /></span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h1 className={s.serif} style={{ fontSize: 28 }}><UiText>Application submitted</UiText></h1>
              <p>{t.rich("referenceSubmitted", { reference: app.reference, date: fmt.date(app.submittedAt), strong: (chunks) => <strong>{chunks}</strong> })}</p>
              <p className={`${s.muted} ${s.small}`}><UiText>Nothing is public, and no donations are being collected.</UiText></p>
            </div>
          </div>
        )}
        {!justSubmitted && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ alignSelf: "flex-start" }}><StatusChip status={app.status} localize /></span>
            <h1 className={s.serif} style={{ fontSize: 30 }}>
              {app.status === "APPROVED" ? ui("Your application has been approved") :
               app.status === "INFORMATION_REQUESTED" ? ui("The reviewer has some questions") :
               app.status === "WITHDRAWN" ? ui("You withdrew this application") : ui("Your application")}
            </h1>
            <p className={s.muted}>{app.reference}{app.category ? ` · ${fmt.category(app.category)}` : ""}{app.submittedAt ? ` · submitted ${fmt.date(app.submittedAt)}` : ""}</p>
          </div>
        )}

        {app.status === "APPROVED" && <ApprovedNext app={app} />}

        {app.status === "INFORMATION_REQUESTED" && (
          <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="iq">
            <h2 id="iq" style={{ fontSize: 16, fontWeight: 700 }}>{t("questionsToAnswer", { count: app.infoRequests.filter((q) => !q.response).length })}</h2>
            <p className={s.muted}><UiText>Answer just these. Everything else you sent stays as it is.</UiText></p>
            <div><Link href={`/fundraising/applications/${app.id}/respond`} className={`${s.btn} ${s.bp}`}><UiText>Respond to review</UiText></Link></div>
          </section>
        )}

        {reviewing && (
          <section className={s.card} style={{ padding: 24 }} aria-labelledby="where">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <h2 id="where" className={s.serif} style={{ fontSize: 22 }}><UiText>Where it is now</UiText></h2>
              <StatusChip status={app.status} localize />
            </div>
            <ol style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 22 }}>
              <li style={{ display: "flex", gap: 14 }}><Dot tone="done">✓</Dot><div><strong><UiText>Submitted</UiText></strong><p className={`${s.muted} ${s.small}`}>{fmt.date(app.submittedAt)}</p></div></li>
              <li style={{ display: "flex", gap: 14 }}><Dot tone="now">2</Dot><div><strong>{step2Label}</strong><p className={`${s.muted} ${s.small}`}><UiText>A reviewer checks your details and documents. If they need anything, you&apos;ll get a notification and see &quot;Action needed&quot; here.</UiText></p></div></li>
              <li style={{ display: "flex", gap: 14 }}><Dot tone="later">3</Dot><div><strong><UiText>Decision</UiText></strong><p className={`${s.muted} ${s.small}`}><UiText>Approved, or not approved with a reason.</UiText></p></div></li>
            </ol>
          </section>
        )}

        {app.status === "WITHDRAWN" && (
          <div><Link href="/fundraising/start" className={`${s.btn} ${s.bp}`}><UiText>Start again</UiText></Link></div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><Link href="/fundraising" className={`${s.btn} ${s.bs}`}><UiText>Back to dashboard</UiText></Link></div>
      </div>

      <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {WITHDRAWABLE.includes(app.status) && (
          <div className={s.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}><UiText>Changed your mind?</UiText></h2>
            <p className={`${s.muted} ${s.small}`}><UiText>You can withdraw this application before a decision. It stays in your history.</UiText></p>
            <button type="button" className={`${s.btn} ${s.bs} ${s.danger}`} style={{ borderColor: "#e9b8b3" }} onClick={() => setConfirming(true)}><UiText>Withdraw application</UiText></button>
          </div>
        )}
      </aside>

      {confirming && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(31,20,12,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="wd" className={s.card} style={{ padding: 28, maxWidth: 520, width: "100%", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
            <h2 id="wd" className={s.serif} style={{ fontSize: 23 }}><UiText>Withdraw this application?</UiText></h2>
            <p>{app.reference}{app.category ? ` · ${fmt.category(app.category)}` : ""}</p>
            <ul className={s.small} style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
              <li><UiText>The review stops and no decision is made.</UiText></li><li><UiText>It stays in your application history as Withdrawn.</UiText></li>
              <li><UiText>Your documents stay private.</UiText></li><li><UiText>Your other approvals and campaigns aren&apos;t affected.</UiText></li>
            </ul>
            {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setConfirming(false)}><UiText>Keep application</UiText></button>
              <button type="button" className={s.btn} style={{ background: "#8f1d1d", color: "#fff" }} onClick={withdraw}><UiText>Withdraw application</UiText></button>
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
  const t = useTranslations("fundraiserFlow");
  const fmt = useFundraisingLabels();
  return (
    <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 24, maxWidth: 880 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Link href="/fundraising" className={s.small} style={{ textDecoration: "none" }}><UiText>← Back to fundraisers</UiText></Link>
        <span style={{ alignSelf: "flex-start" }}><StatusChip status="NOT_APPROVED" localize /></span>
        <h1 className={s.serif} style={{ fontSize: 32 }}><UiText>We couldn&apos;t approve this application</UiText></h1>
        <p className={s.muted}>{t("applicationDecided", { reference: app.reference, category: app.category ? ` · ${fmt.category(app.category)}` : "", date: fmt.date(app.decidedAt) })}</p>
      </div>
      <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="why">
        <h2 id="why" style={{ fontSize: 16, fontWeight: 700 }}><UiText>Reason from the reviewer</UiText></h2>
        <p style={{ fontSize: 16, lineHeight: 1.65 }}>{app.decisionReason}</p>
      </section>
      <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby="next">
        <h2 id="next" style={{ fontSize: 16, fontWeight: 700 }}><UiText>What you can do</UiText></h2>
        {app.resubmissionAllowed ? (
          <>
            <p><UiText>You can apply again for this need.</UiText></p>
            <div><Link href="/fundraising/start" className={`${s.btn} ${s.bp}`}><UiText>Start new application</UiText></Link></div>
            <p className={`${s.muted} ${s.small}`}><UiText>Whether a new application starts blank or from a copy of this one is still being decided.</UiText></p>
          </>
        ) : (
          <>
            <p><UiText>This decision is final for this need. You can still request items, and apply for a different need.</UiText></p>
            <div><Link href="/requests/new" className={`${s.btn} ${s.bp}`}><UiText>Request items</UiText></Link></div>
          </>
        )}
      </section>
      <p className={`${s.muted} ${s.small}`}><UiText>This decision doesn&apos;t change any earlier approval you hold, or any campaign already live.</UiText></p>
    </main>
  );
}

/**
 * After approval. Single-form fundraisers (2026-10-27) were approved together with their page, so
 * this links to it; older applications approved without a page still prepare one here.
 */
function ApprovedNext({ app }: { app: FundraisingApplication }) {
  const ui = useUiText();
  const [page, setPage] = useState<{ id: number; status: string } | null | undefined>(undefined);
  useEffect(() => {
    fundraisingCampaigns.mine()
      .then((all) => setPage(all.find((c) => c.applicationId === app.id && c.status !== "DRAFT" && c.status !== "CHANGES_REQUESTED" && c.status !== "CANCELLED") ?? null))
      .catch(() => setPage(null));
  }, [app.id]);
  if (page === undefined) return null;
  return (
    <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="ap">
      <h2 id="ap" style={{ fontSize: 16, fontWeight: 700 }}>{page
        ? (page.status === "APPROVED" ? ui("Your fundraiser is approved and live.") : ui("Your fundraiser is approved. One step left: payment setup by our team."))
        : <UiText>Finish your fundraiser page and submit it for publication.</UiText>}</h2>
      {app.decisionReason && <p>{app.decisionReason}</p>}
      {app.decisionConditions && <p className={s.small}><strong><UiText>Condition:</UiText></strong> {app.decisionConditions}</p>}
      <div>{page
        ? <Link href={`/fundraising/campaigns/${page.id}`} className={`${s.btn} ${s.bp}`}><UiText>Open your fundraiser</UiText></Link>
        : <PrepareButton applicationId={app.id} />}</div>
    </section>
  );
}

/** Opens the campaign draft for this approved application, creating it the first time. */
function PrepareButton({ applicationId }: { applicationId: number }) {
  const ui = useUiText();
  const t = useTranslations("fundraiserFlow");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true); setError(null);
    try { const c = await fundraisingCampaigns.fromApplication(applicationId); router.push(`/fundraising/campaigns/${c.id}`); }
    catch (e) { setError(e instanceof ApiError ? e.message : ui("Couldn't open the campaign. Try again.")); setBusy(false); }
  }
  return (
    <>
      <button type="button" className={`${s.btn} ${s.bp}`} onClick={go} disabled={busy}>{busy ? ui("Opening…") : ui("Prepare fundraiser")}</button>
      {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
    </>
  );
}
