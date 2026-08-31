"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Square, Video, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * MIME types to offer {@link MediaRecorder}, best first.
 *
 * <p>Ordered by what the pipeline prefers rather than by what browsers like.
 * MP4/H.264 is the canonical output, so a recorder that can produce it directly
 * saves a container conversion; Safari does. Chrome and Firefox will fall
 * through to WebM, which the probe now accepts and the transcoder converts.
 *
 * <p>The list is negotiated with {@code isTypeSupported} rather than picked from
 * the user agent. Browsers disagree about which of these they will honour, and
 * a string that is merely plausible produces a recorder that starts and then
 * emits an empty blob — a failure that looks like the camera not working.
 */
const PREFERRED_TYPES = [
  'video/mp4;codecs="avc1.42E01E"',
  "video/mp4",
  'video/webm;codecs="vp8"',
  "video/webm",
] as const;

/**
 * Bounded on purpose. A phone camera left to its own devices will happily record
 * at a bitrate that blows past the server's size cap in well under the allowed
 * duration, and the donor would only find out at the upload. 2.5 Mbps is
 * comfortably enough for an item on a table.
 */
const VIDEO_BITS_PER_SECOND = 2_500_000;

/** What the picked MIME type means for the filename the server sees. */
function extensionFor(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of PREFERRED_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      // isTypeSupported throws on some older engines rather than returning
      // false. Treat that as unsupported and keep looking.
    }
  }
  return null;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Phase = "starting" | "ready" | "recording" | "finishing" | "error";

/**
 * Records a short clip in the page, with the camera preview visible.
 *
 * <p><b>Video only — {@code audio: false} in the constraint.</b> The transcode
 * drops audio unconditionally because nothing in this stack transcribes or
 * moderates it, so recording a track that is guaranteed to be discarded would
 * ask for the microphone permission under false pretences. It also keeps
 * {@code microphone=()} closed in the Permissions-Policy header.
 *
 * <p>The recorder auto-stops at {@code maxSeconds}. Relying on the donor to stop
 * in time would mean a clip that the server truncates at exactly the moment the
 * item was being shown, and they would have no way to know why.
 *
 * <p>Every exit path — stop, cancel, escape, unmount — runs through
 * {@link teardown}. A {@code getUserMedia} stream that outlives the dialog
 * leaves the camera light on, which readers reasonably interpret as being
 * recorded without consent.
 */
