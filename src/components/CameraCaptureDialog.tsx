"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UiText, useUiText } from "@/components/UiText";
import {
  AlertTriangle,
  Camera,
  Check,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";

type CameraStatus = "requesting" | "live" | "capturing" | "captured" | "error";

type CameraCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
  onChoosePhoto: () => void;
  /**
   * Which camera to prefer. Defaults to "user" so every existing caller keeps
   * the selfie-facing behaviour it was written against; the item-listing wizard
   * passes "environment" because you photograph an object with the rear camera.
   * Only ever `ideal`, never `exact` — a device with one camera must still work.
   */
  facingMode?: "user" | "environment";
  /**
   * Mirror the preview and the saved frame.
   *
   * <p>Defaults to `facingMode === "user"`, which is the only correct default:
   * a mirrored selfie preview is what everyone expects because it matches a
   * bathroom mirror, and a mirrored *rear* camera is simply wrong — it shows
   * the object flipped, and any label, model number or serial in the photo
   * comes out backwards. Both rear-camera callers were getting the mirrored
   * treatment, so deriving it here fixes them without either having to know.
   *
   * <p>Overridable because "mirror" and "which camera" are not the same
   * question, and a future caller may want them apart.
   */
  mirrored?: boolean;
  /** Dialog heading. Defaults to the selfie-flow wording. */
  title?: string;
  /** One line under the heading, telling the user what to frame. */
  instructions?: string;
  /**
   * Prefix for the captured file's name. Defaults to `donee-photo`, which is
   * what every caller got before this was a prop — including the item-listing
   * wizard, whose item photos were all arriving named as donee photos.
   */
  filenamePrefix?: string;
};

/**
 * Error codes, not text: the camera callbacks set these, and the copy is looked
 * up at render (useCameraErrorCopy). Keeping translation out of those callbacks
 * keeps their dependencies stable, so the camera never restarts on a re-render.
 */
type CameraError = "insecure" | "unsupported" | "generic" | "blocked" | "notFound" | "inUse" | "stillStarting" | "captureFailed";

function cameraErrorCode(error: unknown): CameraError {
  if (!window.isSecureContext) return "insecure";
  if (!(error instanceof DOMException)) return "generic";
  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "blocked";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "notFound";
    case "NotReadableError":
    case "TrackStartError":
      return "inUse";
    default:
      return "generic";
  }
}

