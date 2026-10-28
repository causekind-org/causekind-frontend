"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, ImagePlus, Loader2, Plus, RefreshCw, ShieldAlert, X } from "lucide-react";
import { PHOTO_COPY } from "@/features/wizard-kit/mediaStatusCopy";
import { WizardPhotoImage } from "@/features/wizard-kit/WizardPhotoImage";
import { pressProps, revealVariants } from "@/features/wizard-kit/wizardMotion";
import type { WizardPhoto } from "@/features/wizard-kit/types";
import { MIN_OFFER_PHOTOS } from "@/features/donation-offer-wizard/offerModel";
import { OFFER_ACCEPT_ATTR } from "@/features/donation-offer-wizard/useOfferPhotos";
import type { OfferVideoState } from "@/features/donation-offer-wizard/useOfferVideo";
import { OfferVideoField } from "@/features/donation-offer-wizard/steps/OfferVideoField";
import type { ScreeningState } from "@/features/donation-offer-wizard/steps/OfferPhotosStep";

import { UiText, useUiText } from "@/components/UiText";
/** Main photo, a required second angle, and up to 3 more. */
export const DRIVE_MAX_PHOTOS = 5;

/** Display copy for TIPS, translated (was a module constant). */
function useTipsCopy() {
  const ui = useUiText();
  return [
  ui("Daylight, or a well-lit room. No flash glare."),
  ui("The whole item in frame, then a close-up of any wear."),
  ui("A plain background, so the item stands out."),
  ui("No people, faces or personal documents in frame."),
];
}

/**
 * The drive give form's photo step, laid out like the listing wizard's: a large
 * main-photo slot, a required second angle, up to 3 more, a "Photos approved"
 * card and tips beside it, and the optional video below. Colours come from the
 * role accent, so it is green inside the drive give page. The donor↔donee offer
 * wizard keeps its own OfferPhotosStep.
 */
