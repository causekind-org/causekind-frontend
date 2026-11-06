"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Minus, Play, Plus, X } from "lucide-react";
import {
  createDamageVideoSlot, deleteDamageVideo, finalizeDamageVideo, getDamageVideoCapability, getDamageVideoPlayback,
  getDamageVideoStatus, type PurchaseView,
} from "@/lib/api";
import { useOfferVideo, type VideoEndpoints } from "@/features/donation-offer-wizard/useOfferVideo";
import { OfferVideoField } from "@/features/donation-offer-wizard/steps/OfferVideoField";
import { damageBreakdown } from "./purchaseModel";

export const DAMAGE_VIDEO_ENDPOINTS: VideoEndpoints = {
  capability: getDamageVideoCapability,
  slot: createDamageVideoSlot,
  finalize: finalizeDamageVideo,
  status: getDamageVideoStatus,
  playback: getDamageVideoPlayback,
  remove: deleteDamageVideo,
};

/** Same limits as the server's purchase-proof policy; the server re-checks every file. */
export const MAX_DAMAGE_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Why a picked file can't be used, or null when it can. */
export function photoProblem(f: File): string | null {
  if (!PHOTO_TYPES.includes(f.type.toLowerCase())) return `${f.name}: use a JPG, PNG, WEBP or HEIC photo.`;
  if (f.size > MAX_PHOTO_BYTES) return `${f.name}: photos can be up to 8 MB.`;
  return null;
}

const field = "w-full min-h-12 rounded-xl border border-[#C9D0DB] bg-white px-3.5 py-2 text-base text-stone-900 focus:border-[var(--ck-role-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-stone-100 sm:text-[15px]";
const primary = "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[var(--ck-role-accent)] px-7 py-2 text-[16px] font-extrabold text-white hover:bg-[var(--ck-role-hover)] disabled:opacity-60";

