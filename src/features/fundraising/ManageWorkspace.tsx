"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "@/components/AppLink";
import {
  fundraisingManage, fundraisingReports, fundraisingOutcomes, type FundraiserOutcome, type FundraiserClosure, type FundraiserDonationRow, type FundraiserOverview,
  type OrganiserInquiryView,
  type FundraiserRevision, type FundraiserUpdate, type FundraisingCampaign,
} from "@/lib/api";
import { useFundraisingLabels, Icon, formatINR, CampaignChip, ReviewChip } from "./ui";
import s from "./fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
type Tab = "overview" | "page" | "donations" | "updates" | "history" | "questions" | "outcome";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "page", label: "Campaign page" },
  { id: "donations", label: "Donations" },
  { id: "updates", label: "Updates" },
  { id: "history", label: "Review history" },
];
const OPEN = ["DRAFT", "SUBMITTED", "CHANGES_REQUESTED"];

type Data = { o: FundraiserOverview; u: FundraiserUpdate[]; r: FundraiserRevision[]; k: FundraiserClosure[]; q: OrganiserInquiryView };

/** Organiser workspace for a live or closed fundraiser (canvas F28–F31, F36). */
export function ManageWorkspace({ c }: { c: FundraisingCampaign }) {
  const ui = useUiText();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    Promise.all([fundraisingManage.overview(c.id), fundraisingManage.updates(c.id), fundraisingManage.revisions(c.id), fundraisingManage.closures(c.id), fundraisingReports.inquiry(c.id)])
      .then(([o, u, r, k, q]) => setData({ o, u, r, k, q }))
      .catch(() => setFailed(true));
  }, [c.id]);
  useEffect(() => { load(); }, [load]);

  const title = c.title || ui("Untitled fundraiser");
  const live = c.status === "APPROVED";
  const paused = c.status === "PAUSED";
  const ended = c.status === "COLLECTIONS_CLOSED" || c.status === "OUTCOME_REPORTING";
  const tabLabel = (id: Tab): string => ({ overview: ui("Overview", "fundraiser tab"), page: ui("Campaign page", "fundraiser tab"), donations: ui("Donations", "fundraiser tab"), updates: ui("Updates", "fundraiser tab"), history: ui("Review history", "fundraiser tab"), questions: ui("Questions from CauseKind", "fundraiser tab"), outcome: ui("Outcome report", "fundraiser tab") })[id];
  const heading: Record<Tab, string> = { overview: title, page: tabLabel("page"), donations: tabLabel("donations"), updates: tabLabel("updates"), history: tabLabel("history"), questions: tabLabel("questions"), outcome: tabLabel("outcome") };
  const tabs = [
    ...TABS,
    ...(data?.q.inquiry ? [{ id: "questions" as Tab, label: "Questions" }] : []),
    ...(ended ? [{ id: "outcome" as Tab, label: "Outcome" }] : []),
  ];

  return (
    <main className={s.wrap} style={{ paddingTop: 32, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/fundraising" className={s.small} style={{ textDecoration: "none" }}><UiText>← Your fundraisers</UiText></Link>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <h1 className={s.serif} style={{ fontSize: tab === "overview" ? 30 : 28 }}>{heading[tab]}</h1>
            {tab === "overview" && <CampaignChip status={c.status} localize />}
          </div>
          {tab === "overview" && <PublicLink id={c.id} />}
        </div>
        {tab === "overview" && live && <button type="button" className={`${s.btn} ${s.bp}`} onClick={() => setTab("updates")}><UiText>Post an update</UiText></button>}
      </div>

      <nav className={s.tabs} aria-label={ui("Campaign workspace")}>
        {tabs.map((t) => (
          <button key={t.id} type="button" className={`${s.tab} ${tab === t.id ? s.tabOn : ""}`} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>{tabLabel(t.id)}</button>
        ))}
      </nav>

      {failed ? (
        <div className={s.card} role="alert" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <strong><UiText>Couldn&apos;t load your fundraiser</UiText></strong>
          <button type="button" className={`${s.btn} ${s.bs}`} onClick={load}><UiText>Retry</UiText></button>
        </div>
      ) : !data ? (
        <div className={s.card} aria-busy="true" style={{ minHeight: 240 }} />
      ) : tab === "overview" ? (
        <Overview d={data} live={live} paused={paused} go={setTab} onClose={() => setClosing(true)} />
      ) : tab === "page" ? (
        <PageChanges c={c} raised={data.o.confirmedTotal} live={live} revisions={data.r} reload={load} />
      ) : tab === "donations" ? (
        <Donations id={c.id} o={data.o} />
      ) : tab === "updates" ? (
        <Updates id={c.id} live={live || paused || ended} updates={data.u} reload={load} />
      ) : tab === "outcome" && ended ? (
        <OutcomeTab id={c.id} />
      ) : tab === "questions" && data.q.inquiry ? (
        <Questions key={data.q.inquiry.id} id={c.id} view={data.q} reload={load} />
      ) : (
        <History d={data} />
      )}

      {closing && data && <ClosureDialog c={c} o={data.o} onDone={() => { setClosing(false); load(); }} onCancel={() => setClosing(false)} />}
    </main>
  );
}

function PublicLink({ id }: { id: number }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? `/fundraisers/${id}` : `${window.location.origin}/fundraisers/${id}`;
  return (
    <p className={`${s.small} ${s.muted}`}>
      {t("publicLink")} <Link href={`/fundraisers/${id}`}>{url.replace(/^https?:\/\//, "")}</Link> ·{" "}
      <button type="button" className={`${s.btn} ${s.bs}`} style={{ minHeight: 32, padding: "0 10px", fontSize: 13 }}
        onClick={() => { navigator.clipboard?.writeText(url).then(() => setCopied(true)).catch(() => {}); }}>
        {copied ? ui("Link copied") : ui("Copy link")}
      </button>
    </p>
  );
}

// ── F28 Overview ────────────────────────────────────────────────────────────

function Overview({ d, live, paused, go, onClose }: { d: Data; live: boolean; paused: boolean; go: (t: Tab) => void; onClose: () => void }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const fmt = useFundraisingLabels();
  const inq = d.q.inquiry;
  const { o } = d;
  const pct = o.target ? Math.min(100, Math.round((o.confirmedTotal / o.target) * 100)) : 0;
  const daysLeft = o.endDate ? Math.ceil((new Date(o.endDate).getTime() - Date.now()) / 86400000) : null;
  const openClosure = d.k.find((k) => k.status === "SUBMITTED");
  const inReview = [
    ...d.u.filter((u) => u.status === "SUBMITTED" || u.status === "CHANGES_REQUESTED").map((u) => ({ key: `u${u.id}`, status: u.status, text: `Update "${u.title || "Untitled"}"`, at: u.submittedAt ?? u.createdAt, tab: "updates" as Tab })),
    ...d.r.filter((r) => r.status === "SUBMITTED" || r.status === "CHANGES_REQUESTED").map((r) => ({ key: `r${r.id}`, status: r.status, text: ui("Page revision"), at: r.submittedAt ?? r.createdAt, tab: "page" as Tab })),
    ...d.k.filter((k) => k.status === "SUBMITTED").map((k) => ({ key: `k${k.id}`, status: k.status, text: ui("Closure request"), at: k.createdAt, tab: "history" as Tab })),
  ];

  return (
    <>
      {openClosure && (
        <div role="status" className={s.card} style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "center", background: "#eaf0f8", borderColor: "#c9d6e6", flexWrap: "wrap" }}>
          <span style={{ color: "#1e3a60" }}><Icon name="clock" /></span>
          <p style={{ flex: "1 1 400px" }}><strong><UiText>Next:</UiText></strong> {t("closureWithCauseKind", { date: fmt.date(openClosure.createdAt) })} {paused ? ui("Donations stay paused until it's decided.") : ui("Your fundraiser stays Live and keeps taking donations until it's decided.")}</p>
          <span className={`${s.chip} ${s.cN}`}><UiText>Closure request · Submitted</UiText></span>
        </div>
      )}
      {paused && (
        <div role="status" className={s.card} style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, background: "#fdf3e1", borderColor: "#f0d9a8" }}>
          <p><strong><UiText>Donations are paused.</UiText></strong> {t("pauseNoticeShown", { notice: d.q.pauseNotice ?? "" })}</p>
          {d.q.pauseActions && <p className={s.small}><strong><UiText>What CauseKind needs from you:</UiText></strong> {d.q.pauseActions}</p>}
          <p className={`${s.small} ${s.muted}`}>{t("pausedOn", { date: fmt.date(d.q.pausedAt) })}</p>
        </div>
      )}
      {inq?.status === "OPEN" && (
        <div role="status" className={s.card} style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "center", background: "#eaf0f8", borderColor: "#c9d6e6", flexWrap: "wrap" }}>
          <p style={{ flex: "1 1 400px" }}><strong><UiText>CauseKind has some questions about your fundraiser.</UiText></strong> {t("notAFinding")}{inq.deadline ? ` ${t("answerBy", { date: fmt.date(inq.deadline) })}` : ""}</p>
          <button type="button" className={`${s.btn} ${s.bp}`} onClick={() => go("questions")}><UiText>Answer questions</UiText></button>
        </div>
      )}
      {(d.o.status === "COLLECTIONS_CLOSED" || d.o.status === "OUTCOME_REPORTING") && (
        <div role="status" className={s.card} style={{ padding: "16px 20px", background: "#f1ece6" }}>
          <p><strong><UiText>Donations have ended.</UiText></strong> <UiText>Your public page stays visible and shows &quot;No longer accepting donations&quot;. Next:</UiText> <button type="button" className={s.bq} style={{ minHeight: 0, padding: 0 }} onClick={() => go("outcome")}><UiText>tell donors what happened</UiText></button><UiText>. You can still post updates.</UiText></p>
        </div>
      )}

      <div className={s.grid3}>
        <div className={`${s.card} ${s.stat}`}>
          <span className={`${s.small} ${s.muted}`}><UiText>Confirmed so far</UiText></span>
          <strong className={s.tabular} style={{ fontSize: 28 }}>{formatINR(o.confirmedTotal)}</strong>
          <div className={s.prog} aria-hidden="true" style={{ background: "#efe7de" }}><span style={{ width: `${pct}%`, background: "var(--fr-donee)" }} /></div>
          <span className={`${s.small} ${s.muted}`}>{t("ofTargetDonations", { target: formatINR(o.target), count: o.confirmedCount })}</span>
        </div>
        <div className={`${s.card} ${s.stat}`}>
          <span className={`${s.small} ${s.muted}`}><UiText>Pending confirmation</UiText></span>
          <strong className={s.tabular} style={{ fontSize: 28 }}>{o.pendingCount}</strong>
          <span className={`${s.small} ${s.muted}`}><UiText>Not counted until our server confirms them</UiText></span>
        </div>
        <div className={`${s.card} ${s.stat}`}>
          <span className={`${s.small} ${s.muted}`}><UiText>Ends</UiText></span>
          <strong style={{ fontSize: 28 }}>{o.endDate ? fmt.date(o.endDate) : "—"}</strong>
          <span className={`${s.small} ${s.muted}`}>{!live ? ui("Collections closed") : daysLeft === null ? "" : daysLeft > 0 ? t("daysLeft", { count: daysLeft }) : ui("Ends today")}</span>
        </div>
      </div>
      <p className={`${s.small} ${s.muted}`} style={{ maxWidth: 760 }}>
        <UiText>This is money donors have given, not money available to withdraw. Donations are received by Sahas Charitable Trust, which transfers them to the beneficiary — there&apos;s nothing for you to set up.</UiText>
      </p>

      <div className={s.grid2} style={{ gap: 16 }}>
        <section className={s.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="rv">
          <h2 id="rv" style={{ fontSize: 16, fontWeight: 700 }}><UiText>Under review</UiText></h2>
          {inReview.length === 0 ? <p className={`${s.small} ${s.muted}`}><UiText>Nothing waiting for CauseKind.</UiText></p> : inReview.map((i) => (
            <p key={i.key} className={s.small} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <ReviewChip status={i.status} /> {i.text} · {fmt.date(i.at)}
              {i.status === "CHANGES_REQUESTED" && <> · <button type="button" className={s.bq} style={{ minHeight: 0, padding: 0 }} onClick={() => go(i.tab)}><UiText>Make changes</UiText></button></>}
            </p>
          ))}
        </section>
        <section className={s.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="ac">
          <h2 id="ac" style={{ fontSize: 16, fontWeight: 700 }}><UiText>Actions</UiText></h2>
          <button type="button" className={`${s.btn} ${s.bs}`} style={{ justifyContent: "flex-start" }} disabled={!live} onClick={() => go("page")}><UiText>Edit campaign page</UiText></button>
          <button type="button" className={`${s.btn} ${s.bs}`} style={{ justifyContent: "flex-start" }} onClick={() => go("updates")}><UiText>Post an update</UiText></button>
          <button type="button" className={`${s.btn} ${s.bs}`} style={{ justifyContent: "flex-start" }} aria-disabled={!(live || paused) || !!openClosure} disabled={!(live || paused) || !!openClosure} onClick={onClose}>
            <UiText>Request closure</UiText> {openClosure && <span className={`${s.small} ${s.muted}`}><UiText>· already requested</UiText></span>}
          </button>
        </section>
      </div>
    </>
  );
}