export function VideoRecorderDialog({
  open, maxSeconds, onCancel, onRecorded,
}: {
  open: boolean;
  maxSeconds: number;
  onCancel: () => void;
  onRecorded: (file: File) => void;
}) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  // Distinguishes "the donor pressed Stop" from "the dialog is being torn down",
  // both of which fire onstop. Only the first should hand a file back.
  const keepRef = useRef(false);

  /**
   * Stops the camera tracks and clears the preview.
   *
   * <p>Separate from {@link teardown} because the recorder has to be released the
   * moment a recording ends, not only when the dialog goes away. The parent
   * closes on the callback, but the upload it starts can run for a while, and
   * leaving the camera light on through it looks exactly like still recording.
   */
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const teardown = useCallback(() => {
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    tickRef.current = null;
    stopTimerRef.current = null;

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Already stopping. Nothing to do; the tracks below are what matter.
      }
    }
    recorderRef.current = null;

    releaseStream();
    chunksRef.current = [];
  }, [releaseStream]);

  // Tear down whenever the dialog closes, and on unmount. Not only on the
  // buttons: closing by Escape or by an overlay click has to release the camera
  // too, and those never reach a handler of ours.
  useEffect(() => {
    if (!open) teardown();
    return teardown;
  }, [open, teardown]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setPhase("starting");
    setError(null);
    setElapsed(0);
    keepRef.current = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setPhase("error");
          setError("This browser can't record video. Choose a video file instead.");
        }
        return;
      }
      if (!pickMimeType()) {
        if (!cancelled) {
          setPhase("error");
          setError("This browser can't record video. Choose a video file instead.");
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // Rear camera where there is one; "ideal" rather than "exact" so a
          // laptop with only a front camera still works instead of throwing.
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Failing to play is not fatal — the recording still works, and an
          // unhandled rejection here would surface as a console error only.
          void videoRef.current.play().catch(() => {});
        }
        setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        setPhase("error");
        setError(describeCameraError(e));
      }
    };

    void start();
    return () => { cancelled = true; };
  }, [open]);

  const stop = useCallback(() => {
    keepRef.current = true;
    setPhase("finishing");
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    const mimeType = pickMimeType();
    if (!stream || !mimeType) return;

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      });
    } catch {
      setPhase("error");
      setError("This browser can't record video. Choose a video file instead.");
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
      if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
      tickRef.current = null;
      stopTimerRef.current = null;
      // After the last chunk, never before it: releasing the tracks while the
      // recorder is still flushing would cut the end off the clip.
      releaseStream();

      // A teardown-triggered stop must not hand anything back: the dialog is
      // already closing, and the donor did not ask to keep this.
      if (!keepRef.current) return;

      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size === 0) {
        setPhase("error");
        setError("That recording came out empty. Please try again.");
        return;
      }

      // Named, and typed to the container rather than to the full codec string.
      // The server allowlists the base type and the probe settles the codec, so
      // the parameters would only be noise here.
      const baseType = mimeType.split(";")[0];
      const file = new File(
        [blob],
        `recording-${Date.now()}.${extensionFor(mimeType)}`,
        { type: baseType },
      );
      onRecorded(file);
    };
    recorder.onerror = () => {
      setPhase("error");
      setError("The recording stopped unexpectedly. Please try again.");
    };

    recorderRef.current = recorder;
    // A timeslice, so a long recording produces chunks as it goes rather than
    // one allocation at the end.
    recorder.start(1000);
    setPhase("recording");
    setElapsed(0);

    tickRef.current = window.setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    // The hard stop. The interval above is display only — a throttled background
    // tab would let it drift, and the limit is not a display concern.
    stopTimerRef.current = window.setTimeout(stop, maxSeconds * 1000);
  }, [maxSeconds, onRecorded, releaseStream, stop]);

  const remaining = Math.max(0, maxSeconds - elapsed);

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a video</DialogTitle>
          <DialogDescription>
            Up to {maxSeconds} seconds. No sound is recorded.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            // The preview is decoration around the control; the elapsed time is
            // announced separately, in text.
            aria-hidden
            data-testid="recorder-preview"
            className="aspect-video w-full object-cover"
          />

          {phase === "starting" && (
            <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-bold text-white">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
              Starting camera…
            </p>
          )}

          {phase === "recording" && (
            <p
              role="status"
              aria-live="polite"
              className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-3xs font-bold text-white"
            >
              <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
              {formatElapsed(elapsed)} · {remaining}s left
            </p>
          )}
        </div>

        {error && (
          <p className="text-3xs font-semibold text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-bold text-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-200"
          >
            <X className="h-4 w-4" aria-hidden /> Cancel
          </button>

          {phase === "recording" ? (
            <button
              type="button"
              onClick={stop}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <Square className="h-4 w-4" aria-hidden /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={phase !== "ready"}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--ck-role-accent)]/30 bg-[var(--ck-role-soft)] px-3 py-2.5 text-sm font-bold text-[var(--ck-role-accent)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
            >
              <Video className="h-4 w-4" aria-hidden /> Start recording
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Camera failures, said in terms of what the donor can do.
 *
 * <p>The distinction that matters is denied-vs-absent: "allow camera access" is
 * useless advice to someone whose laptop has no camera, and "no camera found" is
 * misleading to someone who pressed Block. Both end with the file picker as the
 * way forward, because it always is.
 */
function describeCameraError(e: unknown): string {
  const name = e instanceof Error ? e.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow it in your browser, or choose a video file instead.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found. Choose a video file instead.";
    case "NotReadableError":
      return "Your camera is in use by another app. Close it and try again, or choose a video file.";
    default:
      return "We couldn't start the camera. Choose a video file instead.";
  }
}