/** A number with large − / + buttons; typing works too. Clamps to [min, max]. */
export function Stepper({ label, hint, value, min, max, onChange }: {
  label: string; hint?: string; value: number; min: number; max: number; onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const id = `stepper-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 px-4 py-3 dark:border-zinc-800">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[15px] font-bold text-stone-900 dark:text-stone-100">{label}</label>
        {hint && <span className="block text-[13px] text-stone-500 dark:text-stone-400">{hint}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - 1))}
          className="flex size-11 items-center justify-center rounded-xl border border-stone-300 text-stone-700 disabled:opacity-40 dark:border-zinc-700 dark:text-stone-200">
          <Minus className="size-4" aria-hidden />
        </button>
        <input id={id} inputMode="numeric" value={value} aria-valuemin={min} aria-valuemax={max}
          onChange={e => { const n = Number(e.target.value.replace(/\D/g, "")); if (Number.isFinite(n)) onChange(clamp(n)); }}
          className="h-11 w-14 rounded-xl border border-stone-300 text-center text-lg font-extrabold tabular-nums dark:border-zinc-700 dark:bg-zinc-950" />
        <button type="button" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + 1))}
          className="flex size-11 items-center justify-center rounded-xl border border-stone-300 text-stone-700 disabled:opacity-40 dark:border-zinc-700 dark:text-stone-200">
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Drag-and-drop (or tap to choose) photos with previews; bad files are named, not silently dropped. */
export function PhotoDropzone({ files, onChange, max = MAX_DAMAGE_PHOTOS, label = "Photos of the damage" }: {
  files: File[]; onChange: (files: File[]) => void; max?: number; label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = typeof URL.createObjectURL === "function" ? files.map(f => URL.createObjectURL(f)) : files.map(() => "");
    setPreviews(urls);
    return () => { if (typeof URL.revokeObjectURL === "function") urls.forEach(u => u && URL.revokeObjectURL(u)); };
  }, [files]);

  function add(picked: File[]) {
    const bad = picked.map(photoProblem).filter((p): p is string => !!p);
    const good = picked.filter(f => !photoProblem(f));
    const room = Math.max(0, max - files.length);
    if (good.length > room) bad.push(`You can add up to ${max} photos.`);
    setProblems(bad);
    if (good.length) onChange([...files, ...good.slice(0, room)]);
  }

  return (
    <div>
      <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">{label}</span>
      <span className="block text-[13px] text-stone-500 dark:text-stone-400">Required: at least 1, up to {max}. JPG, PNG, WEBP or HEIC, 8 MB each. Avoid faces and documents.</span>
      <input ref={ref} type="file" multiple accept="image/*" className="sr-only" data-testid="damage-photo-input"
        onChange={e => { const picked = Array.from(e.target.files ?? []); e.target.value = ""; add(picked); }} />
      <div role="button" tabIndex={0} aria-label="Add damage photos: drop them here or press to choose"
        onClick={() => ref.current?.click()}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click(); } }}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); add(Array.from(e.dataTransfer.files ?? [])); }}
        className={`mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-5 text-center text-sm transition-colors ${
          over ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-soft)]" : "border-stone-300 hover:border-stone-400 dark:border-zinc-700"}`}>
        <ImagePlus className="size-6 text-stone-400" aria-hidden />
        <span className="font-bold text-stone-700 dark:text-stone-200">Drop photos here or tap to choose</span>
        <span className="text-[13px] text-stone-500">{files.length}/{max} added</span>
      </div>
      {problems.length > 0 && (
        <ul role="alert" className="mt-2 space-y-0.5 text-[13px] text-red-700 dark:text-red-400">{problems.map(p => <li key={p}>{p}</li>)}</ul>
      )}
      {files.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="relative aspect-square overflow-hidden rounded-xl bg-stone-100 dark:bg-zinc-800">
              {previews[i]
                // eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file
                ? <img src={previews[i]} alt={`Damage photo ${i + 1}`} className="size-full object-cover" />
                : <span className="flex size-full items-center justify-center p-1 text-center text-2xs">{f.name}</span>}
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white">
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The optional damage video, through the same upload-and-screening hook as every other video. */
export function DamageVideoField({ offerId }: { offerId: number }) {
  const video = useOfferVideo(() => Promise.resolve(offerId), DAMAGE_VIDEO_ENDPOINTS);
  return <OfferVideoField state={video} onPick={f => void video.upload(f)} onRemove={() => void video.remove()} />;
}

export type DamageReportData = {
  condition: "DAMAGED" | "WRONG_ITEM";
  arrivedQuantity: number; minorDamageQuantity: number; unusableQuantity: number; note: string;
};

/**
 * "Some or all items damaged": how many arrived, how many are damaged, and of those
 * how many are unusable (the rest are usable with minor damage), with a live
 * summary, required photos and description, and an optional video. Missing units
 * are part of the same report.
 */
export function DamageReportForm({ view, offerId, busy, onSubmit }: {
  view: PurchaseView; offerId: number; busy: boolean;
  onSubmit: (data: DamageReportData, photos: File[]) => Promise<boolean>;
}) {
  const pledged = view.orderedQuantity ?? view.acceptedQuantity ?? 1;
  const cap = Math.min(pledged, view.receivableMax ?? pledged);
  const [kind, setKind] = useState<"DAMAGED" | "WRONG_ITEM">("DAMAGED");
  const [arrived, setArrived] = useState(pledged);
  const [damaged, setDamaged] = useState(1);
  const [unusable, setUnusable] = useState(1);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const wrong = kind === "WRONG_ITEM";
  // Wrong products are never "usable with minor damage".
  const unusableN = wrong ? damaged : Math.min(unusable, damaged);
  const b = damageBreakdown(pledged, arrived, Math.min(damaged, arrived), unusableN);

  let error: string | null = null;
  if (b.counted > cap) error = `Your request only needs ${cap} more, so at most ${cap} can count as received. Check the numbers.`;
  else if (note.trim().length < 10) error = "Describe the damage (at least 10 characters).";
  else if (photos.length === 0) error = "Add at least one photo of the damage.";

  return (
    <div className="space-y-4" data-testid="damage-form">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 w-full text-[14px] font-bold text-stone-900 dark:text-stone-100">What&apos;s the problem?</legend>
        {([["DAMAGED", "Damaged"], ["WRONG_ITEM", "Wrong product or model"]] as const).map(([v, l]) => (
          <button key={v} type="button" aria-pressed={kind === v} onClick={() => setKind(v)}
            className={`min-h-11 rounded-xl border px-3.5 text-sm font-bold ${kind === v ? "border-[var(--ck-role-accent)] ring-1 ring-[var(--ck-role-accent)]" : "border-stone-300 dark:border-zinc-700"}`}>{l}</button>
        ))}
      </fieldset>

      <div className="space-y-2">
        <Stepper label="How many arrived?" hint={`1 to the ${pledged} pledged. Any not here are counted as missing.`}
          value={arrived} min={1} max={pledged}
          onChange={n => { setArrived(n); setDamaged(d => Math.min(d, n)); setUnusable(u => Math.min(u, n)); }} />
        <Stepper label={wrong ? "How many are the wrong product?" : "How many are damaged?"} hint={`1 to the ${arrived} that arrived.`}
          value={Math.min(damaged, arrived)} min={1} max={arrived}
          onChange={n => { setDamaged(n); setUnusable(u => Math.min(u, n)); }} />
        {!wrong && (
          <Stepper label="Of those, how many are unusable?" hint="Broken or not working. The rest are usable with minor damage (scratched box, dent but works)."
            value={unusableN} min={0} max={Math.min(damaged, arrived)} onChange={setUnusable} />
        )}
      </div>

      <div role="status" aria-live="polite" data-testid="damage-summary" className="rounded-2xl bg-stone-50 p-4 dark:bg-zinc-800/60">
        <p className="text-[13px] font-bold uppercase tracking-wide text-stone-500">Summary</p>
        <ul className="mt-2 flex flex-wrap gap-1.5 text-[13px] font-bold">
          <li className="rounded-full bg-white px-2.5 py-1 text-stone-800 ring-1 ring-stone-200 dark:bg-zinc-900 dark:text-stone-200">Pledged {b.pledged}</li>
          <li className="rounded-full bg-white px-2.5 py-1 text-stone-800 ring-1 ring-stone-200 dark:bg-zinc-900 dark:text-stone-200">Arrived {b.arrived}</li>
          <li className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 ring-1 ring-emerald-200">Good {b.good}</li>
          <li className="rounded-full bg-yellow-50 px-2.5 py-1 text-yellow-800 ring-1 ring-yellow-200">Usable with minor damage {b.minor}</li>
          <li className="rounded-full bg-red-50 px-2.5 py-1 text-red-800 ring-1 ring-red-200">{wrong ? "Wrong product" : "Unusable"} {b.unusable}</li>
          <li className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-600 ring-1 ring-stone-200">Missing {b.missing}</li>
        </ul>
        <p className="mt-2 text-[13px] text-stone-600 dark:text-stone-300">
          {b.counted} will count as received{b.minor > 0 ? ` (${b.minor} with minor damage)` : ""}.
          {b.notCounted > 0 ? ` ${b.notCounted} go back on your request for other donors, and our team follows up with the donor.` : ""}
          {" "}This purchase then closes for you both.
        </p>
      </div>

      <PhotoDropzone files={photos} onChange={setPhotos} />
      <DamageVideoField offerId={offerId} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">Describe the damage</span>
        <textarea rows={3} className={field} value={note} maxLength={1500}
          placeholder={wrong ? "e.g. We needed a 14-inch Chromebook but got an 11-inch one." : "e.g. Two screens are cracked and won't turn on; one box is dented but the laptop works."}
          onChange={e => setNote(e.target.value)} />
        <span className="text-[13px] text-stone-500">Required, at least 10 characters. Our team and the donor will see this and the photos.</span>
      </label>

      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <button type="button" className={primary} disabled={!!error || busy}
        onClick={() => void onSubmit({
          condition: kind, arrivedQuantity: b.arrived, minorDamageQuantity: b.minor, unusableQuantity: b.unusable, note: note.trim(),
        }, photos)}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Report damage
      </button>
    </div>
  );
}

/** While our team waits on the recipient: more photos (uploaded straight away) and a video. */
export function MoreDamageEvidence({ offerId, busy, onUpload }: {
  offerId: number; busy: boolean; onUpload: (files: File[]) => Promise<boolean>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  return (
    <div className="space-y-3">
      <PhotoDropzone files={files} onChange={setFiles} label="Add more photos" />
      {files.length > 0 && (
        <button type="button" className={primary} disabled={busy}
          onClick={() => void onUpload(files).then(ok => { if (ok) setFiles([]); })}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Send {files.length} photo{files.length === 1 ? "" : "s"}
        </button>
      )}
      <DamageVideoField offerId={offerId} />
    </div>
  );
}

export type GalleryEntry = { kind: "PHOTO" | "VIDEO"; label: string; url: string | null; status?: string | null };

/** Photos and videos with a lightbox; videos still being screened show as pending. */
export function DamageGallery({ items }: { items: GalleryEntry[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const viewable = items.filter(i => i.url);
  const current = open === null ? null : viewable[open];
  if (items.length === 0) return <p className="text-sm text-stone-500">No photos or videos.</p>;
  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-label="Damage photos and videos">
        {items.map((it, i) => (
          <li key={i}>
            {it.url ? (
              <button type="button" onClick={() => setOpen(viewable.indexOf(it))} aria-label={`Open ${it.label} ${i + 1}`}
                className="relative block aspect-square w-full overflow-hidden rounded-xl bg-stone-100 ring-1 ring-stone-200 hover:ring-[var(--ck-role-accent)]">
                {it.kind === "PHOTO"
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived private URL
                  ? <img src={it.url} alt="" className="size-full object-cover" />
                  : <span className="flex size-full items-center justify-center bg-stone-800 text-white"><Play className="size-6" aria-hidden /></span>}
              </button>
            ) : (
              <span className="flex aspect-square items-center justify-center rounded-xl bg-stone-100 p-2 text-center text-2xs text-stone-500 ring-1 ring-stone-200">
                {it.kind === "VIDEO" ? "Video being screened" : "Unavailable"}
              </span>
            )}
          </li>
        ))}
      </ul>
      {current && (
        <div role="dialog" aria-modal="true" aria-label={current.label} tabIndex={-1} ref={el => el?.focus()}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(null)}
          onKeyDown={e => {
            if (e.key === "Escape") setOpen(null);
            if (e.key === "ArrowRight") setOpen(o => o === null ? o : (o + 1) % viewable.length);
            if (e.key === "ArrowLeft") setOpen(o => o === null ? o : (o - 1 + viewable.length) % viewable.length);
          }}>
          {current.kind === "PHOTO"
            // eslint-disable-next-line @next/next/no-img-element -- short-lived private URL
            ? <img src={current.url!} alt={current.label} className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
            : <video src={current.url!} controls className="max-h-[85vh] max-w-[92vw] rounded-xl" onClick={e => e.stopPropagation()} />}
          <button type="button" aria-label="Close" onClick={() => setOpen(null)}
            className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/25">✕</button>
          {viewable.length > 1 && <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/80">{(open ?? 0) + 1} / {viewable.length}</span>}
        </div>
      )}
    </>
  );
}
