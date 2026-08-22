"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Trash2, Video } from "lucide-react";
import { pressProps } from "@/features/wizard-kit/wizardMotion";
import type { OfferVideoState } from "../useOfferVideo";

/**
 * Containers the server accepts. Mirrors VideoPolicy.allowedContainers — MOV is
 * there only because iPhones produce it, and is always transcoded to MP4.
 */
const VIDEO_ACCEPT = "video/mp4,video/quicktime";

/**
 * The optional item video.
 *
 * <p><b>A file input with `capture`, not an in-page recorder.</b> On a phone —
 * where a donor is standing in front of the thing they are giving — that hands
 * off to the real camera app, which is a better recorder than anything built
 * here. It also sidesteps `getUserMedia` entirely, so no camera or microphone
 * permission is involved and the Permissions-Policy header cannot break it the
 * way it broke in-app photo capture.
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
  const inputRef = useRef<HTMLInputElement>(null);

  // capability === null means we have not heard back yet; false means no.
  if (!state.capability?.available) return null;

  const { video, playbackUrl, busy, phase, error, capability } = state;
  const maxMb = Math.round(capability.maxBytes / (1024 * 1024));

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

      {!video && (
        <motion.button
          type="button" {...pressProps(reduced)}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-bold text-stone-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200"
        >
          {busy
            ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> {phase === "uploading" ? "Uploading…" : "Checking…"}</>
            : <><Video className="h-4 w-4" aria-hidden /> Record or choose a video</>}
        </motion.button>
      )}

      <input
        ref={inputRef} type="file" accept={VIDEO_ACCEPT} capture="environment"
        className="sr-only" aria-hidden tabIndex={-1}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          // Reset so re-picking the same file fires change again.
          if (inputRef.current) inputRef.current.value = "";
        }}
      />

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

  if (status === "REJECTED" || status === "QUARANTINED") {
    return (
      <p className="mt-2.5 text-3xs font-semibold text-red-600 dark:text-red-400">
        We can&apos;t accept this video. You can remove it and try another, or continue with photos only.
      </p>
    );
  }

  if (status === "REVIEW_REQUIRED") {
    return (
      <p className="mt-2.5 text-3xs font-semibold text-amber-700 dark:text-amber-400">
        Someone from our team will check this video. You can carry on — it will not hold up your offer.
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