// ── F29 Donations ───────────────────────────────────────────────────────────

function Donations({ id, o }: { id: number; o: FundraiserOverview }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const fmt = useFundraisingLabels();
  const [rows, setRows] = useState<FundraiserDonationRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { fundraisingManage.donations(id).then(setRows).catch(() => setFailed(true)); }, [id]);
  if (failed) return <div className={s.card} role="alert" style={{ padding: 20 }}><strong><UiText>Couldn&apos;t load donations</UiText></strong></div>;
  if (!rows) return <div className={s.card} aria-busy="true" style={{ minHeight: 160 }} />;
  return (
    <>
      <p className={`${s.small} ${s.muted}`}>{t("confirmedPending", { confirmed: o.confirmedCount, pending: o.pendingCount })}</p>
      {rows.length === 0 ? (
        <section className={s.card} style={{ padding: 28, textAlign: "center", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", background: "#fbf8f4", borderStyle: "dashed", maxWidth: 520 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}><UiText>No donations yet</UiText></h2>
          <p className={`${s.small} ${s.muted}`}><UiText>Share your fundraiser link to let people know.</UiText></p>
          <PublicLink id={id} />
        </section>
      ) : (
        <div className={s.card} style={{ overflowX: "auto" }}>
          <table className={s.table}>
            <thead><tr><th><UiText>Donor</UiText></th><th className={s.tabular}><UiText>Amount</UiText></th><th><UiText>Date</UiText></th><th><UiText>Payment</UiText></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className={s.tabular}>{formatINR(r.amount)}</td>
                  <td>{fmt.date(r.at)}</td>
                  <td><span className={`${s.chip} ${r.status === "COMPLETED" ? s.cOk : s.cN}`}>{r.status === "COMPLETED" ? ui("Confirmed") : ui("Pending")}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={`${s.small} ${s.muted}`}><UiText>Pending donations aren&apos;t in your total yet. Failed or cancelled payments aren&apos;t listed. Donors who chose to hide their name are shown as Anonymous.</UiText></p>
    </>
  );
}

// ── F30 Campaign page changes ───────────────────────────────────────────────

function PageChanges({ c, raised, live, revisions, reload }: { c: FundraisingCampaign; raised: number; live: boolean; revisions: FundraiserRevision[]; reload: () => void }) {
  const t = useTranslations("fundraiserFlow");
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  const id = c.id;
  const open = revisions.find((r) => OPEN.includes(r.status));
  const lastDeclined = !open ? revisions.find((r) => r.status === "DECLINED") : undefined;
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<"published" | "draft">("draft");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); setEditing(false); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : ui("Something went wrong")); }
    finally { setBusy(false); }
  };

  if (!live) return <p className={s.muted}><UiText>Donations have stopped, so the campaign page can no longer be changed.</UiText></p>;

  // Every revision carries the live page as it is now; with none yet, the campaign itself.
  const base = revisions[0];
  const current: Current = base
    ? { title: base.currentTitle, story: base.currentStory, target: base.currentTarget, endDate: base.currentEndDate }
    : { title: c.title, story: c.story, target: c.targetAmount, endDate: c.endDate };

  if (editing) {
    return <RevisionForm current={current} raised={raised} existing={open} busy={busy} err={err} onCancel={() => setEditing(false)}
      onSave={(body) => act(() => open ? fundraisingManage.saveRevision(id, open.id, { ...body, expectedVersion: open.version }) : fundraisingManage.createRevision(id, body))} />;
  }

  return (
    <>
      {open?.status === "CHANGES_REQUESTED" && open.reviewerMessage && (
        <div role="status" className={s.card} style={{ padding: "14px 18px", display: "flex", gap: 12, alignItems: "center", background: "#fdf3e1", borderColor: "#f0d9a8", flexWrap: "wrap" }}>
          <ReviewChip status="CHANGES_REQUESTED" />
          <p style={{ flex: "1 1 400px" }}>{t("reviewerSaid", { message: open.reviewerMessage ?? "", date: fmt.date(open.decidedAt) })}</p>
        </div>
      )}
      {open?.status === "SUBMITTED" && (
        <div role="status" className={s.card} style={{ padding: "14px 18px", display: "flex", gap: 12, alignItems: "center", background: "#eaf0f8", borderColor: "#c9d6e6", flexWrap: "wrap" }}>
          <ReviewChip status="SUBMITTED" /><p style={{ flex: "1 1 400px" }}><UiText>Your changes are with CauseKind. Donors still see the published version until they&apos;re approved.</UiText></p>
        </div>
      )}

      {open ? (
        <>
          <div className={s.ver} role="tablist" aria-label={ui("Version")}>
            <button type="button" role="tab" aria-selected={view === "published"} className={view === "published" ? s.verOn : ""} onClick={() => setView("published")}><UiText>Published version</UiText></button>
            <button type="button" role="tab" aria-selected={view === "draft"} className={view === "draft" ? s.verOn : ""} onClick={() => setView("draft")}>{open.status === "SUBMITTED" ? ui("Submitted revision") : ui("Draft changes")}</button>
          </div>
          <div className={s.grid2} style={{ gap: 16 }}>
            <section className={`${s.card} ${s.col}`} aria-labelledby="pub">
              <p id="pub" className={s.colLbl}><UiText>Published · live now</UiText></p>
              <p><strong><UiText>Title</UiText></strong> {current.title}</p>
              <p><strong><UiText>Target</UiText></strong> {formatINR(current.target)}</p>
              <p><strong><UiText>End date</UiText></strong> {fmt.date(current.endDate)}</p>
              <p className={s.small} style={{ whiteSpace: "pre-wrap" }}>{view === "published" ? current.story : `${(current.story ?? "").slice(0, 160)}${(current.story ?? "").length > 160 ? "…" : ""}`}</p>
            </section>
            <section className={`${s.card} ${s.col}`} style={{ borderColor: "#b9c9de" }} aria-labelledby="dr">
              <p id="dr" className={s.colLbl} style={{ color: "#1e3a60" }}>{open.status === "SUBMITTED" ? ui("Submitted changes") : ui("Your draft changes")}</p>
              <Diff label={ui("Title")} from={current.title} to={open.title} />
              <Diff label={ui("Target")} from={formatINR(current.target)} to={open.targetAmount != null ? formatINR(open.targetAmount) : null} material />
              <Diff label={ui("End date")} from={fmt.date(current.endDate)} to={open.endDate ? fmt.date(open.endDate) : null} material />
              <p className={s.small}><strong><UiText>Story</UiText></strong> {open.story ? <mark className={s.add}><UiText>rewritten</UiText></mark> : <span className={`${s.chip} ${s.cM}`}><UiText>unchanged</UiText></span>}</p>
              {view === "draft" && open.story && <p className={s.small} style={{ whiteSpace: "pre-wrap" }}>{open.story}</p>}
              {open.changeReason && <p className={s.small}><strong><UiText>Why:</UiText></strong> {open.changeReason}</p>}
            </section>
          </div>
        </>
      ) : (
        <section className={`${s.card} ${s.col}`} style={{ maxWidth: 820 }}>
          <p className={s.colLbl}><UiText>Published · live now</UiText></p>
          <p><strong><UiText>Title</UiText></strong> {current.title}</p>
          <p><strong><UiText>Target</UiText></strong> {formatINR(current.target)} · <strong><UiText>End date</UiText></strong> {fmt.date(current.endDate)}</p>
          {lastDeclined && <p className={s.small}><ReviewChip status="DECLINED" /> {t("lastChangeDeclined", { message: lastDeclined.reviewerMessage ?? "" })}</p>}
        </section>
      )}

      <p className={`${s.small} ${s.muted}`} style={{ maxWidth: 820 }}>
        <UiText>Changes to the target or end date are</UiText> <strong><UiText>material</UiText></strong> <UiText>and always need a reason. Every change is reviewed before donors see it. Payment details aren&apos;t editable here.</UiText>
      </p>
      {err && <p className={s.errText} role="alert">{err}</p>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {(!open || open.status !== "SUBMITTED") && <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setEditing(true)} disabled={busy}>{open ? ui("Edit draft") : ui("Propose changes")}</button>}
        {open && open.status !== "SUBMITTED" && <button type="button" className={`${s.btn} ${s.bp}`} disabled={busy} onClick={() => act(() => fundraisingManage.submitRevision(id, open.id))}>{open.status === "CHANGES_REQUESTED" ? ui("Resubmit revision") : ui("Submit for review")}</button>}
        {open?.status === "DRAFT" && <button type="button" className={`${s.btn} ${s.bs} ${s.danger}`} disabled={busy} onClick={() => act(() => fundraisingManage.deleteRevision(id, open.id))}><UiText>Discard draft changes</UiText></button>}
      </div>
    </>
  );
}