function useCameraErrorCopy(): Record<CameraError, string> {
  const ui = useUiText();
  return {
    insecure: ui("Camera access requires a secure HTTPS connection."),
    unsupported: ui("This browser doesn't support in-app camera access. Please choose a photo instead."),
    generic: ui("We couldn't start your camera. Please try again or choose a photo."),
    blocked: ui("Camera access is blocked. Allow camera access in your browser settings, then try again."),
    notFound: ui("No camera was found on this device."),
    inUse: ui("Your camera is being used by another app. Close that app and try again."),
    stillStarting: ui("The camera is still starting. Please wait a moment and try again."),
    captureFailed: ui("We couldn't capture that frame. Please try again."),
  };
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
  onChoosePhoto,
  facingMode = "user",
  mirrored = facingMode === "user",
  title,
  instructions,
  filenamePrefix = "donee-photo",
}: CameraCaptureDialogProps) {
  const ui = useUiText();
  const errorCopy = useCameraErrorCopy();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraAttemptRef = useRef(0);
  const openRef = useRef(open);
  const [status, setStatus] = useState<CameraStatus>("requesting");
  const [errorMessage, setErrorMessage] = useState<CameraError | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    const attempt = ++cameraAttemptRef.current;
    stopCamera();
    setCapturedFile(null);
    setErrorMessage(null);
    setStatus("requesting");

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(window.isSecureContext ? "unsupported" : "insecure");
      setStatus("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });

      if (!openRef.current || attempt !== cameraAttemptRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (!openRef.current || attempt !== cameraAttemptRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setStatus("live");
    } catch (error) {
      stopCamera();
      if (!openRef.current || attempt !== cameraAttemptRef.current) return;
      setErrorMessage(cameraErrorCode(error));
      setStatus("error");
    }
  }, [stopCamera, facingMode]);

  const close = useCallback(() => {
    cameraAttemptRef.current += 1;
    stopCamera();
    onOpenChange(false);
  }, [onOpenChange, stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void startCamera();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cameraAttemptRef.current += 1;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      stopCamera();
    };
  }, [close, open, startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage("stillStarting");
      setStatus("error");
      stopCamera();
      return;
    }

    const attempt = ++cameraAttemptRef.current;
    setStatus("capturing");
    const maxDimension = 1280;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setErrorMessage("captureFailed");
      setStatus("error");
      stopCamera();
      return;
    }

    // The saved frame must match the preview the user was looking at when they
    // pressed the shutter — so the flip is applied under exactly the condition
    // the preview flips, and not otherwise. Unconditionally mirroring here is
    // what wrote every rear-camera item photo back to front, labels and serial
    // numbers included.
    context.save();
    if (mirrored) {
      context.translate(width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, width, height);
    context.restore();

    canvas.toBlob(
      (blob) => {
        stopCamera();
        if (!openRef.current || attempt !== cameraAttemptRef.current) return;
        if (!blob) {
          setErrorMessage("captureFailed");
          setStatus("error");
          return;
        }
        setCapturedFile(
          new File([blob], `${filenamePrefix}-${Date.now()}.jpg`, { type: "image/jpeg" })
        );
        setStatus("captured");
      },
      "image/jpeg",
      0.9
    );
  }, [stopCamera]);

  const usePhoto = useCallback(() => {
    if (!capturedFile) return;
    onCapture(capturedFile);
    close();
  }, [capturedFile, close, onCapture]);

  const choosePhotoInstead = useCallback(() => {
    onChoosePhoto();
    close();
  }, [close, onChoosePhoto]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-dialog-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl dark:bg-zinc-900"
        data-testid="camera-dialog"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-zinc-700">
          <div>
            <h2 id="camera-dialog-title" className="text-base font-bold text-stone-900 dark:text-white">
              {title ?? ui("Take a photo")}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {instructions ?? ui("Keep your face clearly visible in the frame.")}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label={ui("Close camera")}
            title={ui("Close camera")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-black">
          <div className="relative mx-auto aspect-[3/4] max-h-[65vh] w-full sm:aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full object-cover ${mirrored ? "[transform:scaleX(-1)]" : ""} ${
                status === "captured" || status === "error" ? "hidden" : ""
              }`}
              data-testid="camera-preview"
            />
            <canvas
              ref={canvasRef}
              className={`h-full w-full object-contain ${
                status === "captured" ? "block" : "hidden"
              }`}
              data-testid="captured-photo"
            />

            {(status === "requesting" || status === "capturing") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 text-white">
                <Loader2 className="h-7 w-7 animate-spin" />
                <p className="text-sm font-semibold">
                  {status === "capturing" ? ui("Preparing your photo…") : ui("Starting camera…")}
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center text-white">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <p className="max-w-sm text-sm leading-6 text-zinc-200">{errorMessage && errorCopy[errorMessage]}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-20 flex-wrap items-center justify-center gap-2 border-t border-stone-200 px-4 py-3 dark:border-zinc-700">
          {status === "live" && (
            <button
              type="button"
              onClick={capturePhoto}
              className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[var(--ck-role-accent)]/25 bg-[var(--ck-role-accent)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              aria-label={ui("Capture photo")}
              title={ui("Capture photo")}
            >
              <Camera className="h-6 w-6" />
            </button>
          )}

          {status === "captured" && (
            <>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="h-4 w-4" />
                <UiText>Retake</UiText>
              </button>
              <button
                type="button"
                onClick={usePhoto}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--ck-role-accent)] px-4 text-sm font-bold text-white transition-colors hover:bg-[#963e12]"
              >
                <Check className="h-4 w-4" />
                <UiText>Use photo</UiText>
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="h-4 w-4" />
                <UiText>Try camera again</UiText>
              </button>
              <button
                type="button"
                onClick={choosePhotoInstead}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--ck-role-accent)] px-4 text-sm font-bold text-white transition-colors hover:bg-[#963e12]"
              >
                <Upload className="h-4 w-4" />
                <UiText>Choose photo</UiText>
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
