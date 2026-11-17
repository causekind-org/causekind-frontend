"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SaLoadError } from "./SaLoadError";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcCampaigns, mcCancel, mcCreateCampaign, mcDeleteCampaign, mcDeleteTemplate, mcEstimate,
  mcPause, mcPreview, mcReport, mcResume, mcSaveTemplate, mcSchedule, mcSegments, mcSendNow,
  mcSendTest, mcTemplates, mcUpdateCampaign, mcVariableCheck,
  mcOverview, mcSuppressionLookup, mcSuppress, mcUnsuppress,
  type McCampaign, type McOverview, type McReport, type McSuppression, type McTemplate, type McVariableCheck,
} from "@/lib/api";
import { Loader2, Mail, Pause, Play, Plus, Send, Trash2, X } from "lucide-react";

/**
 * Super Admin Mail Center, phase 1: campaigns and templates.
 *
 * <p>Every safety rule (no donees, opt-outs, unsubscribe, daily cap, auto-pause,
 * no unknown variables) lives on the server. This screen only explains them.
 * The preview is a server render, so what is approved is what is sent.
 */

const SEGMENT_LABEL: Record<string, string> = {
  SUBSCRIBERS: "Newsletter subscribers",
  DONORS: "Donors",
  NGO_PARTNERS: "NGO partners",
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-stone-500/15 text-stone-400",
  SCHEDULED: "bg-sky-500/15 text-sky-400",
  SENDING: "bg-amber-500/15 text-amber-400",
  PAUSED: "bg-orange-500/15 text-orange-400",
  SENT: "bg-emerald-500/15 text-emerald-400",
  FAILED: "bg-red-500/15 text-red-400",
  CANCELLED: "bg-stone-500/15 text-stone-500",
};

type Draft = { id: number | null; name: string; subject: string; preheader: string; html: string; segments: string[] };
const EMPTY: Draft = { id: null, name: "", subject: "", preheader: "", html: "<p>Hello {{first_name}},</p>\n<p></p>", segments: [] };

