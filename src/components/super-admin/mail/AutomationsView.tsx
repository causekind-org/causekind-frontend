"use client";

/**
 * Mail Center: automations (Phase 6b; inventory AT01–AT15).
 * Rules list (title, audience, repeat, next send, active), editor with the
 * shared rich editor and rule variables, upcoming-sends preview, switch on/off,
 * duplicate, delete, and dispatch history linking to each send's campaign.
 * New rules are saved switched off; switching on is a separate, confirmed step.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcRules, mcSaveRule, mcSetRuleActive, mcDuplicateRule, mcDeleteRule, mcPreviewRule, mcRuleHistory, mcMailIds, mcCtaTargets,
  type McAudience, type McRule, type McRuleInput, type McRulePreview, type McRuleDispatch, type McMailId, type McCtaTarget,
} from "@/lib/api";
import { Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { SEGMENT_LABEL, audienceKey, audienceColumns, errText } from "./shared";
import { RichEmailEditor, type RichEmailEditorHandle } from "./RichEmailEditor";

const RULE_VARS = ["due_date", "days_left", "tag_label", "cta_url"];
const BASE_VARS = ["name", "first_name", "email"];
const ist = (s: string) => new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const EMPTY: McRuleInput = {
  title: "", segments: [], tagLabel: "", repeatType: "MONTHLY", dayOfMonth: 1, yearlyDates: "", offsets: "7, 1",
  sendTime: "10:00", identityId: null, subject: "", preheader: "", html: "<p>Hi {{first_name}},</p><p></p>", text: "", ctaUrl: "",
};
const repeatText = (r: McRuleInput) =>
  r.repeatType === "MONTHLY" ? `Monthly on day ${r.dayOfMonth}` : `Yearly on ${r.yearlyDates || "—"}`;

export function AutomationsView({ isDark, segments, audiences }: { isDark: boolean; segments: string[]; audiences: McAudience[] }) {
  const t = saTheme(isDark);
  const [rules, setRules] = useState<McRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<(McRuleInput & { id: number | null }) | null>(null);
  const [historyFor, setHistoryFor] = useState<number | null | undefined>(undefined);
  const btn = `inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${t.btn}`;

  const load = useCallback(() => { setError(null); mcRules().then(setRules).catch((e) => setError(errText(e))); }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>) => { setError(null); try { await fn(); load(); } catch (e) { setError(errText(e)); } };
  const label = (s: string) => SEGMENT_LABEL[s] ?? audiences.find((a) => audienceKey(a.id) === s)?.name ?? s;

  if (edit) return <RuleEditor isDark={isDark} initial={edit} segments={segments} audiences={audiences} onClose={() => { setEdit(null); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className={`mr-auto max-w-2xl text-xs ${t.muted}`}>
          A rule sends a campaign on a repeating date, with reminders some days before. Each send becomes a normal campaign
          (“Auto: …”), with the same safety rules: no donees, unsubscribe link, daily limits. New rules start switched off.
        </p>
        <button type="button" onClick={() => setHistoryFor(historyFor === undefined ? null : undefined)} className={btn}>Send history</button>
        <button type="button" onClick={() => setEdit({ ...EMPTY, id: null })} className={`${btn} ${t.btnAccent}`}><Plus className="h-3.5 w-3.5" /> New rule</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {historyFor !== undefined && <History isDark={isDark} ruleId={historyFor} />}
      {rules == null ? <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} />
        : rules.length === 0 ? <p className={`py-8 text-center text-sm ${t.muted}`}>No rules yet.</p>
        : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className={t.dim}><tr>{["Rule", "Audience", "Repeat", "Next send (IST)", "Sends", "On", ""].map((h) => <th key={h} className="px-2 py-1.5 font-black uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className={`border-t ${t.text}`}>
                    <td className="px-2 py-2"><p className="font-bold">{r.title}</p>{r.tagLabel && <p className={t.muted}>{r.tagLabel}</p>}</td>
                    <td className="max-w-[12rem] truncate px-2 py-2">{r.segments.map(label).join(", ")}</td>
                    <td className="px-2 py-2">{repeatText(r)} · reminders {r.offsets} days before</td>
                    <td className="whitespace-nowrap px-2 py-2">{r.nextSendAt ? ist(r.nextSendAt) : "—"}</td>
                    <td className="px-2 py-2"><button type="button" className="underline" onClick={() => setHistoryFor(r.id)}>{r.dispatchCount ?? 0}</button></td>
                    <td className="px-2 py-2">
                      <label className="inline-flex items-center gap-1.5">
                        <input type="checkbox" checked={r.active} aria-label={`${r.active ? "Switch off" : "Switch on"} ${r.title}`}
                          onChange={() => act(async () => {
                            if (!r.active && !window.confirm(`Switch on “${r.title}”? It will send automatically from ${r.nextSendAt ? ist(r.nextSendAt) : "its next date"} (IST).`)) return;
                            await mcSetRuleActive(r.id, !r.active);
                          })} />
                        <span className={r.active ? "font-bold text-emerald-600" : t.muted}>{r.active ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right">
                      <button type="button" aria-label={`Edit ${r.title}`} className="rounded p-1 hover:bg-black/10" onClick={() => setEdit({ ...r, id: r.id })}><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label={`Duplicate ${r.title}`} className="rounded p-1 hover:bg-black/10" onClick={() => act(() => mcDuplicateRule(r.id))}><Copy className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label={`Delete ${r.title}`} className="rounded p-1 hover:bg-black/10"
                        onClick={() => act(async () => { if (window.confirm(`Delete “${r.title}”?`)) await mcDeleteRule(r.id); })}><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function RuleEditor({ isDark, initial, segments, audiences, onClose }: {
  isDark: boolean; initial: McRuleInput & { id: number | null }; segments: string[]; audiences: McAudience[]; onClose: () => void;
}) {
  const t = saTheme(isDark);
  const [r, setR] = useState(initial);
  const [preview, setPreview] = useState<McRulePreview | null>(null);
  const [senders, setSenders] = useState<McMailId[]>([]);
  const [targets, setTargets] = useState<McCtaTarget[]>([]);
  const [lastField, setLastField] = useState<"subject" | "html">("html");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<RichEmailEditorHandle>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const field = `w-full rounded-xl border px-3 py-2 text-sm ${t.input}`;
  const label = `mb-1 block text-3xs font-black uppercase tracking-wider ${t.dim}`;

  useEffect(() => {
    mcMailIds().then((m) => setSenders(m.identities.filter((i) => i.status === "ACTIVE"))).catch(() => setSenders([]));
    mcCtaTargets().then(setTargets).catch(() => setTargets([]));
  }, []);
  const set = (p: Partial<McRuleInput>) => { setR((x) => ({ ...x, ...p })); setPreview(null); };

  const insert = (v: string) => {
    const tag = `{{${v}}}`;
    if (lastField === "html") { editorRef.current?.insertText(tag); return; }
    const el = subjectRef.current; const s = r.subject;
    const a = el?.selectionStart ?? s.length, b = el?.selectionEnd ?? s.length;
    set({ subject: s.slice(0, a) + tag + s.slice(b) });
  };

  const doPreview = async () => { setBusy(true); setError(null); try { setPreview(await mcPreviewRule(r)); } catch (e) { setError(errText(e)); } finally { setBusy(false); } };
  const doSave = async () => {
    setBusy(true); setError(null);
    try { await mcSaveRule(r.id, r); onClose(); } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  const allSources = [...segments, ...audiences.map((a) => audienceKey(a.id))];
  const sourceLabel = (s: string) => SEGMENT_LABEL[s] ?? audiences.find((a) => audienceKey(a.id) === s)?.name ?? s;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-3">
        <h3 className={`text-base font-black ${t.heading}`}>{r.id ? "Edit rule" : "New rule (saved switched off)"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={label} htmlFor="ru-title">Rule name</label><input id="ru-title" className={field} value={r.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} /></div>
          <div><label className={label} htmlFor="ru-tag">Label for {"{{tag_label}}"} (optional)</label><input id="ru-tag" className={field} value={r.tagLabel ?? ""} maxLength={120} onChange={(e) => set({ tagLabel: e.target.value })} /></div>
        </div>
        <div>
          <span className={label}>Who gets it (lists are combined, people appear once)</span>
          <div className="flex flex-wrap gap-1.5">
            {allSources.map((s) => {
              const on = r.segments.includes(s);
              return <button key={s} type="button" aria-pressed={on} onClick={() => set({ segments: on ? r.segments.filter((x) => x !== s) : [...r.segments, s] })}
                className={`min-h-8 rounded-full border px-3 text-xs font-bold ${on ? t.chipActive : t.chipInactive}`}>{sourceLabel(s)}</button>;
            })}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><label className={label} htmlFor="ru-rep">Repeat</label>
            <select id="ru-rep" className={field} value={r.repeatType} onChange={(e) => set({ repeatType: e.target.value as "MONTHLY" | "YEARLY" })}>
              <option value="MONTHLY">Every month</option><option value="YEARLY">Every year</option>
            </select></div>
          {r.repeatType === "MONTHLY" ? (
            <div><label className={label} htmlFor="ru-dom">Day of month</label>
              <input id="ru-dom" inputMode="numeric" className={field} value={r.dayOfMonth ?? ""} onChange={(e) => set({ dayOfMonth: Number(e.target.value.replace(/\D/g, "")) || null })} />
              <p className={`text-3xs ${t.dim}`}>29–31 use the last day in shorter months.</p></div>
          ) : (
            <div><label className={label} htmlFor="ru-yd">Dates (MM-DD, comma-separated)</label>
              <input id="ru-yd" className={field} placeholder="03-31, 09-30" value={r.yearlyDates ?? ""} onChange={(e) => set({ yearlyDates: e.target.value })} /></div>
          )}
          <div><label className={label} htmlFor="ru-off">Days before (0 = on the day)</label>
            <input id="ru-off" className={field} placeholder="7, 1, 0" value={r.offsets} onChange={(e) => set({ offsets: e.target.value })} /></div>
          <div><label className={label} htmlFor="ru-time">Send time (IST)</label>
            <input id="ru-time" type="time" className={field} value={r.sendTime} onChange={(e) => set({ sendTime: e.target.value })} /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={label} htmlFor="ru-from">Send from</label>
            <select id="ru-from" className={field} value={r.identityId ?? ""} onChange={(e) => set({ identityId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">CauseKind newsletter (default)</option>
              {senders.map((s) => <option key={s.id} value={s.id}>{s.displayName} &lt;{s.address}&gt;</option>)}
            </select></div>
          <div><label className={label} htmlFor="ru-cta">Link for {"{{cta_url}}"} (optional)</label>
            <select id="ru-cta" className={field} value={r.ctaUrl ?? ""} onChange={(e) => set({ ctaUrl: e.target.value })}>
              <option value="">No link</option>
              {targets.map((x) => <option key={x.url} value={x.url}>{x.kind}: {x.title}</option>)}
            </select></div>
        </div>
        <div><label className={label} htmlFor="ru-subj">Subject</label>
          <input id="ru-subj" ref={subjectRef} className={field} value={r.subject} maxLength={200} onFocus={() => setLastField("subject")} onChange={(e) => set({ subject: e.target.value })} /></div>
        <div><label className={label} htmlFor="ru-pre">Preview line (optional)</label>
          <input id="ru-pre" className={field} value={r.preheader ?? ""} maxLength={200} onChange={(e) => set({ preheader: e.target.value })} /></div>
        <div>
          <span className={label}>Message</span>
          <RichEmailEditor ref={editorRef} value={r.html} isDark={isDark} inputClass={t.input} btnClass={t.btn}
            imageColumns={audienceColumns(audiences, r.segments)} onFocus={() => setLastField("html")} onChange={(html) => set({ html })} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`text-xs ${t.muted}`}>Insert into {lastField === "subject" ? "Subject" : "Message"}:</span>
            {[...BASE_VARS, ...RULE_VARS, ...audienceColumns(audiences, r.segments)].map((v) => (
              <button key={v} type="button" onClick={() => insert(v)} className={`rounded-full border px-2.5 py-1 font-mono text-3xs ${RULE_VARS.includes(v) ? "border-sky-500/50 text-sky-600" : t.badgeAccent}`}>{`{{${v}}}`}</button>
            ))}
          </div>
          <p className={`mt-1 text-xs ${t.dim}`}>{"{{due_date}}"} = the repeating date (e.g. 31 Mar 2027) · {"{{days_left}}"} = days before it · an unsubscribe line is always added.</p>
        </div>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={doSave} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btnAccent}`}>{busy && <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />}Save rule</button>
          <button type="button" disabled={busy} onClick={doPreview} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Preview upcoming sends</button>
          <button type="button" onClick={onClose} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Cancel</button>
        </div>
        <p className={`text-xs ${t.dim}`}>Saving never switches a rule on. Editing a rule that is on keeps it on, and its next sends use the new version.</p>
      </div>
      <div className={`h-fit space-y-2 rounded-2xl border p-4 text-xs ${t.card}`}>
        <p className={`text-sm font-bold ${t.heading}`}>Upcoming sends</p>
        {!preview ? <p className={t.muted}>Press “Preview upcoming sends”.</p> : (
          <>
            <p className={t.text}>{preview.audience != null ? `About ${preview.audience} people today, after removing unsubscribed, blocked and donee addresses.` : "Choose who gets it to see the audience size."}</p>
            <ul className="space-y-1">
              {preview.upcoming.map((u, i) => (
                <li key={i} className={`flex justify-between gap-2 border-t pt-1 ${t.text}`}>
                  <span>{ist(u.sendAt)}</span>
                  <span className={t.muted}>{u.daysBefore === 0 ? "on the day" : `${u.daysBefore}d before`} {u.dueDate}</span>
                </li>
              ))}
            </ul>
            <p className={t.dim}>{preview.note}</p>
          </>
        )}
      </div>
    </div>
  );
}

function History({ isDark, ruleId }: { isDark: boolean; ruleId: number | null }) {
  const t = saTheme(isDark);
  const [rows, setRows] = useState<McRuleDispatch[] | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setRows(null); mcRuleHistory(ruleId, page).then((r) => { setRows(r.rows); setTotal(r.total); }).catch((e) => setError(errText(e))); }, [ruleId, page]);
  const STYLE: Record<string, string> = { QUEUED: "text-emerald-600", SKIPPED: "text-stone-500", MISSED: "text-amber-600", FAILED: "text-red-500" };
  return (
    <div className={`rounded-2xl border p-4 text-xs ${t.card}`}>
      <p className={`mb-2 text-sm font-bold ${t.heading}`}>Send history {ruleId != null ? "(this rule)" : "(all rules)"}</p>
      {error ? <p role="alert" className="text-red-500">{error}</p> : rows == null ? <Loader2 className={`h-4 w-4 animate-spin ${t.muted}`} />
        : rows.length === 0 ? <p className={t.muted}>Nothing sent yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className={t.dim}><tr>{["When (IST)", "Rule", "Date", "Reminder", "People", "Status", "Report"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
              <tbody>{rows.map((d) => (
                <tr key={d.id} className={`border-t ${t.text}`}>
                  <td className="whitespace-nowrap px-2 py-1">{ist(d.plannedAt)}</td>
                  <td className="px-2 py-1">{d.ruleTitle} <span className={t.muted}>v{d.ruleVersion}</span></td>
                  <td className="px-2 py-1">{d.dueDate}</td>
                  <td className="px-2 py-1">{d.daysBefore === 0 ? "on the day" : `${d.daysBefore}d before`}</td>
                  <td className="px-2 py-1 tabular-nums">{d.recipients ?? "—"}</td>
                  <td className={`px-2 py-1 font-bold ${STYLE[d.status] ?? ""}`} title={d.error ?? ""}>{d.status}{d.error ? ` · ${d.error}` : ""}</td>
                  <td className="px-2 py-1">{d.campaignId ? <a className="underline" href={`?section=mail-center&mcReport=${d.campaignId}`}>Open report</a> : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      <div className="mt-2 flex items-center justify-end gap-2">
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className={`min-h-7 rounded border px-2 ${t.btn}`}>Previous</button>
        <span className={t.muted}>Page {page + 1}</span>
        <button type="button" disabled={(page + 1) * 50 >= total} onClick={() => setPage((p) => p + 1)} className={`min-h-7 rounded border px-2 ${t.btn}`}>Next</button>
      </div>
    </div>
  );
}
