"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  ImagePlus,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
} from "lucide-react";
import {
  createNgoActivity,
  deleteNgoActivity,
  getMyNgoActivities,
  removeNgoActivityMedia,
  updateNgoActivity,
  uploadNgoActivityPhoto,
  getNgoActivityVideoCapability,
  createNgoActivityVideoSlot,
  finalizeNgoActivityVideo,
  getNgoActivityVideoStatus,
  deleteNgoActivityVideo,
  ApiError,
  type NgoActivity,
  type OfferVideoStatus,
  type OfferVideoStatusName,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { useOfferVideo, type VideoEndpoints } from "@/features/donation-offer-wizard/useOfferVideo";
import { OfferVideoField } from "@/features/donation-offer-wizard/steps/OfferVideoField";

export const ACTIVITY_MAX_PHOTOS = 5;
export const ACTIVITY_MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACTIVITY_MAX_SUMMARY = 120;
export const ACTIVITY_MAX_DESCRIPTION = 500;

export const STATUS_CONFIG: Record<
  NgoActivity["status"],
  { label: string; badgeClass: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Under review",
    badgeClass: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
    icon: Clock,
  },
  APPROVED: {
    label: "Live",
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Needs changes",
    badgeClass: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50",
    icon: AlertCircle,
  },
};

type DraftState = {
  title: string;
  activityDate: string;
  summary: string;
  description: string;
};

const EMPTY_DRAFT: DraftState = {
  title: "",
  activityDate: "",
  summary: "",
  description: "",
};

function fieldErrors(e: unknown): Record<string, string> {
  const list =
    e instanceof ApiError
      ? ((e.data as { fieldErrors?: { field: string; message: string }[] } | undefined)?.fieldErrors ?? [])
      : [];
  return Object.fromEntries(list.map((f) => [f.field, f.message]));
}

import { formatIST } from "@/lib/formatIST";

function formatDate(dateStr: string): string {
  return formatIST(dateStr) || dateStr;
}

/**
 * Past activity manager on NGO /profile.
 * Instant additions/updates without reload, newest first, multi-photo support.
 */
