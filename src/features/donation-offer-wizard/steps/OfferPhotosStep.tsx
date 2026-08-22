"use client";

import { useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, ImagePlus, Loader2, RefreshCw, ShieldAlert, Sparkles, X } from "lucide-react";
import { pressProps, revealVariants } from "@/features/wizard-kit/wizardMotion";
import type { WizardPhoto } from "@/features/wizard-kit/types";
import { MAX_OFFER_PHOTOS, MIN_OFFER_PHOTOS } from "../offerModel";
import { OFFER_ACCEPT_ATTR } from "../useOfferPhotos";
import type { OfferVideoState } from "../useOfferVideo";
import { OfferVideoField } from "./OfferVideoField";

export type ScreeningState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "safe" }
  | { kind: "unavailable"; note: string }
  | { kind: "prohibited"; reason: string | null; category: string | null };

/**
 * Photos, and the only AI this flow runs: a prohibited-content check.
 *
 * <p>It deliberately does **not** auto-fill condition, age or defects. Those are
 * statements the donor is making about their own item and the declarations hold
 * them to; a model guessing them and the donor clicking past would put words in
 * their mouth. The listing flow autofills because it is cataloguing, not
 * promising.
 */
export function OfferPhotosStep({
  photos, error, screening, onAddFiles, onRetryPhoto, onRemovePhoto, onRescreen,
  video, onPickVideo, onRemoveVideo,
}: {
  photos: WizardPhoto[];
  error?: string;
  screening: ScreeningState;
  onAddFiles: (files: File[]) => void;
  onRetryPhoto: (id: string) => void;
  onRemovePhoto: (id: string) => void;
  onRescreen: () => void;
  /**
   * The optional item video. All three are optional together: the field simply
   * does not render without them, so this step keeps working anywhere it is
   * mounted without video wiring.
   */
  video?: OfferVideoState;
  onPickVideo?: (file: File) => void;
  onRemoveVideo?: () => void;
}) {
  const reduced = !!useReducedMotion();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const uploaded = photos.filter(p => p.status === "uploaded").length;

  function pick(ref: React.RefObject<HTMLInputElement | null>) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length) onAddFiles(files);
      // Reset so re-picking the same file fires change again.
      if (ref.current) ref.current.value = "";
    };
  }

  return (
    <div className="space-y-3" data-field="photos" tabIndex={-1}>
      <p className="text-xs text-stone-600 dark:text-stone-300">
        Add {MIN_OFFER_PHOTOS}–{MAX_OFFER_PHOTOS} clear photos of the item you are donating.
        We only check them for things we cannot accept — everything else you tell us yourself.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <motion.button
          type="button" {...pressProps(reduced)}
          onClick={() => cameraRef.current?.click()}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--ck-role-accent)]/30 bg-[var(--ck-role-soft)] px-3 py-2.5 text-sm font-bold text-[var(--ck-role-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
        >
          <Camera className="h-4 w-4" aria-hidden /> Take photo
        </motion.button>
        <motion.button
          type="button" {...pressProps(reduced)}
          onClick={() => galleryRef.current?.click()}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-bold text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200"
        >
          <ImagePlus className="h-4 w-4" aria-hidden /> Choose photo
        </motion.button>
      </div>

      <input ref={cameraRef} type="file" accept={OFFER_ACCEPT_ATTR} capture="environment"
        multiple className="sr-only" onChange={pick(cameraRef)} aria-hidden tabIndex={-1} />
      <input ref={galleryRef} type="file" accept={OFFER_ACCEPT_ATTR}
        multiple className="sr-only" onChange={pick(galleryRef)} aria-hidden tabIndex={-1} />

      {error && (
        <p id="photos-error" className="text-3xs font-semibold text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Below the photo controls, not beside them: photos are required and the
          video is not, so it must not compete for the same attention. */}
      {video && onPickVideo && onRemoveVideo && (
        <OfferVideoField state={video} onPick={onPickVideo} onRemove={onRemoveVideo} />
      )}

      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p, i) => {
            const src = p.remoteUrl ?? p.localUrl;
            return (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-zinc-800 dark:bg-zinc-900">
                {src && (
                  <Image src={src} alt="" fill sizes="(max-width: 640px) 50vw, 200px"
                    className={`object-cover ${p.status === "uploaded" ? "" : "opacity-60"}`} unoptimized />
                )}

                {i === 0 && p.status === "uploaded" && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-[var(--ck-role-accent)] px-2 py-0.5 text-4xs font-black uppercase tracking-wide text-white">
                    Main
                  </span>
                )}

                {p.status === "uploading" && (
                  <span className="absolute inset-0 grid place-items-center bg-white/60 dark:bg-zinc-950/60">
                    <Loader2 className="h-5 w-5 animate-spin text-stone-600" aria-hidden />
                    <span className="sr-only">Uploading</span>
                  </span>
                )}

                {p.status === "failed" && (
                  <button type="button" onClick={() => onRetryPhoto(p.id)}
                    className="absolute inset-0 grid place-items-center gap-1 bg-red-50/90 text-2xs font-bold text-red-700 dark:bg-red-950/80 dark:text-red-300">
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Retry upload
                  </button>
                )}

                {/* 44×44 touch target, and a label that names the photo it removes. */}
                <button
                  type="button"
                  onClick={() => onRemovePhoto(p.id)}
                  aria-label={`Remove photo ${i + 1} of ${photos.length}`}
                  className="absolute bottom-1 right-1 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-stone-700 shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:bg-zinc-900/90 dark:text-stone-200"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>

              </li>
            );
          })}
        </ul>
      )}

      {/* Screening result. aria-live so a verdict that arrives after the donor
          has moved on is still announced. */}
      <div aria-live="polite">
        <AnimatePresence initial={false} mode="wait">
          {screening.kind === "running" && (
            <motion.p key="running" variants={revealVariants(reduced)} initial="hidden" animate="shown" exit="hidden"
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-2xs text-stone-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-stone-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Checking your photos. You can keep filling the form while this runs.
            </motion.p>
          )}

          {screening.kind === "safe" && uploaded > 0 && (
            <motion.p key="safe" variants={revealVariants(reduced)} initial="hidden" animate="shown" exit="hidden"
              className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-2.5 text-2xs font-semibold text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Photos look fine — nothing we cannot accept.
            </motion.p>
          )}

          {screening.kind === "unavailable" && (
            <motion.div key="unavailable" variants={revealVariants(reduced)} initial="hidden" animate="shown" exit="hidden"
              className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-950/40">
              {/* Non-blocking on purpose: a provider outage is not the donor's
                  problem and must not stop them offering an item. */}
              <p className="text-2xs text-stone-600 dark:text-stone-300">{screening.note}</p>
              <button type="button" onClick={onRescreen}
                className="mt-1.5 inline-flex min-h-[44px] items-center gap-1.5 text-2xs font-bold text-[var(--ck-role-accent)] underline underline-offset-2">
                <RefreshCw className="h-3 w-3" aria-hidden /> Check again
              </button>
            </motion.div>
          )}

          {screening.kind === "prohibited" && (
            <motion.div key="prohibited" role="alert" variants={revealVariants(reduced)} initial="hidden" animate="shown" exit="hidden"
              className="rounded-xl border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
              <p className="flex items-center gap-2 text-2xs font-black uppercase tracking-wide text-red-700 dark:text-red-300">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                We cannot accept this
              </p>
              <p className="mt-1 text-2xs text-red-800 dark:text-red-300">
                {screening.reason ?? "One of these photos shows something CauseKind cannot accept."}
                {screening.category ? ` (${screening.category})` : ""}
              </p>
              <p className="mt-1 text-2xs text-red-700/80 dark:text-red-400/80">
                Remove or replace that photo to continue.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <details className="rounded-xl border border-stone-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        <summary className="cursor-pointer text-2xs font-bold text-stone-700 dark:text-stone-200">
          What makes a good photo?
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-2xs text-stone-500 dark:text-stone-400">
          <li>Daylight, or a well-lit room — no flash glare.</li>
          <li>The whole item in frame, then a close-up of any wear or damage.</li>
          <li>A plain background, so the item is what stands out.</li>
          <li>Show what is included — cables, parts, the box if you still have it.</li>
        </ul>
      </details>
    </div>
  );
}
