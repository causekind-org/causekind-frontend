"use client";
import { useTranslations } from "next-intl";

import { useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { fundraising, fundraisingCampaigns, fundraisingManage, ApiError, type FundraisingApplication, type FundraisingCampaign } from "@/lib/api";
import { DoneeGate } from "@/features/fundraising/DoneeGate";
import { useFundraisingLabels, StatusChip, Icon, CampaignChip } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
/** F01 — Donee dashboard fundraising area (canvas artboard Main.dc.html). */
export default function FundraisingDashboardPage() {
  return (
    <DoneeGate path="/fundraising">
      <Dashboard />
    </DoneeGate>
  );
}

function Dashboard() {
  const ui = useUiText();
  const t = useTranslations("fundraiserFlow");
  const campaignDetail = (status: string): string => ({
    DRAFT: ui("Not public yet"),
    CHANGES_REQUESTED: ui("The reviewer asked for changes"),
    PUBLICATION_REVIEW: ui("Being reviewed for publication · not public"),
    APPROVED_SETUP_INCOMPLETE: ui("Approved · not public · payment setup requirements to be defined"),
    PUBLICATION_DECLINED: ui("Not approved for publication"),
    CANCELLED: ui("Cancelled before publication · no donations"),
  } as Record<string, string>)[status] ?? "";
  const fmt = useFundraisingLabels();
  const [apps, setApps] = useState<FundraisingApplication[] | null>(null);
  const [failed, setFailed] = useState(false);

  const [campaigns, setCampaigns] = useState<FundraisingCampaign[] | null>(null);

  useEffect(() => {
    fundraising.mine().then(setApps).catch(() => setFailed(true));
    fundraisingCampaigns.mine().then(setCampaigns).catch(() => setCampaigns([]));
  }, []);
  // Live fundraisers with a stop request still waiting for an admin.
  const [stopping, setStopping] = useState<Set<number>>(new Set());
  useEffect(() => {
    const live = (campaigns ?? []).filter((c) => LIVE.includes(c.status));
    Promise.all(live.map((c) => fundraisingManage.closures(c.id).then((cl) => cl.some((x) => x.status === "SUBMITTED") ? c.id : null).catch(() => null)))
      .then((ids) => setStopping(new Set(ids.filter((x): x is number => x != null))));
  }, [campaigns]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function cancelCampaign(c: FundraisingCampaign) {
    if (!window.confirm(c.status === "DRAFT" ? ui("This deletes your draft. You can't undo this.") : ui("This cancels your fundraiser. You can't undo this."))) return;
    setBusy(true); setActionError(null);
    try {
      await fundraisingCampaigns.cancel(c.id);
      setCampaigns((cs) => (cs ?? []).filter((x) => x.id !== c.id));
    } catch { setActionError(ui("That didn't work. Check your connection and try again.")); }
    finally { setBusy(false); }
  }
  async function stopCampaign(c: FundraisingCampaign) {
    const reason = window.prompt(ui("Why do you want to stop this fundraiser? Our team will review this before it closes, because donations are involved."));
    if (reason == null) return;
    if (!reason.trim()) { setActionError(ui("Please write a reason to stop the fundraiser.")); return; }
    setBusy(true); setActionError(null);
    try {
      await fundraisingManage.requestClosure(c.id, reason.trim());
      setStopping((st) => new Set(st).add(c.id));
    } catch { setActionError(ui("That didn't work. Check your connection and try again.")); }
    finally { setBusy(false); }
  }
  async function giveUpApproval(a: FundraisingApplication) {
    if (!window.confirm(ui("This gives up your approval and cancels any fundraiser that is not public yet. To fundraise again you will need to apply again. You can't undo this."))) return;
    setBusy(true); setActionError(null);
    try {
      const updated = await fundraising.withdraw(a.id);
      setApps((as) => (as ?? []).map((x) => (x.id === a.id ? updated : x)));
      setCampaigns((cs) => (cs ?? []).filter((x) => x.applicationId !== a.id || LIVE.includes(x.status)));
    } catch (e) {
      setActionError(e instanceof ApiError && e.status === 409 ? ui("Stop your live fundraiser first. Our team reviews that because donations are involved.") : ui("That didn't work. Check your connection and try again."));
    } finally { setBusy(false); }
  }
  async function withdrawApp(a: FundraisingApplication) {
    if (!window.confirm(ui("This withdraws your application and cancels its fundraiser page. You can't undo this."))) return;
    setBusy(true); setActionError(null);
    try {
      const updated = await fundraising.withdraw(a.id);
      setApps((as) => (as ?? []).map((x) => (x.id === a.id ? updated : x)));
      setCampaigns((cs) => (cs ?? []).filter((x) => x.applicationId !== a.id || !CANCELLABLE.includes(x.status)));
    } catch { setActionError(ui("That didn't work. Check your connection and try again.")); }
    finally { setBusy(false); }
  }

  // Reusable-eligibility variant (handoff §3.2): the panel cites the approval
  // that granted access, never whichever application is newest.
  const grant = apps?.find((a) => a.status === "APPROVED") ?? null;
  const others = (apps ?? []).filter((a) => a !== grant && a.status !== "WITHDRAWN" && a.status !== "EXPIRED");
  const history = apps ?? [];

  return (
    <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 64, display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 className={s.serif} style={{ fontSize: 36, lineHeight: 1.15 }}><UiText>Your fundraisers</UiText></h1>
        <p className={s.muted} style={{ maxWidth: 640 }}><UiText>Raise money for a need, or ask for items. You can do either without the other.</UiText></p>
      </div>
      {actionError && <p role="alert" className={s.small} style={{ color: "#a4262c" }}>{actionError}</p>}

      <div className={s.grid2} style={{ gap: 16 }}>
        <Link href="/requests/new" className={s.card} style={{ padding: 22, textDecoration: "none", color: "inherit", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <span style={{ width: 44, height: 44, borderRadius: 10, background: "#f1ece6", color: "#5c4f45", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /></svg>
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ fontSize: 17 }}><UiText>Request items</UiText></strong>
            <span className={`${s.muted} ${s.small}`}><UiText>Ask donors for specific things — clothes, books, a wheelchair.</UiText></span>
          </span>
        </Link>
        <Link href="/fundraising/start" className={s.card} style={{ padding: 22, textDecoration: "none", color: "inherit", display: "flex", gap: 16, alignItems: "flex-start", borderColor: "#b9c9de" }}>
          <span style={{ width: 44, height: 44, borderRadius: 10, background: "#eaf0f8", color: "#1e3a60", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9 8h6M9 11h6M11 8c3 0 3 5 0 5l4 4" /></svg>
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong style={{ fontSize: 17 }}><UiText>Start a fundraiser</UiText></strong>
            <span className={`${s.muted} ${s.small}`}><UiText>Raise money for a need. Our team reviews it before anything goes public.</UiText></span>
          </span>
        </Link>
      </div>

      {failed && (
        <div role="alert" className={s.card} style={{ padding: 18, borderColor: "#e9b8b3" }}>
          <strong style={{ color: "#8f1d1d" }}><UiText>Couldn&apos;t load your applications.</UiText></strong>{" "}
          <button type="button" className={`${s.btn} ${s.bq}`} onClick={() => { setFailed(false); fundraising.mine().then(setApps).catch(() => setFailed(true)); }}><UiText>Try again</UiText></button>
        </div>
      )}

      {apps && apps.length > 0 && (
        <section aria-labelledby="elig" className={s.card} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #efe7de" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className={s.sec}><UiText>Fundraising eligibility</UiText></span>
              <h2 id="elig" className={s.serif} style={{ fontSize: 22 }}>{grant ? ui("You can start fundraisers") : ui("Your applications")}</h2>
            </div>
            <a href="#history" className={s.small}>{t("viewHistory", { count: history.length })}</a>
          </div>
          {grant && (
            <div className={s.row}>
              <span className={`${s.chip} ${s.cOk}`}><Icon name="check" /><UiText>Eligible</UiText></span>
              <div className={s.grow}>
                <strong>{t("grantedBy", { reference: grant.reference })}</strong>
                <div className={`${s.muted} ${s.small}`}>
                  {t("approvedOn", { date: fmt.date(grant.decidedAt) })}{grant.category ? ` · ${fmt.category(grant.category)}` : ""}
                  {grant.decisionConditions ? ` · Condition: ${grant.decisionConditions}` : ""}
                </div>
              </div>
              <Link href={`/fundraising/applications/${grant.id}`} className={`${s.btn} ${s.bs}`}><UiText>View approval</UiText></Link>
              <button type="button" className={`${s.btn} ${s.bs}`} disabled={busy} onClick={() => giveUpApproval(grant)}><UiText>Give up approval</UiText></button>
            </div>
          )}
          {others.map((a) => <ApplicationRow key={a.id} app={a} hasGrant={!!grant} busy={busy} onWithdraw={() => withdrawApp(a)} />)}
        </section>
      )}

      <section aria-labelledby="camps" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}><h2 id="camps" className={s.serif} style={{ fontSize: 22 }}><UiText>Campaigns</UiText></h2>{campaigns && campaigns.length > 0 && <span className={`${s.muted} ${s.small}`}><UiText>Needs your action first</UiText></span>}</div>
        {campaigns && campaigns.length > 0 ? (
          <div className={s.card} style={{ overflow: "hidden" }}>
            {campaigns.filter((c) => c.status !== "CANCELLED").sort((x, y) => rank(x.status) - rank(y.status)).map((c) => (
              <div key={c.id} className={s.row}>
                <CampaignChip status={c.status} localize />
                <div className={s.grow}>
                  <strong>{c.title || ui("Untitled campaign")}</strong>
                  <div className={`${s.muted} ${s.small}`}>{stopping.has(c.id) ? ui("Stop requested · waiting for review") : campaignDetail(c.status)}{c.status === "DRAFT" && c.missing.length ? ` · ${t("thingsLeft", { count: c.missing.length })}` : ""}</div>
                </div>
                <Link href={`/fundraising/campaigns/${c.id}`} className={`${s.btn} ${c.status === "DRAFT" || c.status === "CHANGES_REQUESTED" ? s.bp : s.bs}`}>
                  {c.status === "DRAFT" ? ui("Continue campaign") : c.status === "CHANGES_REQUESTED" ? ui("Make changes") : c.status === "APPROVED_SETUP_INCOMPLETE" ? ui("View setup requirements") : ui("View")}
                </Link>
                {CANCELLABLE.includes(c.status) && (
                  <button type="button" className={`${s.btn} ${s.bs}`} disabled={busy} onClick={() => cancelCampaign(c)}>{c.status === "DRAFT" ? ui("Delete draft") : ui("Cancel fundraiser")}</button>
                )}
                {LIVE.includes(c.status) && !stopping.has(c.id) && (
                  <button type="button" className={`${s.btn} ${s.bs}`} disabled={busy} onClick={() => stopCampaign(c)}>{ui("Stop fundraiser")}</button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={s.card} style={{ padding: "24px 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", background: "#fbf8f4", borderStyle: "dashed" }}>
            <strong><UiText>No campaigns yet</UiText></strong>
            <p className={`${s.muted} ${s.small}`}><UiText>After your application is approved, your campaigns will appear here.</UiText></p>
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section id="history" aria-labelledby="hist" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 id="hist" className={s.serif} style={{ fontSize: 22 }}><UiText>Application history</UiText></h2>
          <div className={s.card} style={{ overflow: "hidden" }}>
            {history.map((a) => (
              <div key={a.id} className={s.row}>
                <StatusChip status={a.status} localize />
                <div className={s.grow}><strong>{a.reference}</strong>{a.category ? ` · ${fmt.category(a.category)}` : ""}<div className={`${s.muted} ${s.small}`}>{t("startedOn", { date: fmt.date(a.createdAt) })}{a.submittedAt ? ` · ${t("submittedOnLower", { date: fmt.date(a.submittedAt) })}` : ""}</div></div>
                <Link href={`/fundraising/applications/${a.id}`} className={`${s.btn} ${s.bs}`}><UiText>View</UiText></Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className={`${s.muted} ${s.small}`} style={{ maxWidth: 720 }}>
        <UiText>Confirmed totals count only payments our server has verified. Money raised is not money available to withdraw — how and when funds reach the beneficiary is still being decided.</UiText>
      </p>
    </main>
  );
}

/** Mirrors the backend: cancel needs no review before publication; live ones go through a closure request. */
const CANCELLABLE = ["DRAFT", "CHANGES_REQUESTED", "APPROVED_SETUP_INCOMPLETE"];
const LIVE = ["APPROVED", "PAUSED"];
const WITHDRAWABLE = ["DRAFT", "SUBMITTED", "IN_REVIEW", "INFORMATION_REQUESTED", "RESUBMITTED"];

function ApplicationRow({ app, hasGrant, busy, onWithdraw }: { app: FundraisingApplication; hasGrant: boolean; busy: boolean; onWithdraw: () => void }) {
  const ui = useUiText();
  const t = useTranslations("fundraiserFlow");
  const fmt = useFundraisingLabels();
  const href = `/fundraising/applications/${app.id}`;
  const action: Record<string, { label: string; href: string; primary: boolean }> = {
    DRAFT: { label: ui("Continue application"), href, primary: true },
    SUBMITTED: { label: ui("View application"), href, primary: false },
    IN_REVIEW: { label: ui("View application"), href, primary: false },
    RESUBMITTED: { label: ui("View application"), href, primary: false },
    INFORMATION_REQUESTED: { label: ui("Respond to review"), href: `${href}/respond`, primary: true },
    APPROVED: { label: ui("Prepare fundraiser"), href, primary: true },
    NOT_APPROVED: { label: ui("View decision"), href, primary: false },
  };
  const a = action[app.status] ?? { label: ui("View"), href, primary: false };
  const open = app.infoRequests.filter((q) => !q.response).length;
  const detail =
    app.status === "DRAFT" ? t("thingsLeftToComplete", { count: app.missing.length }) :
    app.status === "INFORMATION_REQUESTED" ? t(hasGrant ? "questionsUnresolvedWithGrant" : "questionsUnresolved", { count: open }) :
    app.submittedAt ? t("submittedOn", { date: fmt.date(app.submittedAt) }) : t("startedOn", { date: fmt.date(app.createdAt) });
  return (
    <div className={s.row}>
      <StatusChip status={app.status} localize />
      <div className={s.grow}>
        <strong>{hasGrant ? t("laterApplication", { reference: app.reference }) : t("application", { reference: app.reference })}{app.category ? ` · ${fmt.category(app.category)}` : ""}</strong>
        <div className={`${s.muted} ${s.small}`}>{detail}</div>
      </div>
      <Link href={a.href} className={`${s.btn} ${a.primary ? s.bp : s.bs}`}>{a.label}</Link>
      {WITHDRAWABLE.includes(app.status) && (
        <button type="button" className={`${s.btn} ${s.bs}`} disabled={busy} onClick={onWithdraw}>{ui("Withdraw")}</button>
      )}
    </div>
  );
}



/** "Needs your action" first (handoff §4.2), then in-review, then finished. */
function rank(status: string) {
  return ({ CHANGES_REQUESTED: 0, DRAFT: 1, PUBLICATION_REVIEW: 2, APPROVED_SETUP_INCOMPLETE: 3, APPROVED: 3, PUBLICATION_DECLINED: 4, CANCELLED: 5 } as Record<string, number>)[status] ?? 6;
}
