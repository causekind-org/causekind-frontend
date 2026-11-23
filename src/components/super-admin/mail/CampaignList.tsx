"use client";

import { useCallback, useEffect, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcCancel,
  mcCopyCampaign,
  mcResolveUncertain,
  mcDeleteCampaign,
  mcPause,
  mcReport,
  mcResume,
  mcRecipients,
  type McRecipient,
  type McCampaign,
  type McReport,
} from "@/lib/api";
import { Loader2, Mail, Pause, Play, Trash2 } from "lucide-react";
import { STATUS_STYLE, errText } from "./shared";
import { SaveCohort } from "./SaveCohort";
import { PlanProgress } from "./PlanProgress";

/** Mail Center: campaign list, report tiles and per-person table. */

// ------------------------------------------------------------------ list

export function CampaignList({ isDark, campaigns, openReport, setOpenReport, onEdit, onChanged }: {
  isDark: boolean; campaigns: McCampaign[]; openReport: number | null;
  setOpenReport: (id: number | null) => void; onEdit: (c: McCampaign) => void; onChanged: () => void;
}) {
  const t = saTheme(isDark);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: number, fn: (id: number) => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(id);
    setError(null);
    try { await fn(id); onChanged(); } catch (e) { setError(errText(e)); } finally { setBusy(null); }
  };

  if (campaigns.length === 0) {
    return <p className={`py-12 text-center text-sm ${t.muted}`}>No campaigns yet. Click “New campaign” to write your first email.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {campaigns.map((c) => (
        <div key={c.id} className={`rounded-2xl border p-4 ${t.card}`}>
          <div className="flex flex-wrap items-center gap-3">
            <Mail className={`h-4 w-4 ${t.muted}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-bold ${t.heading}`}>{c.name}</p>
              <p className={`truncate text-xs ${t.muted}`}>{c.subject}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-3xs font-black uppercase tracking-wider ${STATUS_STYLE[c.status]}`}>{c.status}</span>
            <div className="flex flex-wrap gap-1.5">
              {(c.status === "DRAFT" || c.status === "SCHEDULED") && (
                <button type="button" onClick={() => onEdit(c)} className={`min-h-8 rounded-lg border px-3 text-xs font-semibold ${t.btn}`}>
                  {c.status === "DRAFT" ? "Edit" : "Open"}
                </button>
              )}
              <button type="button" disabled={busy === c.id} title="Make an editable copy; this campaign stays as it is"
                onClick={async () => {
                  setBusy(c.id); setError(null);
                  try { const copy = await mcCopyCampaign(c.id); onChanged(); onEdit(copy); } catch (e) { setError(errText(e)); } finally { setBusy(null); }
                }}
                className={`min-h-8 rounded-lg border px-3 text-xs font-semibold ${t.btn}`}>Reuse</button>
              {c.status === "SENDING" && (
                <button type="button" disabled={busy === c.id} onClick={() => act(c.id, mcPause)}
                  className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-3 text-xs font-semibold ${t.btn}`}>
                  <Pause className="h-3.5 w-3.5" aria-hidden /> Pause
                </button>
              )}
              {c.status === "PAUSED" && (
                <button type="button" disabled={busy === c.id} onClick={() => act(c.id, mcResume)}
                  className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-3 text-xs font-semibold ${t.btn}`}>
                  <Play className="h-3.5 w-3.5" aria-hidden /> Resume
                </button>
              )}
              {["SCHEDULED", "SENDING", "PAUSED"].includes(c.status) && (
                <button type="button" disabled={busy === c.id}
                  onClick={() => act(c.id, mcCancel, "Cancel this campaign? People not yet emailed will not get it.")}
                  className={`min-h-8 rounded-lg border px-3 text-xs font-semibold text-red-500 ${t.btn}`}>Cancel</button>
              )}
              {c.status === "DRAFT" && (
                <button type="button" aria-label="Delete draft" disabled={busy === c.id}
                  onClick={() => act(c.id, mcDeleteCampaign, "Delete this draft?")}
                  className={`min-h-8 rounded-lg border px-2.5 ${t.btn}`}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
              )}
              {c.status !== "DRAFT" && (
                <button type="button" onClick={() => setOpenReport(openReport === c.id ? null : c.id)}
                  className={`min-h-8 rounded-lg border px-3 text-xs font-semibold ${t.btn}`}>
                  {openReport === c.id ? "Hide report" : "Report"}
                </button>
              )}
            </div>
          </div>
          {c.pauseReason && <p className="mt-2 text-xs text-orange-500">Paused: {c.pauseReason}</p>}
          {c.scheduledAt && c.status === "SCHEDULED" && (
            <p className={`mt-2 text-xs ${t.muted}`}>Scheduled for {new Date(c.scheduledAt).toLocaleString("en-IN")}</p>
          )}
          {openReport === c.id && <ReportBox isDark={isDark} id={c.id} />}
        </div>
      ))}
    </div>
  );
}

function ReportBox({ isDark, id }: { isDark: boolean; id: number }) {
  const t = saTheme(isDark);
  const [r, setR] = useState<McReport | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => { setError(false); mcReport(id).then(setR).catch(() => setError(true)); }, [id]);
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10_000);
    return () => window.clearInterval(timer);
  }, [load]);
  if (error) return <p className="mt-3 text-xs text-red-500">Couldn&apos;t load the report.</p>;
  if (!r) return <Loader2 className={`mt-3 h-4 w-4 animate-spin ${t.muted}`} />;
  const tiles: [string, number][] = [
    ["People", r.total], ["Sent", r.sent], ["Waiting", r.pending + r.sending], ["Failed", r.failed],
    ["Delivered", r.delivered], ["Bounced", r.bounced], ["Spam reports", r.complained],
    ["Opened (approx.)", r.opened], ["Clicked", r.clicked],
  ];
  const uncertain = r.uncertain ?? 0;
  const resolve = async (action: "MARK_SENT" | "MARK_FAILED" | "RETRY") => {
    const msg = action === "RETRY"
      ? `Send again to ${uncertain} people? Some of them may have already received it and will get it twice.`
      : action === "MARK_SENT" ? `Mark ${uncertain} people as sent? Choose this if you believe the emails went out.`
      : `Mark ${uncertain} people as not sent? They won't be tried again.`;
    if (!window.confirm(msg)) return;
    try { await mcResolveUncertain(id, action); load(); } catch (e) { window.alert(errText(e)); }
  };
  return (
    <div className="mt-4 space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(([label, n]) => (
          <div key={label} className={`rounded-xl border p-3 ${t.cardFlat}`}>
            <p className={`text-3xs font-black uppercase tracking-wider ${t.dim}`}>{label}</p>
            <p className={`text-lg font-black tabular-nums ${t.heading}`}>{n}</p>
          </div>
        ))}
      </div>
      <p className={`text-xs ${t.muted}`}>
        All campaigns together sent {r.sentLast24h} of the {r.dailyCap} allowed in the last 24 hours.
        When the limit is reached, sending continues automatically later.
      </p>
      {uncertain > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          <p className="font-bold text-amber-600">{uncertain} uncertain: the server stopped while sending to these people.</p>
          <p className={t.muted}>Amazon SES may or may not have accepted their emails, so they are never resent automatically. Check the People table (filter “Uncertain”), then choose:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => resolve("MARK_SENT")} className={`min-h-8 rounded-lg border px-3 font-semibold ${t.btn}`}>Mark as sent</button>
            <button type="button" onClick={() => resolve("MARK_FAILED")} className={`min-h-8 rounded-lg border px-3 font-semibold ${t.btn}`}>Mark as not sent</button>
            <button type="button" onClick={() => resolve("RETRY")} className={`min-h-8 rounded-lg border px-3 font-semibold ${t.btn}`}>Send again (may duplicate)</button>
          </div>
        </div>
      )}
      <PlanProgress campaignId={id} cardClass={t.cardFlat} mutedClass={t.muted} headingClass={t.heading} btnClass={t.btn} />
      <SaveCohort campaignId={id} campaignName={r.campaign.name} fieldClass={`rounded-lg border px-2 py-1.5 text-xs ${t.input}`} btnClass={t.btn} mutedClass={t.muted} />
      <RecipientTable isDark={isDark} id={id} />
    </div>
  );
}