function Diff({ label, from, to, material }: { label: string; from: string | null; to: string | null; material?: boolean }) {
  if (to == null) return <p><strong>{label}</strong> {from} <span className={`${s.chip} ${s.cM}`}><UiText>unchanged</UiText></span></p>;
  return <p><strong>{label}</strong> <span className={s.del}>{from}</span> <mark className={s.add}>{to}</mark> {material && <span className={`${s.chip} ${s.cW}`}><UiText>Material change</UiText></span>}</p>;
}

type Current = { title: string | null; story: string | null; target: number | null; endDate: string | null };

function RevisionForm({ current, raised, existing, busy, err, onSave, onCancel }: {
  current: Current; raised: number; existing?: FundraiserRevision; busy: boolean; err: string | null;
  onSave: (b: { title: string | null; story: string | null; targetAmount: number | null; endDate: string | null; changeReason: string | null }) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const [title, setTitle] = useState(existing?.title ?? current.title ?? "");
  const [story, setStory] = useState(existing?.story ?? current.story ?? "");
  const [target, setTarget] = useState(String(existing?.targetAmount ?? current.target ?? ""));
  const [end, setEnd] = useState(existing?.endDate ?? current.endDate ?? "");
  const [reason, setReason] = useState(existing?.changeReason ?? "");
  const material = Number(target) !== Number(current.target) || (end || null) !== current.endDate;
  const tooLow = !!target && Number(target) < raised;

  return (
    <form className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, maxWidth: 820 }}
      onSubmit={(e) => { e.preventDefault(); onSave({ title: title || null, story: story || null, targetAmount: target ? Number(target) : null, endDate: end || null, changeReason: reason || null }); }}>
      <h2 style={{ fontSize: 17, fontWeight: 700 }}>{existing ? ui("Edit your draft changes") : ui("Propose changes to the live page")}</h2>
      <p className={`${s.small} ${s.muted}`}><UiText>Donors keep seeing the published page until CauseKind approves your changes.</UiText></p>
      <div><label className={s.lbl} htmlFor="rt"><UiText>Title</UiText></label><input id="rt" className={s.in} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label className={s.lbl} htmlFor="rs"><UiText>Story</UiText></label><textarea id="rs" className={s.in} rows={8} maxLength={5000} value={story} onChange={(e) => setStory(e.target.value)} style={{ resize: "vertical" }} /></div>
      <div className={s.grid2}>
        <div>
          <label className={s.lbl} htmlFor="rg"><UiText>Target (₹)</UiText></label>
          <input id="rg" className={s.in} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))} aria-invalid={tooLow ? true : undefined} />
          {tooLow && <p className={s.errText}>{t("targetBelowRaised", { raised: formatINR(raised) })}</p>}
        </div>
        <div><label className={s.lbl} htmlFor="re"><UiText>End date</UiText></label><input id="re" type="date" className={s.in} value={end} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>
      {material && (
        <div>
          <label className={s.lbl} htmlFor="rw"><UiText>Why is the target or end date changing?</UiText> <span className={`${s.chip} ${s.cW}`}><UiText>Material change</UiText></span></label>
          <textarea id="rw" className={s.in} rows={3} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
      {err && <p className={s.errText} role="alert">{err}</p>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {onCancel && <button type="button" className={`${s.btn} ${s.bs}`} onClick={onCancel}><UiText>Cancel</UiText></button>}
        <button type="submit" className={`${s.btn} ${s.bp}`} disabled={busy || tooLow || (material && !reason.trim())}><UiText>Save draft</UiText></button>
      </div>
    </form>
  );
}

// ── F31 Updates ─────────────────────────────────────────────────────────────

function Updates({ id, live, updates, reload }: { id: number; live: boolean; updates: FundraiserUpdate[]; reload: () => void }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const fmt = useFundraisingLabels();
  const editable = updates.find((u) => u.status === "CHANGES_REQUESTED") ?? updates.find((u) => u.status === "DRAFT");
  const [sel, setSel] = useState<FundraiserUpdate | null>(editable ?? null);
  const [title, setTitle] = useState(sel?.title ?? "");
  const [body, setBody] = useState(sel?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const pick = (u: FundraiserUpdate | null) => { setSel(u); setTitle(u?.title ?? ""); setBody(u?.body ?? ""); setErr(null); setSaved(false); };
  const canEdit = !sel || sel.status === "DRAFT" || sel.status === "CHANGES_REQUESTED";

  const save = async (submit: boolean) => {
    setBusy(true); setErr(null); setSaved(false);
    try {
      let u = sel
        ? await fundraisingManage.saveUpdate(id, sel.id, { title, body, expectedVersion: sel.version })
        : await fundraisingManage.createUpdate(id, { title, body });
      if (submit) { u = await fundraisingManage.submitUpdate(id, u.id); pick(null); }
      else { setSel(u); setSaved(true); }
      reload();
    } catch (e) { setErr(e instanceof Error ? e.message : ui("Something went wrong")); }
    finally { setBusy(false); }
  };

  return (
    <div className={s.composer}>
      {live ? (
        <form className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }} aria-labelledby="nu" onSubmit={(e) => { e.preventDefault(); save(true); }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <h2 id="nu" style={{ fontSize: 17, fontWeight: 700 }}>{sel && canEdit ? (sel.status === "DRAFT" ? ui("Draft update") : ui("Revise update")) : sel ? ui("Update") : ui("New update")}</h2>
            {sel && <ReviewChip status={sel.status} />}
          </div>
          {sel?.reviewerMessage && <p className={s.small} style={{ padding: "10px 12px", borderRadius: 8, background: sel.status === "DECLINED" ? "#fbeaea" : "#fdf3e1" }}>{t("reviewerQuote", { message: sel.reviewerMessage, date: fmt.date(sel.decidedAt) })}</p>}
          <div><label className={s.lbl} htmlFor="t"><UiText>Title</UiText></label><input id="t" className={s.in} maxLength={160} value={title} readOnly={!canEdit} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label className={s.lbl} htmlFor="b"><UiText>What&apos;s happened</UiText></label><textarea id="b" className={s.in} rows={6} maxLength={5000} value={body} readOnly={!canEdit} onChange={(e) => setBody(e.target.value)} style={{ resize: "vertical" }} /></div>
          {canEdit && <div style={{ padding: "12px 14px", borderRadius: 10, background: "#eaf0f8" }} className={s.small}><strong><UiText>Before you send:</UiText></strong> <UiText>remove phone numbers, addresses, hospital file numbers and anyone&apos;s full name who hasn&apos;t agreed. It appears publicly, dated, only after CauseKind approves it.</UiText></div>}
          {err && <p className={s.errText} role="alert">{err}</p>}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            {saved && <span className={`${s.small} ${s.muted}`}><UiText>Draft saved</UiText></span>}
            {sel && <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => pick(null)}><UiText>New update</UiText></button>}
            {sel?.status === "DRAFT" && <button type="button" className={`${s.btn} ${s.bs} ${s.danger}`} disabled={busy} onClick={async () => { setBusy(true); try { await fundraisingManage.deleteUpdate(id, sel.id); pick(null); reload(); } finally { setBusy(false); } }}><UiText>Delete draft</UiText></button>}
            {canEdit && <button type="button" className={`${s.btn} ${s.bs}`} disabled={busy || (!title.trim() && !body.trim())} onClick={() => save(false)}><UiText>Save draft</UiText></button>}
            {canEdit && <button type="submit" className={`${s.btn} ${s.bp}`} disabled={busy || !title.trim() || !body.trim()}>{sel?.status === "CHANGES_REQUESTED" ? ui("Resubmit for review") : ui("Send for review")}</button>}
          </div>
        </form>
      ) : <p className={s.muted}><UiText>Updates can&apos;t be posted on this fundraiser.</UiText></p>}

      <section className={s.card} style={{ padding: 20 }} aria-labelledby="tl">
        <h2 id="tl" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}><UiText>Your updates</UiText></h2>
        {updates.length === 0 ? <p className={`${s.small} ${s.muted}`} style={{ paddingTop: 10 }}><UiText>No updates yet. Donors like hearing how things are going.</UiText></p> : updates.map((u) => (
          <button key={u.id} type="button" className={s.it} onClick={() => pick(u)}
            style={{ width: "100%", background: sel?.id === u.id ? "#f8fafd" : "none", border: 0, borderTop: "1px solid #efe7de", textAlign: "left", font: "inherit", cursor: "pointer", color: "inherit" }}>
            <ReviewChip status={u.status} />
            <div style={{ flex: 1 }}>
              <strong className={s.small}>{u.title || ui("Untitled")}</strong>
              <p className={`${s.small} ${s.muted}`}>{u.status === "DRAFT" ? ui("not sent") : fmt.date(u.decidedAt ?? u.submittedAt ?? u.createdAt)}{u.status === "DECLINED" && u.reviewerMessage ? ` · "${u.reviewerMessage}"` : ""}</p>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}

// ── Review history ──────────────────────────────────────────────────────────

function History({ d }: { d: Data }) {
  const ui = useUiText();
  const fmt = useFundraisingLabels();
  const rows = [
    ...d.u.filter((u) => u.status !== "DRAFT").map((u) => ({ key: `u${u.id}`, kind: "Update", text: u.title || "Untitled", status: u.status, msg: u.reviewerMessage, at: u.decidedAt ?? u.submittedAt ?? u.createdAt })),
    ...d.r.filter((r) => r.status !== "DRAFT").map((r) => ({ key: `r${r.id}`, kind: ui("Page revision"), text: r.material ? ui("Includes target or end date") : ui("Title or story"), status: r.status, msg: r.reviewerMessage, at: r.decidedAt ?? r.submittedAt ?? r.createdAt })),
    ...d.k.map((k) => ({ key: `k${k.id}`, kind: ui("Closure request"), text: k.reason, status: k.status, msg: k.reviewerMessage, at: k.decidedAt ?? k.createdAt })),
  ].sort((x, y) => (y.at ?? "").localeCompare(x.at ?? ""));
  if (rows.length === 0) return <p className={s.muted}><UiText>Nothing has been sent for review yet.</UiText></p>;
  return (
    <div className={s.card} style={{ overflowX: "auto" }}>
      <table className={s.table}>
        <thead><tr><th><UiText>Item</UiText></th><th><UiText>Status</UiText></th><th><UiText>Reviewer</UiText></th><th><UiText>Date</UiText></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td><strong className={s.small}>{r.kind}</strong><div className={`${s.small} ${s.muted}`}>{r.text}</div></td>
              <td><ReviewChip status={r.status} approvedLabel={r.kind === "Update" ? "Published" : "Approved"} /></td>
              <td className={s.small}>{r.msg ?? "—"}</td>
              <td className={s.small}>{fmt.date(r.at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── F36 Closure request ─────────────────────────────────────────────────────

function ClosureDialog({ c, o, onDone, onCancel }: { c: FundraisingCampaign; o: FundraiserOverview; onDone: () => void; onCancel: () => void }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCancel]);
  const send = async () => {
    setBusy(true); setErr(null);
    try { await fundraisingManage.requestClosure(c.id, reason); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : ui("Something went wrong")); setBusy(false); }
  };
  return (
    <div className={s.scrim} onClick={onCancel}>
      <section role="dialog" aria-modal="true" aria-labelledby="cl" className={s.card} onClick={(e) => e.stopPropagation()}
        style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 16px 40px rgba(0,0,0,.08)", maxWidth: 560, width: "100%" }}>
        <p className={s.sec} style={{ color: "#1e3a60" }}><UiText>Request</UiText></p>
        <h2 id="cl" className={s.serif} style={{ fontSize: 22 }}><UiText>Request to close donations</UiText></h2>
        <p className={s.small}>{t("titleConfirmedOf", { title: c.title ?? "", confirmed: formatINR(o.confirmedTotal), target: formatINR(o.target) })}</p>
        <div><label className={s.lbl} htmlFor="w"><UiText>Why do you want to close now?</UiText></label><textarea id="w" className={s.in} rows={3} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></div>
        <p className={s.small} style={{ padding: "12px 14px", borderRadius: 10, background: "#eaf0f8" }}>
          <UiText>Your fundraiser keeps taking donations until CauseKind decides. Closing early doesn&apos;t mean refunds — donations are not refundable, and money already given still goes to the beneficiary through Sahas Charitable Trust.</UiText>
        </p>
        {err && <p className={s.errText} role="alert">{err}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className={`${s.btn} ${s.bs}`} onClick={onCancel}><UiText>Cancel</UiText></button>
          <button type="button" className={`${s.btn} ${s.bp}`} disabled={busy || !reason.trim()} onClick={send}><UiText>Send request</UiText></button>
        </div>
      </section>
    </div>
  );
}

// ── F35 Questions from CauseKind ────────────────────────────────────────────

function Questions({ id, view, reload }: { id: number; view: OrganiserInquiryView; reload: () => void }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const fmt = useFundraisingLabels();
  const inq = view.inquiry!;
  const open = inq.status === "OPEN";
  const [answers, setAnswers] = useState<Record<number, string>>(() => Object.fromEntries(inq.questions.map((q) => [q.id, q.answer ?? ""])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const unanswered = inq.questions.find((q) => !(answers[q.id] ?? "").trim());

  const save = () => fundraisingReports.saveAnswers(id, inq.questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? "" })));
  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true); setErr(null); setSaved(false);
    try { await fn(); after?.(); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : ui("Something went wrong")); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 820 }}>
      {open ? (
        <div className={s.card} style={{ padding: "16px 20px", background: "#eaf0f8", borderColor: "#c9d6e6", display: "flex", flexDirection: "column", gap: 6 }}>
          <span className={`${s.chip} ${s.cW}`} style={{ alignSelf: "flex-start" }}><UiText>Response requested</UiText></span>
          <p><strong><UiText>We&apos;ve received information we need to check.</UiText></strong> <UiText>This isn&apos;t a finding against you. We won&apos;t tell you who contacted us.</UiText></p>
          {inq.deadline && <p className={s.small}>{t.rich("answerByRich", { date: fmt.date(inq.deadline), strong: (chunks) => <strong>{chunks}</strong> })}</p>}
        </div>
      ) : (
        <div className={s.card} role="status" style={{ padding: "16px 20px", background: "#e6f2ea", borderColor: "#bcd9c6" }}>
          <p>{t.rich("responseSentRich", { date: fmt.date(inq.answeredAt), strong: (chunks) => <strong>{chunks}</strong> })}</p>
        </div>
      )}
      {inq.questions.map((q) => (
        <section key={q.id} className={s.card} style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby={`q${q.id}`}>
          <p className={s.colLbl}>{t("questionNumber", { n: q.position })}</p>
          <p id={`q${q.id}`}><strong>&quot;{q.question}&quot;</strong></p>
          <label className={s.lbl} htmlFor={`a${q.id}`}><UiText>Your answer</UiText></label>
          <textarea id={`a${q.id}`} className={s.in} rows={4} maxLength={5000} readOnly={!open} value={answers[q.id] ?? ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} style={{ resize: "vertical" }} />
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className={s.small}><UiText>Evidence</UiText> <span className={s.muted}><UiText>(optional)</UiText></span>:</span>
            {q.hasEvidence ? (
              <>
                <span className={s.small}>{t("fileUploaded", { file: q.evidenceFileName || ui("file") })}</span>
                {open && <button type="button" className={s.bq} disabled={busy} onClick={() => run(() => fundraisingReports.removeEvidence(id, q.id))}><UiText>Remove</UiText></button>}
              </>
            ) : open ? (
              <label className={`${s.btn} ${s.bs}`} style={{ minHeight: 36 }}><UiText>Add file</UiText>
                <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) run(async () => { await save(); await fundraisingReports.uploadEvidence(id, q.id, f); }); }} />
              </label>
            ) : <span className={`${s.small} ${s.muted}`}><UiText>none</UiText></span>}
          </div>
        </section>
      ))}
      {err && <p className={s.errText} role="alert">{err}</p>}
      {open && (
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
          {saved && <span className={`${s.small} ${s.muted}`}><UiText>Draft saved</UiText></span>}
          <button type="button" className={`${s.btn} ${s.bs}`} disabled={busy} onClick={() => run(save, () => setSaved(true))}><UiText>Save and finish later</UiText></button>
          <button type="button" className={`${s.btn} ${s.bp}`} disabled={busy || !!unanswered} onClick={() => run(async () => { await save(); await fundraisingReports.submitAnswers(id); })}>
            {unanswered ? t("answerQuestionToSend", { n: unanswered.position }) : ui("Send response")}
          </button>
        </div>
      )}
      <p className={`${s.small} ${s.muted}`}><UiText>After you send, a reviewer decides whether to keep or reopen donations.</UiText></p>
    </div>
  );
}

