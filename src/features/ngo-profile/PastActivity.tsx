"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import {
  createNgoActivity, deleteNgoActivity, getMyNgoActivities, uploadNgoActivityPhoto,
  type NgoActivity, type PublicNgoActivity,
} from "@/lib/api";
import { ActivityDetailDialog } from "@/features/ngo-drives/components/PastWorkSection";
import { UploadedFilePreview } from "@/features/ngo-registration/components/UploadedFilePreview";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { compressImageIfNeeded } from "@/lib/imageCompression";
import { ActivityCarousel } from "./ActivityCarousel";

/** Up to 3 photos per activity (the backend's NgoActivityService.MAX_PHOTOS). */
export const MAX_ACTIVITY_PHOTOS = 3;

/** "27 Aug 2026" for an activity's date (a calendar date, shown in IST). */
export function formatActivityDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00+05:30` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

/** Whether an activity counts for the wizard's "Past activity" requirement. */
export function activityHasPhoto(a: NgoActivity): boolean {
  return a.status !== "REJECTED" && a.media.some((m) => m.mediaType === "IMAGE");
}

const todayIst = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

type LocalPhoto = { file: File; url: string };

/**
 * Add one past activity: name, date, what work you did and 1–3 photos. The same form in the
 * registration wizard and on /profile (no "short summary"). Photos use the wizard's file card.
 */
export function PastActivityForm({ onSaved, onCancel }: { onSaved: (a: NgoActivity) => void; onCancel?: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [work, setWork] = useState("");
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const replaceAt = useRef<number | null>(null);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  function addFiles(files: FileList | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    const at = replaceAt.current;
    replaceAt.current = null;
    if (at != null && list[0]) {
      setPhotos((prev) => prev.map((p, i) => (i === at ? { file: list[0], url: URL.createObjectURL(list[0]) } : p)));
      return;
    }
    setPhotos((prev) => [...prev, ...list.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_ACTIVITY_PHOTOS));
  }

  async function save() {
    setError("");
    if (!title.trim()) return setError("Add the activity's name.");
    if (!date) return setError("Add the activity date.");
    if (date > todayIst()) return setError("The date cannot be in the future.");
    if (!work.trim()) return setError("Tell donors what work you did.");
    if (photos.length === 0) return setError("Add at least one photo.");
    setBusy(true);
    try {
      let saved = await createNgoActivity({ title: title.trim(), activityDate: date, description: work.trim() });
      for (const p of photos) saved = await uploadNgoActivityPhoto(saved.id, await compressImageIfNeeded(p.file));
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't save the activity. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full min-h-[44px] rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";
  return (
    <div data-testid="past-activity-form" className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="space-y-1">
        <label htmlFor="activity-title" className="text-xs font-bold text-stone-700 dark:text-stone-200">Activity name <span className="text-red-500">*</span></label>
        <input id="activity-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="e.g. Winter blanket drive" />
      </div>
      <div className="space-y-1">
        <label htmlFor="activity-date" className="text-xs font-bold text-stone-700 dark:text-stone-200">Activity date <span className="text-red-500">*</span></label>
        <input id="activity-date" type="date" max={todayIst()} value={date} onChange={(e) => setDate(e.target.value)} className={field} />
      </div>
      <div className="space-y-1">
        <label htmlFor="activity-work" className="text-xs font-bold text-stone-700 dark:text-stone-200">What work did you do? <span className="text-red-500">*</span></label>
        <textarea id="activity-work" rows={4} maxLength={500} value={work} onChange={(e) => setWork(e.target.value)}
          className={`${field} py-2`} placeholder="Who you helped, what you gave, where and how." />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold text-stone-700 dark:text-stone-200">Photos <span className="text-red-500">*</span> <span className="font-normal text-stone-400">(1 to {MAX_ACTIVITY_PHOTOS})</span></p>
        {photos.map((p, i) => (
          <UploadedFilePreview key={p.url} file={{ name: p.file.name, mimeType: p.file.type, size: p.file.size }} kind="photo"
            label={`Activity photo ${i + 1}`} localBlobUrl={p.url} onPreview={() => setPreview(i)}
            onReplace={() => { replaceAt.current = i; input.current?.click(); }}
            onRemove={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} disabled={busy} />
        ))}
        {photos.length < MAX_ACTIVITY_PHOTOS && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 text-xs font-semibold text-stone-600 hover:border-ngo-600 dark:border-zinc-700 dark:text-stone-300">
            <UploadCloud className="h-4 w-4" aria-hidden /> Add photo
          </button>
        )}
        <input ref={input} type="file" accept="image/jpeg, image/png, image/webp" multiple className="hidden" data-testid="activity-photo-input"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel} disabled={busy} className="min-h-[40px] rounded-lg border border-stone-300 px-3 text-xs font-semibold dark:border-zinc-700">Cancel</button>}
        <button type="button" onClick={() => void save()} disabled={busy}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-ngo-700 px-4 text-xs font-bold text-white hover:bg-ngo-600 disabled:opacity-60">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Save activity
        </button>
      </div>
      <FilePreviewDialog files={photos.map((p, i) => ({ name: `Activity photo ${i + 1}`, url: p.url, mimeType: p.file.type }))}
        index={preview} onIndexChange={setPreview} onClose={() => setPreview(null)} />
    </div>
  );
}

/** One saved activity: photos (click opens the preview), title, labelled date, the text. Delete asks first. */
export function PastActivityCard({ activity, onDelete }: { activity: NgoActivity; onDelete?: (a: NgoActivity) => void }) {
  const [preview, setPreview] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [detail, setDetail] = useState(false);
  const photos = activity.media.filter((m) => m.mediaType === "IMAGE" && m.url);
  return (
    <article data-testid="past-activity-card" className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {photos.map((m, i) => (
            <button key={m.id} type="button" onClick={() => setPreview(i)} aria-label={`Open photo ${i + 1} of ${activity.title}`}
              className="aspect-square overflow-hidden rounded-lg border border-stone-200 dark:border-zinc-700">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed photo link */}
              <img src={m.url!} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">{activity.title}</h4>
        {activity.status === "PENDING" && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-3xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Under review</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">Activity date: {formatActivityDate(activity.activityDate)}</p>
      {activity.description && <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm text-stone-700 dark:text-stone-300">{activity.description}</p>}
      {activity.description && (activity.description.length > 220 || activity.description.split("\n").length > 4) && (
        <button type="button" onClick={() => setDetail(true)} aria-haspopup="dialog" aria-label={`Read more about ${activity.title}`}
          className="mt-1 min-h-11 text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-400">Read more</button>
      )}
      {detail && <ActivityDetailDialog a={activity as unknown as PublicNgoActivity} photos={photos.map((m) => m.url!)}
        onClose={() => setDetail(false)} onPhoto={(i) => { setDetail(false); setPreview(i); }} />}
      {activity.status === "REJECTED" && activity.rejectionReason && (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">Not approved: {activity.rejectionReason}</p>
      )}
      {onDelete && (
        <div className="mt-3 flex justify-end">
          {confirm ? (
            <span className="flex items-center gap-2 text-xs">
              Delete this activity?
              <button type="button" onClick={() => onDelete(activity)} className="font-bold text-red-600">Yes, delete</button>
              <button type="button" onClick={() => setConfirm(false)} className="font-semibold">Cancel</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} aria-label={`Delete ${activity.title}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
            </button>
          )}
        </div>
      )}
      <FilePreviewDialog files={photos.map((m, i) => ({ name: `${activity.title} · photo ${i + 1}`, url: m.url, mimeType: "image/jpeg" }))}
        index={preview} onIndexChange={setPreview} onClose={() => setPreview(null)} />
    </article>
  );
}