const RECIPIENT_FILTERS: { label: string; value: string | null }[] = [
  { label: "Everyone", value: null }, { label: "Sent", value: "SENT" }, { label: "Waiting", value: "PENDING" }, { label: "Failed", value: "FAILED" }, { label: "Uncertain", value: "UNCERTAIN" },
];
const PAGE = 50;
const when = (s: string | null) => (s ? new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

/** Per-person report (inventory RP05). Paged on the server; refreshes only when asked. */
function RecipientTable({ isDark, id }: { isDark: boolean; id: number }) {
  const t = saTheme(isDark);
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<McRecipient[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false); setRows(null);
    mcRecipients(id, status, page, PAGE).then(setRows).catch(() => setError(true));
  }, [id, status, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className={`mt-3 rounded-xl border p-3 ${t.cardFlat}`}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className={`mr-1 text-xs font-bold ${t.heading}`}>People</span>
        {RECIPIENT_FILTERS.map((f) => (
          <button key={f.label} type="button" aria-pressed={status === f.value}
            onClick={() => { setStatus(f.value); setPage(0); }}
            className={`min-h-8 rounded-full border px-3 text-xs font-bold ${status === f.value ? t.chipActive : t.chipInactive}`}>{f.label}</button>
        ))}
        <button type="button" onClick={load} className={`ml-auto min-h-8 rounded-lg border px-3 text-xs font-semibold ${t.btn}`}>Refresh</button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-500">Couldn&apos;t load people. <button type="button" className="underline" onClick={load}>Try again</button></p>
      ) : rows == null ? (
        <Loader2 className={`h-4 w-4 animate-spin ${t.muted}`} />
      ) : rows.length === 0 ? (
        <p className={`py-3 text-center text-xs ${t.muted}`}>{page > 0 ? "No more people." : "No one in this group."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className={t.dim}>
              <tr>{["Email", "Status", "Sent", "Delivered", "Opened", "Clicked", "Problem"].map((h) => <th key={h} className="px-2 py-1.5 font-black uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t ${t.text}`}>
                  <td className="max-w-[16rem] truncate px-2 py-1.5" title={r.email}>{r.email}</td>
                  <td className="px-2 py-1.5"><span className={`rounded-full px-2 py-0.5 text-3xs font-black ${STATUS_STYLE[r.status === "PENDING" ? "SCHEDULED" : r.status === "UNCERTAIN" ? "PAUSED" : r.status] ?? ""}`}>{r.status}</span></td>
                  <td className="whitespace-nowrap px-2 py-1.5">{when(r.sentAt)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{when(r.deliveredAt)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{when(r.openedAt)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{when(r.clickedAt)}</td>
                  <td className="px-2 py-1.5 text-red-500">
                    {r.bouncedAt ? `Bounced${r.bounceType ? ` (${r.bounceType})` : ""}` : r.complainedAt ? "Marked as spam" : r.error ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-2 flex items-center justify-end gap-2 text-xs">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className={`min-h-8 rounded-lg border px-3 ${t.btn}`}>Previous</button>
        <span className={t.muted}>Page {page + 1}</span>
        <button type="button" disabled={!rows || rows.length < PAGE} onClick={() => setPage((p) => p + 1)} className={`min-h-8 rounded-lg border px-3 ${t.btn}`}>Next</button>
      </div>
      <p className={`mt-1 text-3xs ${t.dim}`}>Opens are approximate: some mail apps hide them, others load images automatically.</p>
    </div>
  );
}
