"use client";

import { useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileVideo, Loader2, Trash2, Video } from "lucide-react";
import { pressProps } from "@/features/wizard-kit/wizardMotion";
import type { OfferVideoState } from "../useOfferVideo";
import { VideoRecorderDialog } from "./VideoRecorderDialog";

/**
 * Containers the server accepts. Mirrors VideoPolicy.allowedContainers — MOV is
 * there only because iPhones produce it, and is always transcoded to MP4.
 *
 * <p>Not a security boundary: the server probes the container's own headers and
 * ignores what the picker claimed. This exists so the picker shows the donor
 * files that stand a chance, not to keep anything out.
 */
const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm";

/**
 * The optional item video.
 *
 * <p><b>Two separate actions.</b> Record opens an in-page recorder; Choose opens
 * the ordinary file picker. They were briefly two file inputs differing only in
 * `capture`, because the pipeline took MP4 and MOV only and Chromium and Firefox
 * record WebM — a browser recorder would have produced files the probe threw
 * away. WebM is now accepted end to end and the slot's content type is
 * negotiated rather than fixed, so recording in the page produces something the
 * server keeps, and the donor stays on this screen instead of being handed to
 * the platform camera app.
 *
 * <p>The recorder is video-only: `microphone=()` stays closed, and the transcode
 * drops audio regardless. When it cannot start at all — no `MediaRecorder`, no
 * camera, permission refused — it says so plainly, and Choose video is still
 * there, which is why that path never depends on any permission.
 *
 * <p>Nothing renders at all until the server says video is available. A
 * deployment without ffmpeg must never show a control that cannot work.
 */
export function OfferVideoField({
  state, onPick, onRemove,
}: {
  state: OfferVideoState;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const reduced = !!useReducedMotion();
  const [recording, setRecording] = useState(false);
  const chooseInputRef = useRef<HTMLInputElement>(null);

  // capability === null means we have not heard back yet; false means no.
  if (!state.capability?.available) return null;

  const { video, playbackUrl, busy, phase, error, capability } = state;
  const maxMb = Math.round(capability.maxBytes / (1024 * 1024));

  /**
   * Resets the input after every change.
   *
   * <p>The reset is required, not tidiness: without it, re-selecting the same
   * file — the common case after a rejection or a removal — sets the same value
   * and no `change` event is dispatched, so the donor's second attempt appears
   * to do nothing. Cancelling a picker fires `change` with an empty list, which
   * must not reach `onPick`.
   */
  const handlePick = (ref: React.RefObject<HTMLInputElement | null>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onPick(file);
      if (ref.current) ref.current.value = "";
    };

  return (
    <div className="rounded-xl border border-stone-200 p-3 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-stone-700 dark:text-stone-200">
            Add a short video <span className="font-medium text-stone-500">(optional)</span>
          </p>
          <p className="mt-0.5 text-3xs text-stone-500 dark:text-stone-400">
            Up to {capability.maxSeconds}s, {maxMb}MB. We check it before anyone sees it.
          </p>
        </div>

        {video && !busy && (
          <button
            type="button"
            onClick={onRemove}
            className="flex min-h-[44px] items-center gap-1 px-2 text-3xs font-bold text-stone-500 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
          </button>
        )}
      </div>

      {/* While an upload or screening is in flight the two actions are replaced
          by a single progress line rather than being disabled in place. Two
          greyed buttons would still read as two things to press, and would need
          two spinners to say one thing. */}
      {!video && busy && (
        <p
          role="status"
          aria-live="polite"
          className="mt-2.5 flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-bold text-stone-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-300"
        >
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
          {phase === "uploading" ? "Uploading…" : "Checking…"}
        </p>
      )}

      {!video && !busy && (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <motion.button
            type="button" {...pressProps(reduced)}
            onClick={() => setRecording(true)}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--ck-role-accent)]/30 bg-[var(--ck-role-soft)] px-3 py-2.5 text-sm font-bold text-[var(--ck-role-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
          >
            <Video className="h-4 w-4" aria-hidden /> Record video
          </motion.button>
          <motion.button
            type="button" {...pressProps(reduced)}
            onClick={() => chooseInputRef.current?.click()}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-bold text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200"
          >
            <FileVideo className="h-4 w-4" aria-hidden /> Choose video
          </motion.button>
        </div>
      )}

      {/* The only file input left. Record no longer needs one — it produces a
          File from the recorder — and keeping an unused hidden input around
          would just be something to wonder about later. */}
      <input
        ref={chooseInputRef} type="file" accept={VIDEO_ACCEPT}
        data-testid="video-choose-input"
        className="sr-only" aria-hidden tabIndex={-1}
        onChange={handlePick(chooseInputRef)}
      />

      {recording && (
        <VideoRecorderDialog
          open
          maxSeconds={capability.maxSeconds}
          onCancel={() => setRecording(false)}
          onRecorded={file => {
            // Close first: the dialog's teardown releases the camera, and the
            // upload that follows can take a while with the light still on.
            setRecording(false);
            onPick(file);
          }}
        />
      )}

      {video && <VideoStatusLine state={state} playbackUrl={playbackUrl} />}

      {error && (
        <p className="mt-2 text-3xs font-semibold text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

/**
 * One line per outcome.
 *
 * <p>Every terminal state is spelled out rather than collapsed into
 * success/failure. REVIEW_REQUIRED especially: a human looking at it is a normal
 * result here, and showing it as an error would tell the donor something untrue
 * about their own video.
 */
function VideoStatusLine({
  state, playbackUrl,
}: {
  state: OfferVideoState;
  playbackUrl: string | null;
}) {
  const status = state.video?.status;

  if (status === "APPROVED") {
    return (
      <div className="mt-2.5">
        <p className="text-3xs font-bold text-emerald-700 dark:text-emerald-400">Video added.</p>
        {playbackUrl && (
          <video
            src={playbackUrl} controls playsInline
            className="mt-2 aspect-video w-full rounded-lg bg-black"
          />
        )}
      </div>
    );
  }

  // QUARANTINED is not here on purpose: it means the bytes arrived and screening
  // has not started yet, so it belongs with the in-flight states further down.
  if (status === "REJECTED") {
    return (
      <p className="mt-2.5 text-3xs font-semibold text-red-600 dark:text-red-400">
        We can&apos;t accept this video. You can remove it and try another, or continue with photos only.
      </p>
    );
  }

  if (status === "REVIEW_REQUIRED") {
    return (
      <p className="mt-2.5 text-3xs font-semibold text-amber-700 dark:text-amber-400">
        Someone from our team will check this video. You can carry on — it will not hold up your submission.
      </p>
    );
  }

  if (status === "FAILED") {
    return (
      <p className="mt-2.5 text-3xs font-semibold text-red-600 dark:text-red-400">
        We couldn&apos;t process that video. Remove it and try another, or continue with photos only.
      </p>
    );
  }

  // Everything else is still moving: UPLOADING, VALIDATING, TRANSCODING,
  // MALWARE_SCANNING, MODERATING_VISUAL, MODERATING_AUDIO — or the poll gave up
  // and left it mid-flight, which is why this says "still" rather than a spinner
  // that would imply we are watching.
  return (
    <p className="mt-2.5 flex items-center gap-1.5 text-3xs font-semibold text-stone-500 dark:text-stone-400">
      {state.busy && <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />}
      {state.busy ? "Checking your video…" : "Your video is still being checked. You can carry on."}
    </p>
  );
}
