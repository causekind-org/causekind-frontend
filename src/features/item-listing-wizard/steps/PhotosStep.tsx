"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, ImagePlus, Loader2, RefreshCw, Sparkles, Star, TriangleAlert, X } from "lucide-react";
import { CameraCaptureDialog } from "@/components/CameraCaptureDialog";
import { ACCEPT_ATTR, MAX_PHOTOS, MIN_PHOTOS } from "../useListingPhotos";
import { pressProps } from "@/features/wizard-kit/wizardMotion";
import { useTranslations } from "next-intl";
import { photoStatusCopy, approvedCount, photoView } from "../photoStatusCopy";
import type { WizardPhoto } from "../wizardModel";
import type { OfferVideoState } from "@/features/donation-offer-wizard/useOfferVideo";
import { OfferVideoField } from "@/features/donation-offer-wizard/steps/OfferVideoField";

/**
 * Step 1 — photos first, because the vision analysis fills the rest of the form
 * from them.
 *
 * <p>Every per-photo control is a real button that is permanently visible. The
 * previous implementation revealed remove on hover, which simply does not exist
 * on touch, and offered no way to choose the main photo other than upload order.
 */
export function PhotosStep({
  photos, error, aiState, prohibited, onAddFiles, onRetryPhoto, onRemovePhoto, onMakeMain, onRetryScreening, onReanalyze,
  video, onPickVideo, onRemoveVideo,
}: {
  photos: WizardPhoto[];
  error?: string;
  aiState: { running: boolean; note: string | null; canReanalyze: boolean };
  prohibited: { category: string | null; reason: string | null } | null;
  onAddFiles: (files: File[]) => void;
  onRetryPhoto: (id: string) => void;
  onRemovePhoto: (id: string) => void;
  onMakeMain: (id: string) => void;
  /** Re-screen a photo that failed for our reasons, not its content. */
  onRetryScreening?: (id: string) => void;
  onReanalyze: () => void;
  /**
   * The optional item video. All three are optional together: the field simply
   * does not render without them, so this step keeps working anywhere it is
   * mounted without video wiring — including before a draft id exists.
   */
  video?: OfferVideoState;
  onPickVideo?: (file: File) => void;
  onRemoveVideo?: () => void;
}) {
  const t = useTranslations();
  const reduced = !!useReducedMotion();
  const approved = approvedCount(photos.map(photoView));
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const atLimit = photos.length >= MAX_PHOTOS;

  return (
    <div className="space-y-2">
      {/*
        Stacked, not side by side. As flex siblings the badge sat inside the
        paragraph's line box and the sentence read "…fill in the details for
        [0 OF 2 REQUIRED PHOTOS APPROVED] you — you can change anything…". It is
        a status, not an aside, so it goes on its own line above the copy.
      */}
      <div className="space-y-1.5">
        {/*
          Progress against the rule that actually gates Continue — photos the
          server has approved, not photos picked. Without it the donor sees two
          thumbnails, presses Continue, and is refused with no way to tell what
          the wizard was waiting for.

          `aria-live="polite"` so each approval is announced without the whole
          grid being re-read.
        */}
        <p
          aria-live="polite"
          className={`inline-block rounded-full px-2.5 py-1 text-2xs font-black uppercase tracking-wide ${
            approved >= MIN_PHOTOS
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-stone-300"
          }`}
        >
          {t("listingWizard.photo.progress", { approved, required: MIN_PHOTOS })}
        </p>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          Add {MIN_PHOTOS}–{MAX_PHOTOS} clear photos. We use them to fill in the details for you — you
          can change anything we get wrong.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <motion.button
          type="button"
          onClick={() => setCameraOpen(true)}
          disabled={atLimit}
          {...pressProps(reduced)}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--ck-role-accent)]/40 bg-[var(--ck-role-soft)] px-3 py-2 text-sm font-bold text-[var(--ck-role-accent)] transition-colors hover:bg-[var(--ck-role-soft)]/70 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
        >
          <Camera className="h-4 w-4" aria-hidden /> Take photo
        </motion.button>

        <motion.button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={atLimit}
          {...pressProps(reduced)}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm font-bold text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:text-stone-300 dark:hover:bg-zinc-800"
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

      {/*
        The grid always renders, even with no photos, because the two required
        slots are drawn as placeholders rather than implied by a number in the
        copy. "Add 2–5 photos" told a donor how many but not *what of* — and the
        second photo is the one that decides whether a recipient can judge the
        item, so it is worth naming: an angle, a label, or the damage.
      */}
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
                      <p className="text-3xs font-bold text-white">Upload failed</p>
                      <button
                        type="button"
                        onClick={() => onRetryPhoto(photo.id)}
                        className="flex min-h-[32px] items-center gap-1 rounded-full bg-white px-2.5 text-2xs font-black text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        <RefreshCw className="h-3 w-3" aria-hidden /> Retry
                      </button>
                    </div>
                  )}

                  {/*
                    Screening state, on the photo it belongs to.

                    <p>The old design had one aggregate banner under the whole
                    grid saying something might be prohibited — and then told the
                    donor they could continue anyway. It named no photo, so with
                    three uploaded there was no way to tell which one was the
                    problem, and it blocked nothing.
                  */}
                  {photo.status === "uploaded" && photo.moderationStatus
                    && photo.moderationStatus !== "APPROVED" && (
                    <div
                      className={`absolute inset-x-0 bottom-0 top-0 flex flex-col items-center justify-center gap-1 p-2 text-center ${
                        photo.moderationStatus === "REJECTED"
                          ? "bg-red-900/75"
                          : photo.moderationStatus === "REVIEW_REQUIRED" || photo.moderationStatus === "FAILED"
                            ? "bg-amber-900/75"
                            : "bg-black/55"
                      }`}
                    >
                      {(photo.moderationStatus === "QUARANTINED"
                        || photo.moderationStatus === "MODERATING_VISUAL") && (
                        <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden />
                      )}
                      <p className="text-3xs font-black uppercase tracking-wide text-white">
                        {t(photoStatusCopy(photoView(photo)).labelKey)}
                      </p>
                      {photoStatusCopy(photoView(photo)).detailKey && (
                        <p
                          id={`photo-reason-${photo.id}`}
                          className="text-4xs leading-snug text-white/90"
                        >
                          {t(photoStatusCopy(photoView(photo)).detailKey as string)}
                        </p>
                      )}
                      <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1">
                        {photoStatusCopy(photoView(photo)).actions.includes("retry") && (
                          <button
                            type="button"
                            onClick={() => onRetryScreening?.(photo.id)}
                            aria-label={t("listingWizard.photo.action.retryLabel", { n: i + 1 })}
                            aria-describedby={`photo-reason-${photo.id}`}
                            className="flex min-h-11 items-center gap-1 rounded-full bg-white px-3 text-2xs font-black text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                          >
                            <RefreshCw className="h-3 w-3" aria-hidden />
                            {t("listingWizard.photo.action.retry")}
                          </button>
                        )}
                        {photoStatusCopy(photoView(photo)).actions.includes("remove") && (
                          <button
                            type="button"
                            onClick={() => onRemovePhoto(photo.id)}
                            aria-label={t("listingWizard.photo.action.removeLabel", { n: i + 1 })}
                            aria-describedby={`photo-reason-${photo.id}`}
                            className="flex min-h-11 items-center gap-1 rounded-full bg-white/90 px-3 text-2xs font-black text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                          >
                            {t("listingWizard.photo.action.remove")}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {isMain && photo.status === "uploaded" && (
                    <span className="absolute left-1 top-1 rounded-full bg-[var(--ck-role-accent)] px-1.5 py-0.5 text-4xs font-black uppercase text-white">
                      Main
                    </span>
                  )}

                  {/* Always visible — hover-only controls are unusable on touch. */}
                  <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                    {/* Approved only. A rejected photo offered a "Make main"
                        button, which would have made the listing's cover the one
                        photo that can never be shown. */}
                    {!isMain && photo.status === "uploaded" && photo.moderationStatus === "APPROVED" ? (
                      <button
                        type="button"
                        onClick={() => onMakeMain(photo.id)}
                        aria-label={`Make photo ${i + 1} the main photo`}
                        className="flex min-h-11 items-center gap-1 rounded-full bg-white/90 px-3 text-3xs font-black text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
                      >
                        <Star className="h-3 w-3" aria-hidden /> Main
                      </button>
                    ) : <span />}
                    <button
                      type="button"
                      onClick={() => onRemovePhoto(photo.id)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/90 text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>

          {/*
            One placeholder per still-unfilled required slot.

            Counted against `photos.length`, not against approved: a slot the
            donor has already filled is not empty just because its photo is
            still being checked, and drawing a second "add a photo here" tile
            beside a photo that is mid-screening reads as though it was lost.
          */}
          {Array.from({ length: Math.max(0, MIN_PHOTOS - photos.length) }).map((_, idx) => {
            const slot = photos.length + idx;
            return (
              <li
                key={`slot-${slot}`}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-2 text-center dark:border-zinc-700 dark:bg-zinc-900/40"
              >
                <span className="text-3xs font-black uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  {t(slot === 0 ? "listingWizard.photo.slotMain" : "listingWizard.photo.slotSecond")}
                </span>
                <span className="text-4xs leading-snug text-stone-400 dark:text-stone-500">
                  {t(slot === 0 ? "listingWizard.photo.slotMainHint" : "listingWizard.photo.slotSecondHint")}
                </span>
                <span className="mt-0.5 rounded-full bg-stone-200 px-1.5 py-0.5 text-5xs font-black uppercase text-stone-600 dark:bg-zinc-800 dark:text-stone-400">
                  {t("listingWizard.photo.slotRequired")}
                </span>
              </li>
            );
          })}
        </ul>

      {error && <p role="alert" className="text-2xs font-semibold text-red-600 dark:text-red-400">{error}</p>}

      {/* Below the photo controls, not beside them: photos are required and the
          video is not, so it must not compete for the same attention. The field
          is shared with the offer wizard — same states, same copy, same
          fail-closed behaviour when the deployment has no ffmpeg. */}
      {video && onPickVideo && onRemoveVideo && (
        <OfferVideoField state={video} onPick={onPickVideo} onRemove={onRemoveVideo} />
      )}

      {/* AI status — never blocks the form. */}
      {(aiState.running || aiState.note || aiState.canReanalyze) && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start gap-2">
            {aiState.running
              ? <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[var(--ck-role-accent)]" aria-hidden />
              : <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ck-role-accent)]" aria-hidden />}
            <div className="min-w-0 flex-1">
              <p className="text-2xs font-semibold text-stone-700 dark:text-stone-200" aria-live="polite">
                {aiState.running
                  ? "Reading your photos…"
                  : aiState.note ?? "Details filled in from your photos — review them as you go."}
              </p>
              <p className="mt-0.5 text-2xs text-stone-400">You can keep filling the form while this runs.</p>
              {aiState.canReanalyze && !aiState.running && (
                <button
                  type="button"
                  onClick={onReanalyze}
                  className="mt-1.5 flex min-h-[32px] items-center gap-1 text-2xs font-bold text-[var(--ck-role-accent)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
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
          <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wide text-amber-800 dark:text-amber-300">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Check this item is allowed
          </p>
          {/*
            Advisory, and now honestly labelled as such.

            <p>This banner comes from the *autofill* analysis, which reads the
            photos to suggest a title and condition. It is not the safety
            screening — that happens per photo, on the card, and is what
            actually blocks Continue.

            <p>It used to end "You can still continue — our team makes the final
            decision during review", which was true of this advisory note and
            completely wrong as a statement about prohibited content: nothing
            stopped a listing whose photos had just been flagged. The gate is
            real now, so this line no longer has to pretend to be one, and must
            not imply the opposite either.
          */}
          <p className="mt-1 text-2xs leading-relaxed text-amber-800 dark:text-amber-300">
            {prohibited.reason ?? "This may be a category CauseKind cannot accept."}
            {prohibited.category ? ` (${prohibited.category})` : ""} Each photo is checked
            separately — anything that can&apos;t be accepted is marked on the photo itself.
          </p>
        </div>
      )}

      <details className="rounded-xl border border-stone-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <summary className="cursor-pointer text-2xs font-bold text-stone-600 dark:text-stone-300">
          What makes a good photo?
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-2xs text-stone-500 dark:text-stone-400">
          <li>Natural light, plain background.</li>
          <li>One photo of the whole item, one of any damage.</li>
          <li>Include labels or model numbers if there are any.</li>
          <li>No people, faces or personal documents in frame.</li>
        </ul>
      </details>

      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        // Rear camera: you photograph an object, not yourself. Mirroring follows
        // from that automatically — a mirrored item photo shows every label,
        // model number and serial back to front.
        facingMode="environment"
        title="Photograph the item"
        instructions="Fill the frame with the item. Natural light, plain background."
        filenamePrefix="listing-photo"
        onCapture={file => onAddFiles([file])}
        // The dialog's own fallback when the camera cannot start — closes it and
        // opens the file picker, so a permission denial is never a dead end.
        onChoosePhoto={() => { setCameraOpen(false); fileRef.current?.click(); }}
      />
    </div>
  );
}