/**
 * The NGO's past activity: the list, plus "Add activity" opening the form. Used in the
 * registration wizard (where at least one activity with a photo is required) and on /profile.
 * {@code onCountChange} reports how many activities have a photo.
 */
export function PastActivitySection({ onCountChange, required = false, headingClassName, carousel = false }: {
  onCountChange?: (withPhoto: number) => void; required?: boolean; headingClassName?: string;
  /** /profile: the same carousel as the public NGO page (the wizard keeps the grid). */
  carousel?: boolean;
}) {
  const [items, setItems] = useState<NgoActivity[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState("");
  const report = useRef(onCountChange);
  report.current = onCountChange;

  const load = useCallback(async () => {
    try {
      const list = await getMyNgoActivities();
      setItems(list);
      setLoadError("");
    } catch {
      setLoadError("We couldn't load your past activity. Please refresh.");
      setItems((prev) => prev ?? []);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (items) report.current?.(items.filter(activityHasPhoto).length); }, [items]);

  async function remove(a: NgoActivity) {
    await deleteNgoActivity(a.id).catch(() => {});
    setItems((prev) => (prev ?? []).filter((x) => x.id !== a.id));
  }

  return (
    <section data-testid="past-activity-section" aria-labelledby="past-activity-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id="past-activity-heading" className={headingClassName ?? "text-sm font-bold text-stone-900 dark:text-stone-100"}>
          Past activity{required && <span className="text-red-500"> *</span>}
        </h3>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} aria-label="Add activity"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-ngo-700/40 px-3 text-xs font-bold text-ngo-700 hover:bg-ngo-50 dark:text-ngo-300">
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add activity
          </button>
        )}
      </div>
      {required && <p className="text-xs text-stone-500 dark:text-stone-400">Add at least one activity your NGO has done, with a photo. Our team reviews it with your application.</p>}
      {loadError && <p role="alert" className="text-xs text-red-600">{loadError}</p>}
      {adding && <PastActivityForm onCancel={() => setAdding(false)} onSaved={(a) => { setItems((prev) => [...(prev ?? []), a]); setAdding(false); }} />}
      {items == null ? (
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" aria-label="Loading" />
      ) : items.length === 0 && !adding ? (
        <p className="text-xs text-stone-500">No past activity added yet.</p>
      ) : carousel ? (
        <ActivityCarousel label="Past activity">
          {items.map((a) => <PastActivityCard key={a.id} activity={a} onDelete={remove} />)}
        </ActivityCarousel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((a) => <PastActivityCard key={a.id} activity={a} onDelete={remove} />)}
        </div>
      )}
    </section>
  );
}