export function DriveOfferPhotosStep({
  photos, error, screening, onAddFiles, onRetryPhoto, onRemovePhoto, onRescreen, onTakePhoto,
  video, onPickVideo, onRemoveVideo,
}: {
  photos: WizardPhoto[];
  error?: string;
  screening: ScreeningState;
  onAddFiles: (files: File[]) => void;
  onRetryPhoto: (id: string) => void;
  onRemovePhoto: (id: string) => void;
  onRescreen: () => void;
  /** Receives a function that opens the phone's own camera input. */
  onTakePhoto?: (openNativeCamera: () => void) => void;
  video?: OfferVideoState;
  onPickVideo?: (file: File) => void;
  onRemoveVideo?: () => void;
}) {
  const TIPS = useTipsCopy();
  const df = useTranslations("driveFlow");
  const wt = useTranslations("wizardFlow");
  const ui = useUiText();
  const t = useTranslations();
  const reduced = !!useReducedMotion();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const uploaded = photos.filter(p => p.status === "uploaded").length;
  // The screening is one verdict for all photos: uploaded photos count as approved
  // unless it is still running or refused one.
  const approved = screening.kind === "running" || screening.kind === "prohibited" ? 0 : uploaded;
  const atLimit = photos.length >= DRIVE_MAX_PHOTOS;
  const ringDeg = Math.min(1, approved / MIN_OFFER_PHOTOS) * 360;
  const takePhoto = () => onTakePhoto ? onTakePhoto(() => cameraRef.current?.click()) : cameraRef.current?.click();
  const choosePhoto = () => galleryRef.current?.click();

  function pick(ref: React.RefObject<HTMLInputElement | null>) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, DRIVE_MAX_PHOTOS - photos.length));
      if (files.length) onAddFiles(files);
      if (ref.current) ref.current.value = "";
    };
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-6" data-field="photos" tabIndex={-1}>
      <div className="min-w-0 space-y-3">
        <p className="text-xs text-stone-600 dark:text-stone-300">
          <UiText>Add a main photo and a second angle. You can add up to 3 more. We only check them for things we cannot accept.</UiText>
        </p>
        <p aria-live="polite" data-testid="drive-photos-progress"
          className="inline-block rounded-full bg-[var(--ck-role-soft)] px-2.5 py-1 text-2xs font-black uppercase tracking-wide text-[var(--ck-role-accent)] lg:hidden">
          {df("requiredPhotosApproved", { n: Math.min(approved, MIN_OFFER_PHOTOS), total: MIN_OFFER_PHOTOS })}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <motion.button type="button" {...pressProps(reduced)} onClick={takePhoto} disabled={atLimit}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--ck-role-accent)]/30 bg-[var(--ck-role-soft)] px-3 py-2.5 text-sm font-bold text-[var(--ck-role-accent)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]">
            <Camera className="h-4 w-4" aria-hidden /> <UiText>Take photo</UiText>
          </motion.button>
          <motion.button type="button" {...pressProps(reduced)} onClick={choosePhoto} disabled={atLimit}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-bold text-stone-700 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200">
            <ImagePlus className="h-4 w-4" aria-hidden /> <UiText>Choose photo</UiText>
          </motion.button>
        </div>

        <input ref={cameraRef} type="file" accept={OFFER_ACCEPT_ATTR} capture="environment"
          multiple className="sr-only" onChange={pick(cameraRef)} aria-hidden tabIndex={-1} />
        <input ref={galleryRef} type="file" accept={OFFER_ACCEPT_ATTR}
          multiple className="sr-only" onChange={pick(galleryRef)} aria-hidden tabIndex={-1} />

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:auto-rows-[140px] lg:gap-3">
          {photos.map((p, i) => {
            const src = p.localUrl || p.remoteUrl;
            return (
              <li key={p.id}
                className={`relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-zinc-800 dark:bg-zinc-900 ${i === 0 ? "aspect-square lg:col-span-2 lg:row-span-2 lg:aspect-auto" : "aspect-square lg:aspect-auto"}`}>
                {src && (
                  <WizardPhotoImage src={src} alt={`Photo ${i + 1}`}
                    className={`object-cover ${p.status === "uploaded" ? "" : "opacity-60"}`} />
                )}
                {i === 0 && p.status === "uploaded" && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-[var(--ck-role-accent)] px-2 py-0.5 text-4xs font-black uppercase tracking-wide text-white"><UiText>Main</UiText></span>
                )}
                {p.status === "uploading" && (
                  <span className="absolute inset-0 grid place-items-center bg-white/60 dark:bg-zinc-950/60">
                    <Loader2 className="h-5 w-5 animate-spin text-stone-600" aria-hidden />
                    <span className="sr-only"><UiText>Uploading</UiText></span>
                  </span>
                )}
                {p.status === "failed" && (
                  <button type="button" onClick={() => onRetryPhoto(p.id)}
                    className="absolute inset-0 grid place-items-center gap-1 bg-red-50/90 text-2xs font-bold text-red-700 dark:bg-red-950/80 dark:text-red-300">
                    <RefreshCw className="h-4 w-4" aria-hidden /> <UiText>Retry upload</UiText>
                  </button>
                )}
                <button type="button" onClick={() => onRemovePhoto(p.id)} aria-label={wt("removePhotoOf", { n: i + 1, total: photos.length })}
                  className="absolute bottom-1 right-1 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-stone-700 shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:bg-zinc-900/90 dark:text-stone-200">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            );
          })}

          {/* One placeholder per still-empty required slot: the main photo, then the second angle. */}
          {Array.from({ length: Math.max(0, MIN_OFFER_PHOTOS - photos.length) }).map((_, idx) => {
            const slot = photos.length + idx;
            const main = slot === 0;
            return (
              <li key={`slot-${slot}`} data-testid={main ? "drive-slot-main" : "drive-slot-second"}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stone-300 bg-stone-50/60 p-2 text-center dark:border-zinc-700 dark:bg-zinc-900/40 lg:aspect-auto ${main ? "lg:col-span-2 lg:row-span-2 lg:border-2 lg:border-[var(--ck-role-accent)]/35 lg:bg-[var(--ck-role-soft)]/50" : ""}`}>
                {main && <Camera className="hidden h-8 w-8 text-[var(--ck-role-accent)] lg:block" strokeWidth={1.5} aria-hidden />}
                <span className="text-3xs font-black uppercase tracking-wide text-stone-500 dark:text-stone-400">
                  {main ? ui("Main photo") : ui("Second angle")}
                </span>
                <span className="text-4xs leading-snug text-stone-400 dark:text-stone-500">
                  {main ? ui("The whole item, front on") : ui("Another side, a label, or any wear")}
                </span>
                <span className="mt-0.5 rounded-full bg-stone-200 px-1.5 py-0.5 text-5xs font-black uppercase text-stone-600 dark:bg-zinc-800 dark:text-stone-400"><UiText>Required</UiText></span>
              </li>
            );
          })}

          {!atLimit && photos.length >= 1 && (
            <li className="hidden lg:block">
              <button type="button" onClick={choosePhoto}
                className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/40 p-2 text-sm font-bold text-stone-500 hover:border-[var(--ck-role-accent)]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-800 dark:bg-zinc-900/30">
                <Plus className="h-5 w-5" aria-hidden />
                {photos.length < MIN_OFFER_PHOTOS ? ui("Up to 3 more (optional)") : df("addMoreLeft", { count: DRIVE_MAX_PHOTOS - photos.length })}
              </button>
            </li>
          )}
        </ul>

        {error && <p id="photos-error" role="alert" className="text-2xs font-semibold text-red-600 dark:text-red-400">{error}</p>}

        <div aria-live="polite">
          <AnimatePresence initial={false} mode="wait">
            {screening.kind === "running" && (
              <motion.p key="running" variants={revealVariants(reduced)} initial="hidden" animate="shown" exit="hidden"
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-2xs text-stone-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-stone-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> <UiText>Checking your photos. You can keep filling the form while this runs.</UiText>
              </motion.p>
            )}
            {screening.kind === "unavailable" && (
              <motion.div key="unavailable" variants={revealVariants(reduced)} initial="hidden" animate="shown" exit="hidden"
                className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-950/40">
                <p className="text-2xs text-stone-600 dark:text-stone-300">{screening.note}</p>
                <button type="button" onClick={onRescreen}
                  className="mt-1.5 inline-flex min-h-[44px] items-center gap-1.5 text-2xs font-bold text-[var(--ck-role-accent)] underline underline-offset-2">
                  <RefreshCw className="h-3 w-3" aria-hidden /> <UiText>Check again</UiText>
                </button>
              </motion.div>
            )}
            {screening.kind === "prohibited" && (
              <motion.div key="prohibited" role="alert" variants={revealVariants(reduced)} initial="hidden" animate="shown" exit="hidden"
                className="rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                <p className="flex items-center gap-2 text-2xs font-black uppercase tracking-wide text-red-700 dark:text-red-300">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> <UiText>We cannot accept this</UiText>
                </p>
                <p className="mt-1 text-2xs text-red-800 dark:text-red-300">
                  {t(screening.code ? (PHOTO_COPY.reasons[screening.code] ?? PHOTO_COPY.genericReason) : PHOTO_COPY.genericReason)}
                </p>
                <p className="mt-1 text-2xs text-red-700/80 dark:text-red-400/80"><UiText>Remove or replace that photo to continue.</UiText></p>
                <button type="button" onClick={onRescreen}
                  className="mt-1.5 inline-flex min-h-[44px] items-center gap-1.5 text-2xs font-bold text-red-800 underline underline-offset-2 dark:text-red-300">
                  <RefreshCw className="h-3 w-3" aria-hidden /> <UiText>Check again</UiText>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Below the photos: they are required, the video is not. */}
        {video && onPickVideo && onRemoveVideo && (
          <OfferVideoField state={video} onPick={onPickVideo} onRemove={onRemoveVideo} />
        )}
        {/* The server answered that video is off (e.g. no ffmpeg to check clips): say so. */}
        {video?.capability && !video.capability.available && (
          <p data-testid="drive-video-unavailable" className="text-sm text-stone-500 dark:text-stone-400"><UiText>Video upload isn&apos;t available right now.</UiText></p>
        )}

        <details className="rounded-xl border border-stone-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
          <summary className="cursor-pointer text-2xs font-bold text-stone-700 dark:text-stone-200"><UiText>What makes a good photo?</UiText></summary>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-2xs text-stone-500 dark:text-stone-400">
            {TIPS.map(tip => <li key={tip}>{tip}</li>)}
          </ul>
        </details>
      </div>

      <aside className="hidden flex-col gap-5 self-start rounded-2xl bg-stone-50 p-5 dark:bg-zinc-900/60 lg:flex">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full" aria-hidden
            style={{ background: `conic-gradient(var(--ck-role-accent) ${ringDeg}deg, rgba(120,113,108,0.18) ${ringDeg}deg)` }}>
            <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-stone-50 text-base font-black text-stone-800 dark:bg-zinc-900 dark:text-stone-100">
              {Math.min(approved, MIN_OFFER_PHOTOS)}/{MIN_OFFER_PHOTOS}
            </span>
          </div>
          <div>
            <p className="text-base font-black text-stone-800 dark:text-stone-100"><UiText>Photos approved</UiText></p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {approved >= MIN_OFFER_PHOTOS ? ui("Ready. You can continue.") : df("neededToContinue", { count: MIN_OFFER_PHOTOS })}
            </p>
          </div>
        </div>
        <div className="h-px bg-stone-200 dark:bg-zinc-800" />
        <div className="space-y-3">
          <p className="text-2xs font-black uppercase tracking-[0.12em] text-[var(--ck-role-accent)]"><UiText>What makes a good photo</UiText></p>
          {TIPS.map(tip => (
            <p key={tip} className="flex items-start gap-2 text-sm leading-snug text-stone-700 dark:text-stone-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ck-role-accent)]" aria-hidden />
              {tip}
            </p>
          ))}
        </div>
      </aside>
    </div>
  );
}
