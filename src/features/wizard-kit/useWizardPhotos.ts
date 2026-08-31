"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaModerationStatus, WizardPhoto } from "./types";

/**
 * Photo selection, upload and lifecycle, for any wizard.
 *
 * <p>Preview is immediate and upload is background: the object URL is shown the
 * moment a file is picked, and the round-trip only swaps `status`. The page this
 * replaced awaited `Promise.all` over every file before rendering anything, so
 * one slow or failed image blocked — and discarded — all its siblings.
 *
 * <p>Uploads therefore run independently and settle independently. Each photo
 * owns its own status and its own retry.
 *
 * <p>Object URLs are revoked on remove, on successful upload (the remote URL
 * takes over) and on unmount. Leaking them pins the full-resolution image in
 * memory, which on a phone with several 10MB photos is what actually crashes the
 * tab.
 *
 * <p>Transport is injected. The two flows differ in a way no shared abstraction
 * should paper over: a listing photo is a URL in a delimited string, while an
 * offer photo is a server row with its own DELETE endpoint. `upload` may
 * therefore return a `mediaId`, and `removeRemote` exists for the flows that
 * need a server call before the local row disappears.
 */

export type UploadedPhoto = {
  remoteUrl: string;
  mediaId?: number | null;
  /**
   * The server's screening state for the row just created, where the flow has
   * one. Optional and additive: the donation-offer wizard leaves it undefined
   * and nothing there reads it.
   *
   * <p>Note this is normally *not* APPROVED. A successful upload means the bytes
   * are stored, which is a different claim from "this photo may be used" — the
   * listing flow returns QUARANTINED here and the status arrives later.
   */
  moderationStatus?: MediaModerationStatus | null;
  moderationCode?: string | null;
};

export type WizardPhotoLimits = {
  maxPhotos: number;
  minPhotos: number;
  /** MIME types the server actually accepts — mirror it, never guess. */
  acceptedTypes: readonly string[];
  maxBytes: number;
  /** e.g. "JPEG, PNG, WebP or HEIC" — used in the rejection message. */
  typeLabel: string;
  /** e.g. "10MB". */
  sizeLabel: string;
};

export function acceptAttr(limits: WizardPhotoLimits): string {
  return limits.acceptedTypes.join(",");
}

export function describeRejectionFor(limits: WizardPhotoLimits) {
  return (file: File): string | null => {
    if (!limits.acceptedTypes.includes(file.type.toLowerCase())) {
      return `${file.name}: only ${limits.typeLabel} images are accepted`;
    }
    if (file.size > limits.maxBytes) {
      return `${file.name}: images must be under ${limits.sizeLabel}`;
    }
    return null;
  };
}

let photoSeq = 0;
const nextId = () => `p${Date.now().toString(36)}-${photoSeq++}`;