export function NgoActivitiesManager() {
  const [items, setItems] = useState<NgoActivity[] | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getMyNgoActivities();
      // Sort newest first by activityDate desc, then id desc
      data.sort((a, b) => b.activityDate.localeCompare(a.activityDate) || b.id - a.id);
      setItems(data);
      setError(null);
    } catch {
      setError("We couldn't load your past activity.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upsert = (a: NgoActivity) => {
    setItems((list) => {
      const current = list ?? [];
      const exists = current.some((x) => x.id === a.id);
      const next = exists ? current.map((x) => (x.id === a.id ? a : x)) : [a, ...current];
      // Keep newest first
      return next.sort((x, y) => y.activityDate.localeCompare(x.activityDate) || y.id - x.id);
    });
  };

  async function remove(a: NgoActivity) {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    try {
      await deleteNgoActivity(a.id);
      setItems((list) => (list ?? []).filter((x) => x.id !== a.id));
      toast.success("Activity deleted.");
    } catch {
      toast.error("We couldn't delete it. Please try again.");
    }
  }

  return (
    <section
      aria-labelledby="ngo-activity-heading"
      className="rounded-2xl border border-[#EADBCE] dark:border-emerald-950/80 bg-[#FAF7F2] dark:bg-[#141E18] p-5 sm:p-6 shadow-sm min-w-0"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EADBCE]/80 dark:border-emerald-950/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2
              id="ngo-activity-heading"
              className="text-lg sm:text-xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight"
            >
              Past activity
            </h2>
            {items && items.length > 0 && (
              <span className="rounded-full bg-ngo-50 dark:bg-ngo-950/50 border border-ngo-200 dark:border-ngo-800 px-2 py-0.5 text-2xs font-semibold text-ngo-700 dark:text-ngo-300">
                {items.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Show donors what you have done. Our team reviews each entry before it goes live.
          </p>
        </div>

        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-ngo-700 px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-ngo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700 focus-visible:ring-offset-2 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add activity
          </button>
        )}
      </div>

      {error && <p role="alert" className="pt-4 text-sm text-red-600">{error}</p>}
      {items === null && !error && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-ngo-700 dark:text-ngo-400" />
        </div>
      )}

      {/* Editor Modal/Panel */}
      {editing === "new" && (
        <ActivityEditor
          onCancel={() => setEditing(null)}
          onSaved={(a) => {
            upsert(a);
            setEditing(null);
          }}
        />
      )}

      {/* Activities List */}
      {items && items.length > 0 && (
        <div className="mt-5 space-y-4">
          {items.map((activity) =>
            editing === activity.id ? (
              <ActivityEditor
                key={activity.id}
                activity={activity}
                onCancel={() => setEditing(null)}
                onSaved={(updated) => {
                  upsert(updated);
                  setEditing(null);
                }}
              />
            ) : (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onEdit={() => setEditing(activity.id)}
                onDelete={() => void remove(activity)}
              />
            )
          )}
        </div>
      )}

      {/* Empty State */}
      {items && items.length === 0 && editing === null && (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-[#d9c7b6] dark:border-zinc-800 bg-[#F5EFE6]/50 dark:bg-[#121c17]/30 mt-4">
          <div className="w-12 h-12 rounded-full bg-ngo-50 dark:bg-ngo-950/40 text-ngo-700 dark:text-ngo-300 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-stone-900 dark:text-stone-100">No past activity yet</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 max-w-sm">
            Showcase your completed drives, beneficiary distributions, and ground impact to build trust with donors.
          </p>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-ngo-700 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-ngo-800"
          >
            <Plus className="w-3.5 h-3.5" />
            Add first activity
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Neat, responsive card representation of a single past activity.
 */
function ActivityCard({
  activity,
  onEdit,
  onDelete,
}: {
  activity: NgoActivity;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const photos = activity.media?.filter((m) => m.mediaType === "IMAGE" && m.url) ?? [];
  const statusInfo = STATUS_CONFIG[activity.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusInfo.icon;

  const maxVisibleThumbnails = 3;
  const visiblePhotos = photos.slice(0, maxVisibleThumbnails);
  const extraCount = photos.length - maxVisibleThumbnails;

  return (
    <article
      data-testid="ngo-activity"
      className="group relative rounded-xl border border-[#EADBCE] dark:border-emerald-950/70 bg-[#FAF7F2]/90 dark:bg-[#121c17]/60 p-4 sm:p-5 transition-all hover:border-ngo-600/50 hover:shadow-xs min-w-0"
    >
      <div className="flex flex-col gap-3 items-stretch">
        {/* Cover or gallery on top */}
        {photos.length > 0 && (
          <div className="w-full flex gap-2 overflow-x-auto pb-1 shrink-0">
            {visiblePhotos.map((m, idx) => {
              const isLast = idx === maxVisibleThumbnails - 1 && extraCount > 0;
              return (
                <div
                  key={m.id}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-[#EADBCE] dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 shrink-0"
                >
                  <img
                    src={m.url as string}
                    alt={activity.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {isLast && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                      +{extraCount + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Content Details */}
        <div className="w-full min-w-0">
          {/* Title */}
          <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug break-words [overflow-wrap:anywhere]">
            {activity.title}
          </h3>

          {/* Date pill + Status + Actions */}
          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-3xs font-bold ${statusInfo.badgeClass}`}
              >
                <StatusIcon className="w-3 h-3" />
                {statusInfo.label}
              </span>

              {/* Date pill */}
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F5EFE6] dark:bg-zinc-800 px-2.5 py-0.5 text-3xs font-medium text-stone-600 dark:text-stone-400">
                <Calendar className="w-3 h-3" />
                {formatDate(activity.activityDate)}
              </span>
            </div>

            {/* Actions: Edit & Delete with min 44px tap targets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`Edit ${activity.title}`}
                onClick={onEdit}
                className="grid h-11 w-11 min-w-[44px] min-h-[44px] place-items-center rounded-xl text-stone-500 hover:text-stone-800 hover:bg-[#F5EFE6] dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-zinc-700/60 transition-colors"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Delete ${activity.title}`}
                onClick={onDelete}
                className="grid h-11 w-11 min-w-[44px] min-h-[44px] place-items-center rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          {/* Short summary */}
          {activity.summary && (
            <p className="mt-1 text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300 break-words [overflow-wrap:anywhere] leading-relaxed">
              {activity.summary}
            </p>
          )}

          {/* Description with Read More / Read Less */}
          {activity.description && (
            <div className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              <p
                className={`break-words [overflow-wrap:anywhere] ${
                  expanded ? "" : "line-clamp-2"
                }`}
              >
                {activity.description}
              </p>
              {activity.description.length > 120 && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ngo-700 dark:text-ngo-400 hover:underline"
                >
                  {expanded ? (
                    <>
                      Read less <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Read more <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Rejection Reason if any */}
          {activity.status === "REJECTED" && activity.rejectionReason && (
            <div className="mt-2.5 rounded-lg border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30 p-2.5 text-xs text-rose-800 dark:text-rose-200">
              <span className="font-bold">Review note: </span>
              {activity.rejectionReason}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function videoOf(a: NgoActivity | undefined): OfferVideoStatus | null {
  const v = a?.media.find((m) => m.mediaType === "VIDEO" && m.status !== "REJECTED" && m.status !== "FAILED");
  return v
    ? {
        mediaId: v.id,
        status: v.status as OfferVideoStatusName,
        moderationCode: null,
        durationMs: null,
        playbackUrl: v.url,
        available: true,
      }
    : null;
}

/**
 * Activity add/edit form with simple wording, multi-photo picker, and live counters.
 */
function ActivityEditor({
  activity,
  onCancel,
  onSaved,
}: {
  activity?: NgoActivity;
  onCancel: () => void;
  onSaved: (a: NgoActivity) => void;
}) {
  const [draft, setDraft] = useState<DraftState>(
    activity
      ? {
          title: activity.title,
          activityDate: activity.activityDate,
          summary: activity.summary ?? "",
          description: activity.description ?? "",
        }
      : EMPTY_DRAFT
  );

  // Stored photos already on server
  const [existingPhotos, setExistingPhotos] = useState(
    activity?.media?.filter((m) => m.mediaType === "IMAGE") ?? []
  );
  // Staged photos selected by user for upload
  const [stagedFiles, setStagedFiles] = useState<{ id: string; file: File; preview: string }[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  const totalPhotosCount = existingPhotos.length + stagedFiles.length;

  const endpoints = useMemo<VideoEndpoints>(
    () => ({
      capability: getNgoActivityVideoCapability,
      slot: createNgoActivityVideoSlot,
      finalize: finalizeNgoActivityVideo,
      status: getNgoActivityVideoStatus,
      playback: async (id, mediaId) => ({
        url: (await getNgoActivityVideoStatus(id, mediaId)).playbackUrl ?? "",
      }),
      remove: deleteNgoActivityVideo,
      current: async () => videoOf(activity),
    }),
    [activity]
  );

  const resolveId = useCallback(async () => {
    if (!activity) throw new Error("Save the entry first.");
    return activity.id;
  }, [activity]);

  const video = useOfferVideo(resolveId, endpoints);
  const { hydrate } = video;

  useEffect(() => {
    if (activity && videoOf(activity)) void hydrate(activity.id);
  }, [activity, hydrate]);

  function handleFilesPicked(picked: File[]) {
    const availableSlots = ACTIVITY_MAX_PHOTOS - totalPhotosCount;
    if (availableSlots <= 0) {
      toast.error(`You can add up to ${ACTIVITY_MAX_PHOTOS} photos.`);
      return;
    }

    const nextFiles = picked.slice(0, availableSlots);
    const valid: { id: string; file: File; preview: string }[] = [];

    for (const f of nextFiles) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        toast.error(`${f.name} must be a JPG, PNG, or WebP image.`);
        continue;
      }
      if (f.size > ACTIVITY_MAX_PHOTO_BYTES) {
        toast.error(`${f.name} exceeds the 5 MB limit.`);
        continue;
      }
      valid.push({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        preview: URL.createObjectURL(f),
      });
    }

    setStagedFiles((prev) => [...prev, ...valid]);
  }

  async function handleRemoveExisting(mediaId: number) {
    if (!activity) return;
    try {
      await removeNgoActivityMedia(activity.id, mediaId);
      setExistingPhotos((prev) => prev.filter((p) => p.id !== mediaId));
      toast.success("Photo removed.");
    } catch {
      toast.error("Could not remove photo.");
    }
  }

  function handleRemoveStaged(id: string) {
    setStagedFiles((prev) => {
      const match = prev.find((p) => p.id === id);
      if (match) URL.revokeObjectURL(match.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!draft.title.trim()) {
      errs.title = "Please enter the activity name.";
    } else if (draft.title.trim().length > 120) {
      errs.title = "Activity name cannot exceed 120 characters.";
    }

    if (!draft.activityDate) {
      errs.activityDate = "Please select the date.";
    } else if (draft.activityDate > today) {
      errs.activityDate = "The date cannot be in the future.";
    }

    if (draft.summary.length > ACTIVITY_MAX_SUMMARY) {
      errs.summary = `Short summary cannot exceed ${ACTIVITY_MAX_SUMMARY} characters.`;
    }

    if (!draft.description.trim()) {
      errs.description = "Please describe what work you did.";
    } else if (draft.description.length > ACTIVITY_MAX_DESCRIPTION) {
      errs.description = `Description cannot exceed ${ACTIVITY_MAX_DESCRIPTION} characters.`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setBusy(true);
    setUploadStatus(null);

    try {
      const payload = {
        title: draft.title.trim(),
        activityDate: draft.activityDate,
        summary: draft.summary.trim() || null,
        description: draft.description.trim(),
      };

      let saved = activity
        ? await updateNgoActivity(activity.id, payload)
        : await createNgoActivity(payload);

      // Upload staged photos if any
      if (stagedFiles.length > 0) {
        setUploadStatus(`Uploading 0 of ${stagedFiles.length} photos…`);
        let count = 0;
        for (const staged of stagedFiles) {
          try {
            saved = await uploadNgoActivityPhoto(saved.id, staged.file);
            count++;
            setUploadStatus(`Uploading ${count} of ${stagedFiles.length} photos…`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : `Failed to upload ${staged.file.name}`);
          }
        }
      }

      toast.success(
        activity
          ? "Activity updated. It will show once reviewed."
          : "Activity created successfully!"
      );

      // Clean up staged previews
      stagedFiles.forEach((p) => URL.revokeObjectURL(p.preview));

      onSaved(saved);
    } catch (e) {
      const f = fieldErrors(e);
      setErrors(f);
      if (!Object.keys(f).length) {
        toast.error("We couldn't save the activity. Please try again.");
      }
    } finally {
      setBusy(false);
      setUploadStatus(null);
    }
  }

  const inputClasses =
    "w-full rounded-xl border border-[#EADBCE] dark:border-zinc-700 bg-[#FAF7F2] dark:bg-zinc-950 p-3 text-base sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700 focus-visible:border-transparent transition-all";

  return (
    <div
      data-testid="activity-editor"
      className="mt-4 rounded-xl border border-ngo-200 dark:border-ngo-900/60 bg-ngo-50/30 dark:bg-ngo-950/20 p-4 sm:p-6 space-y-4 min-w-0"
    >
      <div className="border-b border-ngo-200/60 dark:border-ngo-900/40 pb-3">
        <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
          {activity ? "Edit activity" : "Add past activity"}
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Share details of your ground impact for donors to see.
        </p>
      </div>

      {/* Single column form layout */}
      <div className="space-y-4">
        {/* Activity name */}
        <div className="space-y-1.5">
          <label htmlFor="activity-title" className="text-xs font-bold text-stone-700 dark:text-stone-300">
            Activity name <span className="text-emerald-700">*</span>
          </label>
          <input
            id="activity-title"
            maxLength={120}
            placeholder="Blanket distribution at Virar station"
            value={draft.title}
            onChange={(e) => {
              setDraft({ ...draft, title: e.target.value });
              if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
            }}
            className={inputClasses}
          />
          {errors.title && <p role="alert" className="text-xs text-red-600 font-medium">{errors.title}</p>}
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label htmlFor="activity-date" className="text-xs font-bold text-stone-700 dark:text-stone-300">
            When did this happen? <span className="text-emerald-700">*</span>
          </label>
          <input
            id="activity-date"
            type="date"
            max={today}
            value={draft.activityDate}
            onChange={(e) => {
              setDraft({ ...draft, activityDate: e.target.value });
              if (errors.activityDate) setErrors((prev) => ({ ...prev, activityDate: "" }));
            }}
            className={inputClasses}
          />
          {errors.activityDate && <p role="alert" className="text-xs text-red-600 font-medium">{errors.activityDate}</p>}
        </div>
      </div>

      {/* Short summary */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="activity-summary" className="text-xs font-bold text-stone-700 dark:text-stone-300">
            Short summary
          </label>
          <span className="text-3xs text-stone-400 font-medium">
            {draft.summary.length} / {ACTIVITY_MAX_SUMMARY}
          </span>
        </div>
        <input
          id="activity-summary"
          maxLength={ACTIVITY_MAX_SUMMARY}
          placeholder="Brief one-line highlight (shown on the activity card)"
          value={draft.summary}
          onChange={(e) => {
            setDraft({ ...draft, summary: e.target.value });
            if (errors.summary) setErrors((prev) => ({ ...prev, summary: "" }));
          }}
          className={inputClasses}
        />
        {errors.summary && <p role="alert" className="text-xs text-red-600 font-medium">{errors.summary}</p>}
      </div>

      {/* What work did you do? */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="activity-description" className="text-xs font-bold text-stone-700 dark:text-stone-300">
            What work did you do? <span className="text-emerald-700">*</span>
          </label>
          <span className="text-3xs text-stone-400 font-medium">
            {draft.description.length} / {ACTIVITY_MAX_DESCRIPTION}
          </span>
        </div>
        <textarea
          id="activity-description"
          rows={3}
          maxLength={ACTIVITY_MAX_DESCRIPTION}
          placeholder="Describe the impact, number of people helped, items distributed, and who made it possible…"
          value={draft.description}
          onChange={(e) => {
            setDraft({ ...draft, description: e.target.value });
            if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
          }}
          className={inputClasses}
        />
        {errors.description && <p role="alert" className="text-xs text-red-600 font-medium">{errors.description}</p>}
      </div>

      {/* Add photos */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
            Add photos <span className="font-normal text-stone-400">(up to {ACTIVITY_MAX_PHOTOS}, 5 MB each)</span>
          </label>
          <span className="text-3xs text-stone-400 font-medium">
            {totalPhotosCount} / {ACTIVITY_MAX_PHOTOS}
          </span>
        </div>

        {/* Thumbnails Grid: 3 per row on mobile */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 items-center">
          {/* Existing photos */}
          {existingPhotos.map((m) => (
            <div
              key={m.id}
              className="group relative aspect-square w-full rounded-lg overflow-hidden border border-[#EADBCE] dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 shrink-0"
            >
              {m.url && <img src={m.url} alt="" className="w-full h-full object-cover" />}
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => void handleRemoveExisting(m.id)}
                className="absolute top-1 right-1 grid h-8 w-8 min-w-[32px] min-h-[32px] place-items-center rounded-full bg-black/70 text-white hover:bg-black transition-colors"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}

          {/* Staged new photos */}
          {stagedFiles.map((staged) => (
            <div
              key={staged.id}
              className="group relative aspect-square w-full rounded-lg overflow-hidden border-2 border-emerald-500/70 bg-stone-100 dark:bg-zinc-800 shrink-0"
            >
              <img src={staged.preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => handleRemoveStaged(staged.id)}
                className="absolute top-1 right-1 grid h-8 w-8 min-w-[32px] min-h-[32px] place-items-center rounded-full bg-black/70 text-white hover:bg-black transition-colors"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}

          {/* Add Photos Button with at least 44px tap target */}
          {totalPhotosCount < ACTIVITY_MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square w-full grid min-h-[44px] place-items-center rounded-lg border-2 border-dashed border-[#d9c7b6] dark:border-zinc-700 hover:border-ngo-600 text-stone-500 hover:text-ngo-700 dark:text-stone-400 dark:hover:text-ngo-300 transition-colors shrink-0"
              aria-label="Add photos"
            >
              <div className="flex flex-col items-center">
                <ImagePlus className="h-5 w-5" aria-hidden />
                <span className="text-3xs font-medium mt-1">Upload</span>
              </div>
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (f.length) handleFilesPicked(f);
          }}
        />

        {/* Optional video support if editing existing entry */}
        {activity && (
          <div className="pt-2">
            <OfferVideoField state={video} onPick={(file) => void video.upload(file)} onRemove={() => void video.remove()} />
          </div>
        )}

        {uploadStatus && (
          <p className="text-xs text-ngo-700 dark:text-ngo-400 font-medium flex items-center gap-1.5 mt-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploadStatus}
          </p>
        )}
      </div>

      {/* Save and Cancel buttons are full width and stacked */}
      <div className="flex flex-col gap-2.5 pt-2 w-full">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-ngo-700 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-ngo-800 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="w-full min-h-[44px] inline-flex items-center justify-center rounded-full border border-[#d9c7b6] dark:border-zinc-700 px-6 text-sm font-semibold text-stone-700 dark:text-stone-300 hover:bg-[#F5EFE6] dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
