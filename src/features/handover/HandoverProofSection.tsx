"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HandoverProofPhoto } from "@/lib/api";
import { compressDisplayPhoto } from "@/lib/imageCompression";
import { PhotoCaptureDialog, prefersNativeCamera } from "@/features/ngo-drives/components/PhotoCaptureDialog";
import { handoverPrimary, handoverSecondary } from "./handoverStyles";

export const MAX_HANDOVER_PHOTOS = 3;

/** What the hub hands the confirmation panel for the photo step. */
export type HandoverProofControls = {
  photos: HandoverProofPhoto[];
  upload: (file: File, device: string) => Promise<void>;
  /** Removes the viewer's own photo (a mis-click); refused once either side has confirmed. */
  remove?: (photoId: number) => Promise<void>;
};

/**
 * The on-the-spot handover photo (owner, 2026-10-08). Shown to BOTH sides once
 * the recipient has entered the code; either one takes it, and one photo
 * unlocks both "I have donated the item" and "I have received the item".
 *
 * <p>Camera only, never the gallery: phones open the camera through
 * `capture="environment"`, desktops open the webcam dialog. A browser cannot
 * prove a photo is fresh, but this is as close as the web gets.
 */
export function HandoverProofSection({ proof, viewerRole, locked = false }: {
  proof: HandoverProofControls;
  viewerRole: "DONOR" | "DONEE";
  /** Either side has confirmed: photos can no longer be removed (the server refuses too). */
  locked?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [webcam, setWebcam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  const photos = proof.photos;
  const atLimit = photos.length >= MAX_HANDOVER_PHOTOS;

  async function send(file: File, device: string) {
    setBusy(true); setError(null);
    // A phone camera's original is often 5-12MB and past 40MP, over the server's
    // MATCH_PHOTO limits; shrink it like listing and offer photos (~1MB).
    try { await proof.upload(await compressDisplayPhoto(file), device); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't upload the handover photo."); }
    finally { setBusy(false); }
  }

  async function remove(photoId: number) {
    if (!proof.remove) return;
    setRemoving(photoId); setError(null);
    try { await proof.remove(photoId); }
    // The server's only 400 here is "already confirmed" (e.g. the other side
    // confirmed a moment ago), and its reason text is replaced by a generic one.
    catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(/couldn't read that request/i.test(msg)
        ? "This photo can't be removed — the handover has already been confirmed."
        : msg || "Couldn't remove the photo.");
    }
    finally { setRemoving(null); }
  }

  function take() {
    if (prefersNativeCamera()) inputRef.current?.click();
    else setWebcam(true);
  }

  const who = (p: HandoverProofPhoto) =>
    p.uploaderRole === viewerRole ? "You" : p.uploaderRole === "DONOR" ? "The donor" : "The recipient";
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-2.5 rounded-xl border border-stone-200 p-3 dark:border-zinc-800">
      <div>
        <p className="text-sm font-bold text-stone-800 dark:text-stone-100">Handover photo</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {photos.length === 0
            ? "Take a photo of the item being handed over. Either of you can take it — one is enough for both."
            : "Done — you can both confirm now. Add another angle if you like."}
        </p>
      </div>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map(p => (
            <li key={p.id} className="relative space-y-1">
              <button type="button" onClick={() => p.url && setViewing(p.url)}
                className="relative block aspect-square w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-zinc-800"
                aria-label={`Handover photo taken by ${who(p).toLowerCase()}`}>
                {p.url && (
                  // eslint-disable-next-line @next/next/no-img-element -- presigned URL
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                )}
              </button>
              {/* Only your own photo, and the server still refuses once either side confirmed. */}
              {proof.remove && !locked && p.uploaderRole === viewerRole && (
                <button type="button" onClick={() => void remove(p.id)} disabled={removing !== null || busy}
                  aria-label="Remove this photo"
                  className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/65 text-white shadow disabled:opacity-60">
                  {removing === p.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <X className="size-4" aria-hidden />}
                </button>
              )}
              <p className="text-3xs leading-tight text-stone-500 dark:text-stone-400">
                {who(p)} · {when(p.takenAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!atLimit && (
        <Button type="button" onClick={take} disabled={busy}
          className={`${photos.length === 0 ? handoverPrimary : handoverSecondary} w-full`}>
          {busy
            ? <><Loader2 className="animate-spin" aria-hidden /> Uploading</>
            : <><Camera aria-hidden /> {photos.length === 0 ? "Take handover photo" : "Take another photo"}</>}
        </Button>
      )}
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {/* Camera only: `capture` and no gallery button. */}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only"
        aria-hidden tabIndex={-1}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) void send(f, "phone");
          e.target.value = "";
        }} />
      <PhotoCaptureDialog
        open={webcam}
        onCancel={() => setWebcam(false)}
        onCaptured={file => { setWebcam(false); void send(file, "desktop"); }}
      />

      {viewing && (
        <div role="dialog" aria-modal="true" aria-label="Handover photo"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setViewing(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned URL */}
          <img src={viewing} alt="" className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
