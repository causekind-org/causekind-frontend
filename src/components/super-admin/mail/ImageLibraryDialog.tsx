"use client";

/**
 * Mail Center image library (Phase 1c, inventory ED11–ED15).
 * Upload (drop or pick, PNG/JPG/GIF/WebP, ≤2 MB, ≤10 at once), pick from the
 * library, choose size / alt text / link, or use a per-person image column.
 * The server validates type and size again; this is only the friendly check.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { mcAssets, mcUploadAsset, mcDeleteAsset, mcAssetUsage, type McAsset } from "@/lib/api";
import { Copy, Loader2, Trash2, Upload } from "lucide-react";

export type ImageInsert = { src: string; width: string | null; alt: string; href: string };

const SIZES: { label: string; value: string | null }[] = [
  { label: "Full width", value: null }, { label: "600 px", value: "600" }, { label: "400 px", value: "400" },
  { label: "200 px", value: "200" }, { label: "100 px", value: "100" },
];
const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX = 2 * 1024 * 1024;
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function ImageLibraryDialog({ open, onOpenChange, onInsert, columns, isDark }: {
  open: boolean; onOpenChange: (o: boolean) => void; onInsert: (img: ImageInsert) => void;
  /** Merge columns that may hold a per-person image URL. */
  columns: string[]; isDark: boolean;
}) {
  const [assets, setAssets] = useState<McAsset[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<McAsset | null>(null);
  const [column, setColumn] = useState("");
  const [size, setSize] = useState<string | null>("600");
  const [alt, setAlt] = useState("");
  const [href, setHref] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try { setAssets(await mcAssets()); } catch (e) { setLoadError(e instanceof Error ? e.message : "Couldn't load images."); }
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);

  const upload = async (files: File[]) => {
    setError(null);
    if (files.length > 10) { setError("Up to 10 images at a time."); return; }
    const bad = files.find((f) => !TYPES.includes(f.type) || f.size > MAX);
    if (bad) { setError(`${bad.name}: only PNG, JPG, GIF or WebP up to 2 MB.`); return; }
    const done: McAsset[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setBusy(`Uploading ${i + 1} of ${files.length}…`);
        done.push(await mcUploadAsset(files[i]));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    finally { setBusy(null); }
    if (done.length) { setPicked(done[done.length - 1]); setColumn(""); await load(); }
  };

  const remove = async (a: McAsset) => {
    setError(null);
    try {
      const u = await mcAssetUsage(a.id);
      if (u.usedIn.length) { setError(`Still used in: ${u.usedIn.join("; ")}. Remove it there first.`); return; }
      if (!window.confirm(`Delete ${a.fileName}? Emails already sent with it would show a broken image.`)) return;
      await mcDeleteAsset(a.id);
      if (picked?.id === a.id) setPicked(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't delete."); }
  };

  const insert = () => {
    const src = column ? `{{${column}}}` : picked?.url;
    if (!src) { setError("Pick an image or a per-person column."); return; }
    const h = href.trim();
    if (h && !/^(https?:\/\/|mailto:|\{\{\s*\w+\s*\}\}$)/i.test(h)) { setError("Link must start with https://, mailto: or be a {{tag}}."); return; }
    onInsert({ src, width: size, alt: alt.trim(), href: h });
    onOpenChange(false);
    setPicked(null); setColumn(""); setAlt(""); setHref("");
  };

  const field = `w-full rounded-lg border px-3 py-2 text-sm ${isDark ? "border-white/15 bg-white/5 text-white" : "border-slate-300 bg-white text-slate-900"}`;
  const btn = `inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold ${isDark ? "border-white/15 text-white" : "border-slate-300 text-slate-800"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(56rem,calc(100vw-2rem))] max-w-none overflow-y-auto">
        <DialogTitle>Images</DialogTitle>
        <DialogDescription>Upload or pick an image for this email. PNG, JPG, GIF or WebP, up to 2 MB each, 10 at a time.</DialogDescription>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(Array.from(e.dataTransfer.files)); }}
          className={`mt-3 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center text-sm ${drag ? "border-sky-500 bg-sky-500/10" : "border-slate-400/40"}`}>
          <Upload className="h-5 w-5 opacity-70" aria-hidden />
          <span>Drop images here, or</span>
          <button type="button" className={btn} onClick={() => fileRef.current?.click()} disabled={!!busy}>Choose files</button>
          <input ref={fileRef} type="file" accept={TYPES.join(",")} multiple className="hidden"
            onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) upload(f); }} />
          {busy && <span className="inline-flex items-center gap-1.5 text-xs"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />{busy}</span>}
        </div>

        {error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}

        <div className="mt-3">
          {loadError ? (
            <p role="alert" className="text-sm text-red-500">{loadError} <button type="button" className="underline" onClick={load}>Try again</button></p>
          ) : assets == null ? (
            <p className="inline-flex items-center gap-1.5 text-sm opacity-70"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading…</p>
          ) : assets.length === 0 ? (
            <p className="text-sm opacity-70">No images yet. Upload one above.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {assets.map((a) => {
                const on = picked?.id === a.id && !column;
                return (
                  <li key={a.id} className={`overflow-hidden rounded-lg border ${on ? "ring-2 ring-sky-500" : ""}`}>
                    <button type="button" className="block w-full bg-slate-100" aria-pressed={on} aria-label={`Use ${a.fileName}`}
                      onClick={() => { setPicked(a); setColumn(""); }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt="" className="h-24 w-full object-contain" loading="lazy" />
                    </button>
                    <div className="flex items-center gap-1 p-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-2xs font-semibold" title={a.fileName}>{a.fileName}</p>
                        <p className="text-3xs opacity-60">{kb(a.sizeBytes)}{a.width ? ` · ${a.width}×${a.height}` : ""}</p>
                      </div>
                      <button type="button" aria-label={`Copy URL of ${a.fileName}`} className="rounded p-1 hover:bg-black/10"
                        onClick={() => navigator.clipboard?.writeText(a.url)}><Copy className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label={`Delete ${a.fileName}`} className="rounded p-1 hover:bg-black/10"
                        onClick={() => remove(a)}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {columns.length > 0 && (
            <label className="text-xs font-bold">Or a different image per person (from a list column)
              <select className={`${field} mt-1`} value={column} onChange={(e) => { setColumn(e.target.value); if (e.target.value) setPicked(null); }}>
                <option value="">— none —</option>
                {columns.map((c) => <option key={c} value={c}>{`{{${c}}}`}</option>)}
              </select>
            </label>
          )}
          <label className="text-xs font-bold">Size
            <select className={`${field} mt-1`} value={size ?? ""} onChange={(e) => setSize(e.target.value || null)}>
              {SIZES.map((s) => <option key={s.label} value={s.value ?? ""}>{s.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold">Alt text (read aloud, shown if images are off)
            <input className={`${field} mt-1`} value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} />
          </label>
          <label className="text-xs font-bold">Link when clicked (optional)
            <input className={`${field} mt-1`} value={href} placeholder="https://… or {{cta_url}}" onChange={(e) => setHref(e.target.value)} />
          </label>
        </div>
        {column && <p className="mt-2 text-xs opacity-70">Each person sees the image whose web address is in their “{column}” column. Rows with an empty or unsafe address show no image.</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={btn} onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="button" className={`${btn} bg-sky-600 text-white`} onClick={insert} disabled={!picked && !column}>Insert image</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
