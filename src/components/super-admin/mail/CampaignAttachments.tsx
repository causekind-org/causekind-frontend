"use client";

/**
 * Campaign attachments (Phase 1e; inventory CP19, decision D7).
 * Up to 5 files, 5 MB in total; the server checks type and size again.
 * Every recipient gets every file, so links are recommended for anything big.
 */
import { useEffect, useRef, useState } from "react";
import { mcAttachments, mcAddAttachment, mcRemoveAttachment, type McAttachment } from "@/lib/api";
import { Loader2, Paperclip, X } from "lucide-react";

const MAX_TOTAL = 5 * 1024 * 1024;
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.gif,.docx,.xlsx,.pptx,.csv,.txt";
const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function CampaignAttachments({ campaignId, ensureSaved, editable, labelClass, btnClass, mutedClass, onItems }: {
  campaignId: number | null;
  /** Saves the draft if needed and returns its id (attachments need a saved campaign). */
  ensureSaved: () => Promise<number | null>;
  editable: boolean;
  labelClass: string; btnClass: string; mutedClass: string;
  /** Told whenever the list changes, so the preview and send confirmation can name the files. */
  onItems?: (items: McAttachment[]) => void;
}) {
  const [items, setItems] = useState<McAttachment[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (campaignId == null) { setItems([]); return; }
    let live = true;
    mcAttachments(campaignId).then((x) => live && setItems(x)).catch(() => live && setError("Couldn't load attachments."));
    return () => { live = false; };
  }, [campaignId]);

  useEffect(() => { onItems?.(items); }, [items, onItems]);

  const total = items.reduce((s, a) => s + a.sizeBytes, 0);

  const add = async (files: File[]) => {
    setError(null);
    if (items.length + files.length > 5) { setError("Up to 5 attachments per campaign."); return; }
    if (total + files.reduce((s, f) => s + f.size, 0) > MAX_TOTAL) { setError("Attachments can add up to 5 MB in total. Share bigger files as a link in the message instead."); return; }
    try {
      const id = await ensureSaved();
      if (id == null) return;
      const added: McAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        setBusy(`Attaching ${i + 1} of ${files.length}…`);
        added.push(await mcAddAttachment(id, files[i]));
      }
      setItems((p) => [...p, ...added]);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't attach the file."); }
    finally { setBusy(null); }
  };

  const remove = async (a: McAttachment) => {
    setError(null);
    try { await mcRemoveAttachment(a.campaignId, a.id); setItems((p) => p.filter((x) => x.id !== a.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't remove the file."); }
  };

  return (
    <div>
      <span className={labelClass}>Attachments (optional)</span>
      {items.length > 0 && (
        <ul className="mb-2 space-y-1">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-xs">
              <Paperclip className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="min-w-0 flex-1 truncate" title={a.fileName}>{a.fileName}</span>
              <span className={mutedClass}>{size(a.sizeBytes)}</span>
              {editable && (
                <button type="button" aria-label={`Remove ${a.fileName}`} onClick={() => remove(a)} className="rounded p-1 hover:bg-black/10"><X className="h-3.5 w-3.5" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <>
          <button type="button" disabled={!!busy} onClick={() => fileRef.current?.click()}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${btnClass}`}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Paperclip className="h-3.5 w-3.5" aria-hidden />}
            {busy ?? "Attach files"}
          </button>
          <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden"
            onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) add(f); }} />
        </>
      )}
      <p className={`mt-1 text-xs ${mutedClass}`}>
        {size(total)} of 5 MB used. PDF, images, Word/Excel/PowerPoint, CSV or text. Every person receives every file, which makes
        each email bigger and more likely to land in spam, so a link in the message is usually better.
      </p>
      {error && <p role="alert" className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
