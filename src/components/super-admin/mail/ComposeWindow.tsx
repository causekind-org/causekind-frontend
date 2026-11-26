"use client";

/**
 * 1:1 compose window (Phase 4c; inventory IN10–IN15).
 * From (active Mail IDs only), To, expandable Cc/Bcc, subject, plain message,
 * attachments up to 10 MB, minimise / full screen, Save and close, Discard,
 * Ctrl/Cmd+Enter to send. Autosaves every few seconds while you type; a save
 * conflict (someone else edited the draft) is shown, never silently overwritten.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  mcSaveDraft, mcDeleteDraft, mcSendDraft, mcAddDraftFile, mcRemoveDraftFile,
  type McDraft, type McMailbox,
} from "@/lib/api";
import { Loader2, Maximize2, Minimize2, Minus, Paperclip, Send, Trash2, X } from "lucide-react";

const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const TITLE: Record<string, string> = { NEW: "New message", REPLY: "Reply", REPLY_ALL: "Reply all", FORWARD: "Forward" };

export function ComposeWindow({ draft: initial, mailboxes, isDark, onClose, onSent }: {
  draft: McDraft; mailboxes: McMailbox[]; isDark: boolean;
  onClose: () => void; onSent: (threadId: number) => void;
}) {
  const [d, setD] = useState<McDraft>(initial);
  const [showCc, setShowCc] = useState(!!(initial.cc || initial.bcc));
  const [size, setSize] = useState<"normal" | "min" | "full">("normal");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const latest = useRef(d);
  latest.current = d;

  const save = useCallback(async (): Promise<McDraft | null> => {
    const cur = latest.current;
    try {
      const saved = await mcSaveDraft(cur.id, { version: cur.version, identityId: cur.identityId, to: cur.to, cc: cur.cc, bcc: cur.bcc, subject: cur.subject, body: cur.body });
      dirty.current = false;
      setD((p) => ({ ...p, version: saved.version, files: saved.files }));
      setStatus("Saved");
      return saved;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the draft.");
      return null;
    }
  }, []);

  // Autosave a few seconds after the last change.
  useEffect(() => {
    if (!dirty.current) return;
    setStatus("Saving…");
    const h = window.setTimeout(save, 2500);
    return () => window.clearTimeout(h);
  }, [d.to, d.cc, d.bcc, d.subject, d.body, d.identityId, save]);

  const change = (patch: Partial<McDraft>) => { dirty.current = true; setError(null); setD((p) => ({ ...p, ...patch })); };

  const send = async () => {
    setBusy(true); setError(null);
    try {
      const saved = dirty.current ? await save() : latest.current;
      if (!saved) return;
      const count = [saved.to, saved.cc, saved.bcc].join(",").split(/[,;\s]+/).filter((x) => x.includes("@")).length;
      if (!window.confirm(`Send this email from ${mailboxes.find((m) => m.id === saved.identityId)?.address ?? "this Mail ID"} to ${count} recipient(s)?`)) return;
      const r = await mcSendDraft(saved.id, saved.version);
      onSent(r.threadId);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't send."); }
    finally { setBusy(false); }
  };

  const closeAndSave = async () => { if (dirty.current) await save(); onClose(); };
  const discard = async () => {
    if (!window.confirm("Discard this draft?")) return;
    try { await mcDeleteDraft(d.id); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Couldn't discard."); }
  };

  const attach = async (files: File[]) => {
    setError(null);
    const total = d.files.reduce((s, f) => s + f.sizeBytes, 0) + files.reduce((s, f) => s + f.size, 0);
    if (total > 10 * 1024 * 1024) { setError("Attachments can add up to 10 MB per email."); return; }
    setBusy(true);
    try {
      const added: { id: number; fileName: string; sizeBytes: number }[] = [];
      for (const f of files) added.push(await mcAddDraftFile(d.id, f));
      setD((p) => ({ ...p, files: [...p.files, ...added] }));
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't attach."); }
    finally { setBusy(false); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); send(); }
    if (e.key === "Escape") { e.preventDefault(); closeAndSave(); }
  };

  const panel = isDark ? "bg-slate-900 text-white border-white/15" : "bg-white text-slate-900 border-slate-300";
  const field = `w-full border-0 border-b bg-transparent px-1 py-1.5 text-sm focus:outline-none ${isDark ? "border-white/10" : "border-slate-200"}`;
  const btn = `inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${isDark ? "border-white/15" : "border-slate-300"}`;
  const pos = size === "full" ? "inset-4 sm:inset-10" : size === "min" ? "bottom-0 right-4 w-72" : "bottom-0 right-0 w-full sm:right-4 sm:w-[34rem]";

  return (
    <div role="dialog" aria-label={TITLE[d.mode]} onKeyDown={onKey}
      className={`fixed z-50 flex flex-col rounded-t-2xl border shadow-2xl ${panel} ${pos} ${size === "full" ? "rounded-2xl" : ""}`}>
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <p className="mr-auto truncate text-sm font-bold">{TITLE[d.mode]}{d.subject ? ` · ${d.subject}` : ""}</p>
        <span className="text-3xs opacity-60">{status}</span>
        <button type="button" aria-label={size === "min" ? "Restore" : "Minimise"} onClick={() => setSize(size === "min" ? "normal" : "min")} className="rounded p-1 hover:bg-black/10"><Minus className="h-4 w-4" /></button>
        <button type="button" aria-label={size === "full" ? "Exit full screen" : "Full screen"} onClick={() => setSize(size === "full" ? "normal" : "full")} className="rounded p-1 hover:bg-black/10">
          {size === "full" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button type="button" aria-label="Save and close" onClick={closeAndSave} className="rounded p-1 hover:bg-black/10"><X className="h-4 w-4" /></button>
      </div>
      {size !== "min" && (
        <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
          <label className="flex items-center gap-2 text-xs"><span className="w-10 opacity-70">From</span>
            <select className={field} value={d.identityId} onChange={(e) => change({ identityId: Number(e.target.value) })}>
              {mailboxes.filter((m) => m.status === "ACTIVE" || m.id === d.identityId).map((m) => (
                <option key={m.id} value={m.id} disabled={m.status !== "ACTIVE"}>{m.displayName} &lt;{m.address}&gt;</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs"><span className="w-10 opacity-70">To</span>
            <input className={field} value={d.to} onChange={(e) => change({ to: e.target.value })} autoFocus={d.mode === "NEW" || d.mode === "FORWARD"} />
            {!showCc && <button type="button" onClick={() => setShowCc(true)} className="whitespace-nowrap underline">Cc / Bcc</button>}
          </label>
          {showCc && (
            <>
              <label className="flex items-center gap-2 text-xs"><span className="w-10 opacity-70">Cc</span>
                <input className={field} value={d.cc} onChange={(e) => change({ cc: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-xs"><span className="w-10 opacity-70">Bcc</span>
                <input className={field} value={d.bcc} onChange={(e) => change({ bcc: e.target.value })} /></label>
            </>
          )}
          <input aria-label="Subject" placeholder="Subject" className={field} value={d.subject} onChange={(e) => change({ subject: e.target.value })} />
          <textarea aria-label="Message" className={`min-h-[12rem] flex-1 resize-none bg-transparent px-1 py-2 text-sm focus:outline-none`}
            value={d.body} onChange={(e) => change({ body: e.target.value })} autoFocus={d.mode === "REPLY" || d.mode === "REPLY_ALL"} />
          {d.quoted && (
            <details className="text-xs opacity-70"><summary className="cursor-pointer">Show the quoted message</summary>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-sans">{d.quoted}</pre></details>
          )}
          {d.files.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {d.files.map((f) => (
                <li key={f.id} className={`${btn} font-normal`}>
                  <Paperclip className="h-3 w-3" /> {f.fileName} <span className="opacity-60">{kb(f.sizeBytes)}</span>
                  <button type="button" aria-label={`Remove ${f.fileName}`} onClick={async () => {
                    try { await mcRemoveDraftFile(d.id, f.id); setD((p) => ({ ...p, files: p.files.filter((x) => x.id !== f.id) })); }
                    catch (e) { setError(e instanceof Error ? e.message : "Couldn't remove."); }
                  }}><X className="h-3 w-3" /></button>
                </li>
              ))}
            </ul>
          )}
          {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" disabled={busy} onClick={send} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-sky-600 px-4 text-xs font-bold text-white disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send <span className="opacity-70">Ctrl+Enter</span>
            </button>
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={btn} aria-label="Attach files"><Paperclip className="h-3.5 w-3.5" /></button>
            <input ref={fileRef} type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg,.gif,.docx,.xlsx,.pptx,.csv,.txt"
              onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) attach(f); }} />
            <span className="text-3xs opacity-60">Not tracked · no unsubscribe footer · counts toward this Mail ID&apos;s daily limit</span>
            <button type="button" onClick={discard} className={`ml-auto ${btn}`} aria-label="Discard draft"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
