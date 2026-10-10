"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RotateCcw, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Whether "Take photo" should hand over to the device's own camera app.
 *
 * <p>Phones and tablets honour {@code <input capture="environment">} and open the
 * rear camera directly. Desktop browsers ignore {@code capture} and show the file
 * picker instead, so on those the drive wizard opens {@link PhotoCaptureDialog},
 * which uses the webcam through {@code getUserMedia}.
 */
export function prefersNativeCamera(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent ?? "");
  return coarse || mobileUa;
}

/** Plain words for why the camera could not start. */
export function describePhotoCameraError(e: unknown): string {
  const name = e instanceof Error ? e.name : (e as { name?: string } | null)?.name ?? "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow the camera for this site in your browser, or choose a photo instead.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device. Choose a photo instead.";
    case "NotReadableError":
      return "Your camera is in use by another app. Close it and try again, or choose a photo instead.";
    default:
      return "We couldn't start the camera. Choose a photo instead.";
  }
}

type Phase = "starting" | "live" | "captured" | "error";

/**
 * Takes a photo with the webcam: a live preview, Capture, then Retake or Use photo.
 *
 * <p>The stream is stopped on every exit (use, cancel, escape, unmount) so the
 * camera light never stays on after the dialog closes.
 */
export function PhotoCaptureDialog({
  open, onCancel, onCaptured,
}: {
  open: boolean;
  onCancel: () => void;
  onCaptured: (file: File) => void;
}) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const clearPreview = useCallback(() => {
    setPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    blobRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setPhase("starting");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't use the camera. Choose a photo instead.");
      setPhase("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPhase("live");
    } catch (e) {
      setError(describePhotoCameraError(e));
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void start();
    return () => { stopStream(); clearPreview(); };
  }, [open, start, stopStream, clearPreview]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
    canvas.toBlob(blob => {
      if (!blob) { setError("That photo came out empty. Please try again."); return; }
      blobRef.current = blob;
      setPreview(URL.createObjectURL(blob));
      setPhase("captured");
    }, "image/jpeg", 0.92);
  }

  function retake() {
    clearPreview();
    setPhase("live");
  }

  function use() {
    const blob = blobRef.current;
    if (!blob) return;
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
    stopStream();
    clearPreview();
    onCaptured(file);
  }

  function cancel() {
    stopStream();
    clearPreview();
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) cancel(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Take a photo</DialogTitle>
          <DialogDescription>Hold the item in good light, with all of it in the frame.</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-stone-900">
          {/* Kept mounted so the stream can attach before it is shown. */}
          <video ref={videoRef} playsInline muted aria-label="Camera preview"
            className={`h-full w-full object-contain ${phase === "live" ? "" : "invisible"}`} />
          {phase === "captured" && preview && (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob URL
            <img src={preview} alt="Captured photo" className="absolute inset-0 h-full w-full object-contain" />
          )}
          {phase === "starting" && (
            <span className="absolute inset-0 grid place-items-center text-sm text-white/80">
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Starting camera…</span>
            </span>
          )}
          {phase === "error" && (
            <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-semibold text-white">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={cancel}
            className="min-h-[44px] rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 dark:border-zinc-700 dark:text-stone-200">
            {phase === "error" ? "Close" : "Cancel"}
          </button>
          {phase === "error" && (
            <button type="button" onClick={() => void start()}
              className="min-h-[44px] rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 dark:border-zinc-700 dark:text-stone-200">
              Try again
            </button>
          )}
          {phase === "live" && (
            <button type="button" onClick={capture}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-5 text-sm font-bold text-white">
              <Camera className="h-4 w-4" aria-hidden /> Capture
            </button>
          )}
          {phase === "captured" && (
            <>
              <button type="button" onClick={retake}
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 dark:border-zinc-700 dark:text-stone-200">
                <RotateCcw className="h-4 w-4" aria-hidden /> Retake
              </button>
              <button type="button" onClick={use}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-5 text-sm font-bold text-white">
                <Check className="h-4 w-4" aria-hidden /> Use photo
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
