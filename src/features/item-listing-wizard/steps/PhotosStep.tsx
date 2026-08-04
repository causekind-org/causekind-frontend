"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, ImagePlus, Loader2, RefreshCw, Sparkles, Star, TriangleAlert, X } from "lucide-react";
import { CameraCaptureDialog } from "@/components/CameraCaptureDialog";
import { ACCEPT_ATTR, MAX_PHOTOS, MIN_PHOTOS } from "../useListingPhotos";
import { pressProps } from "../wizardMotion";
import type { WizardPhoto } from "../wizardModel";

/**
 * Step 1 — photos first, because the vision analysis fills the rest of the form
 * from them.
 *
 * <p>Every per-photo control is a real button that is permanently visible. The
 * previous implementation revealed remove on hover, which simply does not exist
 * on touch, and offered no way to choose the main photo other than upload order.
 */
export function PhotosStep({
  photos, error, aiState, prohibited, onAddFiles, onRetryPhoto, onRemovePhoto, onMakeMain, onReanalyze,
}: {
  photos: WizardPhoto[];
  error?: string;
  aiState: { running: boolean; note: string | null; canReanalyze: boolean };
  prohibited: { category: string | null; reason: string | null } | null;
  onAddFiles: (files: File[]) => void;
  onRetryPhoto: (id: string) => void;
  onRemovePhoto: (id: string) => void;
  onMakeMain: (id: string) => void;
  onReanalyze: () => void;
}) {
  const reduced = !!useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const atLimit = photos.length >= MAX_PHOTOS;

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">
        Add {MIN_PHOTOS}–{MAX_PHOTOS} clear photos. We use them to fill in the details for you — you can
        change anything we get wrong.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <motion.button
          type="button"
          onClick={() => setCameraOpen(true)}
          disabled={atLimit}
          {...pressProps(reduced)}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--ck-role-accent)]/40 bg-[var(--ck-role-soft)] px-3 py-2 text-[13px] font-bold text-[var(--ck-role-accent)] transition-colors hover:bg-[var(--ck-role-soft)]/70 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
        >
          <Camera className="h-4 w-4" aria-hidden /> Take photo
        </motion.button>

        <motion.button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={atLimit}
          {...pressProps(reduced)}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-[13px] font-bold text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:text-stone-300 dark:hover:bg-zinc-800"
        >
          <ImagePlus className="h-4 w-4" aria-hidden /> Choose photo
        </motion.button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="sr-only"
        onChange={e => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = ""; // allow re-picking the same file after a removal
          if (files.length) onAddFiles(files);
        }}
      />

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <AnimatePresence initial={false}>
            {photos.map((photo, i) => {
              const src = photo.remoteUrl ?? photo.localUrl ?? "";
              const isMain = i === 0;
              return (
                <motion.li
                  key={photo.id}
                  layout={!reduced}
                  initial={reduced ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <div className="aspect-square w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {src && <img src={src} alt={`Item photo ${i + 1}`} className="h-full w-full object-cover" />}
                  </div>

                  {photo.status === "uploading" && (
                    <div className="absolute inset-0 grid place-items-center bg-black/35">
                      <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
                      <span className="sr-only">Uploading photo {i + 1}</span>
                    </div>
                  )}

                  {photo.status === "failed" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-red-900/70 p-2 text-center">
                      <p className="text-[10px] font-bold text-white">Upload failed</p>
                      <button
                        type="button"
                        onClick={() => onRetryPhoto(photo.id)}
                        className="flex min-h-[32px] items-center gap-1 rounded-full bg-white px-2.5 text-[11px] font-black text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <RefreshCw className="h-3 w-3" aria-hidden /> Retry
                      </button>
                    </div>
                  )}

                  {isMain && photo.status === "uploaded" && (
                    <span className="absolute left-1 top-1 rounded-full bg-[var(--ck-role-accent)] px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                      Main
                    </span>
                  )}

                  {/* Always visible — hover-only controls are unusable on touch. */}
                  <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                    {!isMain && photo.status === "uploaded" ? (
                      <button
                        type="button"
                        onClick={() => onMakeMain(photo.id)}
                        aria-label={`Make photo ${i + 1} the main photo`}
                        className="flex min-h-[32px] items-center gap-1 rounded-full bg-white/90 px-2 text-[10px] font-black text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
                      >
                        <Star className="h-3 w-3" aria-hidden /> Main
                      </button>
                    ) : <span />}
                    <button
                      type="button"
                      onClick={() => onRemovePhoto(photo.id)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/90 text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {error && <p role="alert" className="text-[11px] font-semibold text-red-600 dark:text-red-400">{error}</p>}

      {/* AI status — never blocks the form. */}
      {(aiState.running || aiState.note || aiState.canReanalyze) && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start gap-2">
            {aiState.running
              ? <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[var(--ck-role-accent)]" aria-hidden />
              : <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ck-role-accent)]" aria-hidden />}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-stone-700 dark:text-stone-200" aria-live="polite">
                {aiState.running
                  ? "Reading your photos…"
                  : aiState.note ?? "Details filled in from your photos — review them as you go."}
              </p>
              <p className="mt-0.5 text-[11px] text-stone-400">You can keep filling the form while this runs.</p>
              {aiState.canReanalyze && !aiState.running && (
                <button
                  type="button"
                  onClick={onReanalyze}
                  className="mt-1.5 flex min-h-[32px] items-center gap-1 text-[11px] font-bold text-[var(--ck-role-accent)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden /> Re-analyse photos
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {prohibited && (
        <div role="alert" className="rounded-xl border border-amber-400 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-amber-800 dark:text-amber-300">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Check this item is allowed
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            {prohibited.reason ?? "This may be a category CauseKind cannot accept."}
            {prohibited.category ? ` (${prohibited.category})` : ""} You can still continue — our team makes the
            final decision during review.
          </p>
        </div>
      )}

      <details className="rounded-xl border border-stone-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <summary className="cursor-pointer text-[11px] font-bold text-stone-600 dark:text-stone-300">
          What makes a good photo?
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-stone-500 dark:text-stone-400">
          <li>Natural light, plain background.</li>
          <li>One photo of the whole item, one of any damage.</li>
          <li>Include labels or model numbers if there are any.</li>
          <li>No people, faces or personal documents in frame.</li>
        </ul>
      </details>

      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        // Rear camera: you photograph an object, not yourself.
        facingMode="environment"
        onCapture={file => onAddFiles([file])}
        // The dialog's own fallback when the camera cannot start — closes it and
        // opens the file picker, so a permission denial is never a dead end.
        onChoosePhoto={() => { setCameraOpen(false); fileRef.current?.click(); }}
      />
    </div>
  );
}