// ── F37 Outcome report ──────────────────────────────────────────────────────

function OutcomeTab({ id }: { id: number }) {
  const t = useTranslations("fundraiserFlow");
  const [o, setO] = useState<FundraiserOutcome | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => { fundraisingOutcomes.current(id).then((x) => setO(x ?? null)).catch(() => setFailed(true)); }, [id]);
  useEffect(() => { load(); }, [load]);
  if (failed) return <div className={s.card} role="alert" style={{ padding: 20 }}><strong><UiText>Couldn&apos;t load your outcome report</UiText></strong></div>;
  if (o === undefined) return <div className={s.card} aria-busy="true" style={{ minHeight: 200 }} />;
  if (o === null || o.status === "DECLINED") {
    return (
      <section className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 12, maxWidth: 820 }}>
        {o?.status === "DECLINED" && <p className={s.small} style={{ padding: "10px 12px", borderRadius: 8, background: "#fbeaea" }}>{t("outcomeDeclined", { message: o.reviewerMessage ?? "" })}</p>}
        <h2 className={s.serif} style={{ fontSize: 22 }}><UiText>Tell donors what happened</UiText></h2>
        <p className={s.muted}><UiText>Donations have ended. Share what the money paid for and how things are now. CauseKind reviews it before it appears on your page.</UiText></p>
        <button type="button" className={`${s.btn} ${s.bp}`} style={{ alignSelf: "flex-start" }}
          onClick={() => fundraisingOutcomes.start(id).then(setO).catch(() => setFailed(true))}><UiText>Start outcome report</UiText></button>
      </section>
    );
  }
  return <OutcomeEditor key={o.id} campaignId={id} initial={o} onChange={setO} />;
}

