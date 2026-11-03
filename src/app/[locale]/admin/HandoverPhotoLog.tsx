"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, ChevronRight, Loader2, RefreshCw, X } from "lucide-react";
import Link from "@/components/AppLink";
import {
  getHandoverProofLog, getHandoverProofRecord,
  type HandoverProofContext, type HandoverProofLogEntry,
} from "@/lib/api";

/**
 * Admin Handover photo log (owner, 2026-10-08): every handover with an
 * on-the-spot photo, newest first; opening one shows the whole donation —
 * "literally everything" — exactly as the server returns it, so a field added
 * to any of those DTOs shows up here without a frontend change.
 */
export function HandoverPhotoLog() {
  const [rows, setRows] = useState<HandoverProofLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<{ type: HandoverProofContext; id: number } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setRows(await getHandoverProofLog()); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't load the handover photo log."); setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400">{rows ? `${rows.length} handover${rows.length === 1 ? "" : "s"} with a photo` : "Loading…"}</p>
        <button type="button" onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-stone-300 hover:bg-white/5">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {rows === null ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-stone-500" /></div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-stone-500">No handover photos yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={`${r.type}-${r.id}`}>
              <button type="button" onClick={() => setOpen({ type: r.type, id: r.id })}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left hover:bg-white/[0.06]">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {r.thumbUrl
                    // eslint-disable-next-line @next/next/no-img-element -- presigned URL
                    ? <img src={r.thumbUrl} alt="" className="h-full w-full object-cover" />
                    : <Camera className="absolute inset-0 m-auto h-5 w-5 text-stone-500" />}
                  {r.photoCount > 1 && (
                    <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/70 px-1 text-[10px] font-bold text-white">{r.photoCount}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-100">
                    {r.itemTitle ?? r.requestTitle ?? "Donation"}
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-stone-300">{r.type} #{r.id}</span>
                  </p>
                  <p className="truncate text-xs text-stone-400">
                    {r.donorName ?? "Donor"} → {r.doneeName ?? "Recipient"}{r.city ? ` · ${r.city}` : ""} · {humanize(r.status ?? "")}
                  </p>
                  <p className="text-[11px] text-stone-500">Last photo {fmt(r.lastPhotoAt)}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-stone-500" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <RecordPanel type={open.type} id={open.id} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ── The full record ──────────────────────────────────────────────────────────

const SECTION_ORDER: [string, string][] = [
  ["handoverPhotos", "Handover photos"],
  ["donation", "Donation"],
  ["handover", "Handover"],
  ["donor", "Donor"],
  ["recipient", "Recipient"],
  ["certificate", "Certificate"],
  ["feedback", "Feedback"],
  ["issues", "Issues reported"],
  ["timeline", "Timeline"],
];

function RecordPanel({ type, id, onClose }: { type: HandoverProofContext; id: number; onClose: () => void }) {
  const [rec, setRec] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getHandoverProofRecord(type, id)
      .then(r => { if (alive) setRec(r); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : "Couldn't load this donation."); });
    return () => { alive = false; };
  }, [type, id]);

  const hub = type === "OFFER" ? `/offers/${id}/handover` : `/matches/${id}/handover`;

  return (
    <div role="dialog" aria-modal="true" aria-label={`${type} ${id} full record`}
      className="fixed inset-0 z-[200] flex justify-end bg-black/60" onClick={onClose}>
      <div className="h-full w-full max-w-3xl overflow-y-auto bg-[#141012] p-5 text-stone-200 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-500">Full donation record</p>
            <h2 className="text-lg font-bold text-white">{type} #{id}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Link href={hub} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-stone-300 hover:bg-white/5">Open handover</Link>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {!rec && !error && <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-stone-500" /></div>}
        {rec && (
          <div className="space-y-4">
            {SECTION_ORDER.filter(([k]) => rec[k] != null).map(([k, title]) => (
              <section key={k} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-[#e0874f]">{title}</h3>
                {k === "handoverPhotos"
                  ? <Photos list={rec[k] as PhotoRow[]} onView={setViewing} />
                  : <Value value={rec[k]} onView={setViewing} />}
              </section>
            ))}
            {/* Anything the server adds later, in case it isn't in the list above. */}
            {Object.keys(rec).filter(k => !["type", "id"].includes(k) && !SECTION_ORDER.some(([s]) => s === k)).map(k => (
              <section key={k} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-[#e0874f]">{humanize(k)}</h3>
                <Value value={rec[k]} onView={setViewing} />
              </section>
            ))}
          </div>
        )}
        {viewing && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4" onClick={() => setViewing(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned URL */}
            <img src={viewing} alt="" className="max-h-[90vh] max-w-[94vw] rounded-xl object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}

type PhotoRow = { id: number; url: string | null; uploaderRole: string; uploaderName: string | null; device: string | null; takenAt: string };

function Photos({ list, onView }: { list: PhotoRow[]; onView: (u: string) => void }) {
  if (!list.length) return <p className="text-xs text-stone-500">None.</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {list.map(p => (
        <li key={p.id} className="space-y-1">
          <button type="button" onClick={() => p.url && onView(p.url)} className="block aspect-square w-full overflow-hidden rounded-lg bg-white/5">
            {p.url && (
              // eslint-disable-next-line @next/next/no-img-element -- presigned URL
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            )}
          </button>
          <p className="text-[11px] leading-tight text-stone-400">
            {p.uploaderRole === "DONOR" ? "Donor" : "Recipient"}{p.uploaderName ? ` (${p.uploaderName})` : ""}
            <br />{fmt(p.takenAt)}{p.device ? ` · ${p.device}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

// ── Generic renderer: every field, nothing hidden ────────────────────────────

const isImageUrl = (s: string) => /^https?:\/\//.test(s) && /\.(jpe?g|png|webp|gif|heic)(\?|$)/i.test(s);
const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s);

function Value({ value, onView, depth = 0 }: { value: unknown; onView: (u: string) => void; depth?: number }) {
  if (value == null || value === "") return <span className="text-stone-600">—</span>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (typeof value === "number") return <span>{value}</span>;
  if (typeof value === "string") {
    if (isImageUrl(value)) {
      return (
        <button type="button" onClick={() => onView(value)} className="h-16 w-16 overflow-hidden rounded-md bg-white/5 align-top">
          {/* eslint-disable-next-line @next/next/no-img-element -- stored image URL */}
          <img src={value} alt="" className="h-full w-full object-cover" />
        </button>
      );
    }
    return <span className="whitespace-pre-wrap break-words">{isIsoDate(value) ? fmt(value) : value}</span>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-stone-600">None</span>;
    if (value.every(v => typeof v === "string" && isImageUrl(v))) {
      return <div className="flex flex-wrap gap-2">{value.map((v, i) => <Value key={i} value={v} onView={onView} />)}</div>;
    }
    return (
      <ol className="space-y-2">
        {value.map((v, i) => (
          <li key={i} className="rounded-lg border border-white/5 bg-black/20 p-2">
            <Value value={v} onView={onView} depth={depth + 1} />
          </li>
        ))}
      </ol>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return <span className="text-stone-600">—</span>;
    return (
      <dl className={`grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs ${depth === 0 ? "sm:grid-cols-2" : ""}`}>
        {entries.map(([k, v]) => {
          const nested = v != null && typeof v === "object" && !(Array.isArray(v) && v.every(x => typeof x !== "object"));
          return (
            <div key={k} className={nested ? "sm:col-span-2" : ""}>
              <dt className="text-[11px] text-stone-500">{humanize(k)}</dt>
              <dd className="text-stone-200"><Value value={v} onView={onView} depth={depth + 1} /></dd>
            </div>
          );
        })}
      </dl>
    );
  }
  return <span>{String(value)}</span>;
}

function humanize(k: string) {
  return k
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^./, c => c.toUpperCase());
}

function fmt(iso: string) {
  const ms = Date.parse(iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z");
  return Number.isNaN(ms) ? iso : new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