export function useWizardPhotos(options: {
  photos: WizardPhoto[];
  setPhotos: (updater: (prev: WizardPhoto[]) => WizardPhoto[]) => void;
  limits: WizardPhotoLimits;
  upload: (file: File) => Promise<UploadedPhoto>;
  /** Server-side delete, for flows whose photos are rows rather than URLs. */
  removeRemote?: (photo: WizardPhoto) => Promise<void>;
  /** Called after any change that alters the uploaded set. */
  onUrlsChanged?: () => void;
  onRejected?: (message: string) => void;
}) {
  const { photos, setPhotos, limits, upload, removeRemote, onUrlsChanged, onRejected } = options;
  const describeRejection = describeRejectionFor(limits);

  /** Every object URL this hook has created, so unmount can revoke all of them. */
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const onUrlsChangedRef = useRef(onUrlsChanged);
  useEffect(() => { onUrlsChangedRef.current = onUrlsChanged; }, [onUrlsChanged]);
  const onRejectedRef = useRef(onRejected);
  useEffect(() => { onRejectedRef.current = onRejected; }, [onRejected]);

  /** Photos removed while their upload is still in flight. The server row is
   * deleted as soon as the upload returns, preventing invisible orphan media. */
  const removedDuringUploadRef = useRef(new Map<string, { photo: WizardPhoto; index: number }>());
  const [remoteMutationCount, setRemoteMutationCount] = useState(0);

  const transportRef = useRef({ upload, removeRemote });
  useEffect(() => { transportRef.current = { upload, removeRemote }; }, [upload, removeRemote]);

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach(u => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

  const revoke = useCallback((url: string | null) => {
    if (!url) return;
    if (objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }, []);

  const uploadOne = useCallback(async (id: string, file: File) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: "uploading", error: null } : p));
    try {
      const result = await transportRef.current.upload(file);

      const removed = removedDuringUploadRef.current.get(id);
      if (removed) {
        removedDuringUploadRef.current.delete(id);
        const remotePhoto: WizardPhoto = {
          ...removed.photo,
          status: "uploaded",
          localUrl: null,
          remoteUrl: result.remoteUrl,
          mediaId: result.mediaId ?? null,
          file: null,
          error: null,
        };

        if (transportRef.current.removeRemote && remotePhoto.mediaId != null) {
          setRemoteMutationCount(n => n + 1);
          try {
            await transportRef.current.removeRemote(remotePhoto);
          } catch {
            // The upload exists but cleanup failed. Restore it visibly instead
            // of leaving an invisible server row that reappears only on reload.
            setPhotos(prev => {
              if (prev.some(p => p.id === id)) return prev;
              const copy = [...prev];
              copy.splice(Math.min(removed.index, copy.length), 0, remotePhoto);
              return copy;
            });
            onRejectedRef.current?.("The photo uploaded, but could not be removed. Please try again.");
          } finally {
            setRemoteMutationCount(n => Math.max(0, n - 1));
          }
        }
        onUrlsChangedRef.current?.();
        return;
      }

      setPhotos(prev => prev.map(p => {
        if (p.id !== id) return p;
        revoke(p.localUrl);
        return {
          ...p, status: "uploaded", remoteUrl: result.remoteUrl,
          mediaId: result.mediaId ?? null, localUrl: null, error: null,
          // Carried through where the flow supplies it. "uploaded" above is the
          // transfer finishing; this is what the server has decided about the
          // picture, which at this point is usually "nothing yet".
          moderationStatus: result.moderationStatus ?? null,
          moderationCode: result.moderationCode ?? null,
        };
      }));
      onUrlsChangedRef.current?.();
    } catch {
      // If the donor removed it while it was uploading, a failed upload means
      // there is no server row to clean up and nothing should be restored.
      if (removedDuringUploadRef.current.delete(id)) return;
      // Keep the local preview and the File so Retry needs no re-pick.
      setPhotos(prev => prev.map(p =>
        p.id === id ? { ...p, status: "failed", error: "Upload failed" } : p
      ));
    }
  }, [setPhotos, revoke]);

  /** Adds files, previewing immediately and uploading each independently. */
  const addFiles = useCallback((files: File[]) => {
    const room = limits.maxPhotos - photos.length;
    if (room <= 0) {
      onRejected?.(`You can add up to ${limits.maxPhotos} photos`);
      return;
    }

    const accepted: { id: string; file: File; url: string }[] = [];
    for (const file of files.slice(0, room)) {
      const problem = describeRejection(file);
      if (problem) { onRejected?.(problem); continue; }
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      accepted.push({ id: nextId(), file, url });
    }
    if (files.length > room) onRejected?.(`Only ${room} more photo${room === 1 ? "" : "s"} could be added`);
    if (!accepted.length) return;

    setPhotos(prev => [
      ...prev,
      ...accepted.map(a => ({
        id: a.id, localUrl: a.url, remoteUrl: null, mediaId: null,
        status: "pending" as const, file: a.file, error: null,
      })),
    ]);

    // allSettled, not all: one rejection must not take its siblings with it.
    void Promise.allSettled(accepted.map(a => uploadOne(a.id, a.file)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length, setPhotos, uploadOne, onRejected, limits.maxPhotos]);

  const retryPhoto = useCallback((id: string) => {
    const target = photos.find(p => p.id === id);
    if (!target?.file) return;
    void uploadOne(id, target.file);
  }, [photos, uploadOne]);

  const removePhoto = useCallback((id: string) => {
    const target = photos.find(p => p.id === id);
    const targetIndex = photos.findIndex(p => p.id === id);

    if (target && (target.status === "pending" || target.status === "uploading")) {
      removedDuringUploadRef.current.set(id, { photo: target, index: Math.max(0, targetIndex) });
    }

    // Optimistic: the row disappears immediately, because a photo the user has
    // just deleted must not linger while a request is in flight. A failed server
    // delete is surfaced by the caller's own reconciliation, not by resurrecting
    // the thumbnail under their finger.
    setPhotos(prev => {
      const found = prev.find(p => p.id === id);
      revoke(found?.localUrl ?? null);
      return prev.filter(p => p.id !== id);
    });
    onUrlsChangedRef.current?.();

    if (target && target.status === "uploaded" && transportRef.current.removeRemote) {
      setRemoteMutationCount(n => n + 1);
      void transportRef.current.removeRemote(target)
        .catch(() => {
          // Restore the server-backed photo if DELETE failed so local and server
          // state never silently diverge.
          setPhotos(prev => {
            if (prev.some(p => p.id === id)) return prev;
            const copy = [...prev];
            copy.splice(Math.min(Math.max(0, targetIndex), copy.length), 0, target);
            return copy;
          });
          onRejectedRef.current?.("We couldn't remove that photo. Please try again.");
          onUrlsChangedRef.current?.();
        })
        .finally(() => setRemoteMutationCount(n => Math.max(0, n - 1)));
    }
  }, [photos, setPhotos, revoke]);

  /** Promotes a photo to main by moving it to index 0, preserving the rest. */
  const makeMain = useCallback((id: string) => {
    setPhotos(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [picked] = copy.splice(idx, 1);
      copy.unshift(picked);
      return copy;
    });
    onUrlsChangedRef.current?.();
  }, [setPhotos]);

  return {
    addFiles, retryPhoto, removePhoto, makeMain,
    remoteMutationPending: remoteMutationCount > 0,
  };
}