const errText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export function MailCenterPanel({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [view, setView] = useState<"overview" | "campaigns" | "templates" | "suppression">("campaigns");
  const [campaigns, setCampaigns] = useState<McCampaign[]>([]);
  const [templates, setTemplates] = useState<McTemplate[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [openReport, setOpenReport] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [c, tp, s] = await Promise.all([mcCampaigns(), mcTemplates(), mcSegments()]);
      setCampaigns(c);
      setTemplates(tp);
      setSegments(s.segments);
      setVariables(s.variables);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loadError) return <SaLoadError what="the Mail Center" onRetry={load} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["overview", "campaigns", "templates", "suppression"] as const).map((v) => (
          <button key={v} type="button" onClick={() => { setView(v); setEditing(null); }}
            className={`min-h-9 rounded-full border px-4 text-xs font-bold capitalize ${view === v ? t.chipActive : t.chipInactive}`}>
            {v === "suppression" ? "Blocked addresses" : v}
          </button>
        ))}
        {view === "campaigns" && !editing && (
          <button type="button" onClick={() => setEditing({ ...EMPTY })}
            className={`ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-4 text-xs font-bold ${t.btnAccent}`}>
            <Plus className="h-4 w-4" aria-hidden /> New campaign
          </button>
        )}
      </div>

      <p className={`text-xs ${t.muted}`}>
        Emails go only to newsletter subscribers, donors and NGO partners — never to people asking for help.
        Unsubscribed and bouncing addresses are skipped automatically, and every email has an unsubscribe link.
      </p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className={`h-6 w-6 animate-spin ${t.muted}`} /></div>
      ) : view === "overview" ? (
        <OverviewView isDark={isDark} />
      ) : view === "suppression" ? (
        <SuppressionView isDark={isDark} />
      ) : view === "templates" ? (
        <TemplatesView isDark={isDark} templates={templates} variables={variables} onChanged={load} />
      ) : editing ? (
        <CampaignEditor isDark={isDark} draft={editing} segments={segments} variables={variables} templates={templates}
          onClose={() => { setEditing(null); load(); }} />
      ) : (
        <CampaignList isDark={isDark} campaigns={campaigns} openReport={openReport} setOpenReport={setOpenReport}
          onEdit={(c) => setEditing({
            id: c.id, name: c.name, subject: c.subject, preheader: c.preheader ?? "", html: c.html,
            segments: c.segments.split(",").filter(Boolean),
          })}
          onChanged={load} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ list

function CampaignList({ isDark, campaigns, openReport, setOpenReport, onEdit, onChanged }: {
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
    </div>
  );
}

// ------------------------------------------------------------------ editor

function CampaignEditor({ isDark, draft, segments, variables, templates, onClose }: {
  isDark: boolean; draft: Draft; segments: string[]; variables: string[]; templates: McTemplate[]; onClose: () => void;
}) {
  const t = saTheme(isDark);
  const [d, setD] = useState<Draft>(draft);
  const [lastField, setLastField] = useState<"subject" | "html">("html");
  const subjectRef = useRef<HTMLInputElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [check, setCheck] = useState<McVariableCheck | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string; to: string } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (d.segments.length === 0) { setEstimate(null); return; }
    let live = true;
    mcEstimate(d.segments).then((r) => live && setEstimate(r.recipients)).catch(() => live && setEstimate(null));
    return () => { live = false; };
  }, [d.segments]);

  const set = (patch: Partial<Draft>) => { setD((p) => ({ ...p, ...patch })); setCheck(null); setPreview(null); };

  const insertVariable = (v: string) => {
    const tag = `{{${v}}}`;
    const el = lastField === "subject" ? subjectRef.current : htmlRef.current;
    const key = lastField === "subject" ? "subject" : "html";
    const value = d[key];
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    set({ [key]: value.slice(0, start) + tag + value.slice(end) } as Partial<Draft>);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + tag.length, start + tag.length); });
  };

  /** Saves the draft and returns its id; every server action needs a saved copy. */
  const save = async (): Promise<number | null> => {
    if (!d.name.trim() || !d.subject.trim() || !d.html.trim()) { setError("Name, subject and message are all needed."); return null; }
    if (d.segments.length === 0) { setError("Choose at least one audience."); return null; }
    const body = { name: d.name, subject: d.subject, preheader: d.preheader, html: d.html, segments: d.segments };
    const saved = d.id == null ? await mcCreateCampaign(body) : await mcUpdateCampaign(d.id, body);
    setD((p) => ({ ...p, id: saved.id }));
    return saved.id;
  };

  const run = async (fn: (id: number) => Promise<void>) => {
    setBusy(true); setError(null); setNote(null);
    try { const id = await save(); if (id != null) await fn(id); } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  const doCheck = () => run(async (id) => setCheck(await mcVariableCheck(id)));
  const doPreview = () => run(async (id) => setPreview(await mcPreview(id)));
  const doSave = () => run(async () => setNote("Draft saved."));
  const doTest = () => run(async (id) => {
    if (!testEmail.includes("@")) throw new Error("Type an email address for the test.");
    await mcSendTest(id, testEmail);
    setNote(`Test email sent to ${testEmail}.`);
  });
  const doSend = () => run(async (id) => {
    if (!window.confirm(`Send this email to about ${estimate ?? "?"} people now? This can be paused but not undone.`)) return;
    await mcSendNow(id);
    onClose();
  });
  const doSchedule = () => run(async (id) => {
    if (!scheduleAt) throw new Error("Pick a date and time first.");
    await mcSchedule(id, new Date(scheduleAt).toISOString());
    onClose();
  });

  const field = `w-full rounded-xl border px-3 py-2.5 text-sm ${t.input}`;
  const label = `mb-1 block text-3xs font-black uppercase tracking-wider ${t.dim}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-base font-black ${t.heading}`}>{d.id ? "Edit campaign" : "New campaign"}</h3>
          <button type="button" onClick={onClose} aria-label="Close editor" className={`rounded-lg border p-1.5 ${t.btn}`}><X className="h-4 w-4" /></button>
        </div>

        {templates.length > 0 && (
          <div>
            <label className={label} htmlFor="mc-template">Start from a template</label>
            <select id="mc-template" className={field} defaultValue=""
              onChange={(e) => {
                const tp = templates.find((x) => String(x.id) === e.target.value);
                if (tp) set({ subject: tp.subject, preheader: tp.preheader ?? "", html: tp.html, name: d.name || tp.name });
              }}>
              <option value="">— choose —</option>
              {templates.map((tp) => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className={label} htmlFor="mc-name">Campaign name (only you see this)</label>
          <input id="mc-name" className={field} value={d.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} />
        </div>

        <div>
          <span className={label}>Who gets it</span>
          <div className="flex flex-wrap gap-2">
            {segments.map((s) => {
              const on = d.segments.includes(s);
              return (
                <button key={s} type="button" aria-pressed={on}
                  onClick={() => set({ segments: on ? d.segments.filter((x) => x !== s) : [...d.segments, s] })}
                  className={`min-h-9 rounded-full border px-3.5 text-xs font-bold ${on ? t.chipActive : t.chipInactive}`}>
                  {SEGMENT_LABEL[s] ?? s}
                </button>
              );
            })}
          </div>
          {estimate != null && (
            <p className={`mt-1.5 text-xs ${t.muted}`}>About <b>{estimate}</b> people, after removing unsubscribed and bouncing addresses.</p>
          )}
        </div>

        <div>
          <label className={label} htmlFor="mc-subject">Subject</label>
          <input id="mc-subject" ref={subjectRef} className={field} value={d.subject} maxLength={200}
            onFocus={() => setLastField("subject")} onChange={(e) => set({ subject: e.target.value })} />
        </div>

        <div>
          <label className={label} htmlFor="mc-pre">Preview line (grey text after the subject in the inbox, optional)</label>
          <input id="mc-pre" className={field} value={d.preheader} maxLength={200} onChange={(e) => set({ preheader: e.target.value })} />
        </div>

        <div>
          <label className={label} htmlFor="mc-html">Message (HTML)</label>
          <textarea id="mc-html" ref={htmlRef} rows={12} className={`${field} font-mono text-xs`} value={d.html}
            onFocus={() => setLastField("html")} onChange={(e) => set({ html: e.target.value })} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`text-xs ${t.muted}`}>Insert into {lastField === "subject" ? "Subject" : "Message"}:</span>
            {variables.map((v) => (
              <button key={v} type="button" onClick={() => insertVariable(v)}
                className={`rounded-full border px-2.5 py-1 font-mono text-3xs ${t.badgeAccent}`}>{`{{${v}}}`}</button>
            ))}
          </div>
          <p className={`mt-1 text-xs ${t.dim}`}>An unsubscribe line is added at the bottom of every email automatically.</p>
        </div>

        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        {note && <p className="text-sm text-emerald-500">{note}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={doSave} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Save draft</button>
          <button type="button" disabled={busy} onClick={doCheck} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Check variables</button>
          <button type="button" disabled={busy} onClick={doPreview} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Preview</button>
        </div>

        <div className={`space-y-3 rounded-2xl border p-4 ${t.cardFlat}`}>
          <div className="flex flex-wrap gap-2">
            <input type="email" placeholder="your@email.com" className={`${field} max-w-xs`} value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)} aria-label="Test email address" />
            <button type="button" disabled={busy} onClick={doTest} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Send test</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="datetime-local" className={`${field} max-w-xs`} value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)} aria-label="Schedule date and time" />
            <button type="button" disabled={busy} onClick={doSchedule} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Schedule</button>
          </div>
          <button type="button" disabled={busy} onClick={doSend}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-5 text-xs font-bold ${t.btnAccent}`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" aria-hidden />} Send now
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {check && (
          <div className={`rounded-2xl border p-4 ${t.card}`}>
            <p className={`mb-2 text-sm font-bold ${t.heading}`}>Variable check (first person on the list)</p>
            {check.unknown.length > 0 ? (
              <p className="mb-2 text-sm text-red-500">
                Can&apos;t be filled: {check.unknown.map((u) => `{{${u}}}`).join(", ")}. Fix these — the email can&apos;t be sent until you do.
              </p>
            ) : (
              <p className="mb-2 text-sm text-emerald-500">All variables can be filled.</p>
            )}
            <ul className="space-y-1 text-xs">
              {Object.entries(check.sample).map(([k, v]) => (
                <li key={k} className={t.text}><span className="font-mono">{`{{${k}}}`}</span> → {v || <i className="text-amber-500">empty</i>}</li>
              ))}
            </ul>
            <p className={`mt-2 text-xs ${t.muted}`}>Subject becomes: “{check.subject}”</p>
          </div>
        )}
        {preview && (
          <div className={`rounded-2xl border p-4 ${t.card}`}>
            <p className={`text-xs ${t.muted}`}>To: {preview.to}</p>
            <p className={`mb-3 text-sm font-bold ${t.heading}`}>{preview.subject}</p>
            <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="h-[480px] w-full rounded-xl border bg-white" />
          </div>
        )}
        {!check && !preview && (
          <p className={`rounded-2xl border p-6 text-center text-sm ${t.cardFlat} ${t.muted}`}>
            Click “Preview” to see the email exactly as the first person will get it.
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ templates

function TemplatesView({ isDark, templates, variables, onChanged }: {
  isDark: boolean; templates: McTemplate[]; variables: string[]; onChanged: () => void;
}) {
  const t = saTheme(isDark);
  const [edit, setEdit] = useState<{ id: number | null; name: string; subject: string; preheader: string; html: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const field = `w-full rounded-xl border px-3 py-2.5 text-sm ${t.input}`;

  const save = async () => {
    if (!edit) return;
    setError(null);
    try {
      await mcSaveTemplate(edit.id, { name: edit.name, subject: edit.subject, preheader: edit.preheader, html: edit.html });
      setEdit(null);
      onChanged();
    } catch (e) { setError(errText(e)); }
  };

  if (edit) {
    return (
      <div className="max-w-2xl space-y-3">
        <input className={field} placeholder="Template name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
        <input className={field} placeholder="Subject" value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} />
        <input className={field} placeholder="Preview line (optional)" value={edit.preheader} onChange={(e) => setEdit({ ...edit, preheader: e.target.value })} />
        <textarea rows={12} className={`${field} font-mono text-xs`} value={edit.html} onChange={(e) => setEdit({ ...edit, html: e.target.value })} />
        <p className={`text-xs ${t.muted}`}>Variables you can use: {variables.map((v) => `{{${v}}}`).join(", ")}</p>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={save} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btnAccent}`}>Save template</button>
          <button type="button" onClick={() => setEdit(null)} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setEdit({ id: null, name: "", subject: "", preheader: "", html: EMPTY.html })}
        className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-4 text-xs font-bold ${t.btnAccent}`}>
        <Plus className="h-4 w-4" aria-hidden /> New template
      </button>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {templates.length === 0 && <p className={`py-8 text-center text-sm ${t.muted}`}>No templates yet.</p>}
      {templates.map((tp) => (
        <div key={tp.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${t.card}`}>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-bold ${t.heading}`}>{tp.name}</p>
            <p className={`truncate text-xs ${t.muted}`}>{tp.subject}</p>
          </div>
          <button type="button" onClick={() => setEdit({ id: tp.id, name: tp.name, subject: tp.subject, preheader: tp.preheader ?? "", html: tp.html })}
            className={`min-h-8 rounded-lg border px-3 text-xs font-semibold ${t.btn}`}>Edit</button>
          <button type="button" aria-label="Delete template"
            onClick={async () => {
              if (!window.confirm("Delete this template?")) return;
              try { await mcDeleteTemplate(tp.id); onChanged(); } catch (e) { setError(errText(e)); }
            }}
            className={`min-h-8 rounded-lg border px-2.5 ${t.btn}`}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ overview

function OverviewView({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [o, setO] = useState<McOverview | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => { setError(false); mcOverview().then(setO).catch(() => setError(true)); }, []);
  useEffect(() => { load(); }, [load]);
  if (error) return <SaLoadError what="the overview" onRetry={load} />;
  if (!o) return <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} />;

  const pct = (n: number, of: number) => (of === 0 ? "—" : `${Math.round((100 * n) / of)}%`);
  const bounceBad = o.bouncePct7d > o.bouncePausePct;
  const complaintBad = o.complaintPct7d > o.complaintPausePct;
  const tiles: [string, string][] = [
    ["Sent (30 days)", String(o.sent30d)],
    ["Delivered", pct(o.delivered30d, o.sent30d)],
    ["Opened (approx.)", pct(o.opened30d, o.sent30d)],
    ["Clicked", pct(o.clicked30d, o.sent30d)],
    ["Sent today (24 h)", `${o.sentLast24h} / ${o.dailyCap}`],
    ["Sending · Scheduled · Paused", `${o.sending} · ${o.scheduled} · ${o.paused}`],
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div key={label} className={`rounded-2xl border p-4 ${t.card}`}>
            <p className={`text-3xs font-black uppercase tracking-wider ${t.dim}`}>{label}</p>
            <p className={`mt-1 text-xl font-black tabular-nums ${t.heading}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className={`rounded-2xl border p-4 ${t.card}`}>
        <p className={`text-sm font-bold ${t.heading}`}>Sender health (last 7 days, {o.sent7d} emails)</p>
        <p className={`mt-1 text-xs ${t.muted}`}>
          Amazon blocks the account at 5% bounces or 0.1% spam reports — and that would also stop OTP emails,
          so nobody could log in. Sending pauses on its own well before that.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          <li className={bounceBad ? "text-red-500" : "text-emerald-500"}>
            Bounces: {o.bouncePct7d.toFixed(2)}% (pauses above {o.bouncePausePct}%)
          </li>
          <li className={complaintBad ? "text-red-500" : "text-emerald-500"}>
            Spam reports: {o.complaintPct7d.toFixed(3)}% (pauses above {o.complaintPausePct}%)
          </li>
        </ul>
        {o.sent7d < 200 && <p className={`mt-2 text-xs ${t.dim}`}>Too few emails yet for these numbers to mean much.</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ blocked addresses

function SuppressionView({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<McSuppression | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = `w-full rounded-xl border px-3 py-2.5 text-sm ${t.input}`;

  const run = async (fn: () => Promise<McSuppression>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setError(null);
    try { setResult(await fn()); } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl space-y-4">
      <p className={`text-xs ${t.muted}`}>
        Look up one address to see if CauseKind is blocked from emailing it. Addresses get blocked automatically when an
        email bounces for good or the person reports it as spam. There is no full list on purpose — it is people&apos;s private data.
      </p>
      <div className="flex gap-2">
        <input type="email" className={field} placeholder="someone@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} aria-label="Email address to look up" />
        <button type="button" disabled={busy || !email.includes("@")} onClick={() => run(() => mcSuppressionLookup(email))}
          className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btnAccent}`}>Look up</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {result && (
        <div className={`space-y-3 rounded-2xl border p-4 ${t.card}`}>
          <p className={`text-sm font-bold ${t.heading}`}>{result.email}</p>
          {result.suppressed ? (
            <p className="text-sm text-red-500">
              Blocked for all email (reason: {result.reason}, from {result.source}
              {result.since ? `, since ${new Date(result.since).toLocaleDateString("en-IN")}` : ""}).
              This also stops OTPs and receipts to this address.
            </p>
          ) : (
            <p className="text-sm text-emerald-500">Not blocked.</p>
          )}
          <p className={`text-xs ${t.muted}`}>
            {result.optedOut ? "Has unsubscribed from campaign emails." : "Has not unsubscribed from campaign emails."}
          </p>
          {result.suppressed ? (
            <button type="button" disabled={busy}
              onClick={() => run(() => mcUnsuppress(result.email),
                "Unblock this address? Only do this if the problem is fixed — Amazon may still refuse to deliver until it is removed in the AWS console too.")}
              className={`min-h-9 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Unblock</button>
          ) : (
            <div className="flex gap-2">
              <input className={field} placeholder="Why (optional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
              <button type="button" disabled={busy}
                onClick={() => run(() => mcSuppress(result.email, note), "Block this address from ALL CauseKind email, including OTPs?")}
                className={`min-h-9 rounded-xl border px-4 text-xs font-bold text-red-500 ${t.btn}`}>Block</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
