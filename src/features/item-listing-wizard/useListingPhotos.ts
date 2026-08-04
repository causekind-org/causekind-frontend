"use client";

import { useCallback, useEffect, useRef } from "react";
import { uploadListingImage } from "@/lib/api";
import type { WizardPhoto } from "./wizardModel";

/**
 * Photo selection, upload and lifecycle.
 *
 * <p>Preview is immediate and upload is background: the object URL is shown the
 * moment a file is picked, and the S3 round-trip only swaps `status`. The old
 * page awaited `Promise.all` over every file before rendering anything, so one
 * slow or failed image blocked — and discarded — all its siblings.
 *
 * <p>Uploads therefore run independently and settle independently. Each photo
 * owns its own status and its own retry.
 *
 * <p>Object URLs are revoked on remove, on successful upload (the remote URL
 * takes over) and on unmount. Leaking them pins the full-resolution image in
 * memory, which on a phone with five 10MB photos is what actually crashes the tab.
 */

/** Mirrors S3Service.ALLOWED_IMAGE_TYPES — verified, not guessed. */
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
/** Mirrors spring.servlet.multipart.max-file-size=10MB. */
const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTOS = 5;
export const MIN_PHOTOS = 2;

export const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

export function describeRejection(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
    return `${file.name}: only JPEG, PNG, WebP or HEIC images are accepted`;
  }
  if (file.size > MAX_BYTES) {
    return `${file.name}: images must be under 10MB`;
  }
  return null;
}

let photoSeq = 0;
const nextId = () => `p${Date.now().toString(36)}-${photoSeq++}`;

export function useListingPhotos(options: {
  photos: WizardPhoto[];
  setPhotos: (updater: (prev: WizardPhoto[]) => WizardPhoto[]) => void;
  /** Called after any change that alters the uploaded-URL set. */
  onUrlsChanged?: () => void;
  onRejected?: (message: string) => void;
}) {
  const { photos, setPhotos, onUrlsChanged, onRejected } = options;

  /** Every object URL this hook has created, so unmount can revoke all of them. */
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const onUrlsChangedRef = useRef(onUrlsChanged);
  useEffect(() => { onUrlsChangedRef.current = onUrlsChanged; }, [onUrlsChanged]);

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
      const url = await uploadListingImage(file);
      setPhotos(prev => prev.map(p => {
        if (p.id !== id) return p;
        revoke(p.localUrl);
        return { ...p, status: "uploaded", remoteUrl: url, localUrl: null, error: null };
      }));
      onUrlsChangedRef.current?.();
    } catch {
      // Keep the local preview and the File so Retry needs no re-pick.
      setPhotos(prev => prev.map(p =>
        p.id === id ? { ...p, status: "failed", error: "Upload failed" } : p
      ));
    }
  }, [setPhotos, revoke]);

  /** Adds files, previewing immediately and uploading each independently. */
  const addFiles = useCallback((files: File[]) => {
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      onRejected?.(`You can add up to ${MAX_PHOTOS} photos`);
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
        id: a.id, localUrl: a.url, remoteUrl: null,
        status: "pending" as const, file: a.file, error: null,
      })),
    ]);

    // allSettled, not all: one rejection must not take its siblings with it.
    void Promise.allSettled(accepted.map(a => uploadOne(a.id, a.file)));
  }, [photos.length, setPhotos, uploadOne, onRejected]);

  const retryPhoto = useCallback((id: string) => {
    const target = photos.find(p => p.id === id);
    if (!target?.file) return;
    void uploadOne(id, target.file);
  }, [photos, uploadOne]);

  const removePhoto = useCallback((id: string) => {
    setPhotos(prev => {
      const target = prev.find(p => p.id === id);
      revoke(target?.localUrl ?? null);
      return prev.filter(p => p.id !== id);
    });
    onUrlsChangedRef.current?.();
  }, [setPhotos, revoke]);

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

  return { addFiles, retryPhoto, removePhoto, makeMain };
}