function OutcomeEditor({ campaignId, initial, onChange }: { campaignId: number; initial: FundraiserOutcome; onChange: (o: FundraiserOutcome) => void }) {
  const t = useTranslations("fundraiserFlow");
  const ui = useUiText();
  const o = initial;
  const editable = o.status === "DRAFT" || o.status === "CHANGES_REQUESTED";
  const [used, setUsed] = useState(o.moneyUsed ?? "");
  const [now, setNow] = useState(o.currentSituation ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const shortfall = o.target != null ? Math.max(0, o.target - o.confirmed) : 0;

  const save = () => fundraisingOutcomes.save(campaignId, o.id, { moneyUsed: used, currentSituation: now, expectedVersion: o.version });
  const run = async (fn: () => Promise<FundraiserOutcome>, after?: () => void) => {
    setBusy(true); setErr(null); setSaved(false);
    try { onChange(await fn()); after?.(); }
    catch (e) { setErr(e instanceof Error ? e.message : ui("Something went wrong")); }
    finally { setBusy(false); }
  };

  return (
    <div className={s.composer}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {o.status !== "DRAFT" && (
          <div role="status" className={s.card} style={{ padding: "14px 18px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
            background: o.status === "APPROVED" ? "#e6f2ea" : o.status === "CHANGES_REQUESTED" ? "#fdf3e1" : "#eaf0f8" }}>
            <ReviewChip status={o.status} />
            <p style={{ flex: "1 1 360px" }}>
              {o.status === "SUBMITTED" && ui("With CauseKind for review. It isn't public yet.")}
              {o.status === "APPROVED" && ui("Published on your fundraiser page. Your fundraiser stays in Outcome reporting for now.")}
              {o.status === "CHANGES_REQUESTED" && t("reviewerQuoteShort", { message: o.reviewerMessage ?? "" })}
            </p>
          </div>
        )}
        <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h2 className={s.serif} style={{ fontSize: 22 }}><UiText>Tell donors what happened</UiText></h2>
            <p className={`${s.small} ${s.muted}`} style={{ marginTop: 4 }}>
              {t("donationsEndedAt", { confirmed: formatINR(o.confirmed), target: formatINR(o.target) })}
              {shortfall > 0 && <> <UiText>Ending below target is fine — say plainly what the money covered and what&apos;s still open.</UiText></>}
            </p>
          </div>
          <div><label className={s.lbl} htmlFor="ou"><UiText>What did the money pay for?</UiText></label>
            <textarea id="ou" className={s.in} rows={5} maxLength={5000} readOnly={!editable} value={used} onChange={(e) => setUsed(e.target.value)} style={{ resize: "vertical" }} /></div>
          <div><label className={s.lbl} htmlFor="on"><UiText>How are things now?</UiText></label>
            <textarea id="on" className={s.in} rows={4} maxLength={5000} readOnly={!editable} value={now} onChange={(e) => setNow(e.target.value)} style={{ resize: "vertical" }} /></div>

          <div>
            <p className={s.lbl}><UiText>Spending evidence</UiText> <span className={s.muted} style={{ fontWeight: 500 }}><UiText>(optional)</UiText></span></p>
            <p className={`${s.small} ${s.muted}`} style={{ marginBottom: 8 }}><UiText>Receipts or bills. Private to reviewers unless you choose to show one. If something has no receipt — for example it wasn&apos;t paid from the fundraiser — say so.</UiText></p>
            {o.evidence.map((e) => (
              <div key={e.id} className={s.it} style={{ alignItems: "center" }}>
                <span className={`${s.chip} ${e.hasFile ? s.cOk : s.cN}`}>{e.hasFile ? ui("Ready") : ui("Explained")}</span>
                <div style={{ flex: 1 }}>
                  <strong className={s.small}>{e.label}</strong>
                  <p className={`${s.small} ${s.muted}`}>{e.hasFile ? t("fileUploaded", { file: e.fileName ?? ui("file") }) : e.explanation}{e.publicVisible ? ` · ${ui("shown publicly")}` : ""}</p>
                </div>
                {editable && <button type="button" className={s.bq} disabled={busy} onClick={() => run(() => fundraisingOutcomes.removeEvidence(campaignId, o.id, e.id))}><UiText>Remove</UiText></button>}
              </div>
            ))}
            {editable && (adding
              ? <EvidenceForm busy={busy} onCancel={() => setAdding(false)} onAdd={(label, expl, pub, file) => run(async () => { await save(); return fundraisingOutcomes.addEvidence(campaignId, o.id, label, expl, pub, file); }, () => setAdding(false))} />
              : <button type="button" className={`${s.btn} ${s.bs}`} style={{ marginTop: 8 }} onClick={() => setAdding(true)}><UiText>+ Add spending item</UiText></button>)}
          </div>

          {err && <p className={s.errText} role="alert">{err}</p>}
          {editable && (
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
              {saved && <span className={`${s.small} ${s.muted}`}><UiText>Draft saved</UiText></span>}
              <button type="button" className={`${s.btn} ${s.bs}`} disabled={busy} onClick={() => run(save, () => setSaved(true))}><UiText>Save draft</UiText></button>
              <button type="button" className={`${s.btn} ${s.bp}`} disabled={busy || !used.trim() || !now.trim()}
                onClick={() => run(async () => { await save(); return fundraisingOutcomes.submit(campaignId, o.id); })}>
                {o.status === "CHANGES_REQUESTED" ? ui("Resubmit for review") : ui("Submit outcome for review")}
              </button>
            </div>
          )}
        </section>
      </div>
      <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <section className={`${s.card} ${s.col}`}>
          <p className={s.colLbl}><UiText>Raised</UiText></p>
          <p className={s.tabular} style={{ display: "flex", justifyContent: "space-between" }}><UiText>Target</UiText> <strong>{formatINR(o.target)}</strong></p>
          <p className={s.tabular} style={{ display: "flex", justifyContent: "space-between" }}><UiText>Confirmed</UiText> <strong>{formatINR(o.confirmed)}</strong></p>
          {shortfall > 0 && <p className={s.tabular} style={{ display: "flex", justifyContent: "space-between" }}><UiText>Shortfall</UiText> <strong>{formatINR(shortfall)}</strong></p>}
        </section>
        <section className={`${s.card} ${s.col}`} style={{ background: "#fbf8f4" }}>
          <p className={s.small}><strong><UiText>Closure conditions to be defined.</UiText></strong> <UiText>Publishing your outcome doesn&apos;t close the fundraiser. What happens to unused money or partial funding is decided by Sahas Charitable Trust — there&apos;s nothing to do here. Donations are not refundable.</UiText></p>
        </section>
      </aside>
    </div>
  );
}

function EvidenceForm({ busy, onAdd, onCancel }: { busy: boolean; onAdd: (label: string, explanation: string, pub: boolean, file: File | null) => void; onCancel: () => void }) {
  const ui = useUiText();
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"file" | "none">("file");
  const [file, setFile] = useState<File | null>(null);
  const [expl, setExpl] = useState("");
  const [pub, setPub] = useState(false);
  const ok = !!label.trim() && (mode === "file" ? !!file : !!expl.trim());
  return (
    <div className={s.card} style={{ padding: 16, marginTop: 8, display: "flex", flexDirection: "column", gap: 10, background: "#fbf8f4" }}>
      <div><label className={s.lbl} htmlFor="evl"><UiText>What is it for?</UiText></label><input id="evl" className={s.in} maxLength={200} placeholder={ui("e.g. Final-year tuition")} value={label} onChange={(e) => setLabel(e.target.value)} /></div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }} className={s.small}>
        <label><input type="radio" checked={mode === "file"} onChange={() => setMode("file")} /> <UiText>I have a receipt</UiText></label>
        <label><input type="radio" checked={mode === "none"} onChange={() => setMode("none")} /> <UiText>No receipt</UiText></label>
      </div>
      {mode === "file"
        ? <label className={`${s.btn} ${s.bs}`} style={{ alignSelf: "flex-start" }}>{file ? file.name : ui("Choose file")}<input type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        : <div><label className={s.lbl} htmlFor="evx"><UiText>Why is there no receipt?</UiText></label><input id="evx" className={s.in} maxLength={2000} placeholder={ui("e.g. Not paid from the fundraiser")} value={expl} onChange={(e) => setExpl(e.target.value)} /></div>}
      <label className={s.small} style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} /> <UiText>Show this on my public page</UiText></label>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" className={`${s.btn} ${s.bs}`} onClick={onCancel}><UiText>Cancel</UiText></button>
        <button type="button" className={`${s.btn} ${s.bp}`} disabled={busy || !ok} onClick={() => onAdd(label.trim(), mode === "none" ? expl.trim() : "", pub, mode === "file" ? file : null)}><UiText>Add</UiText></button>
      </div>
    </div>
  );
}
