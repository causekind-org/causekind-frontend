"use client";

import { useEffect, useRef, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcCreateCampaign,
  mcEstimate,
  mcPreview,
  mcSaveTemplate,
  mcSchedule,
  mcSendNow,
  mcSendTest,
  mcUpdateCampaign,
  mcVariableCheck,
  mcMailIds,
  type McMailId,
  type McMailIdSetup,
  type McAttachment,
  type McAudience,
  type McTemplate,
  type McVariableCheck,
} from "@/lib/api";
import { Loader2, Send, X } from "lucide-react";
import { SEGMENT_LABEL, type Draft, audienceKey, errText, audienceColumns } from "./shared";
import { RichEmailEditor, type RichEmailEditorHandle } from "./RichEmailEditor";
import { CampaignAttachments } from "./CampaignAttachments";
import { PlanBuilder } from "./PlanBuilder";

/** Mail Center: campaign composer. */

// ------------------------------------------------------------------ editor

export function CampaignEditor({ isDark, draft, segments, variables, templates, audiences, onClose }: {
  isDark: boolean; draft: Draft; segments: string[]; variables: string[]; templates: McTemplate[];
  audiences: McAudience[]; onClose: () => void;
}) {
  const t = saTheme(isDark);
  const [d, setD] = useState<Draft>(draft);
  const [lastField, setLastField] = useState<"subject" | "html" | "text">("html");
  const subjectRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<RichEmailEditorHandle>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [check, setCheck] = useState<McVariableCheck | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string; to: string } | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [files, setFiles] = useState<McAttachment[]>([]);
  const [senders, setSenders] = useState<{ setup: McMailIdSetup; identities: McMailId[] } | null>(null);
  useEffect(() => { mcMailIds().then(setSenders).catch(() => setSenders(null)); }, []);
  const fromLine = (() => { const i = senders?.identities.find((x) => x.id === d.identityId); return i ? `${i.displayName} <${i.address}>` : "CauseKind newsletter"; })();
  const trackLine = d.tracking ? "opens and clicks tracked" : "personal mode, opens and clicks not tracked";
  const filesLine = files.length ? `${files.length} attachment(s): ${files.map((f) => f.fileName).join(", ")}` : "No attachments";

  useEffect(() => {
    if (d.segments.length === 0) { setEstimate(null); return; }
    let live = true;
    mcEstimate(d.segments).then((r) => live && setEstimate(r.recipients)).catch(() => live && setEstimate(null));
    return () => { live = false; };
  }, [d.segments]);

  const set = (patch: Partial<Draft>) => { setD((p) => ({ ...p, ...patch })); setCheck(null); setPreview(null); };

  const insertVariable = (v: string) => {
    const tag = `{{${v}}}`;
    if (lastField === "html") { editorRef.current?.insertText(tag); return; }
    const el = lastField === "subject" ? subjectRef.current : textRef.current;
    const key = lastField;
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
    const perDay = d.dailyLimit.trim() === "" ? null : Number(d.dailyLimit);
    if (perDay != null && (!Number.isInteger(perDay) || perDay < 1)) { setError("“Per day” must be a whole number, or empty."); return null; }
    const body = { name: d.name, subject: d.subject, preheader: d.preheader, html: d.html, text: d.text, segments: d.segments, dailyLimit: perDay,
      identityId: d.identityId, tracking: d.tracking };
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
  /**
   * Whole-list check before sending. Unknown tags stop here; blanks need an
   * explicit yes. Returns null to abort, else whether blanks were accepted.
   */
  const confirmVariables = async (id: number): Promise<boolean | null> => {
    const c = await mcVariableCheck(id);
    setCheck(c);
    if (c.unknown.length) throw new Error(`Can't be filled: ${c.unknown.map((u) => `{{${u}}}`).join(", ")}. Fix these first.`);
    if (!c.missing.length) return false;
    const lines = c.missing.map((m) => `• {{${m.variable}}}: ${m.count} of ${c.recipients} people have no value`).join("\n");
    return window.confirm(`Some people will see a blank where these are used:\n\n${lines}\n\nSend anyway with blanks?`) ? true : null;
  };
  const doSend = () => run(async (id) => {
    const accept = await confirmVariables(id);
    if (accept === null) return;
    if (!window.confirm(`Send this email to about ${estimate ?? "?"} people now?

${filesLine}
From: ${fromLine} · ${trackLine}

This can be paused but not undone.`)) return;
    await mcSendNow(id, accept);
    onClose();
  });
  const doSchedule = () => run(async (id) => {
    if (!scheduleAt) throw new Error("Pick a date and time first.");
    const accept = await confirmVariables(id);
    if (accept === null) return;
    await mcSchedule(id, new Date(scheduleAt).toISOString(), accept);
    onClose();
  });
  const doSaveTemplate = async () => {
    const name = window.prompt("Template name", d.name || d.subject);
    if (!name?.trim()) return;
    setBusy(true); setError(null); setNote(null);
    try {
      await mcSaveTemplate(null, { name: name.trim().slice(0, 120), subject: d.subject, preheader: d.preheader, html: d.html, text: d.text });
      setNote(`Saved as template “${name.trim()}”. The campaign itself is unchanged.`);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

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
                if (tp) set({ subject: tp.subject, preheader: tp.preheader ?? "", html: tp.html, text: tp.text ?? "", name: d.name || tp.name });
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
            {audiences.map((a) => {
              const k = audienceKey(a.id);
              const on = d.segments.includes(k);
              return (
                <button key={k} type="button" aria-pressed={on}
                  onClick={() => set({ segments: on ? d.segments.filter((x) => x !== k) : [...d.segments, k] })}
                  className={`min-h-9 rounded-full border px-3.5 text-xs font-bold ${on ? t.chipActive : t.chipInactive}`}>
                  {a.name} · {a.memberCount}
                </button>
              );
            })}
          </div>
          {estimate != null && (
            <p className={`mt-1.5 text-xs ${t.muted}`}>About <b>{estimate}</b> people, after removing unsubscribed and bouncing addresses.</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="mc-from">Send from</label>
            <select id="mc-from" className={field} value={d.identityId ?? ""}
              onChange={(e) => set({ identityId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">CauseKind newsletter (default)</option>
              {senders?.identities.filter((i) => i.status === "ACTIVE" || i.id === d.identityId).map((i) => (
                <option key={i.id} value={i.id} disabled={i.status !== "ACTIVE"}>{i.displayName} &lt;{i.address}&gt;{i.status !== "ACTIVE" ? " (suspended)" : ""}</option>
              ))}
            </select>
            <p className={`mt-1 text-xs ${t.dim}`}>Replies go to this address. Only Mail IDs set up under Mail IDs can be chosen.</p>
          </div>
          <div>
            <span className={label}>Tracking</span>
            <label className={`flex items-start gap-2 text-xs ${t.text}`}>
              <input type="checkbox" className="mt-0.5" checked={!d.tracking}
                disabled={d.tracking && senders != null && !senders.setup.untrackedModeConfigured}
                onChange={(e) => set({ tracking: !e.target.checked })} />
              <span>Personal mode: no open pixel or link tracking. Opens and clicks won&apos;t be counted; bounces and unsubscribes still are. It doesn&apos;t guarantee the main inbox.</span>
            </label>
            {senders != null && !senders.setup.untrackedModeConfigured && (
              <p className={`mt-1 text-xs ${t.dim}`}>Not set up on this server yet, so tracking stays on.</p>
            )}
          </div>
        </div>

        <div>
          <label className={label} htmlFor="mc-perday">Send in rounds: at most this many per day (optional)</label>
          <input id="mc-perday" inputMode="numeric" className={`${field} max-w-[12rem]`} placeholder="e.g. 500"
            value={d.dailyLimit} onChange={(e) => set({ dailyLimit: e.target.value.replace(/[^0-9]/g, "") })} />
          {d.dailyLimit && estimate != null && Number(d.dailyLimit) > 0 && (
            <p className={`mt-1 text-xs ${t.muted}`}>
              About {Math.ceil(estimate / Number(d.dailyLimit))} day(s) to reach everyone. Leave empty to send as fast as allowed.
            </p>
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
          <label className={label} htmlFor="mc-html">Message</label>
          <RichEmailEditor ref={editorRef} id="mc-html" value={d.html} isDark={isDark} inputClass={t.input} btnClass={t.btn}
            imageColumns={audienceColumns(audiences, d.segments)}
            onFocus={() => setLastField("html")} onChange={(html) => set({ html })} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={`text-xs ${t.muted}`}>Insert into {lastField === "subject" ? "Subject" : lastField === "text" ? "Plain-text version" : "Message"}:</span>
            {[...variables, ...audienceColumns(audiences, d.segments)].map((v) => (
              <button key={v} type="button" onClick={() => insertVariable(v)}
                className={`rounded-full border px-2.5 py-1 font-mono text-3xs ${t.badgeAccent}`}>{`{{${v}}}`}</button>
            ))}
          </div>
          <p className={`mt-1 text-xs ${t.dim}`}>An unsubscribe line is added at the bottom of every email automatically.</p>
        </div>

        <details open={d.text.trim() !== ""}>
          <summary className={`cursor-pointer text-xs font-bold ${t.muted}`}>Plain-text version (optional)</summary>
          <textarea id="mc-text" ref={textRef} rows={6} className={`${field} mt-2 font-mono text-xs`} value={d.text}
            placeholder="Leave empty and it is made from the message automatically."
            onFocus={() => setLastField("text")} onChange={(e) => set({ text: e.target.value })} />
          <p className={`mt-1 text-xs ${t.dim}`}>Shown by mail apps that don’t display HTML. Variables work here too.</p>
        </details>

        <CampaignAttachments campaignId={d.id} editable onItems={setFiles} labelClass={label} btnClass={t.btn} mutedClass={t.muted}
          ensureSaved={async () => { setError(null); try { return await save(); } catch (e) { setError(errText(e)); return null; } }} />

        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        {note && <p className="text-sm text-emerald-500">{note}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={doSave} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Save draft</button>
          <button type="button" disabled={busy} onClick={doCheck} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Check variables</button>
          <button type="button" disabled={busy} onClick={doPreview} className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Preview</button>
          <button type="button" disabled={busy || !d.subject.trim() || !d.html.trim()} onClick={doSaveTemplate}
            className={`min-h-10 rounded-xl border px-4 text-xs font-bold ${t.btn}`}>Save as template</button>
        </div>

        <details className={`rounded-2xl border p-4 ${t.cardFlat}`}>
          <summary className={`cursor-pointer text-sm font-bold ${t.heading}`}>Send in rounds (batch plan)</summary>
          <p className={`mt-1 mb-3 text-xs ${t.muted}`}>Start small and grow, or follow date phases. Each person is put in one round when you schedule, and nobody gets it twice.</p>
          <PlanBuilder fieldClass={field} labelClass={label} btnClass={t.btn} accentClass={t.btnAccent} mutedClass={t.muted} headingClass={`font-bold ${t.heading}`}
            ensureSaved={async () => {
              if (d.dailyLimit.trim()) { setError("Clear the simple “per day” amount above first; a batch plan replaces it."); return null; }
              setError(null); try { return await save(); } catch (e) { setError(errText(e)); return null; }
            }}
            confirmVariables={confirmVariables} onScheduled={onClose} />
        </details>

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
            <p className={`mb-2 text-sm font-bold ${t.heading}`}>Variable check · {check.recipients} people</p>
            {check.unknown.length > 0 ? (
              <p className="mb-2 text-sm text-red-500">
                Can&apos;t be filled: {check.unknown.map((u) => `{{${u}}}`).join(", ")}. Fix these — the email can&apos;t be sent until you do.
              </p>
            ) : check.missing.length > 0 ? (
              <div className="mb-2 text-sm text-amber-500">
                <p>Every tag is known, but some people have no value:</p>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {check.missing.map((m) => (
                    <li key={m.variable}>
                      <span className="font-mono">{`{{${m.variable}}}`}</span>: {m.count} of {check.recipients} blank
                      {m.examples.length > 0 && <span className={t.muted}> (e.g. {m.examples.join(", ")})</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs">They will see nothing in that spot. You&apos;ll be asked to confirm before sending.</p>
              </div>
            ) : (
              <p className="mb-2 text-sm text-emerald-500">All variables are filled for everyone on the list.</p>
            )}
            <p className={`mb-1 text-xs font-bold ${t.muted}`}>First person, as an example:</p>
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
            <p className={`text-xs ${t.muted}`}>To: {preview.to} (example person) · From: {fromLine} · {trackLine}</p>
            <p className={`text-xs ${t.muted}`}>{filesLine}</p>
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
