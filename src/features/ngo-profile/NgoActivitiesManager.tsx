"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Pencil, Trash2, X } from "lucide-react";
import {
  createNgoActivity, deleteNgoActivity, getMyNgoActivities, removeNgoActivityMedia, reorderNgoActivities,
  updateNgoActivity, uploadNgoActivityPhoto,
  getNgoActivityVideoCapability, createNgoActivityVideoSlot, finalizeNgoActivityVideo, getNgoActivityVideoStatus,
  deleteNgoActivityVideo, ApiError,
  type NgoActivity, type OfferVideoStatus, type OfferVideoStatusName,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { useOfferVideo, type VideoEndpoints } from "@/features/donation-offer-wizard/useOfferVideo";
import { OfferVideoField } from "@/features/donation-offer-wizard/steps/OfferVideoField";

export const ACTIVITY_MAX_PHOTOS = 6;
export const ACTIVITY_MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACTIVITY_MAX_DESCRIPTION = 500;

const STATUS: Record<NgoActivity["status"], { label: string; dot: string }> = {
  PENDING: { label: "Waiting for review", dot: "bg-amber-500" },
  APPROVED: { label: "Live on your public page", dot: "bg-ngo-600" },
  REJECTED: { label: "Needs changes", dot: "bg-red-500" },
};

type Draft = { title: string; activityDate: string; description: string; consentGiven: boolean };
const EMPTY: Draft = { title: "", activityDate: "", description: "", consentGiven: false };

function fieldErrors(e: unknown): Record<string, string> {
  const list = e instanceof ApiError ? ((e.data as { fieldErrors?: { field: string; message: string }[] } | undefined)?.fieldErrors ?? []) : [];
  return Object.fromEntries(list.map(f => [f.field, f.message]));
}

/**
 * Past activity on an approved NGO's profile: add, edit, delete and reorder.
 * New and edited entries wait for an admin before they show publicly.
 */
export function NgoActivitiesManager() {
  const [items, setItems] = useState<NgoActivity[] | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setItems(await getMyNgoActivities()); setError(null); }
    catch { setError("We couldn't load your past activity."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const replace = (a: NgoActivity) => setItems(list => (list ?? []).some(x => x.id === a.id)
    ? (list ?? []).map(x => (x.id === a.id ? a : x)) : [...(list ?? []), a]);

  async function move(index: number, dir: -1 | 1) {
    if (!items) return;
    const next = [...items];
    const [it] = next.splice(index, 1);
    next.splice(index + dir, 0, it);
    setItems(next);
    try { setItems(await reorderNgoActivities(next.map(a => a.id))); }
    catch { toast.error("We couldn't save the new order."); void load(); }
  }

  async function remove(a: NgoActivity) {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    try { await deleteNgoActivity(a.id); setItems(list => (list ?? []).filter(x => x.id !== a.id)); }
    catch { toast.error("We couldn't delete it. Please try again."); }
  }

  return (
    <section aria-labelledby="ngo-activity-heading" className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex items-start justify-between gap-3 border-b-2 border-stone-200 pb-2.5 dark:border-zinc-800">
        <div>
          <h2 id="ngo-activity-heading" className="text-3xs font-black uppercase tracking-[0.24em] text-ngo-700 dark:text-ngo-300">Past activity</h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">Show donors what you have done. Our team reviews each entry before it goes live.</p>
        </div>
        {editing === null && (
          <button type="button" onClick={() => setEditing("new")}
            className="min-h-9 shrink-0 rounded-full bg-ngo-700 px-4 text-xs font-bold text-white hover:bg-ngo-800">
            Add activity
          </button>
        )}
      </div>

      {error && <p role="alert" className="pt-3 text-sm text-red-600">{error}</p>}
      {items === null && !error && <p role="status" className="pt-3 text-sm text-stone-500">Loading…</p>}

      {editing === "new" && (
        <ActivityEditor onCancel={() => setEditing(null)} onSaved={a => { replace(a); setEditing(a.id); }} />
      )}

      <ul className="space-y-3 pt-4">
        {(items ?? []).map((a, i) => editing === a.id ? (
          <li key={a.id}>
            <ActivityEditor activity={a} onCancel={() => setEditing(null)} onSaved={replace} onDone={() => setEditing(null)} />
          </li>
        ) : (
          <li key={a.id} data-testid="ngo-activity" className="rounded-xl border border-stone-200 p-3 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-stone-900 dark:text-stone-100">{a.title}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{a.activityDate}</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-stone-300">
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS[a.status].dot}`} aria-hidden />
                  {STATUS[a.status].label}
                </p>
                {a.status === "REJECTED" && a.rejectionReason && (
                  <p className="mt-1 text-xs text-red-700 dark:text-red-300">Reason: {a.rejectionReason}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" aria-label={`Move ${a.title} up`} disabled={i === 0} onClick={() => void move(i, -1)}
                  className="grid h-9 w-9 place-items-center rounded-full text-stone-600 hover:bg-stone-100 disabled:opacity-30 dark:text-stone-300 dark:hover:bg-zinc-800">
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" aria-label={`Move ${a.title} down`} disabled={i === (items?.length ?? 0) - 1} onClick={() => void move(i, 1)}
                  className="grid h-9 w-9 place-items-center rounded-full text-stone-600 hover:bg-stone-100 disabled:opacity-30 dark:text-stone-300 dark:hover:bg-zinc-800">
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" aria-label={`Edit ${a.title}`} onClick={() => setEditing(a.id)}
                  className="grid h-9 w-9 place-items-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-zinc-800">
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
                <button type="button" aria-label={`Delete ${a.title}`} onClick={() => void remove(a)}
                  className="grid h-9 w-9 place-items-center rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            {a.media.some(m => m.mediaType === "IMAGE" && m.url) && (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Photos">
                {a.media.filter(m => m.mediaType === "IMAGE" && m.url).map(m => (
                  <li key={m.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo URL */}
                    <img src={m.url as string} alt="" className="h-14 w-14 rounded-md object-cover" />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {items && items.length === 0 && editing === null && (
        <p className="text-sm text-stone-500 dark:text-stone-400">No past activity yet.</p>
      )}
    </section>
  );
}

function videoOf(a: NgoActivity | undefined): OfferVideoStatus | null {
  const v = a?.media.find(m => m.mediaType === "VIDEO" && m.status !== "REJECTED" && m.status !== "FAILED");
  return v ? { mediaId: v.id, status: v.status as OfferVideoStatusName, moderationCode: null, durationMs: null, playbackUrl: v.url, available: true } : null;
}

function ActivityEditor({ activity, onCancel, onSaved, onDone }: {
  activity?: NgoActivity; onCancel: () => void; onSaved: (a: NgoActivity) => void; onDone?: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(activity
    ? { title: activity.title, activityDate: activity.activityDate, description: activity.description ?? "", consentGiven: activity.consentGiven }
    : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<NgoActivity | undefined>(activity);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  const currentRef = useRef(current);
  currentRef.current = current;
  const endpoints = useMemo<VideoEndpoints>(() => ({
    capability: getNgoActivityVideoCapability,
    slot: createNgoActivityVideoSlot,
    finalize: finalizeNgoActivityVideo,
    status: getNgoActivityVideoStatus,
    playback: async (id, mediaId) => ({ url: (await getNgoActivityVideoStatus(id, mediaId)).playbackUrl ?? "" }),
    remove: deleteNgoActivityVideo,
    current: async () => videoOf(currentRef.current),
  }), []);
  const resolveId = useCallback(async () => {
    if (!currentRef.current) throw new Error("Save the entry first.");
    return currentRef.current.id;
  }, []);
  const video = useOfferVideo(resolveId, endpoints);
  const { hydrate } = video;
  useEffect(() => { if (activity && videoOf(activity)) void hydrate(activity.id); }, [activity, hydrate]);

  function check(): boolean {
    const e: Record<string, string> = {};
    if (!draft.title.trim()) e.title = "Add a title.";
    if (!draft.activityDate) e.activityDate = "Add the date.";
    else if (draft.activityDate > today) e.activityDate = "The date cannot be in the future.";
    if (draft.description.length > ACTIVITY_MAX_DESCRIPTION) e.description = `Up to ${ACTIVITY_MAX_DESCRIPTION} characters.`;
    if (!draft.consentGiven) e.consentGiven = "Confirm that people shown have given consent.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!check()) return;
    setBusy(true);
    try {
      const body = { ...draft, title: draft.title.trim(), description: draft.description.trim() };
      const saved = current ? await updateNgoActivity(current.id, body) : await createNgoActivity(body);
      setCurrent(saved);
      onSaved(saved);
      toast.success(current ? "Saved. It will show again once reviewed." : "Saved. Add photos or a video, then you're done.");
    } catch (e) {
      const f = fieldErrors(e);
      setErrors(f);
      if (!Object.keys(f).length) toast.error("We couldn't save it. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addPhotos(files: File[]) {
    if (!current) return;
    const left = ACTIVITY_MAX_PHOTOS - current.media.filter(m => m.mediaType === "IMAGE").length;
    for (const file of files.slice(0, Math.max(0, left))) {
      if (file.size > ACTIVITY_MAX_PHOTO_BYTES) { toast.error(`${file.name} is over 5 MB.`); continue; }
      try { const a = await uploadNgoActivityPhoto(current.id, file); setCurrent(a); onSaved(a); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    }
  }

  async function removePhoto(mediaId: number) {
    if (!current) return;
    try { const a = await removeNgoActivityMedia(current.id, mediaId); setCurrent(a); onSaved(a); }
    catch { toast.error("We couldn't remove that photo."); }
  }

  const photos = current?.media.filter(m => m.mediaType === "IMAGE") ?? [];
  const input = "w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm text-stone-800 focus-visible:outline-2 focus-visible:outline-ngo-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-stone-200";

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-ngo-200 bg-ngo-50/40 p-4 dark:border-ngo-900 dark:bg-ngo-950/20" data-testid="activity-editor">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="activity-title" className="text-sm font-semibold">Title</label>
          <input id="activity-title" maxLength={120} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={input} />
          {errors.title && <p role="alert" className="text-xs text-red-600">{errors.title}</p>}
        </div>
        <div>
          <label htmlFor="activity-date" className="text-sm font-semibold">Date</label>
          <input id="activity-date" type="date" max={today} value={draft.activityDate} onChange={e => setDraft({ ...draft, activityDate: e.target.value })} className={input} />
          {errors.activityDate && <p role="alert" className="text-xs text-red-600">{errors.activityDate}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="activity-description" className="text-sm font-semibold">What happened</label>
        <textarea id="activity-description" rows={3} maxLength={ACTIVITY_MAX_DESCRIPTION} value={draft.description}
          onChange={e => setDraft({ ...draft, description: e.target.value })} className={input} />
        <p className="text-right text-xs text-stone-500">{draft.description.length} / {ACTIVITY_MAX_DESCRIPTION}</p>
        {errors.description && <p role="alert" className="text-xs text-red-600">{errors.description}</p>}
      </div>
      <label className="flex items-start gap-2 text-sm text-stone-700 dark:text-stone-300">
        <input type="checkbox" checked={draft.consentGiven} onChange={e => setDraft({ ...draft, consentGiven: e.target.checked })}
          className="mt-0.5 h-4 w-4 accent-ngo-700" />
        <span>People shown have given consent; guardian consent for children.</span>
      </label>
      {errors.consentGiven && <p role="alert" className="text-xs text-red-600">{errors.consentGiven}</p>}

      {current && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Photos <span className="font-normal text-stone-500">(up to {ACTIVITY_MAX_PHOTOS}, 5 MB each)</span></p>
          <ul className="flex flex-wrap gap-2">
            {photos.map(m => (
              <li key={m.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo URL */}
                {m.url && <img src={m.url} alt="" className="h-16 w-16 rounded-md object-cover" />}
                <button type="button" aria-label="Remove photo" onClick={() => void removePhoto(m.id)}
                  className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-stone-700 shadow dark:bg-zinc-800 dark:text-stone-200">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
            {photos.length < ACTIVITY_MAX_PHOTOS && (
              <li>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="grid h-16 w-16 place-items-center rounded-md border border-dashed border-ngo-400 text-ngo-700 dark:text-ngo-300" aria-label="Add photos">
                  <ImagePlus className="h-5 w-5" aria-hidden />
                </button>
              </li>
            )}
          </ul>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} aria-hidden
            onChange={e => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) void addPhotos(f); }} />
          <OfferVideoField state={video} onPick={file => void video.upload(file)} onRemove={() => void video.remove()} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void save()} disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ngo-700 px-5 text-sm font-semibold text-white hover:bg-ngo-800 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {current ? "Save changes" : "Save"}
        </button>
        <button type="button" onClick={current && onDone ? onDone : onCancel}
          className="min-h-11 rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-700 dark:border-zinc-700 dark:text-stone-200">
          {current ? "Done" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
