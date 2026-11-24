"use client";

/**
 * Mail Center Overview, Reports, Activity and System mail (Phase 7b; inventory
 * OV01–OV13, RP01–RP09, AC01–AC06, SY01–SY14). Missing setup is shown as
 * "not available", never as 0. Loading, empty and failed states are distinct.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcInsightsOverview, mcInsightsReports, mcActivity, mcSystem, mcSystemLog, mcTestTransport, mcProcessDue, mcMailboxes,
  type McInsightsOverview, type McReportsData, type McReportRow, type McActivityRow, type McSystemData, type McSystemLogRow, type McMailbox,
} from "@/lib/api";
import { Loader2, RefreshCw } from "lucide-react";
import { STATUS_STYLE, errText } from "./shared";

const pct = (n: number | null, d: number) => (n == null ? "n/a" : d ? `${Math.round((n / d) * 100)}%` : "—");
const num = (n: number | null | undefined) => (n == null ? "n/a" : n.toLocaleString("en-IN"));
const dt = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

function Failed({ msg, retry }: { msg: string; retry: () => void }) {
  return <p role="alert" className="text-sm text-red-500">Couldn&apos;t load: {msg} <button type="button" className="underline" onClick={retry}>Try again</button></p>;
}

/** Small stacked-free bar chart: one row per day, bars scaled to the busiest day. */
function DayBars({ days, series, isDark }: { days: Record<string, number | string>[]; series: { key: string; label: string; color: string }[]; isDark: boolean }) {
  const t = saTheme(isDark);
  const max = Math.max(1, ...days.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-3 text-3xs">
        {series.map((s) => <span key={s.key} className="inline-flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
      </div>
      <div className="flex h-36 items-end gap-1" role="img" aria-label={`Daily ${series.map((s) => s.label).join(", ")} for ${days.length} days`}>
        {days.map((d) => (
          <div key={String(d.day)} className="flex flex-1 items-end justify-center gap-px" title={`${d.day}: ${series.map((s) => `${s.label} ${d[s.key]}`).join(", ")}`}>
            {series.map((s) => (
              <div key={s.key} className="w-full max-w-2 rounded-t-sm" style={{ height: `${((Number(d[s.key]) || 0) / max) * 100}%`, minHeight: Number(d[s.key]) ? 2 : 0, background: s.color }} />
            ))}
          </div>
        ))}
      </div>
      <div className={`mt-1 flex justify-between text-3xs ${t.muted}`}><span>{String(days[0]?.day ?? "")}</span><span>{String(days[days.length - 1]?.day ?? "")}</span></div>
    </div>
  );
}

// ------------------------------------------------------------------ overview

export function OverviewV2({ isDark, onGo }: { isDark: boolean; onGo: (view: string) => void }) {
  const t = saTheme(isDark);
  const [o, setO] = useState<McInsightsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => { setError(null); mcInsightsOverview().then(setO).catch((e) => setError(errText(e))); }, []);
  useEffect(() => { load(); }, [load]);
  if (error) return <Failed msg={error} retry={load} />;
  if (!o) return <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} />;
  const card = (label: string, value: string, sub: string, go?: string) => (
    <button type="button" disabled={!go} onClick={() => go && onGo(go)} className={`rounded-xl border p-3 text-left ${t.cardFlat} ${go ? "hover:ring-1 hover:ring-sky-500/40" : ""}`}>
      <p className={`text-3xs font-black uppercase tracking-wider ${t.dim}`}>{label}</p>
      <p className={`text-xl font-black tabular-nums ${t.heading}`}>{value}</p>
      <p className={`text-3xs ${t.muted}`}>{sub}</p>
    </button>
  );
  const s = o.last30;
  return (
    <div className="space-y-4">
      {!o.setup.trackingConfigured && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700">
          Delivery and open tracking isn&apos;t set up (SES configuration set + event topic), so delivered, bounced, opened and clicked show “n/a”, not zero.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {card("Unread", num(o.unread), `${o.receivedWeek} received · ${o.sentWeek} sent this week`, "inbox")}
        {card("Campaign emails", num(s.sent), `${s.campaigns} campaigns · last 30 days`, "reports")}
        {card("Delivered", pct(s.delivered, s.sent), o.setup.trackingConfigured ? `${num(s.delivered)} of ${num(s.sent)}` : "tracking not set up", "reports")}
        {card("Opened", pct(s.opened, s.sent), "approximate", "reports")}
        {card("Replied", pct(s.replied, s.sent), `${s.replied} people (robots excluded)`, "marketing")}
        {card("Saved lists", num(o.lists.count), `${num(o.lists.people)} people`, "audiences")}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className={`rounded-2xl border p-4 ${t.card}`}>
          <p className={`mb-2 text-sm font-bold ${t.heading}`}>Last 14 days</p>
          <DayBars isDark={isDark} days={o.days} series={[
            { key: "broadcast", label: "Campaign emails", color: "#2563eb" },
            { key: "sent", label: "1:1 sent", color: "#10b981" },
            { key: "received", label: "Received", color: "#f59e0b" },
          ]} />
        </div>
        <div className={`space-y-2 rounded-2xl border p-4 text-xs ${t.card}`}>
          <p className={`text-sm font-bold ${t.heading}`}>Last 30 days</p>
          {([["Sent (accepted by SES)", s.sent], ["Delivered", s.delivered], ["Opened (approx.)", s.opened], ["Clicked", s.clicked], ["Replied", s.replied], ["Bounced", s.bounced]] as [string, number | null][]).map(([l, n]) => (
            <p key={l} className={`flex justify-between ${t.text}`}><span>{l}</span><span className="tabular-nums">{num(n)} <span className={t.muted}>{l.startsWith("Sent") ? "" : pct(n, s.sent)}</span></span></p>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className={`rounded-2xl border p-4 text-xs ${t.card}`}>
          <p className={`mb-1 text-sm font-bold ${t.heading}`}>Quick actions</p>
          <div className="flex flex-wrap gap-1.5">
            {[["New campaign", "campaigns"], ["Upload a list", "audiences"], ["New Mail ID", "mailids"], ["New automation", "automations"]].map(([l, v]) => (
              <button key={v} type="button" onClick={() => onGo(v)} className={`min-h-8 rounded-lg border px-2.5 font-semibold ${t.btn}`}>{l}</button>
            ))}
          </div>
          <p className={`mt-2 ${t.muted}`}>{o.rules.active} of {o.rules.total} automations on · {o.mailIds.active} of {o.mailIds.total} Mail IDs active · receiving {o.setup.receivingConfigured ? "on" : "not set up"}</p>
        </div>
        <div className={`rounded-2xl border p-4 text-xs ${t.card}`}>
          <p className={`mb-1 text-sm font-bold ${t.heading}`}>Scheduled</p>
          {o.scheduled.length === 0 ? <p className={t.muted}>Nothing scheduled.</p> : o.scheduled.map((c) => <p key={c.id} className={t.text}>{dt(c.at)} · {c.name}</p>)}
        </div>
        <div className={`rounded-2xl border p-4 text-xs ${t.card}`}>
          <p className={`mb-1 text-sm font-bold ${t.heading}`}>Needs attention</p>
          {o.attention.length === 0 ? <p className="text-emerald-600">All clear.</p> : o.attention.map((a, i) => <p key={i} className="text-amber-700">• {a.text}</p>)}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ reports

type SortKey = keyof Pick<McReportRow, "sent" | "delivered" | "bounced" | "failed" | "opened" | "clicked" | "replied" | "startedAt">;

export function ReportsView({ isDark, onOpenCampaign }: { isDark: boolean; onOpenCampaign: (id: number) => void }) {
  const t = saTheme(isDark);
  const [status, setStatus] = useState("");
  const [data, setData] = useState<McReportsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "startedAt", desc: true });
  const load = useCallback(() => { setError(null); setData(null); mcInsightsReports(status).then(setData).catch((e) => setError(errText(e))); }, [status]);
  useEffect(() => { load(); }, [load]);
  const rows = useMemo(() => {
    const r = [...(data?.rows ?? [])];
    r.sort((a, b) => {
      const x = a[sort.key] ?? "", y = b[sort.key] ?? "";
      return (x < y ? -1 : x > y ? 1 : 0) * (sort.desc ? -1 : 1);
    });
    return r;
  }, [data, sort]);
  const th = (label: string, key?: SortKey) => (
    <th className="px-2 py-1.5 font-black uppercase tracking-wider">
      {key ? <button type="button" onClick={() => setSort({ key, desc: sort.key === key ? !sort.desc : true })}>{label}{sort.key === key ? (sort.desc ? " ↓" : " ↑") : ""}</button> : label}
    </th>
  );
  const tracked = data?.trackingConfigured;
  const T = data?.totals;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Status" className={`rounded-xl border px-3 py-2 text-sm ${t.input}`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {["SCHEDULED", "SENDING", "PAUSED", "SENT", "FAILED", "CANCELLED"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="button" aria-label="Refresh" onClick={load} className={`min-h-9 rounded-lg border px-2.5 ${t.btn}`}><RefreshCw className="h-3.5 w-3.5" /></button>
        <span className={`text-xs ${t.muted}`}>{rows.length} campaigns{tracked === false ? " · delivery/open tracking not set up" : ""}</span>
      </div>
      {T && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {([["Campaigns", T.campaigns], ["Sent", T.sent], ["Delivered", T.delivered], ["Bounced", T.bounced], ["Opened ≈", T.opened], ["Clicked", T.clicked], ["Replied", T.replied]] as [string, number | null][]).map(([l, n]) => (
            <div key={l} className={`rounded-xl border p-3 ${t.cardFlat}`}><p className={`text-3xs font-black uppercase tracking-wider ${t.dim}`}>{l}</p><p className={`text-lg font-black tabular-nums ${t.heading}`}>{num(n)}</p>
              {l !== "Campaigns" && l !== "Sent" && <p className={`text-3xs ${t.muted}`}>{pct(n, T.sent)}</p>}</div>
          ))}
        </div>
      )}
      {error ? <Failed msg={error} retry={load} /> : !data ? <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} />
        : rows.length === 0 ? <p className={`py-8 text-center text-sm ${t.muted}`}>No campaigns {status ? "with this status" : "sent yet"}.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className={t.dim}><tr>
                {th("Campaign")}{th("Sender")}{th("Status")}{th("Sent", "sent")}{th("Delivered", "delivered")}{th("Bounced", "bounced")}
                {th("Failed", "failed")}{th("Opens", "opened")}{th("Clicks", "clicked")}{th("Replies", "replied")}{th("Sent at", "startedAt")}
              </tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} onClick={() => onOpenCampaign(r.id)} className={`cursor-pointer border-t ${t.text}`}>
                  <td className="max-w-[16rem] px-2 py-1.5"><p className="truncate font-bold">{r.name}</p><p className={`truncate ${t.muted}`}>{r.subject}</p></td>
                  <td className="max-w-[10rem] truncate px-2 py-1.5">{r.sender}{!r.tracking && <span className={t.muted}> · not tracked</span>}</td>
                  <td className="px-2 py-1.5"><span className={`rounded-full px-2 py-0.5 text-3xs font-black ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span></td>
                  <td className="px-2 py-1.5 tabular-nums">{r.sent} / {r.recipients}</td>
                  <td className="px-2 py-1.5 tabular-nums">{tracked ? `${r.delivered} · ${pct(r.delivered, r.sent)}` : "n/a"}</td>
                  <td className="px-2 py-1.5 tabular-nums">{tracked ? r.bounced : "n/a"}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.failed}</td>
                  <td className="px-2 py-1.5 tabular-nums">{tracked && r.tracking ? `${r.opened} · ${pct(r.opened, r.sent)}` : "n/a"}</td>
                  <td className="px-2 py-1.5 tabular-nums">{tracked && r.tracking ? `${r.clicked} · ${pct(r.clicked, r.sent)}` : "n/a"}</td>
                  <td className="px-2 py-1.5 tabular-nums">{r.replied}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{dt(r.startedAt ?? r.scheduledAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      <p className={`text-3xs ${t.dim}`}>Click a row to open its report with the per-person table and “Save a group as a list”. Opens are approximate; replies exclude automatic messages.</p>
    </div>
  );
}

// ------------------------------------------------------------------ activity

export function ActivityView({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [type, setType] = useState("ALL");
  const [mailbox, setMailbox] = useState<number | null>(null);
  const [boxes, setBoxes] = useState<McMailbox[]>([]);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<McActivityRow[] | null>(null);
  const [more, setMore] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { mcMailboxes().then((b) => setBoxes(b.mailboxes)).catch(() => setBoxes([])); }, []);
  const load = useCallback(() => {
    setError(null); setRows(null);
    mcActivity({ type, mailbox, q: q.trim() }).then((r) => { setRows(r.rows); setMore(r.hasMore); setNote(r.note); }).catch((e) => setError(errText(e)));
  }, [type, mailbox, q]);
  useEffect(() => { const h = window.setTimeout(load, 250); return () => window.clearTimeout(h); }, [load]);
  const older = async () => {
    if (!rows?.length) return;
    try { const r = await mcActivity({ type, mailbox, q: q.trim(), before: rows[rows.length - 1].at }); setRows([...rows, ...r.rows]); setMore(r.hasMore); }
    catch (e) { setError(errText(e)); }
  };
  const TYPE: Record<string, string> = { RECEIVED: "Received", SENT: "Sent 1:1", BROADCAST: "Campaign" };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Type" className="flex gap-1">
          {[["ALL", "Everything"], ["RECEIVED", "Received"], ["SENT", "Sent"], ["BROADCAST", "Campaigns"]].map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={type === v} onClick={() => setType(v)}
              className={`min-h-8 rounded-full border px-3 text-xs font-bold ${type === v ? t.chipActive : t.chipInactive}`}>{l}</button>
          ))}
        </div>
        <select aria-label="Mailbox" className={`rounded-xl border px-3 py-2 text-sm ${t.input}`} value={mailbox ?? ""} onChange={(e) => setMailbox(e.target.value ? Number(e.target.value) : null)}>
          <option value="">All senders</option>
          {boxes.map((b) => <option key={b.id} value={b.id}>{b.address}</option>)}
        </select>
        <input type="search" aria-label="Search activity" placeholder="Subject, address or campaign" value={q} onChange={(e) => setQ(e.target.value)}
          className={`w-full max-w-xs rounded-xl border px-3 py-2 text-sm ${t.input}`} />
      </div>
      {error ? <Failed msg={error} retry={load} /> : rows == null ? <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} />
        : rows.length === 0 ? <p className={`py-8 text-center text-sm ${t.muted}`}>No mail activity yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className={t.dim}><tr>{["When (IST)", "Type", "Mail ID", "From → To", "Subject", "Status"].map((h) => <th key={h} className="px-2 py-1.5 font-black uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={`${r.type}-${r.threadId ?? r.campaignId}-${i}`} className={`border-t ${t.text}`}>
                  <td className="whitespace-nowrap px-2 py-1.5">{dt(r.at)}</td>
                  <td className="px-2 py-1.5">{TYPE[r.type]}</td>
                  <td className="max-w-[10rem] truncate px-2 py-1.5">{r.mailbox ?? "—"}</td>
                  <td className="max-w-[16rem] truncate px-2 py-1.5">{r.from ? `${r.from} → ` : ""}{r.to ?? ""}</td>
                  <td className="max-w-[18rem] truncate px-2 py-1.5">{r.subject}</td>
                  <td className="px-2 py-1.5">{r.status}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      {more && <button type="button" onClick={older} className={`min-h-9 w-full rounded-lg border text-xs font-semibold ${t.btn}`}>Load older</button>}
      {note && <p className={`text-3xs ${t.dim}`}>{note}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ system mail

export function SystemView({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [data, setData] = useState<McSystemData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<McSystemLogRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ category: "", status: "", q: "", page: 0 });
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => { setError(null); mcSystem().then(setData).catch((e) => setError(errText(e))); }, []);
  const loadLog = useCallback(() => { setLog(null); mcSystemLog(filter).then((r) => { setLog(r.rows); setTotal(r.total); }).catch((e) => setError(errText(e))); }, [filter]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const h = window.setTimeout(loadLog, 250); return () => window.clearTimeout(h); }, [loadLog]);
  // Auto-refresh every 60 s, only while this tab is visible.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") { load(); loadLog(); } };
    const h = window.setInterval(tick, 60_000);
    return () => window.clearInterval(h);
  }, [load, loadLog]);
  const btn = `min-h-9 rounded-lg border px-3 text-xs font-semibold ${t.btn}`;
  return (
    <div className="space-y-4">
      {error && <Failed msg={error} retry={load} />}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" className={btn} onClick={async () => { try { await mcProcessDue(); setMsg("Run started: due schedules, automations and sending are being processed."); } catch (e) { setMsg(errText(e)); } }}>Process due now</button>
        <input type="email" aria-label="Test address" placeholder="you@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} className={`rounded-lg border px-3 py-2 text-xs ${t.input}`} />
        <button type="button" className={btn} disabled={!testTo.includes("@")} onClick={async () => {
          if (!window.confirm(`Send one test email to ${testTo}?`)) return;
          try { await mcTestTransport(testTo); setMsg(`Test email sent to ${testTo}. It appears in the log below.`); loadLog(); } catch (e) { setMsg(errText(e)); }
        }}>Test mail transport</button>
        <button type="button" aria-label="Refresh" className={btn} onClick={() => { load(); loadLog(); }}><RefreshCw className="inline h-3.5 w-3.5" /></button>
        {msg && <span className={t.text}>{msg}</span>}
      </div>
      {!data ? !error && <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} /> : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {([["Sent today", data.sentToday], ["Failed today", data.failedToday], ["Skipped (blocked)", data.skippedToday]] as [string, number][]).map(([l, n]) => (
              <div key={l} className={`rounded-xl border p-3 ${t.cardFlat}`}><p className={`text-3xs font-black uppercase tracking-wider ${t.dim}`}>{l}</p><p className={`text-lg font-black tabular-nums ${l.startsWith("Failed") && n ? "text-red-500" : t.heading}`}>{n}</p></div>
            ))}
          </div>
          <p className={`text-xs ${t.muted}`}>Queue: {data.queue} {data.loggingSince}</p>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className={`rounded-2xl border p-4 ${t.card}`}>
              <p className={`mb-2 text-sm font-bold ${t.heading}`}>Last 30 days (accepted by SES, not proof of inbox delivery)</p>
              <DayBars isDark={isDark} days={data.trend} series={[{ key: "sent", label: "Sent", color: "#2563eb" }, { key: "failed", label: "Failed", color: "#ef4444" }]} />
            </div>
            <div className={`rounded-2xl border p-4 text-xs ${t.card}`}>
              <p className={`mb-1 text-sm font-bold ${t.heading}`}>Today by type</p>
              {data.todayByCategory.length === 0 ? <p className={t.muted}>Nothing sent today.</p> : data.todayByCategory.map((c) => (
                <button key={c.category} type="button" onClick={() => setFilter({ ...filter, category: c.category, page: 0 })} className={`flex w-full justify-between border-t py-1 text-left ${t.text}`}>
                  <span>{c.category.replace("_", " / ").toLowerCase()}</span><span className="tabular-nums">{c.sent} sent · {c.failed} failed ({c.failurePct}%)</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <div className={`rounded-2xl border p-4 ${t.card}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <p className={`mr-auto text-sm font-bold ${t.heading}`}>Email log</p>
          <select aria-label="Category" className={`rounded-lg border px-2 py-1.5 ${t.input}`} value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value, page: 0 })}>
            <option value="">All types</option>
            {["OTP_SECURITY", "ACCOUNT", "DONATION", "HANDOVER", "FUNDRAISING", "NGO", "SUPPORT", "OTHER"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Status" className={`rounded-lg border px-2 py-1.5 ${t.input}`} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value, page: 0 })}>
            <option value="">Any status</option><option value="SENT">Sent</option><option value="FAILED">Failed</option><option value="SKIPPED">Skipped</option>
          </select>
          <input type="search" aria-label="Search log" placeholder="Recipient, subject or type" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value, page: 0 })} className={`rounded-lg border px-2 py-1.5 ${t.input}`} />
        </div>
        {log == null ? <Loader2 className={`h-4 w-4 animate-spin ${t.muted}`} /> : log.length === 0 ? <p className={`text-xs ${t.muted}`}>No system emails match.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className={t.dim}><tr>{["Time (IST)", "Type", "Recipient", "Subject", "Status"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
              <tbody>{log.map((l) => (
                <tr key={l.id} className={`border-t ${t.text}`}>
                  <td className="whitespace-nowrap px-2 py-1">{dt(l.createdAt)}</td>
                  <td className="px-2 py-1">{l.mailType}<span className={t.muted}> · {l.category}</span></td>
                  <td className="max-w-[14rem] truncate px-2 py-1">{l.recipient}</td>
                  <td className="max-w-[18rem] truncate px-2 py-1">{l.subject}</td>
                  <td className={`px-2 py-1 font-bold ${l.status === "FAILED" ? "text-red-500" : l.status === "SKIPPED" ? "text-stone-500" : "text-emerald-600"}`} title={l.error ?? ""}>{l.status}{l.error ? ` · ${l.error}` : ""}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="mt-2 flex items-center justify-end gap-2 text-xs">
          <button type="button" disabled={filter.page === 0} onClick={() => setFilter({ ...filter, page: filter.page - 1 })} className={btn}>Previous</button>
          <span className={t.muted}>Page {filter.page + 1} · {total} entries</span>
          <button type="button" disabled={(filter.page + 1) * 50 >= total} onClick={() => setFilter({ ...filter, page: filter.page + 1 })} className={btn}>Next</button>
        </div>
        <p className={`mt-1 text-3xs ${t.dim}`}>Metadata only. Codes in security emails are masked and message bodies are never stored.</p>
      </div>
    </div>
  );
}
